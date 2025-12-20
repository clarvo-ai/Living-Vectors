import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/interview/page';
import { getGeminiResponse, getSTT, getTTS } from '../../lib/services/pyapi';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock services
jest.mock('../../lib/services/pyapi', () => ({
  getGeminiResponse: jest.fn(),
  getSTT: jest.fn(),
  getTTS: jest.fn(),
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

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const mockUseSession = useSession as jest.Mock;

describe('InterviewPage - Voice Errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'test-user-id', name: 'Test User' } },
      status: 'authenticated',
    });
  });

  it('should handle STT error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSTT as jest.Mock).mockRejectedValue(new Error('STT Failed'));

    render(<InterviewPage />);

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
      status: 200,
    });
    (getTTS as jest.Mock).mockRejectedValue(new Error('TTS Failed'));

    render(<InterviewPage />);

    // Enable Voice Mode
    const voiceModeSwitch = screen.getByLabelText(/AI Voice/i);
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
