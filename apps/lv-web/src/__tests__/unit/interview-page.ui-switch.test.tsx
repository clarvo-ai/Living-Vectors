import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/interview/page';
import { getTTS, startConversation } from '../../lib/services/pyapi';
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
jest.mock('../../app/interview/components/VoiceRecorder', () => ({
  VoiceRecorder: ({ onRecordingComplete }: { onRecordingComplete: (blob: Blob) => void }) => (
    <button
      data-testid="mock-voice-recorder"
      onClick={() => {
        onRecordingComplete(new Blob(['test audio'], { type: 'audio/webm' }));
      }}
    >
      Mock Record
    </button>
  ),
}));

// Setup voice mocks (Audio, URL, scrollIntoView)
setupVoiceMocks();

const mockUseSession = useSession as jest.Mock;

describe('InterviewPage - UI Switch', () => {
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

  it('should update UI when switching modes', async () => {
    (getTTS as jest.Mock).mockResolvedValue(new Blob(['audio'], { type: 'audio/mp3' }));
    render(<InterviewPage />);

    // Initially chat input visible
    expect(screen.getByPlaceholderText(/Type your response.../i)).toBeInTheDocument();

    // Switch to Voice Only
    const voiceOnlySwitch = screen.getByLabelText(/Voice Only/i);
    fireEvent.click(voiceOnlySwitch);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Type your response.../i)).not.toBeInTheDocument();
      expect(screen.getByText("Let's talk!")).toBeInTheDocument();
    });

    // Back to Chat
    fireEvent.click(voiceOnlySwitch);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your response.../i)).toBeInTheDocument();
      expect(screen.queryByText("Let's talk!")).not.toBeInTheDocument();
    });
  });
});
