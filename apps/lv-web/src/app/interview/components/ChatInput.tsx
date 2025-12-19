import { Button } from '@/components/ui/button';
import { Textarea } from '@repo/ui/components/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  onKeyDown,
}: ChatInputProps) {
  return (
    <div className="flex gap-2 items-start">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type your response..."
        className="resize-none rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        rows={1}
        disabled={isLoading}
      />
      <Button
        data-testid="sendButton"
        onClick={onSend}
        disabled={isLoading || !value.trim()}
        className="rounded-lg text-white px-6 h-10 border-0"
        style={{
          background:
            isLoading || !value.trim()
              ? `linear-gradient(90deg, rgb(156 163 175) 0%, rgb(107 114 128) 100%)`
              : `linear-gradient(90deg, var(--gradient-primary-start) 0%, var(--gradient-primary-end) 100%)`,
          transition: 'all 0.2s ease-in-out',
        }}
        onMouseEnter={(e) => {
          if (!isLoading && value.trim()) {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = `0 4px 12px var(--shadow-blue-hover)`;
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading && value.trim()) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <Send className="h-4 w-4 mr-2" />
        Send
      </Button>
    </div>
  );
}
