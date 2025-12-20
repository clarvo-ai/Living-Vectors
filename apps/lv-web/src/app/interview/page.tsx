'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getGeminiResponse, getSTT, getTTS, startConversation } from '@/lib/services/pyapi';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatInput } from './components/ChatInput';
import { Message } from './components/ChatMessage';
import { EndInterviewDialog } from './components/EndInterviewDialog';
import { InterviewHeader } from './components/InterviewHeader';
import { MessagesList } from './components/MessagesList';
import { VoiceOnlyMode } from './components/VoiceOnlyMode';
import { VoiceRecorder } from './components/VoiceRecorder';

export default function InterviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    /*     {
      id: 'initial-ai-message',
      role: 'ai',
      content: "Hello! I'm here to figure you out. First, are you dedicated?",
      timestamp: new Date(),
    }, */
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(false);
  const [isUserRecording, setIsUserRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showEndInterviewDialog, setShowEndInterviewDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [goalIndex, setGoalIndex] = useState<number>(0);
  const [questionIndex, setQuestionIndex] = useState<number>(0);

  // Require auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Upon mount run the start script once (first time chatting)
  useEffect(() => {
    //Also fetching data can be here since this runs on mount

    //Do data fetching before this
    firstChat();
  }, []);

  async function firstChat() {
    if (messages.length === 0) {
      setIsLoading(true);
      try {
        const request = await startConversation();

        setMessages([
          {
            id: 'initial-ai-message',
            role: 'ai',
            content: request.message,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  }

  // Scroll behaviour
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceOnlyMode]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  };

  const playAudio = useCallback((blob: Blob) => {
    stopAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => setIsAiSpeaking(true);
    audio.onended = () => setIsAiSpeaking(false);
    audio.onpause = () => setIsAiSpeaking(false);

    audio.play();
  }, []);

  // TTS for the latest AI message in Voice Only Mode
  useEffect(() => {
    if (voiceOnlyMode) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'ai') {
        getTTS(lastMessage.content)
          .then((blob) => playAudio(blob))
          .catch((e) => console.error('TTS error', e));
      }
    }
  }, [voiceOnlyMode, messages, playAudio]);

  // Pause audio when user starts recording or when voice modes are off
  useEffect(() => {
    if (isUserRecording || (!voiceOnlyMode && !voiceMode)) {
      audioRef.current?.pause();
    }
  }, [isUserRecording, voiceOnlyMode, voiceMode]);

  const handleVoiceRecording = async (blob: Blob) => {
    //console.log('handleVoiceRecording called with blob size:', blob.size);
    setIsTranscribing(true);
    try {
      const { transcript } = await getSTT(blob);
      handleSend(transcript);
    } catch (error) {
      console.error('STT error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async (content?: string) => {
    const msgContent = typeof content === 'string' ? content : input;
    if (!msgContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgContent.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // This is the part where a message would be sent to the API
      // and the response is received from the API
      // Logic for the request processing is in
      // src/app/api/interview/chat/route.ts
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('User ID missing');
      }

      //frontend calls the backend API to get the AI response + next question
      //this function also saves the message to the database
      const data = await getGeminiResponse(userId, userMessage.content, goalIndex, questionIndex);

      if (!data.completed && data.nextQuestionId) {
        setGoalIndex(data.nextQuestionId.goalIndex);
        setQuestionIndex(data.nextQuestionId.questionIndex);
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);

      if (voiceMode && !voiceOnlyMode) {
        getTTS(data.message)
          .then((audioBlob) => playAudio(audioBlob))
          .catch((e) => console.error('TTS error', e));
      }
    } catch (error) {
      // In case an error occurs
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  //Send message on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndInterview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    router.push('/dashboard');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"
        ></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(45deg, var(--bg-gradient-start) 0%, var(--bg-gradient-middle) 50%, var(--bg-gradient-end) 100%)`,
      }}
    >
      <InterviewHeader
        onEndInterviewClick={() => setShowEndInterviewDialog(true)}
        userName={session.user?.name || session.user?.email}
      />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="h-[calc(100vh-12rem)] flex flex-col shadow-lg">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-4">
              <ChatHeader currentGoal="Build Trust & Explore Current Motivation" />
              <div className="flex justify-end items-center space-x-4">
                {!voiceOnlyMode && (
                  <div className="flex items-center space-x-2">
                    <Switch id="voice-mode" checked={voiceMode} onCheckedChange={setVoiceMode} />
                    <Label htmlFor="voice-mode" className="flex items-center gap-2">
                      {voiceMode ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                      AI Voice
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="voice-only-mode"
                    checked={voiceOnlyMode}
                    onCheckedChange={setVoiceOnlyMode}
                  />
                  <Label htmlFor="voice-only-mode" className="flex items-center gap-2">
                    Voice Only
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden pt-6">
            {voiceOnlyMode ? (
              <div className="flex-1 flex flex-col items-center">
                <VoiceOnlyMode
                  isAiSpeaking={isAiSpeaking}
                  isUserRecording={isUserRecording}
                  isProcessing={isLoading || isTranscribing}
                />
                <div className="flex justify-center pb-4">
                  {isTranscribing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <VoiceRecorder
                      onRecordingComplete={handleVoiceRecording}
                      onRecordingStateChange={setIsUserRecording}
                      disabled={isLoading || messages.length === 0}
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                <MessagesList
                  messages={messages}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                />
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <ChatInput
                      value={input}
                      onChange={setInput}
                      onSend={() => handleSend()}
                      isLoading={isLoading}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                  <div className="flex h-10 items-center justify-center">
                    {isTranscribing ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <VoiceRecorder
                        onRecordingComplete={handleVoiceRecording}
                        onRecordingStateChange={setIsUserRecording}
                        disabled={isLoading || messages.length === 0}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <EndInterviewDialog
        open={showEndInterviewDialog}
        onOpenChange={setShowEndInterviewDialog}
        onConfirm={handleEndInterview}
      />
    </div>
  );
}
