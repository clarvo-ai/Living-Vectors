import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VoiceRecorder } from '../../app/interview/components/VoiceRecorder';

// Mock MediaRecorder
const mockStart = jest.fn();
const mockStop = jest.fn();
let mockOndataavailable: ((event: BlobEvent) => void) | null = null;
let mockOnstop: (() => void) | null = null;

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn().mockImplementation(() => {
    const recorder = {
      start: mockStart,
      stop: () => {
        mockStop();
        mockOndataavailable = recorder.ondataavailable;
        mockOnstop = recorder.onstop;
      },
      ondataavailable: jest.fn(),
      onstop: jest.fn(),
      onerror: jest.fn(),
      state: '',
    };
    return recorder;
  }),
});

Object.defineProperty(MediaRecorder, 'isTypeSupported', {
  writable: true,
  value: () => true,
});

const mockGetUserMedia = jest.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe('VoiceRecorder', () => {
  const mockOnRecordingComplete = jest.fn();
  const mockOnRecordingStateChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOndataavailable = null;
    mockOnstop = null;
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
  });

  it('should handle recording flow correctly', async () => {
    render(
      <VoiceRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onRecordingStateChange={mockOnRecordingStateChange}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true }));
    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    await waitFor(() => expect(mockOnRecordingStateChange).toHaveBeenCalledWith(true));

    // Stop recording
    fireEvent.click(button);

    const mockData = new Blob(['test'], { type: 'audio/webm' });
    if (mockOndataavailable) {
      mockOndataavailable({ data: mockData } as BlobEvent);
    }
    if (mockOnstop) {
      mockOnstop();
    }

    await waitFor(() => expect(mockStop).toHaveBeenCalled());
    await waitFor(() => expect(mockOnRecordingStateChange).toHaveBeenCalledWith(false));
    await waitFor(() => expect(mockOnRecordingComplete).toHaveBeenCalled());
  });

  it('should handle microphone access error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

    render(
      <VoiceRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onRecordingStateChange={mockOnRecordingStateChange}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error accessing microphone:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should stop recording when disabled', async () => {
    const { rerender } = render(
      <VoiceRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onRecordingStateChange={mockOnRecordingStateChange}
        disabled={false}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnRecordingStateChange).toHaveBeenCalledWith(true);
    });

    // Disable component
    rerender(
      <VoiceRecorder
        onRecordingComplete={mockOnRecordingComplete}
        onRecordingStateChange={mockOnRecordingStateChange}
        disabled={true}
      />
    );

    await waitFor(() => expect(mockStop).toHaveBeenCalled());
    await waitFor(() => expect(mockOnRecordingStateChange).toHaveBeenCalledWith(false));
  });
});
