import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminUserDetailPage from '../../app/admin/users/[userId]/page';

// Tests for AdminUserDetailPage:
// - Loading, error (500/404) states
// - User details, stats cards, chat history, learning connections rendering
// - Message expansion toggle, view mode switching (List/Visual)
// - Navigation (back button), empty states

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@repo/db', () => ({
  MessageSender: {
    USER: 'USER',
    AI: 'AI',
  },
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Helper to create mock fetch responses
const createMockFetch = (
  responses: Record<string, { ok: boolean; data?: unknown; status?: number }>
) => {
  return jest.fn((url: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        if (!response.ok) {
          return Promise.resolve({
            ok: false,
            status: response.status || 500,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => response.data,
        });
      }
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
};

const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: '2024-01-15T10:00:00.000Z',
  first_name: 'Test',
  last_name: 'User',
  role: 'USER',
};

const mockStats = {
  messageCount: 25,
  learningCount: 5,
};

const mockMessages = [
  {
    messageId: 'msg-1',
    sender: 'USER',
    content: 'Hello, this is a short message.',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    messageId: 'msg-2',
    sender: 'AI',
    content: 'A'.repeat(250), // Long message to test expansion
    createdAt: '2024-01-15T10:01:00.000Z',
  },
];

const mockLearningConnections = [
  {
    id: 'learning-1',
    summary: 'User is interested in technology',
    createdAt: '2024-01-16T10:00:00.000Z',
    messages: [
      {
        messageId: 'msg-1',
        sender: 'USER',
        content: 'I love technology',
        createdAt: '2024-01-15T10:00:00.000Z',
      },
    ],
  },
];

describe('AdminUserDetailPage', () => {
  // Before each test, clear all mocks and set up the mock fetch responses
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockImplementation(
      createMockFetch({
        '/stats': { ok: true, data: mockStats },
        '/messages': { ok: true, data: mockMessages },
        '/learning-connections': { ok: true, data: mockLearningConnections },
        '/api/admin/users/': { ok: true, data: mockUser },
      })
    );
  });

  it('displays loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    expect(screen.getByText(/Loading user…/)).toBeInTheDocument();
  });

  it('displays error when user fetch fails', async () => {
    (fetch as jest.Mock).mockImplementation(
      createMockFetch({
        '/stats': { ok: true, data: mockStats },
        '/messages': { ok: true, data: [] },
        '/learning-connections': { ok: true, data: [] },
        '/api/admin/users/test-user-id': { ok: false, status: 500 },
      })
    );

    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch user/)).toBeInTheDocument();
    });

    // Back button should be visible
    expect(screen.getByRole('button', { name: /Back to Users/ })).toBeInTheDocument();
  });

  it('displays user not found error for 404', async () => {
    (fetch as jest.Mock).mockImplementation(
      createMockFetch({
        '/stats': { ok: true, data: mockStats },
        '/messages': { ok: true, data: [] },
        '/learning-connections': { ok: true, data: [] },
        '/api/admin/users/nonexistent': { ok: false, status: 404 },
      })
    );

    render(<AdminUserDetailPage params={{ userId: 'nonexistent' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: User not found/)).toBeInTheDocument();
    });
  });

  it('renders user details correctly', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument(); // first_name
      // "User" appears in multiple places (last_name + message sender), so use getAllByText
      expect(screen.getAllByText('User').length).toBeGreaterThanOrEqual(1);
      // "USER" appears both in role badge and message sender badge
      expect(screen.getAllByText('USER').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders stats cards with counts', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // messageCount
      expect(screen.getByText('5')).toBeInTheDocument(); // learningCount
      expect(screen.getByText('Total Messages')).toBeInTheDocument();
      expect(screen.getByText('Total Learnings')).toBeInTheDocument();
    });
  });

  it('renders chat history with messages', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Chat History/i));
      expect(screen.getByText('Hello, this is a short message.')).toBeInTheDocument();
    });
  });

  it('shows "Show more" for long messages and toggles expansion', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      // Long message should have "Show more" button
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    // Click to expand
    fireEvent.click(screen.getByText('Show more'));

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    // Click to collapse
    fireEvent.click(screen.getByText('Show less'));

    await waitFor(() => {
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });
  });

  it('renders learning connections with message count', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Learning Connections/i)).toBeInTheDocument();
      expect(screen.getByText('User is interested in technology')).toBeInTheDocument();
      expect(screen.getByText('1 connected message')).toBeInTheDocument();
    });
  });

  it('displays view mode toggle buttons', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByText('Visual')).toBeInTheDocument();
    });
  });

  it('switches to visual mode when Visual button is clicked', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Visual')).toBeInTheDocument();
    });

    // Click Visual button
    fireEvent.click(screen.getByText('Visual'));

    await waitFor(() => {
      // Visual mode shows different content
      expect(screen.getByText(/Chat Timeline/i)).toBeInTheDocument();
      expect(
        screen.getByText('Click a learning card to see connected messages')
      ).toBeInTheDocument();
    });
  });

  it('navigates back to users list when back button is clicked', async () => {
    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Back to Users/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Back to Users/ }));

    expect(mockPush).toHaveBeenCalledWith('/admin/users');
  });

  it('shows empty state when no messages', async () => {
    (fetch as jest.Mock).mockImplementation(
      createMockFetch({
        '/stats': { ok: true, data: { messageCount: 0, learningCount: 0 } },
        '/messages': { ok: true, data: [] },
        '/learning-connections': { ok: true, data: [] },
        '/api/admin/users/': { ok: true, data: mockUser },
      })
    );

    render(<AdminUserDetailPage params={{ userId: 'test-user-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('No learnings yet')).toBeInTheDocument();
    });
  });
});
