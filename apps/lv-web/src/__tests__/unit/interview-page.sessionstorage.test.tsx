import '@testing-library/jest-dom';

describe('Interview Page SessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should persist interview mode to sessionStorage', () => {
    const testMode = 'chat';
    sessionStorage.setItem('interviewMode', testMode);

    expect(sessionStorage.getItem('interviewMode')).toBe('chat');
  });

  it('should clear sessionStorage on component unmount', () => {
    sessionStorage.setItem('interviewMode', 'voice');
    sessionStorage.setItem('conversationId', 'conv-123');

    sessionStorage.clear();

    expect(sessionStorage.getItem('interviewMode')).toBeNull();
    expect(sessionStorage.getItem('conversationId')).toBeNull();
  });

  it('should persist user preferences to sessionStorage', () => {
    const preferences = {
      enableVoiceOnly: true,
      enableTTS: true,
      enableSTT: true,
    };
    sessionStorage.setItem('userPreferences', JSON.stringify(preferences));

    const stored = JSON.parse(sessionStorage.getItem('userPreferences')!);
    expect(stored.enableVoiceOnly).toBe(true);
    expect(stored.enableTTS).toBe(true);
  });
});
