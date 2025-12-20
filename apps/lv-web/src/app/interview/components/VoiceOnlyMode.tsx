import { Loader2, Mic, Volume2 } from 'lucide-react';

interface VoiceOnlyModeProps {
  isAiSpeaking: boolean;
  isUserRecording: boolean;
  isProcessing: boolean;
}

export function VoiceOnlyMode({ isAiSpeaking, isUserRecording, isProcessing }: VoiceOnlyModeProps) {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center space-y-8">
      <div
        className={`rounded-full p-8 transition-all duration-500 ${
          isAiSpeaking
            ? 'bg-blue-100 scale-110'
            : isUserRecording
              ? 'bg-red-100 scale-110'
              : isProcessing
                ? 'bg-yellow-100 scale-110'
                : 'bg-gray-100'
        }`}
      >
        {isAiSpeaking ? (
          <Volume2 className="h-24 w-24 text-blue-500 animate-pulse" />
        ) : isUserRecording ? (
          <Mic className="h-24 w-24 text-red-500 animate-pulse" />
        ) : isProcessing ? (
          <Loader2 className="h-24 w-24 text-yellow-500 animate-spin" />
        ) : (
          <div className="h-24 w-24 flex items-center justify-center text-gray-400">
            <Mic className="h-12 w-12 opacity-50" />
          </div>
        )}
      </div>
      <div className="text-xl font-medium text-gray-600">
        {isAiSpeaking
          ? 'AI is speaking...'
          : isUserRecording
            ? 'Listening...'
            : isProcessing
              ? 'Waiting for AI...'
              : "Let's talk!"}
      </div>
    </div>
  );
}
