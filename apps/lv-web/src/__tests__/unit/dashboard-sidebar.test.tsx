import DashboardLayout from '@/app/dashboard/layout';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { getMatchedJobs } from '../../lib/services/pyapi';

interface SidebarMenuButtonProps {
  children: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  [key: string]: unknown;
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

interface ImageProps {
  alt: string;
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('../../lib/services/pyapi', () => ({
  getMatchedJobs: jest.fn(),
}));

// Mock sidebar components
jest.mock('@repo/ui/components/sidebar', () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <nav data-testid="sidebar">{children}</nav>,
  SidebarContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, onClick, isActive, ...props }: SidebarMenuButtonProps) => (
    <button onClick={onClick} data-active={isActive} {...props}>
      {children}
    </button>
  ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Trigger</button>,
  useSidebar: () => ({
    toggleSidebar: jest.fn(),
    open: false,
    setOpen: jest.fn(),
  }),
}));

// Mock dropdown menu
jest.mock('@repo/ui/components/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: DropdownMenuItemProps) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: DropdownMenuTriggerProps) => <div>{children}</div>,
}));

// Mock Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: ImageProps) => <div data-testid="image" data-alt={alt} />,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Briefcase: () => <div>Briefcase</div>,
  ChevronDown: () => <div>ChevronDown</div>,
  LogOut: () => <div>LogOut</div>,
  Menu: () => <div>Menu</div>,
  Phone: () => <div>Phone</div>,
  User: () => <div>User</div>,
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Dashboard Sidebar', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockSession = {
    user: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard/interview');
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
    (getMatchedJobs as jest.Mock).mockResolvedValue({
      jobs: [{ id: 'job-1' }, { id: 'job-2' }, { id: 'job-3' }],
      total: 3,
      has_more: false,
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders sidebar', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders navigation menu items', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Query for sidebar items specifically (not the header)
    const sidebarItems = screen.getAllByText('Interview');
    expect(sidebarItems.length).toBeGreaterThan(0);
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
  });

  it('shows dynamic opportunities count', async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(getMatchedJobs).toHaveBeenCalledWith('1');
  });

  it('hides opportunities count badge when count is zero', async () => {
    (getMatchedJobs as jest.Mock).mockResolvedValueOnce({
      jobs: [],
      total: 0,
      has_more: false,
    });

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await screen.findAllByText('Opportunities');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('calculates opportunities count once on app open', async () => {
    const { rerender } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await screen.findByText('3');

    rerender(
      <DashboardLayout>
        <div>Test Content Updated</div>
      </DashboardLayout>
    );

    expect(getMatchedJobs).toHaveBeenCalledTimes(1);
  });

  it('recalculates opportunities count when entering opportunities page', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/profile');

    const { rerender } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(getMatchedJobs).toHaveBeenCalledTimes(1);
    });

    (usePathname as jest.Mock).mockReturnValue('/dashboard/opportunities');

    rerender(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(getMatchedJobs).toHaveBeenCalledTimes(2);
    });
  });

  it('shows active state for current page', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/interview');

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    const interviewButtons = screen.getAllByText('Interview');
    const sidebarButton = interviewButtons.find(
      (element) => element.closest('button')?.getAttribute('data-active') === 'true'
    );
    expect(sidebarButton).toBeInTheDocument();
  });

  it('navigates to profile page', async () => {
    const user = userEvent.setup();
    (usePathname as jest.Mock).mockReturnValue('/dashboard/profile');

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    const profileButtons = screen.getAllByText('Profile');
    const sidebarProfileButton = profileButtons.find((element) => element.closest('button'));
    if (sidebarProfileButton) {
      await user.click(sidebarProfileButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/profile');
    }
  });

  it('displays user name in profile menu', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays sign out option', async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('calls signOut when sign out clicked', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('sidebar-open', 'true');
    sessionStorage.setItem('opportunities-count', '3');

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    const signOutButton = screen.getByText('Sign Out');
    await user.click(signOutButton);
    expect(sessionStorage.getItem('sidebar-open')).toBeNull();
    expect(sessionStorage.getItem('opportunities-count')).toBeNull();
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  it('shows mobile menu trigger button', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument();
  });
});
