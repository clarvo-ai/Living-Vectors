'use client';

import { useChat, useTranscriptions } from '@livekit/components-react';
import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { Message } from './ChatMessage';
import { MessagesList } from './MessagesList';
import { VoiceOnlyMode } from './VoiceOnlyMode';

interface ChatContentProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  voiceOnlyMode: boolean;
  setVoiceOnlyMode: (value: boolean) => void;
  voiceMode: boolean;
  setVoiceMode: (value: boolean) => void;
  showEndInterviewDialog: boolean;
  setShowEndInterviewDialog: (value: boolean) => void;
  onEndInterview: () => void;
  hasStarted: boolean;
  setHasStarted: (value: boolean) => void;
}

export function ChatContent({
  input,
  setInput,
  isLoading,
  voiceOnlyMode,
  setVoiceOnlyMode,
  voiceMode,
  setVoiceMode,
  hasStarted,
  setHasStarted,
}: ChatContentProps) {
  // Messages state - stored in sessionStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('interview-messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (e) {
          console.error('Failed to parse saved messages', e);
        }
      }
    }
    return [];
  });

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('interview-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // LiveKit hooks - now inside RoomContext
  const { chatMessages, send } = useChat();
  const transcriptions = useTranscriptions();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);

  // Sync LiveKit and stored messages with display
  useEffect(() => {
    const allMessages: Message[] = [];

    // First add stored messages
    messages.forEach((msg) => {
      allMessages.push(msg);
    });

    // Add LiveKit chat messages
    chatMessages.forEach((msg) => {
      const role: 'user' | 'ai' = msg.from?.isLocal ? 'user' : 'ai';

      allMessages.push({
        id: msg.id || `chat-${msg.timestamp}`,
        role,
        content: msg.message,
        timestamp: new Date(msg.timestamp || Date.now()),
      });
    });

    // Add transcriptions
    transcriptions.forEach((transcription) => {
      const isAgent = transcription.participantInfo?.identity?.toLowerCase().includes('agent');
      allMessages.push({
        id: `transcription-${transcription.participantInfo?.identity}-${Date.now()}-${Math.random()}`,
        role: isAgent ? 'ai' : 'user',
        content: transcription.text,
        timestamp: new Date(),
      });
    });

    // Sort by timestamp
    allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setDisplayMessages(allMessages);
  }, [messages, chatMessages, transcriptions]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const handleSendWithLiveKit = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Always add message to local state first
    setMessages([...messages, userMessage]);
    const inputValue = input;
    setInput('');

    // Try to send via LiveKit, but don't fail if it doesn't work
    try {
      if (send) {
        await send(inputValue).catch((error) => {
          console.warn('LiveKit send failed, message saved locally:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to send message to LiveKit, message saved locally:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendWithLiveKit();
    }
  };

  return (
    <>
      {!voiceOnlyMode && (
        <div
          className="flex items-center px-6 py-2 border-b"
          style={{ backgroundColor: 'var(--bg-light)', borderColor: 'var(--border-gray)' }}
        >
          <ChatHeader
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            voiceOnlyMode={voiceOnlyMode}
            setVoiceOnlyMode={setVoiceOnlyMode}
          />
        </div>
      )}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-light)' }}
      >
        {voiceOnlyMode ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-6 relative">
            <VoiceOnlyMode
              messageCount={messages.length}
              hasStarted={hasStarted}
              onStart={() => {
                setHasStarted(true);
              }}
              onGoToChat={() => setVoiceOnlyMode(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 pt-6">
              <MessagesList
                messages={displayMessages}
                isLoading={isLoading}
                messagesEndRef={messagesEndRef}
              />
            </div>
            <div
              className="flex gap-2 items-end pb-4 border-t pt-4 px-6"
              style={{ borderColor: 'var(--border-gray)' }}
            >
              <div className="flex-1">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={handleSendWithLiveKit}
                  isLoading={isLoading}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
