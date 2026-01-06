import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from '../../app/interview/page';
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

describe('InterviewPage - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();

    // Mock successful startConversation by default
    (startConversation as jest.Mock).mockResolvedValue({
      message: "Hello! I'm here to figure you out.",
      goalCategory: 'Career Goals',
      questionId: { goalIndex: 0, questionIndex: 0 },
    });
  });

  afterEach(() => {
    // Restore original scrollIntoView to avoid leaking to other tests
    Element.prototype.scrollIntoView = realScrollIntoView;
    (fetch as jest.Mock).mockReset();
  });

  it('shows error message when fetch fails', async () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUseSession.mockReturnValue({
      data: { user: { id: 'err-user-id', name: 'Err User' } },
      status: 'authenticated',
    });
    render(<InterviewPage />);

    // Wait for initial message
    await waitFor(() => {
      expect(screen.getByText(/Hello!/)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Type your response.../i);
    fireEvent.change(textarea, { target: { value: 'Test error' } });

    // Make getGeminiResponse reject to simulate error
    (getGeminiResponse as jest.Mock).mockRejectedValueOnce(new Error('Error'));

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    // Wait for the error AI message to appear
    await waitFor(() =>
      expect(
        screen.getByText('Sorry, I encountered an error. Please try again.')
      ).toBeInTheDocument()
    );

    // Input should have been cleared
    expect(textarea).toHaveValue('');

    // Restore console.error
    consoleSpy.mockRestore();
  });
});
