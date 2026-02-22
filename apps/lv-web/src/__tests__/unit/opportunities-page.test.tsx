import OpportunitiesPage from '@/app/dashboard/opportunities/page';
import { Job } from '@/types/job';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { getMatchedJobs } from '../../lib/services/pyapi';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../../lib/services/pyapi', () => ({
  getMatchedJobs: jest.fn(),
}));

// Lightweight stub for Dialog: renders children only when open
jest.mock('@repo/ui/components/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// Stub sub-components so page tests focus on page logic only
jest.mock('../../app/dashboard/opportunities/components', () => ({
  JobGridCard: ({ job, onClick }: { job: Job; onClick: () => void }) => (
    <div data-testid="job-card" onClick={onClick}>
      {job.job_title}
    </div>
  ),
  JobDetailView: ({ job, onClose }: { job: Job; onClose: () => void }) => (
    <div data-testid="job-detail-view">
      <span>{job.job_title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  EmptyState: ({ onRetry, isLoading }: { onRetry?: () => void; isLoading?: boolean }) => (
    <div data-testid="empty-state">
      <button onClick={onRetry} disabled={isLoading}>
        Retry
      </button>
    </div>
  ),
  JobGridSkeletonList: ({ count }: { count: number }) => (
    <div data-testid="skeleton-list" data-count={count} />
  ),
}));

jest.mock('lucide-react', () => ({
  Sparkles: () => <svg data-testid="sparkles-icon" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeJob = (id: string, title: string): Job => ({
  id,
  job_title: title,
  company_name: 'Test Corp',
  required_skills: [],
  required_languages: [],
  requirements: [],
  city: 'Helsinki',
  country: 'Finland',
  working_mode: 'hybrid',
  employment_type: 'full-time',
  contract_type: null,
  job_level: null,
  company_industry: null,
  role_industry: null,
  salary_min: null,
  salary_max: null,
  guessed_salary: null,
  guessed_salary_min: null,
  guessed_salary_max: null,
  language_summary: null,
  job_description: null,
  job_description_summary: null,
  deprecated_perks: null,
  company_description: null,
  company_culture: null,
  company_values: null,
  apply_link: null,
  source_url: null,
  posted_at: null,
  expires_at: null,
});

const mockSession = {
  data: { user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
  status: 'authenticated' as const,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OpportunitiesPage', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Authentication', () => {
    it('redirects to /login when unauthenticated', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });
      render(<OpportunitiesPage />);
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('renders loading spinner while session is loading', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
      render(<OpportunitiesPage />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('renders nothing when session is null after loading', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null, status: 'authenticated' });
      const { container } = render(<OpportunitiesPage />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Page header', () => {
    it('renders the Recommended for You heading', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({ jobs: [], total: 0, has_more: false });
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(screen.getByText('Recommended for You')).toBeInTheDocument();
      });
    });

    it('renders subtitle text', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({ jobs: [], total: 0, has_more: false });
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(
          screen.getByText(/Jobs matched to your skills and preferences/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('shows skeleton list while fetching', () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      // Never resolves during this test
      (getMatchedJobs as jest.Mock).mockReturnValue(new Promise(() => {}));
      render(<OpportunitiesPage />);
      expect(screen.getByTestId('skeleton-list')).toBeInTheDocument();
    });
  });

  describe('Successful fetch', () => {
    it('calls getMatchedJobs with the user id', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({
        jobs: [makeJob('1', 'Data Engineer')],
        total: 1,
        has_more: false,
      });
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(getMatchedJobs).toHaveBeenCalledWith('user-1');
      });
    });

    it('renders job cards when jobs are returned', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({
        jobs: [makeJob('1', 'Data Engineer'), makeJob('2', 'ML Engineer')],
        total: 2,
        has_more: false,
      });
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(screen.getAllByTestId('job-card')).toHaveLength(2);
        expect(screen.getByText('Data Engineer')).toBeInTheDocument();
        expect(screen.getByText('ML Engineer')).toBeInTheDocument();
      });
    });

    it('hides skeleton after fetch completes', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({ jobs: [], total: 0, has_more: false });
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-list')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('shows EmptyState when no jobs returned', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({ jobs: [], total: 0, has_more: false });
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
    });

    it('shows EmptyState when getMatchedJobs throws', async () => {
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockRejectedValue(new Error('No embedding'));
      render(<OpportunitiesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
    });

    it('calls getMatchedJobs again when retry button is clicked', async () => {
      const user = userEvent.setup();
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock)
        .mockResolvedValueOnce({ jobs: [], total: 0, has_more: false })
        .mockResolvedValueOnce({
          jobs: [makeJob('1', 'Data Engineer')],
          total: 1,
          has_more: false,
        });

      render(<OpportunitiesPage />);
      await waitFor(() => screen.getByTestId('empty-state'));

      await user.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByTestId('job-card')).toBeInTheDocument();
      });
    });
  });

  describe('Error state', () => {
    beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    it('shows error message when generate recommendations fails', async () => {
      const user = userEvent.setup();
      (useSession as jest.Mock).mockReturnValue(mockSession);
      // Initial load throws (caught by inner try/catch → empty state),
      // then retry triggers handleGenerateRecommendations which throws → error shown
      (getMatchedJobs as jest.Mock).mockRejectedValue(new Error('Network error'));
      render(<OpportunitiesPage />);

      await waitFor(() => screen.getByTestId('empty-state'));
      await user.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Failed to generate recommendations')).toBeInTheDocument();
      });
    });
  });

  describe('Job detail modal', () => {
    it('opens job detail view when a card is clicked', async () => {
      const user = userEvent.setup();
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({
        jobs: [makeJob('1', 'Data Engineer')],
        total: 1,
        has_more: false,
      });

      render(<OpportunitiesPage />);
      await waitFor(() => screen.getByTestId('job-card'));

      await user.click(screen.getByTestId('job-card'));

      // job-detail-view is open and shows the correct job
      expect(screen.getByTestId('job-detail-view')).toBeInTheDocument();
      // job title appears in both card and detail view — use getAllByText
      expect(screen.getAllByText('Data Engineer').length).toBeGreaterThanOrEqual(1);
    });

    it('closes job detail view when onClose is called', async () => {
      const user = userEvent.setup();
      (useSession as jest.Mock).mockReturnValue(mockSession);
      (getMatchedJobs as jest.Mock).mockResolvedValue({
        jobs: [makeJob('1', 'Data Engineer')],
        total: 1,
        has_more: false,
      });

      render(<OpportunitiesPage />);
      await waitFor(() => screen.getByTestId('job-card'));

      await user.click(screen.getByTestId('job-card'));
      expect(screen.getByTestId('job-detail-view')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByTestId('job-detail-view')).not.toBeInTheDocument();
    });
  });
});
