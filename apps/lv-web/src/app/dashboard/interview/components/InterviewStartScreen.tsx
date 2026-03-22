import { Bot, Phone } from 'lucide-react';

interface InterviewStartScreenProps {
  onStart?: () => void;
}

export function InterviewStartScreen({ onStart }: InterviewStartScreenProps) {
  return (
    <div
      data-testid="voice-only-mode"
      className="flex-1 w-full flex flex-col items-center justify-center space-y-8"
    >
      <div className="text-center space-y-2">
        <p className="text-2xl font-semibold text-gray-700">Welcome to the interview!</p>
        <p className="text-sm text-gray-500">Press the button to start</p>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Please complete the interview in one go. The call will end at 17 minutes. You can take a
          new call anytime.
        </p>
      </div>
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
      </div>
    </div>
  );
}
