import {
  BarVisualizer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Bot, MessageSquare, Mic, MicOff, Phone } from 'lucide-react';

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface VoiceOnlyModeProps {
  onStart?: () => void;
  onGoToChat?: () => void;
  hasStarted: boolean;
}

export function VoiceOnlyMode({ onStart, onGoToChat, hasStarted }: VoiceOnlyModeProps) {
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { state: agentState } = useVoiceAssistant();

  // Get agent audio track
  const agentAudioTrack = useTracks([{ source: Track.Source.Microphone, withPlaceholder: false }], {
    onlySubscribed: true,
    updateOnlyOn: [],
  }).find((track) => track.participant.identity !== localParticipant?.identity);

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  // If session is active, show LiveKit voice interface
  if (hasStarted) {
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
          <BarVisualizer
            barCount={5}
            state={agentState}
            options={{ minHeight: 6, maxHeight: 60 }}
            track={agentAudioTrack}
            className={cn('flex h-16 items-center justify-center gap-1')}
          >
            <span
              className={cn(
                'min-h-1 w-1.5 rounded-full transition-all duration-250 ease-linear',
                'data-[lk-muted=true]:bg-gray-300 data-[lk-muted=true]:opacity-30',
                'data-[lk-highlighted=true]:opacity-100 opacity-20'
              )}
              style={{
                background: 'var(--gradient-primary)',
              }}
            />
          </BarVisualizer>
          <p className="text-xl font-medium text-gray-600">
            Connected to a room with{' '}
            {remoteParticipants[0] ? remoteParticipants[0]?.identity : 'no agent'}
          </p>
          <div className="mt-8 flex gap-4">
            <button
              onClick={toggleMute}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              style={{
                background: `linear-gradient(white, white) padding-box, var(--gradient-primary) border-box`,
                border: '3px solid transparent',
                boxShadow: '0px 5px 15px -4px var(--gradient-message-shadow)',
              }}
              aria-label={!isMicrophoneEnabled ? 'Unmute' : 'Mute'}
            >
              {!isMicrophoneEnabled ? (
                <MicOff className="w-8 h-8 text-gray-600" />
              ) : (
                <Mic className="w-8 h-8 text-gray-600" />
              )}
            </button>
            <button
              onClick={onGoToChat}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              style={{
                background: `linear-gradient(white, white) padding-box, var(--gradient-primary) border-box`,
                border: '3px solid transparent',
                boxShadow: '0px 5px 15px -4px var(--gradient-message-shadow)',
              }}
              aria-label="Switch to chat"
            >
              <MessageSquare className="w-8 h-8 text-gray-600" />
            </button>
          </div>
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
      {!hasStarted && (
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
