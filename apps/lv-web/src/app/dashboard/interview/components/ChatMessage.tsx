import { Bot, User } from 'lucide-react';
export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      key={message.id}
      className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
            <Bot className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`rounded-lg px-4 py-2 ${isUser ? 'text-white' : 'bg-gray-100 text-gray-900'}`}
          style={
            isUser
              ? {
                  background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`,
                  boxShadow: `0px 5px 15px -4px rgba(139, 92, 246, 0.3)`,
                }
              : undefined
          }
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`,
            }}
          >
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
