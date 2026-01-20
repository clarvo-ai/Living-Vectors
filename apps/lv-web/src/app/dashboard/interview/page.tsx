'use client';

import { RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { Room } from 'livekit-client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatContent } from './components/ChatContent';

export default function InterviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [room] = useState(() => new Room({}));
  const [token, setToken] = useState<string | null>(null);
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
        <ChatContent
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          voiceOnlyMode={voiceOnlyMode}
          setVoiceOnlyMode={setVoiceOnlyMode}
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
          showEndInterviewDialog={showEndInterviewDialog}
          setShowEndInterviewDialog={setShowEndInterviewDialog}
          onEndInterview={handleEndInterview}
          hasStarted={hasStarted}
          setHasStarted={setHasStarted}
        />
      </div>
    </RoomContext.Provider>
  );
}
