'use client';

import '@livekit/components-styles';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ActiveInterview } from './components/ActiveInterview';
import { InterviewStartScreen } from './components/InterviewStartScreen';

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

  return hasStarted ? (
    <ActiveInterview
      session={session}
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
  ) : (
    <div className="h-full flex flex-col">
      <InterviewStartScreen onStart={() => setHasStarted(true)} />
    </div>
  );
}
