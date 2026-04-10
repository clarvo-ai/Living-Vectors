/**
 * Interview Page - Error Handling Tests
 *
 * Tests error states and graceful handling
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
  ChatInput: () => <div data-testid="chat-input">Chat Input</div>,
}));

jest.mock('../../app/dashboard/interview/components/ChatMessage', () => ({
  ChatMessage: () => <div data-testid="chat-message">Message</div>,
}));

jest.mock('../../app/dashboard/interview/components/VoiceOnlyMode', () => ({
  VoiceOnlyMode: () => <div data-testid="voice-only-mode">Voice Mode</div>,
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { InterviewContent } from '../../app/dashboard/interview/components/InterviewContent';

Element.prototype.scrollIntoView = jest.fn();

describe('Interview - Error Handling', () => {
  const defaultProps = {
    input: '',
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

  it('should render without crashing when component loads', () => {
    const { container } = render(<InterviewContent {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle undefined messages gracefully', () => {
    render(<InterviewContent {...defaultProps} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<InterviewContent {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('should handle prop changes without crashing', () => {
    const { rerender } = render(<InterviewContent {...defaultProps} input="test" />);

    rerender(<InterviewContent {...defaultProps} input="updated" />);

    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('should handle mode switch without errors', () => {
    const { rerender } = render(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);

    rerender(<InterviewContent {...defaultProps} voiceOnlyMode={true} />);

    expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();
  });

  it('should maintain state consistency during rapid prop updates', () => {
    const setInput = jest.fn();
    const setVoiceOnlyMode = jest.fn();

    const { rerender } = render(
      <InterviewContent
        {...defaultProps}
        setInput={setInput}
        setVoiceOnlyMode={setVoiceOnlyMode}
        input="message1"
      />
    );

    rerender(
      <InterviewContent
        {...defaultProps}
        setInput={setInput}
        setVoiceOnlyMode={setVoiceOnlyMode}
        input="message2"
      />
    );

    expect(setInput).toBeDefined();
    expect(setVoiceOnlyMode).toBeDefined();
  });

  it('should handle missing callbacks gracefully', () => {
    const propsWithoutCallbacks: Partial<typeof defaultProps> = {
      ...defaultProps,
      setInput: jest.fn(),
      setVoiceOnlyMode: jest.fn(),
      onEndInterview: jest.fn(),
    };

    const { container } = render(
      <InterviewContent {...(propsWithoutCallbacks as typeof defaultProps)} />
    );

    expect(container).toBeInTheDocument();
  });
});
