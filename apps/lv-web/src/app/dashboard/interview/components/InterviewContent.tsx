'use client';

import {
  useChat,
  useLocalParticipant,
  useSessionContext,
  useSessionMessages,
} from '@livekit/components-react';
import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage, type Message } from './ChatMessage';
import { VoiceOnlyMode } from './VoiceOnlyMode';

interface InterviewContentProps {
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

export function InterviewContent({
  input,
  setInput,
  isLoading,
  voiceOnlyMode,
  setVoiceOnlyMode,
  voiceMode,
  setVoiceMode,
  hasStarted,
  setHasStarted,
}: InterviewContentProps) {
  // LiveKit session hooks
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { send } = useChat();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to sessionStorage whenever they change

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendWithLiveKit = async () => {
    if (!input.trim()) return;

    const inputValue = input;
    setInput('');

    // Send via chat
    if (send) {
      try {
        await send(inputValue);
      } catch (error) {
        console.warn('Failed to send message:', error);
      }
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
              messageCount={messages?.length ?? 0}
              hasStarted={hasStarted}
              onStart={() => {
                setHasStarted(true);
              }}
              onGoToChat={() => setVoiceOnlyMode(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 pt-6 space-y-4">
              {messages.map((receivedMessage) => {
                const { id, timestamp, from, message } = receivedMessage;
                const messageOrigin = from?.isLocal ? 'local' : 'remote';

                const displayMessage: Message = {
                  id: id || `msg-${timestamp}`,
                  role: messageOrigin === 'local' ? 'user' : 'ai',
                  content: message,
                  timestamp: new Date(timestamp),
                };

                return <ChatMessage key={displayMessage.id} message={displayMessage} />;
              })}
              <div ref={messagesEndRef} />
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
              <button
                onClick={toggleMute}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-110 mb-0.5"
                style={{
                  background: `linear-gradient(white, white) padding-box, var(--gradient-primary) border-box`,
                  border: '3px solid transparent',
                  boxShadow: '0px 5px 15px -4px var(--gradient-message-shadow)',
                }}
                aria-label={!isMicrophoneEnabled ? 'Unmute' : 'Mute'}
              >
                {!isMicrophoneEnabled ? (
                  <MicOff className="w-5 h-5 text-gray-600" />
                ) : (
                  <Mic className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
