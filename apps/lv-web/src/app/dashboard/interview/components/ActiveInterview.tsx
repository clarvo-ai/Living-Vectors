'use client';

import {
  RoomAudioRenderer,
  SessionProvider,
  StartAudio,
  useSession as useLiveKitSession,
} from '@livekit/components-react';
import { Session } from 'next-auth';
import { useEffect, useMemo } from 'react';
import { InterviewContent } from './InterviewContent';

interface ActiveInterviewProps {
  session: Session | null;
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  voiceOnlyMode: boolean;
  setVoiceOnlyMode: (mode: boolean) => void;
  showEndInterviewDialog: boolean;
  setShowEndInterviewDialog: (show: boolean) => void;
  onEndInterview: () => void;
  hasStarted: boolean;
  setHasStarted: (started: boolean) => void;
}

export function ActiveInterview({
  session,
  input,
  setInput,
  isLoading,
  voiceOnlyMode,
  setVoiceOnlyMode,
  showEndInterviewDialog,
  setShowEndInterviewDialog,
  onEndInterview,
  hasStarted,
  setHasStarted,
}: ActiveInterviewProps) {
  const tokenSource = useMemo(() => {
    return {
      fetch: async () => {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `interview-${session?.user?.id}`,
            participantName: session?.user?.email || 'user',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get LiveKit token');
        }

        const data = await response.json();
        return {
          accessToken: data.token,
          serverUrl: data.url,
          participantToken: data.token,
        };
      },
    };
  }, [session?.user?.id, session?.user?.email]);

  const liveKitSession = useLiveKitSession(tokenSource);

  useEffect(() => {
    if (liveKitSession && liveKitSession.connectionState !== 'connected') {
      liveKitSession.start();
    }
  }, []);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (liveKitSession?.room) {
        liveKitSession.end();
      }
    };
  }, []); // Empty dependency array = only runs on mount/unmount

  return (
    <SessionProvider session={liveKitSession}>
      <div className="h-full flex flex-col">
        <InterviewContent
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          voiceOnlyMode={voiceOnlyMode}
          setVoiceOnlyMode={setVoiceOnlyMode}
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
