import { Bot, Phone } from 'lucide-react';

interface InterviewStartScreenProps {
  onStart?: () => void;
  completedTasksCount?: number;
  totalTasks?: number;
}

export function InterviewStartScreen({
  onStart,
  completedTasksCount = 0,
  totalTasks = 8,
}: InterviewStartScreenProps) {
  const allCompleted = completedTasksCount === totalTasks && totalTasks > 0;
  const partiallyCompleted = completedTasksCount > 0 && !allCompleted;

  let title = 'Welcome to the interview!';
  let subtitle = 'Press the button to start';
  let buttonText = 'Start Call';
  let durationText = 'This will take 10-15 minutes';

  if (allCompleted) {
    title = 'Interview completed';
    subtitle = 'You finished every section. Open a call only if you want to add or change something.';
    buttonText = 'Start Call';
    durationText = 'Optional follow-up with the assistant';
  } else if (partiallyCompleted) {
    title = 'Continue your interview?';
    subtitle = `Your progress is saved (${totalTasks - completedTasksCount} sections left). Start the call only if you want to pick up where you left off.`;
    buttonText = 'Continue Call';
    durationText = `${totalTasks - completedTasksCount} sections remaining`;
  }

  return (
    <div
      data-testid="voice-only-mode"
      className="flex-1 w-full flex flex-col items-center justify-center space-y-8"
    >
      <div className="text-center space-y-2">
        <p className="text-2xl font-semibold text-gray-700">{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
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
            {buttonText}
          </button>
          <p className="text-xs text-gray-500">{durationText}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center max-w-md px-6">
        Finished sections are saved on your account. Signing out clears interview settings on this browser
        only. Leaving a call ends that session—you can start a new one anytime.
      </p>
    </div>
  );
}
