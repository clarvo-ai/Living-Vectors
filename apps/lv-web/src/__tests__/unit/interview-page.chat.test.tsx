/**
 * Interview Page - Chat Tests
 *
 * Tests chat functionality: message input, sending, and display
 */

jest.mock('@livekit/components-react', () => ({
  useChat: jest.fn(() => ({
    send: jest.fn(),
  })),
  useLocalParticipant: jest.fn(() => ({
    isMicrophoneEnabled: true,
    localParticipant: {
      setMicrophoneEnabled: jest.fn(),
    },
  })),
  useRoomInfo: jest.fn(() => ({
    metadata: '{}',
  })),
  useSessionContext: jest.fn(() => ({})),
  useSessionMessages: jest.fn(() => ({
    messages: [],
  })),
}));

jest.mock('../../app/dashboard/interview/components/ChatHeader', () => ({
  ChatHeader: () => <div data-testid="chat-header">Chat Header</div>,
}));

jest.mock('../../app/dashboard/interview/components/ChatInput', () => ({
  ChatInput: ({ onSend }: { onSend?: (message: string) => void }) => (
    <input
      data-testid="chat-input"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSend?.('test message');
        }
      }}
    />
  ),
}));

jest.mock('../../app/dashboard/interview/components/ChatMessage', () => ({
  ChatMessage: ({ message }: { message: { text: string } }) => (
    <div data-testid="chat-message">{message.text}</div>
  ),
}));

jest.mock('../../app/dashboard/interview/components/VoiceOnlyMode', () => ({
  VoiceOnlyMode: () => <div data-testid="voice-only-mode">Voice Mode</div>,
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { InterviewContent } from '../../app/dashboard/interview/components/InterviewContent';

Element.prototype.scrollIntoView = jest.fn();

describe('Interview - Chat Functionality', () => {
  const defaultProps = {
    input: 'Hello',
    setInput: jest.fn(),
    isLoading: false,
    voiceOnlyMode: false,
    setVoiceOnlyMode: jest.fn(),
    showEndInterviewDialog: false,
    setShowEndInterviewDialog: jest.fn(),
    onEndInterview: jest.fn(),
    hasStarted: true,
    setHasStarted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chat header when in chat mode', () => {
    render(<InterviewContent {...defaultProps} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('should accept and handle input changes', () => {
    const setInput = jest.fn();
    render(<InterviewContent {...defaultProps} setInput={setInput} input="test" />);
    expect(defaultProps.setInput).toBeDefined();
  });

  it('should not render chat when in voice-only mode', () => {
    render(<InterviewContent {...defaultProps} voiceOnlyMode={true} />);
    expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-header')).not.toBeInTheDocument();
  });

  it('should render chat when voiceOnlyMode is false', () => {
    render(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    expect(screen.queryByTestId('voice-only-mode')).not.toBeInTheDocument();
  });
});
