'use client';

import { getGeminiResponse, startConversation } from '@/lib/services/pyapi';
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

  // Stop audio when component unmounts (user leaves interview)
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

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
    // Mark that user activated voice-only mode manually
    if (voiceOnlyMode) {
      sessionStorage.setItem('voiceOnlyActivatedByUser', 'true');
    }
  }, [voiceOnlyMode]);

  // Clear the activation flag on mount
  useEffect(() => {
    sessionStorage.removeItem('voiceOnlyActivatedByUser');
  }, []);

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

  // Handle playing TTS when switching to voice-only mode (only on mode change, not on message change)
  useEffect(() => {
    const wasActivatedByUser = sessionStorage.getItem('voiceOnlyActivatedByUser') === 'true';
    if (voiceOnlyMode && messages.length > 1 && wasActivatedByUser) {
      // Voice agent will handle TTS via LiveKit
    }
  }, [voiceOnlyMode]); // Only depend on voiceOnlyMode to trigger when switching modes

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
      // Voice agent will handle STT via LiveKit
      // This function is kept for legacy compatibility but not used in voice-only mode
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

      if ((voiceMode && !voiceOnlyMode) || voiceOnlyMode) {
        // Voice agent will handle TTS via LiveKit
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
          style={{ backgroundColor: 'var(--bg-light)', borderColor: 'var(--border-gray)' }}
        >
          <ChatHeader
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            voiceOnlyMode={voiceOnlyMode}
            setVoiceOnlyMode={setVoiceOnlyMode}
          />
        </div>
      )}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-light)' }}
      >
        {voiceOnlyMode ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-6 relative">
            <VoiceOnlyMode
              isAiSpeaking={isAiSpeaking}
              isUserRecording={isUserRecording}
              isProcessing={isLoading || isTranscribing}
              messageCount={messages.length}
              hasStarted={hasStarted}
              onStart={() => {
                setHasStarted(true);
                // Voice agent will handle initial greeting via LiveKit
              }}
              onGoToChat={() => setVoiceOnlyMode(false)}
            />
            <div className="absolute left-0 right-0 bottom-4 flex justify-center">
              {isTranscribing ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : hasStarted || messages.length > 1 ? (
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecording}
                  onRecordingStateChange={setIsUserRecording}
                  disabled={isLoading}
                  isVoiceOnly={voiceOnlyMode}
                />
              ) : null}
            </div>
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
              className="flex gap-2 items-end pb-4 border-t pt-4 px-6"
              style={{ borderColor: 'var(--border-gray)' }}
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
              <div className="flex items-center justify-center">
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
