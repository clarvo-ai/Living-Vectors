import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminUsersPage from '../../app/admin/users/page';

// Mock next/navigation
// Here, clicking a row should navigate to the user detail page
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
  });

  it('displays loading state initially', () => {
    // Never resolves because we want to test the loading state
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<AdminUsersPage />);

    expect(screen.getByText(/Loading users…/)).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('displays error when response is not ok', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch users/)).toBeInTheDocument();
    });
  });

  it('renders user list correctly', async () => {
    const mockUsers = [
      {
        id: 'user-1-full-uuid',
        name: 'Adam Brown',
        email: 'adam@example.com',
        role: 'USER',
        createdAt: '2024-01-15T10:00:00.000Z',
      },
      {
        id: 'user-2-full-uuid',
        name: null,
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: '2024-02-20T12:00:00.000Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Adam Brown')).toBeInTheDocument();
      expect(screen.getByText('adam@example.com')).toBeInTheDocument();
      expect(screen.getByText('USER')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      // Name is null, should show dash
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('shows empty state when no users', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('navigates to user detail page when row is clicked', async () => {
    const mockUsers = [
      {
        id: 'clickable-user-id',
        name: 'Clickable User',
        email: 'click@example.com',
        role: 'USER',
        createdAt: '2024-03-10T08:00:00.000Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Clickable User')).toBeInTheDocument();
    });

    // Click the row
    const row = screen.getByText('Clickable User').closest('tr');
    expect(row).not.toBeNull();
    if (row) {  
      fireEvent.click(row);
    }

    expect(mockPush).toHaveBeenCalledWith('/admin/users/clickable-user-id');
  });

  // Note: "Back to Dashboard" link was removed as navigation is now available via sidebar
});
