import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatHeader } from '../../app/dashboard/interview/components/ChatHeader';
import { useVoiceAssistant } from '@livekit/components-react';

// Mock LiveKit
jest.mock('@livekit/components-react', () => ({
  useRemoteParticipants: jest.fn(() => []),
  useVoiceAssistant: jest.fn(() => ({
    agentAttributes: {},
  })),
}));

describe('ChatHeader Component', () => {
  const mockUseVoiceAssistant = useVoiceAssistant as jest.Mock;
  const defaultProps = {
    voiceOnlyMode: false,
    setVoiceOnlyMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockUseVoiceAssistant.mockReturnValue({
      agentAttributes: {},
    });
  });

  it('should render the header title and online status', () => {
    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByText('AI Career Discussion')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should call setVoiceOnlyMode when mode toggle is clicked', () => {
    const setVoiceOnlyMode = jest.fn();
    const { container } = render(
      <ChatHeader {...defaultProps} voiceOnlyMode={false} setVoiceOnlyMode={setVoiceOnlyMode} />
    );

    const modeButton = container.querySelector('button[title="Switch to Voice"]');
    if (modeButton) {
      fireEvent.click(modeButton);
    }

    expect(setVoiceOnlyMode).toHaveBeenCalledWith(true);
  });

  it('should show correct mode icons based on voiceOnlyMode state', () => {
    const { container, rerender } = render(<ChatHeader {...defaultProps} voiceOnlyMode={false} />);

    expect(container.querySelector('button[title="Switch to Voice"]')).toBeInTheDocument();

    rerender(<ChatHeader {...defaultProps} voiceOnlyMode={true} />);

    expect(container.querySelector('button[title="Switch to Chat"]')).toBeInTheDocument();
  });

  it('should have mute button for AI voice control', () => {
    const { container } = render(<ChatHeader {...defaultProps} />);

    expect(container.querySelector('button[title="Disable AI Voice"]')).toBeInTheDocument();
  });

  it('should toggle mute state when mute button is clicked', () => {
    const { container } = render(<ChatHeader {...defaultProps} />);

    const muteButton = container.querySelector('button[title="Disable AI Voice"]');
    if (muteButton) {
      fireEvent.click(muteButton);
      // After click, should show unmute button
      expect(container.querySelector('button[title="Enable AI Voice"]')).toBeInTheDocument();
    }
  });

  it('should render default current theme and progress', () => {
    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByLabelText('Current section: Opening conversation & goals')).toBeInTheDocument();
    expect(screen.getByText('Current theme:')).toBeInTheDocument();
    expect(screen.getByText('1/8')).toBeInTheDocument();
  });

  it('should render mapped theme label and progress for current task', () => {
    mockUseVoiceAssistant.mockReturnValue({
      agentAttributes: {
        current_task: 'industry',
      },
    });

    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByLabelText('Current section: Target industries & roles')).toBeInTheDocument();
    expect(screen.getByText('3/8')).toBeInTheDocument();
  });

  it('should not render progress pill for unknown task IDs', () => {
    mockUseVoiceAssistant.mockReturnValue({
      agentAttributes: {
        current_task: 'unknown_task',
      },
    });

    render(<ChatHeader {...defaultProps} />);

    expect(screen.queryByText('Current theme:')).not.toBeInTheDocument();
    expect(screen.queryByText('unknown_task')).not.toBeInTheDocument();
  });
});
