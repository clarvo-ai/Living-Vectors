import { EmptyState } from '@/app/dashboard/opportunities/components/EmptyState';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@repo/ui/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  Briefcase: () => <svg data-testid="briefcase-icon" />,
  Sparkles: () => <svg data-testid="sparkles-icon" />,
  Settings: () => <svg data-testid="settings-icon" />,
  RefreshCw: ({ className }: { className?: string }) => (
    <svg data-testid="refresh-icon" className={className} />
  ),
}));

describe('EmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading', () => {
    render(<EmptyState />);
    expect(screen.getByText('No Job Recommendations Yet')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState />);
    expect(screen.getByText(/Have a conversation with our AI/i)).toBeInTheDocument();
  });

  it('renders Start Interview button', () => {
    render(<EmptyState />);
    expect(screen.getByText('Start Interview')).toBeInTheDocument();
  });

  it('renders Update Profile button', () => {
    render(<EmptyState />);
    expect(screen.getByText('Update Profile')).toBeInTheDocument();
  });

  it('navigates to interview page when Start Interview is clicked', async () => {
    const user = userEvent.setup();
    render(<EmptyState />);
    await user.click(screen.getByText('Start Interview'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/interview');
  });

  it('navigates to profile page when Update Profile is clicked', async () => {
    const user = userEvent.setup();
    render(<EmptyState />);
    await user.click(screen.getByText('Update Profile'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/profile');
  });

  it('shows retry button when onRetry is provided', () => {
    render(<EmptyState onRetry={jest.fn()} />);
    expect(screen.getByText('Try generating recommendations')).toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<EmptyState />);
    expect(screen.queryByText(/generating recommendations/i)).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(<EmptyState onRetry={onRetry} />);
    await user.click(screen.getByText('Try generating recommendations'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables retry button and shows loading text when isLoading is true', () => {
    render(<EmptyState onRetry={jest.fn()} isLoading={true} />);
    expect(screen.getByText('Generating recommendations...')).toBeInTheDocument();
    const retryBtn = screen.getByText('Generating recommendations...').closest('button');
    expect(retryBtn).toBeDisabled();
  });

  it('shows spinning icon when isLoading is true', () => {
    render(<EmptyState onRetry={jest.fn()} isLoading={true} />);
    const icon = screen.getByTestId('refresh-icon');
    expect(icon.getAttribute('class')).toContain('animate-spin');
  });
});
