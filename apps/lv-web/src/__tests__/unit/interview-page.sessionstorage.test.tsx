import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import InterviewPage from '../../app/dashboard/interview/page';
import { getGeminiResponse, getSTT, getTTS, startConversation } from '../../lib/services/pyapi';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation');
jest.mock('../../lib/services/pyapi');
jest.mock('../../app/dashboard/interview/components/VoiceRecorder', () => ({
  VoiceRecorder: ({ onStop }: { onStop: (blob: Blob) => void }) => (
    <div data-testid="mock-voice-recorder">
      <button
        data-testid="mock-stop-recording"
        onClick={() => {
          const mockBlob = new Blob(['audio'], { type: 'audio/wav' });
          onStop(mockBlob);
        }}
      >
        Stop
      </button>
    </div>
  ),
}));

describe('Interview Page Mode Switching', () => {
  const mockSession = {
    user: { email: 'test@example.com', name: 'Test User' },
    expires: '2025-01-01',
  };

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    Element.prototype.scrollIntoView = jest.fn();
    (useSession as jest.Mock).mockReturnValue({ data: mockSession, status: 'authenticated' });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (startConversation as jest.Mock).mockResolvedValue({
      conversationId: 'conv-123',
      firstResponse: 'Hello! How can I help?',
    });
    (getTTS as jest.Mock).mockResolvedValue(new ArrayBuffer(100));
    (getSTT as jest.Mock).mockResolvedValue({ text: 'Test transcription' });
    (getGeminiResponse as jest.Mock).mockResolvedValue('AI response');
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should switch from voice-only to chat mode', async () => {
    render(<InterviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/Or Chat/)).toBeInTheDocument();
    });

    const chatButton = screen.getByText(/Or Chat/);
    fireEvent.click(chatButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your response...')).toBeInTheDocument();
    });
  });

  it('should display chat header with voice toggles in chat mode', async () => {
    render(<InterviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/Or Chat/)).toBeInTheDocument();
    });

    const chatButton = screen.getByText(/Or Chat/);
    fireEvent.click(chatButton);

    await waitFor(() => {
      expect(screen.getByText('AI Career Discussion')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });
});
