export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ message }: { message: Message }) {
  return (
    <div
      key={message.id}
      className={`flex relative ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] rounded-t-lg px-4 py-2 ${
          message.role === 'user'
            ? 'bg-blue-600 text-white rounded-br-none rounded-bl-lg'
            : 'bg-gray-200 text-gray-900 rounded-bl-none rounded-br-lg'
        }`}
        style={{
          backgroundColor: message.role === 'user' ? '#2563eb' : undefined,
          color: message.role === 'user' ? '#ffffff' : undefined,
        }}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={`text-xs mt-1 ${
            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
      {/* Small triangle "tail" under the message bubble */}
      <svg
        width="28"
        height="14"
        viewBox="0 0 28 14"
        className={`absolute -bottom-3 ${
          message.role === 'user'
            ? 'right-0 -scale-x-100'
            : 'left-0'
        }`}
        style={{ zIndex: 5 }}
      >
        <polygon
          points="0,0 28,0 0,14"
          fill={message.role === 'user' ? '#2563eb' : '#e5e7eb'}
        />
      </svg>
    </div>
  );
}