import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('InterviewPage - Auth & Loading', () => {
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

  it('shows loading spinner when session status is loading', () => {
    mockUseSession.mockReturnValue({ status: 'loading' });
    render(<InterviewPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated' });
    render(<InterviewPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
