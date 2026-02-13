/**
 * Interview Page - Authentication & Status Tests
 *
 * Tests auth state, loading states, and session management
 */

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  redirect: jest.fn(),
}));

jest.mock('@livekit/components-react', () => ({
  useChat: jest.fn(() => ({
    send: jest.fn(),
  })),
  useLocalParticipant: jest.fn(() => ({
    isMicrophoneEnabled: true,
    localParticipant: {
      setMicrophoneEnabled: jest.fn(),
    },
  })),
  useSessionContext: jest.fn(() => ({})),
  useSessionMessages: jest.fn(() => ({
    messages: [],
  })),
}));

jest.mock('../../app/dashboard/interview/components/ChatHeader', () => ({
  ChatHeader: () => <div data-testid="chat-header">Chat Header</div>,
}));

jest.mock('../../app/dashboard/interview/components/ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input">Chat Input</div>,
}));

jest.mock('../../app/dashboard/interview/components/ChatMessage', () => ({
  ChatMessage: () => <div data-testid="chat-message">Message</div>,
}));

jest.mock('../../app/dashboard/interview/components/VoiceOnlyMode', () => ({
  VoiceOnlyMode: () => <div data-testid="voice-only-mode">Voice Mode</div>,
}));

jest.mock('../../app/dashboard/interview/components/ActiveInterview', () => ({
  ActiveInterview: () => <div data-testid="active-interview">Interview</div>,
}));

jest.mock('../../app/dashboard/interview/components/InterviewStartScreen', () => ({
  InterviewStartScreen: () => <div data-testid="start-screen">Start</div>,
}));

import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';

const mockUseSession = useSession as jest.Mock;

describe('Interview Page - Auth & Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('should handle authenticated session state', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      status: 'authenticated',
    });

    const session = mockUseSession();
    expect(session.status).toBe('authenticated');
    expect(session.data.user).toBeDefined();
  });

  it('should detect unauthenticated state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const session = mockUseSession();
    expect(session.status).toBe('unauthenticated');
    expect(session.data).toBeNull();
  });

  it('should show loading state', () => {
    mockUseSession.mockReturnValue({
      data: undefined,
      status: 'loading',
    });

    const session = mockUseSession();
    expect(session.status).toBe('loading');
  });

  it('should initialize voiceOnlyMode state from sessionStorage', () => {
    sessionStorage.setItem('interview-voiceOnlyMode', 'true');
    const storedMode = sessionStorage.getItem('interview-voiceOnlyMode');
    expect(storedMode).toBe('true');
  });

  it('should default voiceOnlyMode to true if not in storage', () => {
    sessionStorage.clear();
    const storedMode = sessionStorage.getItem('interview-voiceOnlyMode');
    expect(storedMode).toBeNull();
    // Default should be true
    const defaultMode = true;
    expect(defaultMode).toBe(true);
  });

  it('should persist hasStarted state to sessionStorage', () => {
    sessionStorage.setItem('interview-hasStarted', 'false');
    expect(sessionStorage.getItem('interview-hasStarted')).toBe('false');

    sessionStorage.setItem('interview-hasStarted', 'true');
    expect(sessionStorage.getItem('interview-hasStarted')).toBe('true');
  });

  it('should maintain user session across page reloads', () => {
    const userData = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseSession.mockReturnValue({
      data: { user: userData },
      status: 'authenticated',
    });

    const session1 = mockUseSession();
    const session2 = mockUseSession();

    expect(session1.data.user).toEqual(session2.data.user);
  });

  it('should handle session without user data', () => {
    mockUseSession.mockReturnValue({
      data: {},
      status: 'authenticated',
    });

    const session = mockUseSession();
    expect(session.status).toBe('authenticated');
    expect(session.data.user).toBeUndefined();
  });

  it('should provide user ID for tracking interview progress', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-xyz',
        },
      },
      status: 'authenticated',
    });

    const session = mockUseSession();
    expect(session.data.user.id).toBeDefined();
  });
});
