import { Loader2, Mic, Volume2 } from 'lucide-react';

interface VoiceOnlyModeProps {
  isAiSpeaking: boolean;
  isUserRecording: boolean;
  isProcessing: boolean;
}

export function VoiceOnlyMode({ isAiSpeaking, isUserRecording, isProcessing }: VoiceOnlyModeProps) {
  return (
    <div
      data-testid="voice-only-mode"
      className="flex-1 w-full flex flex-col items-center justify-center space-y-8"
    >
      <div
        className={`rounded-full p-8 transition-all duration-500 ${
          isAiSpeaking
            ? 'scale-110'
            : isUserRecording
              ? 'scale-110'
              : isProcessing
                ? 'bg-yellow-100 scale-110'
                : 'bg-gray-100'
        }`}
        style={
          isAiSpeaking || isUserRecording
            ? {
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }
            : {}
        }
      >
        {isAiSpeaking ? (
          <Volume2 className="h-24 w-24 text-white animate-pulse" />
        ) : isUserRecording ? (
          <Mic className="h-24 w-24 text-white animate-pulse" />
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
