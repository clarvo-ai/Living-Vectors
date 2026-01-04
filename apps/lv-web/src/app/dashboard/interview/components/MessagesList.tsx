import { RefObject } from 'react';
import { ChatMessage, Message } from './ChatMessage';

interface MessagesListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function MessagesList({ messages, isLoading, messagesEndRef }: MessagesListProps) {
  return (
    <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0 pr-2">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex justify-start" data-testid="chat-loading-indicator">
          <div className="bg-gray-200 rounded-lg px-4 py-2">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '0.4s' }}
              ></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
