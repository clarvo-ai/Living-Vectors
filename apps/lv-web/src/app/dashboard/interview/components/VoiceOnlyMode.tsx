import {
  BarVisualizer,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomInfo,
  useTracks,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Bot, MessageSquare, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useEffect } from 'react';

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

const TASK_LABELS: Record<string, string> = {
  loading: 'Loading',
  opening: 'Opening conversation & goals',
  logistics: 'Logistics, timing & motivation',
  industry: 'Target industries & roles',
  location: 'Location, remote & relocation',
  background: 'Experience, strengths & skills',
  culture: 'Team, culture & work style',
  value_vision: 'Compensation, priorities & vision',
  alignment: 'Summary, alignment & next steps',
  'post-interview': 'Post Interview',
};

const TASK_ORDER: Array<keyof typeof TASK_LABELS> = [
  'opening',
  'logistics',
  'industry',
  'location',
  'background',
  'culture',
  'value_vision',
  'alignment',
];

interface VoiceOnlyModeProps {
  onGoToChat?: () => void;
  hasStarted: boolean;
}

export function VoiceOnlyMode({ onGoToChat, hasStarted }: VoiceOnlyModeProps) {
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { state: agentState } = useVoiceAssistant();
  const roomInfo = useRoomInfo();

  let currentTaskId = 'loading';
  if (roomInfo?.metadata) {
    try {
      const metadata = JSON.parse(roomInfo.metadata);
      currentTaskId = metadata.current_task || 'loading';
    } catch {
      currentTaskId = 'loading';
    }
  }

  const currentTaskLabel = currentTaskId
    ? (TASK_LABELS[currentTaskId] ?? currentTaskId)
    : TASK_LABELS.opening;
  const currentTaskIndex = TASK_ORDER.indexOf(currentTaskId as keyof typeof TASK_LABELS);
  const totalTasks = TASK_ORDER.length;

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
          <div className="flex flex-col items-center gap-6">
            {currentTaskLabel &&
              (currentTaskIndex !== -1 ? (
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-700 border border-purple-200 bg-gradient-to-r from-purple-50/80 to-pink-50/80 shadow-sm"
                  aria-label={`Current section: ${currentTaskLabel}`}
                >
                  <span className="mr-1 text-[0.7rem] uppercase tracking-wide text-purple-500">
                    Current theme:
                  </span>
                  <span>{currentTaskLabel}</span>
                  <span className="ml-2 text-[0.7rem] text-gray-500">
                    {currentTaskIndex + 1}/{totalTasks}
                  </span>
                </span>
              ) : (
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-700 border border-purple-200 bg-gradient-to-r from-purple-50/80 to-pink-50/80 shadow-sm"
                  aria-label={`Current section: ${currentTaskLabel}`}
                >
                  <span>{currentTaskLabel}</span>
                </span>
              ))}
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
          </div>
          <div className="w-40 h-20 flex items-center justify-center overflow-visible">
            <BarVisualizer
              barCount={7}
              state={agentState}
              options={{ minHeight: 40, maxHeight: 150 }}
              track={agentAudioTrack}
              className={cn('flex h-16 items-center justify-center gap-0')}
            >
              <span
                className={cn(
                  'min-h-1 w-1.5 rounded-full transition-all duration-250 ease-linear -mx-1',
                  'data-[lk-muted=true]:bg-gray-300 data-[lk-muted=true]:opacity-30',
                  'data-[lk-highlighted=true]:opacity-100 opacity-20'
                )}
                style={{
                  background: 'var(--gradient-primary)',
                }}
              />
            </BarVisualizer>
          </div>
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
            <button
              onClick={() => window.location.reload()}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              style={{
                background: '#ef4444',
                border: 'none',
                boxShadow: '0px 2px 8px -2px rgba(239, 68, 68, 0.5)',
              }}
              aria-label="End interview"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
