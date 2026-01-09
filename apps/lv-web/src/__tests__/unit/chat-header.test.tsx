import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatHeader } from '../../app/dashboard/interview/components/ChatHeader';

describe('ChatHeader Component', () => {
  const defaultProps = {
    voiceMode: true,
    setVoiceMode: jest.fn(),
    voiceOnlyMode: false,
    setVoiceOnlyMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header title and online status', () => {
    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByText('AI Career Discussion')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should call setVoiceMode when voice toggle is clicked', () => {
    const setVoiceMode = jest.fn();
    const { container } = render(
      <ChatHeader {...defaultProps} voiceMode={true} setVoiceMode={setVoiceMode} />
    );

    const voiceButton = container.querySelector('button[title="Disable AI Voice"]');
    if (voiceButton) {
      fireEvent.click(voiceButton);
    }

    expect(setVoiceMode).toHaveBeenCalledWith(false);
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

  it('should show correct voice icons based on voiceMode state', () => {
    const { container, rerender } = render(<ChatHeader {...defaultProps} voiceMode={true} />);

    expect(container.querySelector('button[title="Disable AI Voice"]')).toBeInTheDocument();

    rerender(<ChatHeader {...defaultProps} voiceMode={false} />);

    expect(container.querySelector('button[title="Enable AI Voice"]')).toBeInTheDocument();
  });

  it('should show correct mode icons based on voiceOnlyMode state', () => {
    const { container, rerender } = render(<ChatHeader {...defaultProps} voiceOnlyMode={false} />);

    expect(container.querySelector('button[title="Switch to Voice"]')).toBeInTheDocument();

    rerender(<ChatHeader {...defaultProps} voiceOnlyMode={true} />);

    expect(container.querySelector('button[title="Switch to Chat"]')).toBeInTheDocument();
  });

  it('should have correct titles for toggles', () => {
    const { container } = render(
      <ChatHeader {...defaultProps} voiceMode={true} voiceOnlyMode={false} />
    );

    expect(container.querySelector('button[title="Disable AI Voice"]')).toBeInTheDocument();
    expect(container.querySelector('button[title="Switch to Voice"]')).toBeInTheDocument();
  });
});
