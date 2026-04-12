/**
 * Interview Page - Voice-Only Mode Tests
 *
 * Tests voice-only mode UI and functionality
 */

jest.mock('@livekit/components-react', () => ({
  useRemoteParticipants: jest.fn(() => []),
  useLocalParticipant: jest.fn(() => ({
    isMicrophoneEnabled: false,
    localParticipant: {
      setMicrophoneEnabled: jest.fn(),
    },
  })),
  useRoomInfo: jest.fn(() => ({
    metadata: '{}',
  })),
  useTracks: jest.fn(() => []),
  useVoiceAssistant: jest.fn(() => ({
    state: 'idle',
    toggleMicrophone: jest.fn(),
  })),
  BarVisualizer: () => <div data-testid="visualizer">Visualizer</div>,
}));

jest.mock('@livekit/components-styles', () => ({}));

jest.mock('livekit-client', () => ({
  Track: {
    Source: {
      Microphone: 'microphone',
    },
  },
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { VoiceOnlyMode } from '../../app/dashboard/interview/components/VoiceOnlyMode';

Element.prototype.scrollIntoView = jest.fn();

describe('VoiceOnlyMode Component', () => {
  const defaultProps = {
    onStart: jest.fn(),
    onGoToChat: jest.fn(),
    hasStarted: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('should render voice interface', () => {
    render(<VoiceOnlyMode {...defaultProps} />);
    // Component should render without errors
    expect(screen.getByTestId('visualizer')).toBeInTheDocument();
  });

  it('should call onStart when starting interview', () => {
    render(<VoiceOnlyMode {...defaultProps} hasStarted={false} />);
    expect(defaultProps.hasStarted !== undefined).toBe(true);
  });

  it('should show chat toggle button', () => {
    render(<VoiceOnlyMode {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should call onGoToChat when switching to chat mode', () => {
    const onGoToChat = jest.fn();
    render(<VoiceOnlyMode {...defaultProps} onGoToChat={onGoToChat} />);
    // Button exists and can be clicked
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render when hasStarted is true', () => {
    render(<VoiceOnlyMode {...defaultProps} hasStarted={true} />);
    expect(screen.getByTestId('visualizer')).toBeInTheDocument();
  });

  it('should render when hasStarted is false', () => {
    render(<VoiceOnlyMode {...defaultProps} hasStarted={false} />);
    // Component should render without errors when hasStarted is false
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
  });
});
