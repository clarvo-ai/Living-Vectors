import { JobDetailView } from '@/app/dashboard/opportunities/components/JobDetailView';
import { Job } from '@/types/job';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

// Mock UI library components
jest.mock('@repo/ui/components/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 data-testid="card-title" className={className}>
      {children}
    </h2>
  ),
}));

jest.mock('@repo/ui/components/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@repo/ui/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('@repo/ui/components/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  Award: () => <svg />,
  Briefcase: () => <svg />,
  Building2: () => <svg />,
  Calendar: () => <svg />,
  CircleDollarSign: () => <svg />,
  ExternalLink: () => <svg />,
  FileText: () => <svg />,
  Gift: () => <svg />,
  HeartHandshake: () => <svg />,
  Languages: () => <svg />,
  Layers: () => <svg />,
  MapPin: () => <svg />,
  ScrollText: () => <svg />,
  Target: () => <svg />,
  X: () => <svg />,
}));

const baseJob: Job = {
  id: 'job-2',
  job_title: 'Backend Engineer',
  company_name: 'FinTech Oy',
  company_industry: 'Finance',
  role_industry: null,
  city: 'Espoo',
  country: 'Finland',
  working_mode: 'remote',
  employment_type: 'full-time',
  contract_type: 'permanent',
  job_level: 'mid',
  salary_min: 4000,
  salary_max: 5500,
  guessed_salary: null,
  guessed_salary_min: null,
  guessed_salary_max: null,
  required_skills: ['Python', 'FastAPI', 'PostgreSQL'],
  required_languages: ['English', 'Finnish'],
  language_summary: null,
  requirements: ['3+ years experience', 'Fluent in English'],
  job_description: 'Build scalable backend services.',
  job_description_summary: null,
  deprecated_perks: ['Flexible hours', 'Gym membership'],
  company_description: 'A leading fintech company.',
  company_culture: 'Fast-paced and collaborative.',
  company_values: ['Integrity', 'Innovation'],
  apply_link: 'https://fintech.fi/jobs/1',
  source_url: null,
  posted_at: null,
  expires_at: null,
};

describe('JobDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders job title', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Backend Engineer');
  });

  it('renders company name', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('FinTech Oy')).toBeInTheDocument();
  });

  it('renders city and country as location', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Espoo, Finland')).toBeInTheDocument();
  });

  it('shows country as location when city is absent', () => {
    const job = { ...baseJob, city: null };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.getByText('Finland')).toBeInTheDocument();
  });

  it('shows fallback location text when both city and country are absent', () => {
    const job = { ...baseJob, city: null, country: null };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.getByText('Location not specified')).toBeInTheDocument();
  });

  it('renders required skills', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('FastAPI')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });

  it('does not render skills section when skills are empty', () => {
    const job = { ...baseJob, required_skills: [] };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.queryByText('Required Skills')).not.toBeInTheDocument();
  });

  it('renders required languages as badges', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Finnish')).toBeInTheDocument();
  });

  it('renders language_summary when provided', () => {
    const job = { ...baseJob, language_summary: 'Finnish required, English preferred' };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.getByText('Finnish required, English preferred')).toBeInTheDocument();
  });

  it('renders requirements as list items', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('3+ years experience')).toBeInTheDocument();
    expect(screen.getByText('Fluent in English')).toBeInTheDocument();
  });

  it('renders job description', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Build scalable backend services.')).toBeInTheDocument();
  });

  it('prefers job_description_summary over job_description', () => {
    const job = { ...baseJob, job_description_summary: 'Short summary here.' };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.getByText('Short summary here.')).toBeInTheDocument();
    expect(screen.queryByText('Build scalable backend services.')).not.toBeInTheDocument();
  });

  it('renders perks as list items', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Flexible hours')).toBeInTheDocument();
    expect(screen.getByText('Gym membership')).toBeInTheDocument();
  });

  it('renders company description', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('A leading fintech company.')).toBeInTheDocument();
  });

  it('renders company culture', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Fast-paced and collaborative.')).toBeInTheDocument();
  });

  it('renders company values', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Integrity')).toBeInTheDocument();
    expect(screen.getByText('Innovation')).toBeInTheDocument();
  });

  it('renders actual salary', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('4,000 - 5,500 €/month')).toBeInTheDocument();
  });

  it('shows Estimate badge for guessed salary', () => {
    const job = {
      ...baseJob,
      salary_min: null,
      salary_max: null,
      guessed_salary_min: 3000,
      guessed_salary_max: 4500,
    };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.getByText('Estimate')).toBeInTheDocument();
  });

  it('does not show Estimate badge for actual salary', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.queryByText('Estimate')).not.toBeInTheDocument();
  });

  it('renders Apply Now button when apply_link is present', () => {
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    expect(screen.getByText('Apply Now')).toBeInTheDocument();
  });

  it('does not render Apply Now button when no links', () => {
    const job = { ...baseJob, apply_link: null, source_url: null };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    expect(screen.queryByText('Apply Now')).not.toBeInTheDocument();
  });

  it('opens apply link in new tab when Apply Now is clicked', async () => {
    const user = userEvent.setup();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<JobDetailView job={baseJob} onClose={jest.fn()} />);
    await user.click(screen.getByText('Apply Now'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://fintech.fi/jobs/1',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('falls back to source_url when apply_link is absent', async () => {
    const user = userEvent.setup();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const job = { ...baseJob, apply_link: null, source_url: 'https://source.fi/job/1' };
    render(<JobDetailView job={job} onClose={jest.fn()} />);
    await user.click(screen.getByText('Apply Now'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://source.fi/job/1',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<JobDetailView job={baseJob} onClose={onClose} />);
    await user.click(screen.getByLabelText('Close job details'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
