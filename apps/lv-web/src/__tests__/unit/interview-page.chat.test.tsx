import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/dashboard/interview/page';
import { getGeminiResponse, startConversation } from '../../lib/services/pyapi';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../../lib/services/pyapi', () => ({
  getGeminiResponse: jest.fn(),
  startConversation: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Preserve original scrollIntoView so we can restore it
const realScrollIntoView = Element.prototype.scrollIntoView;

const mockUseSession = useSession as jest.Mock;

describe('InterviewPage - Chat Interaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    sessionStorage.clear();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();

    // Mock startConversation to return initial message
    (startConversation as jest.Mock).mockResolvedValue({
      message: "Hello! I'm here to figure you out. First, are you dedicated?",
      goalCategory: 'Career Goals',
      questionId: { goalIndex: 0, questionIndex: 0 },
    });
  });

  afterEach(() => {
    // Restore original scrollIntoView to avoid leaking to other tests
    Element.prototype.scrollIntoView = realScrollIntoView;
    (fetch as jest.Mock).mockReset();
  });

  it('should allow a user to send a message and receive a response', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'test-user-id', name: 'Test User' } },
      status: 'authenticated',
    });
    render(<InterviewPage />);

    // Switch to chat mode (voice-only is default)
    await waitFor(() => {
      expect(screen.getByText('Or Chat')).toBeInTheDocument();
    });

    const chatButton = screen.getByText(/Or Chat/i);
    fireEvent.click(chatButton);

    // Wait for chat UI to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your response.../i)).toBeInTheDocument();
    });

    // User types a message
    const textarea = screen.getByPlaceholderText(/Type your response.../i);
    fireEvent.change(textarea, { target: { value: 'Yes, I am very dedicated.' } });
    expect(textarea).toHaveValue('Yes, I am very dedicated.');

    // Mock the AI's response
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce({
      message: 'That is great to hear!',
      nextQuestionId: { goalIndex: 0, questionIndex: 1 },
      completed: false,
      status: 200,
    });

    // User clicks the "Send" button using testId
    const sendButton = screen.getByTestId('sendButton');
    fireEvent.click(sendButton);

    // Assert that the user's message appears on the screen and the send button is disabled after
    await waitFor(() => {
      expect(screen.getByText('Yes, I am very dedicated.')).toBeInTheDocument();
      expect(screen.getByTestId('sendButton')).toBeDisabled();
      // Check that the loading indicator is shown
      expect(screen.getByTestId('chat-loading-indicator')).toBeInTheDocument();
    });

    // Assert that the AI's response is displayed
    await waitFor(() => {
      expect(screen.getByText('That is great to hear!')).toBeInTheDocument();
    });

    // Check that the loading indicator is gone
    expect(screen.queryByTestId('chat-loading-indicator')).not.toBeInTheDocument();

    // Check that the input field is cleared
    expect(textarea).toHaveValue('');
  });

  it('submits the message when Enter is pressed', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'enter-tester-id', name: 'Enter Tester' } },
      status: 'authenticated',
    });
    render(<InterviewPage />);

    // Switch to chat mode
    await waitFor(() => {
      expect(screen.getByText('Or Chat')).toBeInTheDocument();
    });

    const chatButton = screen.getByText(/Or Chat/i);
    fireEvent.click(chatButton);

    // Wait for chat UI to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your response.../i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Type your response.../i);

    // Type message
    fireEvent.change(textarea, { target: { value: 'Test Enter' } });

    // Mock AI response before pressing Enter
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce({
      message: 'Received via Enter',
      nextQuestionId: { goalIndex: 0, questionIndex: 1 },
      completed: false,
      status: 200,
    });

    // Press Enter to submit
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: false });

    // Wait for user's message to appear and loading indicator
    await waitFor(() => {
      expect(screen.getByText('Test Enter')).toBeInTheDocument();
      expect(screen.getByTestId('chat-loading-indicator')).toBeInTheDocument();
    });

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText('Received via Enter')).toBeInTheDocument();
    });

    // Input cleared
    expect(textarea).toHaveValue('');
  });
});
