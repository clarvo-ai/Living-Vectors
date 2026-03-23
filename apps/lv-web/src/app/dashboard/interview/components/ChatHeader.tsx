import { useRemoteParticipants, useVoiceAssistant } from '@livekit/components-react';
import { Bot, LogOut, MessageSquare, Phone, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

const TASK_LABELS: Record<string, string> = {
  opening: 'Opening conversation & goals',
  logistics: 'Logistics, timing & motivation',
  industry: 'Target industries & roles',
  location: 'Location, remote & relocation',
  background: 'Experience, strengths & skills',
  culture: 'Team, culture & work style',
  value_vision: 'Compensation, priorities & vision',
  alignment: 'Summary, alignment & next steps',
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

interface ChatHeaderProps {
  voiceOnlyMode: boolean;
  setVoiceOnlyMode: (value: boolean) => void;
}

export function ChatHeader({ voiceOnlyMode, setVoiceOnlyMode }: ChatHeaderProps) {
  const remoteParticipants = useRemoteParticipants();
  const { agentAttributes } = useVoiceAssistant();
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const currentTaskId = (agentAttributes?.current_task as string | undefined) || 'opening';
  const currentTaskLabel = currentTaskId ? TASK_LABELS[currentTaskId] ?? currentTaskId : TASK_LABELS.opening;
  const currentTaskIndex = TASK_ORDER.indexOf(currentTaskId as keyof typeof TASK_LABELS);
  const totalTasks = TASK_ORDER.length;

  // Load muted state from sessionStorage on mount
  useEffect(() => {
    const savedMutedState = sessionStorage.getItem('isAgentMuted');
    if (savedMutedState !== null) {
      const muted = JSON.parse(savedMutedState);
      setIsAgentMuted(muted);
    }
  }, []);

  // Apply muted state to audio elements when remote participants load
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        const audioElement = publication.audioTrack?.attachedElements[0] as HTMLAudioElement;
        if (audioElement) {
          audioElement.muted = isAgentMuted;
        }
      });
    });
  }, [remoteParticipants, isAgentMuted]);

  const toggleAgentVoice = () => {
    const newMutedState = !isAgentMuted;
    setIsAgentMuted(newMutedState);

    // Save to sessionStorage
    sessionStorage.setItem('isAgentMuted', JSON.stringify(newMutedState));

    // Mute/unmute all remote participants' audio by setting track enabled on HTML element
    remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        const audioElement = publication.audioTrack?.attachedElements[0] as HTMLAudioElement;
        if (audioElement) {
          audioElement.muted = newMutedState;
        }
      });
    });
  };

  return (
    <div className="flex items-center w-full justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'var(--bg-light-purple)',
              border: '2px solid var(--border-purple)',
            }}
          >
            <Bot className="h-5 w-5" style={{ color: 'var(--icon-purple)' }} />
          </div>
          <div className="flex flex-col gap-0 justify-center">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              AI Career Discussion
            </h2>
            <p className="text-xs text-gray-500 leading-tight">Online</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={toggleAgentVoice}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            title={!isAgentMuted ? 'Disable AI Voice' : 'Enable AI Voice'}
          >
            {!isAgentMuted ? (
              <Volume2 className="h-4 w-4 text-gray-700" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-700" />
            )}
          </button>
          <button
            onClick={() => {
              setVoiceOnlyMode(!voiceOnlyMode);
            }}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            title={voiceOnlyMode ? 'Switch to Chat' : 'Switch to Voice'}
          >
            {voiceOnlyMode ? (
              <MessageSquare className="h-4 w-4 text-gray-700" />
            ) : (
              <Phone className="h-4 w-4 text-gray-700" />
            )}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
            title="End interview"
          >
            <LogOut className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {currentTaskLabel && currentTaskIndex !== -1 && (
          <span
            className="px-3 py-1 rounded-full text-[11px] font-medium text-gray-700 border border-purple-200 bg-gradient-to-r from-purple-50/80 to-pink-50/80 shadow-sm whitespace-nowrap"
            aria-label={`Current section: ${currentTaskLabel}`}
          >
            <span className="mr-1 text-[0.65rem] uppercase tracking-wide text-purple-500">Current theme:</span>
            <span>{currentTaskLabel}</span>
            <span className="ml-2 text-[0.65rem] text-gray-500">
              {currentTaskIndex + 1}/{totalTasks}
            </span>
          </span>
        )}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
          style={{ backgroundColor: 'var(--btn-success)' }}
        ></div>
      </div>
    </div>
  );
}
