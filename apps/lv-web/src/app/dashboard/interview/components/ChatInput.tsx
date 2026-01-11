import { Button } from '@/components/ui/button';
import { Textarea } from '@repo/ui/components/textarea';
import { Send } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({ value, onChange, onSend, isLoading, onKeyDown }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [value]);
  return (
    <div className="relative flex gap-2 items-end">
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          id="interview-response"
          name="response"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your response..."
          className="resize-none rounded-3xl border border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          rows={1}
          style={{
            height: '48px',
            minHeight: '48px',
            backgroundColor: 'var(--bg-white)',
            paddingTop: '12px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            paddingRight: '56px',
            overflowY: 'auto',
          }}
          disabled={isLoading}
        />
        <Button
          data-testid="sendButton"
          onClick={onSend}
          disabled={isLoading || !value.trim()}
          className="absolute right-2 bottom-2 rounded-full w-8 h-8 p-0 flex items-center justify-center border-0"
          style={{
            background:
              isLoading || !value.trim()
                ? `linear-gradient(90deg, var(--bg-disabled) 0%, var(--bg-disabled-dark) 100%)`
                : `var(--gradient-primary)`,
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && value.trim()) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = `0 8px 16px var(--gradient-primary-shadow)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && value.trim()) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
