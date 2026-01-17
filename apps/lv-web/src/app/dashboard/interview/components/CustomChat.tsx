'use client';

import { Button } from '@/components/ui/button';
import { useChat, useRoomContext } from '@livekit/components-react';
import { Textarea } from '@repo/ui/components/textarea';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function CustomChat() {
  const room = useRoomContext();
  const { chatMessages, send } = useChat();
  const [input, setInput] = useState('');
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync LiveKit chat messages with display
  useEffect(() => {
    const converted = chatMessages.map((msg) => {
      const role: 'user' | 'ai' = msg.from?.isLocal ? 'user' : 'ai';
      return {
        id: msg.id || Date.now().toString(),
        role,
        content: msg.message,
        timestamp: new Date(msg.timestamp || Date.now()),
      };
    });
    setDisplayMessages(converted);
  }, [chatMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  // Handle textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim() || !room) return;

    try {
      await send(input);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0 pr-2 px-6 pt-6">
        {displayMessages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex gap-2 items-end pb-4 border-t pt-4 px-6"
        style={{ borderColor: 'var(--border-gray)' }}
      >
        <div className="flex-1">
          <div className="relative flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                id="interview-response"
                name="response"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
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
                disabled={false}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || !room}
                className="absolute right-2 bottom-2 rounded-full w-8 h-8 p-0 flex items-center justify-center border-0"
                style={{
                  background:
                    !input.trim() || !room
                      ? `linear-gradient(90deg, var(--bg-disabled) 0%, var(--bg-disabled-dark) 100%)`
                      : `var(--gradient-primary)`,
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && room) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = `0 8px 16px var(--gradient-primary-shadow)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (input.trim() && room) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`px-4 py-2 ${isUser ? 'text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
          style={
            isUser
              ? {
                  background: `var(--gradient-primary)`,
                  boxShadow: `0px 5px 15px -4px var(--gradient-message-shadow)`,
                  borderRadius: '18px 18px 8px 18px',
                }
              : {
                  borderRadius: '18px 18px 18px 8px',
                }
          }
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
