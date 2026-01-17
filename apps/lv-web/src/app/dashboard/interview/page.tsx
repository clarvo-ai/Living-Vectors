'use client';

import { RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { Room } from 'livekit-client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { Message } from './components/ChatMessage';
import { CustomChat } from './components/CustomChat';
import { EndInterviewDialog } from './components/EndInterviewDialog';
import { VoiceOnlyMode } from './components/VoiceOnlyMode';

export default function InterviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [room] = useState(() => new Room({}));
  const [token, setToken] = useState<string | null>(null);
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
  const [showEndInterviewDialog, setShowEndInterviewDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      room.disconnect();
    };
  }, [room]);

  // Upon mount initialize LiveKit token for voice features
  useEffect(() => {
    const testToken = process.env.NEXT_PUBLIC_LIVEKIT_TEST_TOKEN;
    if (testToken) {
      setToken(testToken);
    }
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

  const handleVoiceRecording = async (blob: Blob) => {
    // Voice agent handles recording via LiveKit
  };

  const handleSend = async (content?: string) => {
    const msgContent = typeof content === 'string' ? content : input;
    if (!msgContent.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgContent.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
  };

  //Send message on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndInterview = () => {
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
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
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
                messageCount={messages.length}
                hasStarted={hasStarted}
                onStart={() => {
                  setHasStarted(true);
                }}
                onGoToChat={() => setVoiceOnlyMode(false)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CustomChat />
            </div>
          )}
        </div>

        <EndInterviewDialog
          open={showEndInterviewDialog}
          onOpenChange={setShowEndInterviewDialog}
          onConfirm={handleEndInterview}
        />
      </div>
    </RoomContext.Provider>
  );
}
