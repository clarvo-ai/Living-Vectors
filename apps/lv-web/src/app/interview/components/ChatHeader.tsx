import { BorderRotate } from '@/components/ui/animated-gradient-border';
import { Bot } from 'lucide-react';

interface ChatHeaderProps {
  currentGoal: string;
}

export function ChatHeader({ currentGoal }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, var(--gradient-primary-start) 0%, var(--gradient-primary-end) 100%)`,
          }}
        >
          <Bot className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">AI interview</h2>
      </div>
      <BorderRotate
        animationSpeed={5}
        animationMode="auto-rotate"
        gradientColors={{
          primary: 'var(--border-gradient-primary)',
          secondary: 'var(--border-gradient-secondary)',
          accent: 'var(--border-gradient-accent)',
        }}
        backgroundColor="var(--border-bg)"
        className="text-sm p-2.5"
      >
        <span
          style={{
            background: `linear-gradient(90deg, var(--gradient-primary-start) 0%, var(--gradient-primary-end) 100%)`,
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <b>Current goal:</b> {currentGoal}
        </span>
      </BorderRotate>
    </div>
  );
}
