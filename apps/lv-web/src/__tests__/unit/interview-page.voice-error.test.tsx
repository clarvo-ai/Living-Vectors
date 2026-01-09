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

// Setup voice mocks
setupVoiceMocks();

const mockUseSession = useSession as jest.Mock;

describe('InterviewPage - Voice Errors', () => {
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

  it('should handle STT error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSTT as jest.Mock).mockRejectedValue(new Error('STT Failed'));

    render(<InterviewPage />);

    // Wait for voice-only mode to be ready
    await waitFor(() => {
      expect(screen.getByTestId('mock-voice-recorder')).toBeInTheDocument();
    });

    const recordButton = screen.getByTestId('mock-voice-recorder');
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('STT error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle TTS error in voice mode', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getGeminiResponse as jest.Mock).mockResolvedValue({
      message: 'Hello Human',
      nextQuestionId: { goalIndex: 0, questionIndex: 1 },
      completed: false,
      status: 200,
    });
    (getTTS as jest.Mock).mockRejectedValue(new Error('TTS Failed'));

    render(<InterviewPage />);

    // Switch to chat mode first
    await waitFor(() => {
      expect(screen.getByText('Or Chat')).toBeInTheDocument();
    });

    const chatButton = screen.getByText(/Or Chat/i);
    fireEvent.click(chatButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your response.../i)).toBeInTheDocument();
    });

    // Enable AI Voice
    const voiceModeSwitch = screen.getByTitle(/Enable AI Voice/i);
    fireEvent.click(voiceModeSwitch);

    // Send message
    const input = screen.getByPlaceholderText(/Type your response.../i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    const sendButton = screen.getByTestId('sendButton');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('TTS error', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
