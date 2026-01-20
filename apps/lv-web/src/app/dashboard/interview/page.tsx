'use client';

import {
  RoomAudioRenderer,
  SessionProvider,
  StartAudio,
  useSession as useLiveKitSession,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { TokenSource } from 'livekit-client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { InterviewContent } from './components/InterviewContent';

export default function InterviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
    <InterviewPageContent
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
  );
}

function InterviewPageContent({
  input,
  setInput,
  isLoading,
  voiceOnlyMode,
  setVoiceOnlyMode,
  voiceMode,
  setVoiceMode,
  showEndInterviewDialog,
  setShowEndInterviewDialog,
  onEndInterview,
  hasStarted,
  setHasStarted,
}: any) {
  // Create token source for LiveKit session
  // SessionProvider will automatically connect when tokenSource returns a token
  const tokenSource = useMemo(() => {
    // Only provide token when hasStarted is true
    if (!hasStarted) {
      // Return null token to prevent connection
      return {
        fetch: async () => ({
          accessToken: '',
          serverUrl: '',
          participantToken: '',
        }),
      } as const;
    }

    // Check if we have an endpoint or use test token
    if (process.env.NEXT_PUBLIC_LIVEKIT_CONNECTION_ENDPOINT) {
      return TokenSource.endpoint(process.env.NEXT_PUBLIC_LIVEKIT_CONNECTION_ENDPOINT);
    }

    // Use test token
    return {
      fetch: async () => ({
        accessToken: process.env.NEXT_PUBLIC_LIVEKIT_TEST_TOKEN || '',
        serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
        participantToken: process.env.NEXT_PUBLIC_LIVEKIT_TEST_TOKEN || '',
      }),
    } as const;
  }, [hasStarted]);

  // Use LiveKit useSession hook with token source
  const liveKitSession = useLiveKitSession(tokenSource);

  // Connect when hasStarted becomes true
  useEffect(() => {
    if (hasStarted && !liveKitSession.isConnected) {
      console.log('Starting LiveKit session...');
      liveKitSession.start();
    }
  }, [hasStarted, liveKitSession]);

  return (
    <SessionProvider session={liveKitSession}>
      <div className="h-full flex flex-col">
        <InterviewContent
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          voiceOnlyMode={voiceOnlyMode}
          setVoiceOnlyMode={setVoiceOnlyMode}
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
          showEndInterviewDialog={showEndInterviewDialog}
          setShowEndInterviewDialog={setShowEndInterviewDialog}
          onEndInterview={onEndInterview}
          hasStarted={hasStarted}
          setHasStarted={setHasStarted}
        />
      </div>
      <StartAudio label="Click to enable audio" />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}
