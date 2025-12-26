import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import DashboardPage from '../../app/dashboard/page';

//Tests for DashboardPage:
// - Admin Tools card visibility
// - Navigation to /admin/users
// - Redirect to login when not authenticated

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the pyapi service
// Without this, there will be some console errors (even though all tests pass)
jest.mock('../../lib/services/pyapi', () => ({
  checkHealth: jest.fn().mockResolvedValue({ status: 'healthy', service: 'lv-pyapi' }),
  getHello: jest.fn().mockResolvedValue({ message: 'Hello from PyAPI' }),
}));

const mockUseSession = useSession as jest.Mock;

describe('DashboardPage - Admin Tools Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Admin Tools card when user has ADMIN role', async () => {
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
      expect(screen.getByText(/Admin Tools/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Users/ })).toBeInTheDocument();
    });
  });

  it('hides Admin Tools card when user has USER role', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'regular-user-id',
          name: 'Regular User',
          email: 'user@example.com',
          role: 'USER',
        },
      },
      status: 'authenticated',
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Admin Tools should NOT be visible
    expect(screen.queryByText(/Admin Tools/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Go to Users/ })).not.toBeInTheDocument();
  });

  it('navigates to /admin/users when "Go to Users" button is clicked', async () => {
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
      expect(screen.getByRole('button', { name: /Go to Users/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Go to Users/ }));

    expect(mockPush).toHaveBeenCalledWith('/admin/users');
  });

  it('redirects to login when not authenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

});
