import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatHeader } from '../../app/dashboard/interview/components/ChatHeader';

// Mock LiveKit
jest.mock('@livekit/components-react', () => ({
  useRemoteParticipants: jest.fn(() => []),
}));

describe('ChatHeader Component', () => {
  const defaultProps = {
    voiceOnlyMode: false,
    setVoiceOnlyMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
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
});
