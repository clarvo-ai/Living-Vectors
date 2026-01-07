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
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`px-4 py-2 ${isUser ? 'text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
          style={
            isUser
              ? {
                  background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`,
                  boxShadow: `0px 5px 15px -4px rgba(139, 92, 246, 0.3)`,
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
