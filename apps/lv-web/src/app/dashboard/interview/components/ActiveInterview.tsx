'use client';

import { RoomAudioRenderer, SessionProvider, StartAudio, useSession as useLiveKitSession } from '@livekit/components-react';
import { Session } from 'next-auth';
import { useEffect, useMemo, useRef, useState } from 'react';
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
}: ActiveInterviewProps) {
  const [micPermissionStatus, setMicPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  // Unique room name per session mount — timestamp suffix guarantees a fresh room
  // on every interview start, so LiveKit always dispatches a new agent without
  // waiting for the previous room's delete_room_on_close to propagate on Cloud.
  const roomName = useRef(`interview-${session?.user?.id ?? 'unknown'}-${Date.now()}`).current;

  // Request and verify microphone access before joining the LiveKit room / agent session
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPermissionStatus('denied');
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // We only need to trigger the permission prompt and verify access;
        // stop tracks immediately to avoid holding the stream ourselves.
        stream.getTracks().forEach((track) => track.stop());
        if (!cancelled) {
          setMicPermissionStatus('granted');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMicPermissionStatus('denied');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tokenSource = useMemo(() => {
    return {
      fetch: async () => {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: roomName,
            participantName: session?.user?.id || 'userid',
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
  }, [session?.user?.id, roomName]);

  const liveKitSession = useLiveKitSession(tokenSource);

  useEffect(() => {
    if (!liveKitSession || micPermissionStatus !== 'granted') {
      return;
    }

    if (liveKitSession.connectionState !== 'connected') {
      liveKitSession.start();
    }
  }, [liveKitSession, micPermissionStatus]);

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
        />
      </div>
      <StartAudio label="Click to enable audio" />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}
