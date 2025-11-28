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

describe('InterviewPage - Error Handling', () => {
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

  it('shows error message when fetch fails', async () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUseSession.mockReturnValue({
      data: { user: { name: 'Err User' } },
      status: 'authenticated',
    });
    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText(/Type your response.../i);
    fireEvent.change(textarea, { target: { value: 'Test error' } });

    // Make fetch reject to simulate error
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Error'));

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
