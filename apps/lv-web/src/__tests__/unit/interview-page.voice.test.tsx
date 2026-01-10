import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/dashboard/interview/page';
import { getGeminiResponse, getSTT, getTTS, startConversation } from '../../lib/services/pyapi';
import { setupVoiceMocks } from '../mocks/voice-mocks';

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
jest.mock('../../app/dashboard/interview/components/VoiceRecorder', () => ({
  VoiceRecorder: ({
    onRecordingComplete,
    onRecordingStateChange,
  }: {
    onRecordingComplete: (blob: Blob) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
  }) => {
    return (
      <button
        data-testid="mock-voice-recorder"
        onClick={() => {
          onRecordingStateChange?.(true);
          setTimeout(() => {
            onRecordingStateChange?.(false);
            onRecordingComplete(new Blob(['test audio'], { type: 'audio/webm' }));
          }, 0);
        }}
      >
        Mock Record
      </button>
    );
  },
}));

// Setup voice mocks
setupVoiceMocks();

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
        nextQuestionId: { goalIndex: 0, questionIndex: 1 },
        completed: false,
        status: 200,
      };
    });
    (getTTS as jest.Mock).mockResolvedValue(new Blob(['audio'], { type: 'audio/mp3' }));

    render(<InterviewPage />);

    // Already in Voice Only mode (default)
    await waitFor(() => {
      expect(screen.getByTestId('voice-only-mode')).toBeInTheDocument();
    });

    // Start the voice conversation
    await waitFor(() => {
      expect(screen.getByText(/Start Call/)).toBeInTheDocument();
    });
    const startButton = screen.getByText(/Start Call/);
    fireEvent.click(startButton);

    // Wait for voice recorder to appear
    await waitFor(() => {
      expect(screen.getByTestId('mock-voice-recorder')).toBeInTheDocument();
    });

    const recordButton = screen.getByTestId('mock-voice-recorder');
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Waiting for AI...')).toBeInTheDocument();
    });

    await waitFor(() => expect(getSTT).toHaveBeenCalled());
    await waitFor(() =>
      expect(getGeminiResponse).toHaveBeenCalledWith('test-user-id', 'Hello AI', 0, 0)
    );
    await waitFor(() => expect(getTTS).toHaveBeenCalledWith('Hello Human'));

    await waitFor(() => {
      expect(screen.getByText('AI is speaking...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-voice-recorder')).toBeInTheDocument();
    });
  });
});
