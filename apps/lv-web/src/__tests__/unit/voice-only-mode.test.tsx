import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { VoiceOnlyMode } from '../../app/dashboard/interview/components/VoiceOnlyMode';

describe('VoiceOnlyMode Component', () => {
  const defaultProps = {
    isAiSpeaking: false,
    isUserRecording: false,
    isProcessing: false,
    messageCount: 1,
    hasStarted: false,
  };

  it('should render "Start Call" button when not started and messageCount is 1', () => {
    render(<VoiceOnlyMode {...defaultProps} />);

    expect(screen.getByText(/Start Call/)).toBeInTheDocument();
    expect(screen.getByText(/Chat instead/)).toBeInTheDocument();
  });

  it('should call onStart when "Start Call" button is clicked', () => {
    const onStart = jest.fn();
    const onGoToChat = jest.fn();
    render(<VoiceOnlyMode {...defaultProps} onStart={onStart} onGoToChat={onGoToChat} />);

    const startButton = screen.getByText(/Start Call/);
    fireEvent.click(startButton);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('should call onGoToChat when "Chat instead" button is clicked', () => {
    const onStart = jest.fn();
    const onGoToChat = jest.fn();
    render(<VoiceOnlyMode {...defaultProps} onStart={onStart} onGoToChat={onGoToChat} />);

    const chatButton = screen.getByText(/Chat instead/);
    fireEvent.click(chatButton);

    expect(onGoToChat).toHaveBeenCalledTimes(1);
  });

  it('should show "AI is speaking..." when isAiSpeaking is true', () => {
    render(
      <VoiceOnlyMode {...defaultProps} isAiSpeaking={true} messageCount={2} hasStarted={true} />
    );

    expect(screen.getByText('AI is speaking...')).toBeInTheDocument();
  });

  it('should show pulsing bot icon when AI is speaking', () => {
    const { container } = render(
      <VoiceOnlyMode {...defaultProps} isAiSpeaking={true} messageCount={2} hasStarted={true} />
    );

    const pulsingElement = container.querySelector('.animate-pulse');
    expect(pulsingElement).toBeInTheDocument();
  });

  it('should show "Listening..." when isUserRecording is true', () => {
    render(
      <VoiceOnlyMode {...defaultProps} isUserRecording={true} messageCount={2} hasStarted={true} />
    );

    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('should show microphone icon when user is recording', () => {
    const { container } = render(
      <VoiceOnlyMode {...defaultProps} isUserRecording={true} messageCount={2} hasStarted={true} />
    );

    // Check for mic icon with animate-pulse class
    const micIcon = container.querySelector('.lucide-mic');
    expect(micIcon).toBeInTheDocument();
  });

  it('should show "Waiting for AI..." when isProcessing is true', () => {
    render(
      <VoiceOnlyMode {...defaultProps} isProcessing={true} messageCount={2} hasStarted={true} />
    );

    expect(screen.getByText('Waiting for AI...')).toBeInTheDocument();
  });

  it('should show loader icon when processing', () => {
    const { container } = render(
      <VoiceOnlyMode {...defaultProps} isProcessing={true} messageCount={2} hasStarted={true} />
    );

    const loaderIcon = container.querySelector('.lucide-loader-circle');
    expect(loaderIcon).toBeInTheDocument();
    expect(loaderIcon).toHaveClass('animate-spin');
  });

  it('should show static bot icon and quoted text when conversation started but idle', () => {
    render(<VoiceOnlyMode {...defaultProps} messageCount={2} hasStarted={true} />);

    expect(screen.getByText(/Let's talk!/)).toBeInTheDocument();
    expect(screen.getByText(/Chat instead/)).toBeInTheDocument();
  });

  it('should always render voice-only-mode testid', () => {
    render(<VoiceOnlyMode {...defaultProps} />);

    expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();
  });

  it('should prioritize states correctly: speaking > recording > processing > ready', () => {
    // Speaking takes priority
    const { rerender } = render(
      <VoiceOnlyMode
        {...defaultProps}
        isAiSpeaking={true}
        isUserRecording={true}
        isProcessing={true}
        messageCount={2}
        hasStarted={true}
      />
    );
    expect(screen.getByText('AI is speaking...')).toBeInTheDocument();

    // Recording is second priority
    rerender(
      <VoiceOnlyMode
        {...defaultProps}
        isAiSpeaking={false}
        isUserRecording={true}
        isProcessing={true}
        messageCount={2}
        hasStarted={true}
      />
    );
    expect(screen.getByText('Listening...')).toBeInTheDocument();

    // Processing is third priority
    rerender(
      <VoiceOnlyMode
        {...defaultProps}
        isAiSpeaking={false}
        isUserRecording={false}
        isProcessing={true}
        messageCount={2}
        hasStarted={true}
      />
    );
    expect(screen.getByText('Waiting for AI...')).toBeInTheDocument();
  });

  it('should render "Chat instead" button in all non-started states', () => {
    render(<VoiceOnlyMode {...defaultProps} />);
    expect(screen.getByText(/Chat instead/)).toBeInTheDocument();
  });

  it('should render "Chat instead" button after conversation has started', () => {
    render(<VoiceOnlyMode {...defaultProps} messageCount={2} hasStarted={true} />);
    expect(screen.getByText(/Chat instead/)).toBeInTheDocument();
  });
});
