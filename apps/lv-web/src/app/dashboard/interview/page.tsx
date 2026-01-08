'use client';

import { getGeminiResponse, getSTT, getTTS, startConversation } from '@/lib/services/pyapi';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatInput } from './components/ChatInput';
import { Message } from './components/ChatMessage';
import { EndInterviewDialog } from './components/EndInterviewDialog';
import { MessagesList } from './components/MessagesList';
import { VoiceOnlyMode } from './components/VoiceOnlyMode';
import { VoiceRecorder } from './components/VoiceRecorder';

export default function InterviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('interview-messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (e) {
          console.error('Failed to parse saved messages', e);
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('interview-voiceMode');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('interview-voiceOnlyMode');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [isUserRecording, setIsUserRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showEndInterviewDialog, setShowEndInterviewDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [goalIndex, setGoalIndex] = useState<number>(0);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState(false);

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

  // Save voice settings to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('interview-voiceMode', JSON.stringify(voiceMode));
  }, [voiceMode]);

  useEffect(() => {
    sessionStorage.setItem('interview-voiceOnlyMode', JSON.stringify(voiceOnlyMode));
  }, [voiceOnlyMode]);

  // Save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('interview-messages', JSON.stringify(messages));
    }
  }, [messages]);

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

  // Handle playing TTS when user clicks start button or after sending a message
  useEffect(() => {
    if (voiceOnlyMode && hasStarted && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'ai' && lastMessage.id !== 'initial-ai-message') {
        getTTS(lastMessage.content)
          .then((blob) => playAudio(blob))
          .catch((e) => console.error('TTS error', e));
      }
    }
  }, [voiceOnlyMode, hasStarted, messages, playAudio]);

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
    stopAudio();
    sessionStorage.removeItem('interview-messages');
    setHasStarted(false);
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
    <div className="h-full flex flex-col">
      {!voiceOnlyMode && (
        <div
          className="flex items-center px-6 py-2 border-b"
          style={{ backgroundColor: '#f3f4f8' }}
        >
          <ChatHeader
            currentGoal="Build Trust & Explore Current Motivation"
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            voiceOnlyMode={voiceOnlyMode}
            setVoiceOnlyMode={setVoiceOnlyMode}
          />
        </div>
      )}
      <div
        className="flex-1 flex flex-col overflow-hidden border-t"
        style={{ backgroundColor: '#f3f4f8', borderColor: '#edeef2' }}
      >
        {voiceOnlyMode ? (
          <div className="flex-1 flex flex-col items-center px-6 pt-6">
            <VoiceOnlyMode
              isAiSpeaking={isAiSpeaking}
              isUserRecording={isUserRecording}
              isProcessing={isLoading || isTranscribing}
              hasStarted={hasStarted}
              messageCount={messages.length}
              onStart={() => {
                setHasStarted(true);
                getTTS(messages[0]?.content)
                  .then((blob) => playAudio(blob))
                  .catch((e) => console.error('TTS error', e));
              }}
              onGoToChat={() => setVoiceOnlyMode(false)}
            />
            {(hasStarted || messages.length > 0) && (
              <div className="flex justify-center pb-4 pt-2">
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
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 pt-6">
              <MessagesList
                messages={messages}
                isLoading={isLoading}
                messagesEndRef={messagesEndRef}
              />
            </div>
            <div
              className="flex gap-2 items-start pb-4 border-t pt-4 px-6"
              style={{ borderColor: '#edeef2' }}
            >
              <div className="flex-1">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={() => handleSend()}
                  isLoading={isLoading}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="flex h-12 items-center justify-center">
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
      </div>

      <EndInterviewDialog
        open={showEndInterviewDialog}
        onOpenChange={setShowEndInterviewDialog}
        onConfirm={handleEndInterview}
      />
    </div>
  );
}
