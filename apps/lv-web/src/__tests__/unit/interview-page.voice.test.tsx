import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/interview/page';
import { getGeminiResponse, getSTT, getTTS, startConversation } from '../../lib/services/pyapi';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock services
jest.mock('../../lib/services/pyapi', () => ({
  getGeminiResponse: jest.fn(),
  getSTT: jest.fn(),
  getTTS: jest.fn(),
  startConversation: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock VoiceRecorder component
interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingStateChange: (isRecording: boolean) => void;
}

jest.mock('../../app/interview/components/VoiceRecorder', () => ({
  VoiceRecorder: ({ onRecordingComplete, onRecordingStateChange }: VoiceRecorderProps) => (
    <button
      data-testid="mock-voice-recorder"
      onClick={() => {
        if (onRecordingStateChange) onRecordingStateChange(true);
        setTimeout(() => {
          if (onRecordingStateChange) onRecordingStateChange(false);
          onRecordingComplete(new Blob(['test audio'], { type: 'audio/webm' }));
        }, 0);
      }}
    >
      Mock Record
    </button>
  ),
}));

global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Audio class
class MockAudio {
  src: string;
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  onpause: (() => void) | null = null;

  constructor(src: string) {
    this.src = src;
  }

  play() {
    if (this.onplay) this.onplay();
    // Simulate audio ending after a short delay
    setTimeout(() => {
      if (this.onended) this.onended();
    }, 100);
  }

  pause() {
    if (this.onpause) this.onpause();
  }
}

global.Audio = MockAudio as typeof Audio;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const mockUseSession = useSession as jest.Mock;

describe('InterviewPage - Voice Only Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'test-user-id', name: 'Test User' } },
      status: 'authenticated',
    });
    (startConversation as jest.Mock).mockResolvedValue({
      message: 'Welcome! Let me ask you some questions.',
      goalCategory: 'career',
      questionId: { goalIndex: 0, questionIndex: 0 },
    });
  });

  it('should handle voice interaction flow', async () => {
    (getSTT as jest.Mock).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { transcript: 'Hello AI' };
    });

    (getGeminiResponse as jest.Mock).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        message: 'Hello Human',
        status: 200,
      };
    });
    (getTTS as jest.Mock).mockResolvedValue(new Blob(['audio'], { type: 'audio/mp3' }));

    render(<InterviewPage />);

    // Switch to Voice Only
    const voiceOnlySwitch = screen.getByLabelText(/Voice Only/i);
    fireEvent.click(voiceOnlySwitch);

    // Wait for mode switch
    await waitFor(() => {
      expect(screen.getByText("Let's talk!")).toBeInTheDocument();
    });

    const recordButton = screen.getByTestId('mock-voice-recorder');
    fireEvent.click(recordButton);

    // Recorder gone
    await waitFor(() => {
      expect(screen.queryByTestId('mock-voice-recorder')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Waiting for AI...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getSTT).toHaveBeenCalled();
      expect(getGeminiResponse).toHaveBeenCalledWith('test-user-id', 'Hello AI', 0, 0);
      expect(getTTS).toHaveBeenCalledWith('Hello Human');
    });

    await waitFor(() => {
      expect(screen.getByText('AI is speaking...')).toBeInTheDocument();
    });
  });
});
