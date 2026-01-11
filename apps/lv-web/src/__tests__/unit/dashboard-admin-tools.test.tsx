import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import DashboardPage from '../../app/dashboard/page';

//Tests for DashboardPage:
// - Redirects to /dashboard/interview
// Note: Admin Tools are now in the sidebar navigation, not on the dashboard page

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const mockUseSession = useSession as jest.Mock;

describe('DashboardPage - Redirect Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /dashboard/interview when rendered', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        },
      },
      status: 'authenticated',
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/interview');
    });
  });

  it('redirects to /dashboard/interview for admin users', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'admin-user-id',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      },
      status: 'authenticated',
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/interview');
    });
  });

  // Note: Admin Tools are now in the sidebar navigation, not on the dashboard page
  // The dashboard page simply redirects to /dashboard/interview
});
