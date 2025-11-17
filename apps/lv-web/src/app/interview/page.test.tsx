import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import InterviewPage from './page';

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

const mockUseSession = useSession as jest.Mock;

describe('InterviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('shows loading spinner when session status is loading', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' });
    render(<InterviewPage />);
    expect(screen.getByTestId('loading-spinner'));
  });
});
