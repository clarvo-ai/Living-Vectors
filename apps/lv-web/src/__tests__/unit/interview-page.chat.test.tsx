import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/interview/page';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
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
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    // Restore original scrollIntoView to avoid leaking to other tests
    Element.prototype.scrollIntoView = realScrollIntoView;
    (fetch as jest.Mock).mockReset();
  });

  it('should allow a user to send a message and receive a response', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    });
    render(<InterviewPage />);

    // Check for the first AI message
    expect(screen.getByText(/Hello!/));

    // Check that the send button is disabled initially
    expect(screen.getByTestId('sendButton')).toBeDisabled();

    // User types a message
    const textarea = screen.getByPlaceholderText(/Type your response.../i);
    fireEvent.change(textarea, { target: { value: 'Yes, I am very dedicated.' } });
    expect(textarea).toHaveValue('Yes, I am very dedicated.');

    // Mock the AI's response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'ai-response-1',
        role: 'ai',
        content: 'That is great to hear!',
        timestamp: new Date(),
      }),
    });

    // User clicks the "Send" button
    const sendButton = screen.getByRole('button', { name: /Send/i });
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
      data: { user: { name: 'Enter Tester' } },
      status: 'authenticated',
    });
    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText(/Type your response.../i);

    // Type message
    fireEvent.change(textarea, { target: { value: 'Test Enter' } });

    // Mock AI response before pressing Enter
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'ai-response-enter',
        role: 'ai',
        content: 'Received via Enter',
        timestamp: new Date(),
      }),
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
