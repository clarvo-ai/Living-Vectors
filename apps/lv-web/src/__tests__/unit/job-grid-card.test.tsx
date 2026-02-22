import { JobGridCard } from '@/app/dashboard/opportunities/components/JobGridCard';
import { Job } from '@/types/job';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

jest.mock('@repo/ui/components/badge', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

jest.mock('lucide-react', () => ({
  MapPin: () => <svg data-testid="map-pin-icon" />,
}));

const baseJob: Job = {
  id: 'job-1',
  job_title: 'Senior Frontend Developer',
  company_name: 'Acme Corp',
  company_industry: 'Technology',
  role_industry: null,
  city: 'Helsinki',
  country: 'Finland',
  working_mode: 'hybrid',
  employment_type: 'full-time',
  contract_type: 'permanent',
  job_level: 'senior',
  salary_min: 5000,
  salary_max: 7000,
  guessed_salary: null,
  guessed_salary_min: null,
  guessed_salary_max: null,
  required_skills: ['React', 'TypeScript', 'GraphQL'],
  required_languages: ['English'],
  language_summary: null,
  requirements: [],
  job_description: 'Build great things.',
  job_description_summary: null,
  deprecated_perks: null,
  company_description: null,
  company_culture: null,
  company_values: null,
  apply_link: 'https://acme.com/apply',
  source_url: null,
  posted_at: null,
  expires_at: null,
};

describe('JobGridCard', () => {
  it('renders company name', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders job title', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
  });

  it('renders company industry below company name', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders role_industry when company_industry is absent', () => {
    const job = { ...baseJob, company_industry: null, role_industry: 'SaaS' };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.getByText('SaaS')).toBeInTheDocument();
  });

  it('renders no industry line when both are absent', () => {
    const job = { ...baseJob, company_industry: null, role_industry: null };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.queryByText('Technology')).not.toBeInTheDocument();
    expect(screen.queryByText('SaaS')).not.toBeInTheDocument();
  });

  it('renders city and country as location', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('Helsinki, Finland')).toBeInTheDocument();
  });

  it('renders city only when country is absent', () => {
    const job = { ...baseJob, country: null };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.getByText('Helsinki')).toBeInTheDocument();
  });

  it('renders no location when both city and country are absent', () => {
    const job = { ...baseJob, city: null, country: null };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.queryByTestId('map-pin-icon')).not.toBeInTheDocument();
  });

  it('renders formatted working mode', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
  });

  it('renders up to 3 skills as badges', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
  });

  it('shows overflow badge when more than 3 skills', () => {
    const job = {
      ...baseJob,
      required_skills: ['React', 'TypeScript', 'GraphQL', 'Node.js', 'CSS'],
    };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('Node.js')).not.toBeInTheDocument();
  });

  it('renders no skills section when skills array is empty', () => {
    const job = { ...baseJob, required_skills: [] };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    // No skill badges
    const badges = screen.queryAllByTestId('badge');
    const skillBadges = badges.filter(
      (b) =>
        b.textContent &&
        ['React', 'TypeScript', 'GraphQL', '+'].some((s) => b.textContent!.includes(s))
    );
    expect(skillBadges.length).toBe(0);
  });

  it('displays actual salary range', () => {
    render(<JobGridCard job={baseJob} onClick={jest.fn()} />);
    expect(screen.getByText('5,000 – 7,000 €/month')).toBeInTheDocument();
  });

  it('displays only min salary when max is absent', () => {
    const job = { ...baseJob, salary_max: null };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.getByText('From 5,000 €/month')).toBeInTheDocument();
  });

  it('displays only max salary when min is absent', () => {
    const job = { ...baseJob, salary_min: null };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.getByText('Up to 7,000 €/month')).toBeInTheDocument();
  });

  it('displays guessed salary when no actual salary', () => {
    const job = {
      ...baseJob,
      salary_min: null,
      salary_max: null,
      guessed_salary_min: 3000,
      guessed_salary_max: 4000,
    };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.getByText('3,000 – 4,000 €/month')).toBeInTheDocument();
  });

  it('shows no salary when all salary fields are null', () => {
    const job = {
      ...baseJob,
      salary_min: null,
      salary_max: null,
      guessed_salary: null,
      guessed_salary_min: null,
      guessed_salary_max: null,
    };
    render(<JobGridCard job={job} onClick={jest.fn()} />);
    expect(screen.queryByText(/€\/month/)).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<JobGridCard job={baseJob} onClick={onClick} />);
    await user.click(screen.getByText('Senior Frontend Developer'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
