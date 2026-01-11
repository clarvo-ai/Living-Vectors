import { Bot, Loader2, Mic, Phone } from 'lucide-react';

interface VoiceOnlyModeProps {
  isAiSpeaking: boolean;
  isUserRecording: boolean;
  isProcessing: boolean;
  onStart?: () => void;
  onGoToChat?: () => void;
  messageCount?: number;
  hasStarted: boolean;
}

export function VoiceOnlyMode({
  isAiSpeaking,
  isUserRecording,
  isProcessing,
  onStart,
  onGoToChat,
  messageCount = 0,
  hasStarted,
}: VoiceOnlyModeProps) {
  return (
    <div
      data-testid="voice-only-mode"
      className="flex-1 w-full flex flex-col items-center justify-center space-y-8"
    >
      {!isAiSpeaking && !isUserRecording && !isProcessing && !hasStarted && messageCount === 1 && (
        <div className="text-center space-y-2">
          <p className="text-2xl font-semibold text-gray-700">Welcome to the interview!</p>
          <p className="text-sm text-gray-500">Press the button to start</p>
        </div>
      )}
      {isAiSpeaking ? (
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
      ) : isUserRecording ? (
        <Mic className="h-24 w-24 text-red-500 animate-pulse" />
      ) : isProcessing ? (
        <Loader2 className="h-24 w-24 text-blue-500 animate-spin" />
      ) : (
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
      )}
      <div className="text-xl font-medium text-gray-600">
        {isAiSpeaking ? (
          <div className="flex flex-col items-center gap-2">
            <span>AI is speaking...</span>
            <button
              onClick={onGoToChat}
              className="px-4 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Chat instead
            </button>
          </div>
        ) : isUserRecording ? (
          'Listening...'
        ) : isProcessing ? (
          'Waiting for AI...'
        ) : !hasStarted && messageCount === 1 ? (
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
