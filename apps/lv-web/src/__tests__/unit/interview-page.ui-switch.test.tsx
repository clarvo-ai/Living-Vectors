/**
 * Interview Page - UI Mode Switching Tests
 *
 * Tests switching between chat and voice-only modes
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

describe('Interview - UI Mode Switching', () => {
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
    sessionStorage.clear();
  });

  it('should start in chat mode by default', () => {
    render(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('should switch to voice-only mode', () => {
    const setVoiceOnlyMode = jest.fn();
    render(
      <InterviewContent
        {...defaultProps}
        voiceOnlyMode={true}
        setVoiceOnlyMode={setVoiceOnlyMode}
      />
    );
    expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();
  });

  it('should toggle between modes', () => {
    const { rerender } = render(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();

    rerender(<InterviewContent {...defaultProps} voiceOnlyMode={true} />);
    expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();

    rerender(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('should persist mode state to sessionStorage', () => {
    render(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);

    sessionStorage.setItem('interview-voiceOnlyMode', 'false');
    expect(sessionStorage.getItem('interview-voiceOnlyMode')).toBe('false');

    sessionStorage.setItem('interview-voiceOnlyMode', 'true');
    expect(sessionStorage.getItem('interview-voiceOnlyMode')).toBe('true');
  });

  it('should render chat when voiceOnlyMode is false', () => {
    render(<InterviewContent {...defaultProps} voiceOnlyMode={false} />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    expect(screen.queryByTestId('voice-only-mode')).not.toBeInTheDocument();
  });

  it('should render voice mode when voiceOnlyMode is true', () => {
    render(<InterviewContent {...defaultProps} voiceOnlyMode={true} />);
    expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-header')).not.toBeInTheDocument();
  });
});
