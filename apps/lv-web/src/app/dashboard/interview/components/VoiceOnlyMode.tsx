import {
  BarVisualizer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Bot, MessageSquare, Mic, MicOff } from 'lucide-react';
import { useEffect } from 'react';

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface VoiceOnlyModeProps {
  onGoToChat?: () => void;
  hasStarted: boolean;
}

export function VoiceOnlyMode({ onGoToChat, hasStarted }: VoiceOnlyModeProps) {
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

  // Ensure AI is never muted in voice-only mode
  useEffect(() => {
    if (!hasStarted) return;

    remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        const audioElement = publication.audioTrack?.attachedElements[0] as HTMLAudioElement;
        if (audioElement && audioElement.muted) {
          audioElement.muted = false;
        }
      });
    });
  }, [remoteParticipants, hasStarted]);

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
            barCount={7}
            state={agentState}
            options={{ minHeight: 10, maxHeight: 150 }}
            track={agentAudioTrack}
            className={cn('flex h-16 items-center justify-center gap-0.5')}
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
          <div
            className="flex gap-2 p-3 rounded-lg bg-white bg-opacity-80 shadow-md border border-gray-200"
            style={{
              backdropFilter: 'blur(10px)',
            }}
          >
            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              style={{
                background: `linear-gradient(white, white) padding-box, var(--gradient-primary) border-box`,
                border: '2px solid transparent',
                boxShadow: '0px 2px 8px -2px var(--gradient-message-shadow)',
              }}
              aria-label={!isMicrophoneEnabled ? 'Unmute' : 'Mute'}
            >
              {!isMicrophoneEnabled ? (
                <MicOff className="w-5 h-5 text-gray-600" />
              ) : (
                <Mic className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={onGoToChat}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              style={{
                background: `linear-gradient(white, white) padding-box, var(--gradient-primary) border-box`,
                border: '2px solid transparent',
                boxShadow: '0px 2px 8px -2px var(--gradient-message-shadow)',
              }}
              aria-label="Switch to chat"
            >
              <MessageSquare className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
