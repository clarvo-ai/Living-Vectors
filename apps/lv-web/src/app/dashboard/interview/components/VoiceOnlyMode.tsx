import { useRoomContext, VoiceAssistantControlBar } from '@livekit/components-react';
import '@livekit/components-styles';
import { Bot, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TranscriptionDisplay } from './TranscriptionDisplay';

interface VoiceOnlyModeProps {
  onStart?: () => void;
  onGoToChat?: () => void;
  messageCount?: number;
  hasStarted: boolean;
}

export function VoiceOnlyMode({
  onStart,
  onGoToChat,
  messageCount = 0,
  hasStarted,
}: VoiceOnlyModeProps) {
  const room = useRoomContext();
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize LiveKit token for voice when component mounts
  useEffect(() => {
    const testToken = process.env.NEXT_PUBLIC_LIVEKIT_TEST_TOKEN;
    if (testToken) {
      setToken(testToken);
    } else {
      setError('LiveKit test token not configured');
    }
  }, []);

  // Connect/disconnect room
  useEffect(() => {
    if (!hasStarted || !token || !room) return;

    const connect = async () => {
      try {
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || '', token);
      } catch (e) {
        console.error('Failed to connect to room:', e);
        setError('Failed to connect to voice agent');
      }
    };

    connect();

    return () => {
      // Room disconnect is handled at page level
    };
  }, [hasStarted, token]);

  // If room is active, show LiveKit voice room (audio only)
  if (hasStarted && token && room) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="flex items-center justify-center animate-pulse">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--border-white)',
                border: '5px solid var(--border-light-gray)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--bg-light-purple)',
                  border: '3px solid var(--border-purple)',
                }}
              >
                <Bot className="h-10 w-10" style={{ color: 'var(--icon-purple)' }} />
              </div>
            </div>
          </div>
          <p className="text-xl font-medium text-gray-600">Connected to voice agent</p>
          <div className="mt-8">
            <VoiceAssistantControlBar />
          </div>
          <button
            onClick={onGoToChat}
            className="px-4 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mt-4"
          >
            Chat instead
          </button>
          <TranscriptionDisplay />
        </div>
      </div>
    );
  }

  // Original UI when not in room
  return (
    <div
      data-testid="voice-only-mode"
      className="flex-1 w-full flex flex-col items-center justify-center space-y-8"
    >
      {!hasStarted && messageCount === 1 && (
        <div className="text-center space-y-2">
          <p className="text-2xl font-semibold text-gray-700">Welcome to the interview!</p>
          <p className="text-sm text-gray-500">Press the button to start</p>
        </div>
      )}
      <div className="flex items-center justify-center">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'var(--border-white)',
            border: '5px solid var(--border-light-gray)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'var(--bg-light-purple)',
              border: '3px solid var(--border-purple)',
            }}
          >
            <Bot className="h-10 w-10" style={{ color: 'var(--icon-purple)' }} />
          </div>
        </div>
      </div>
      <div className="text-xl font-medium text-gray-600">
        {!hasStarted ? (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={onGoToChat}
              className="px-4 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Chat instead
            </button>
            <button
              onClick={onStart}
              className="px-6 py-2 rounded-lg text-white font-normal transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              style={{
                background: 'var(--gradient-primary)',
              }}
            >
              <Phone className="w-4 h-4" />
              Start Call
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span>Let&apos;s talk!</span>
            <button
              onClick={onGoToChat}
              className="px-4 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Chat instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
