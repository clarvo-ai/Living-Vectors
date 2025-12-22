// Mocks for voice tests

// Mock Audio class for testing audio playback
export class MockAudio {
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  onpause: (() => void) | null = null;

  play() {
    if (this.onplay) this.onplay();
    // Simulate audio ending after a short delay
    setTimeout(() => {
      if (this.onended) this.onended();
    }, 0);
  }

  pause() {
    if (this.onpause) this.onpause();
  }
}

// Setup function to apply all voice-related global mocks
export const setupVoiceMocks = () => {
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
  global.URL.revokeObjectURL = jest.fn();
  global.Audio = MockAudio as unknown as typeof Audio;
  Element.prototype.scrollIntoView = jest.fn();
};
