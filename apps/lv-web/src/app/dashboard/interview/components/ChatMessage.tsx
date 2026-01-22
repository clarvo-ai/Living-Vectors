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
