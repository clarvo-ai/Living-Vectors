// Job type definition for job recommendations feature

export interface Job {
  id: string;
  job_title: string;
  company_name: string;
  company_industry?: string | null;
  role_industry?: string | null;
  city?: string | null;
  country?: string | null;
  working_mode?: string | null; // remote, hybrid, on-site
  employment_type?: string | null; // full-time, part-time, contract
  contract_type?: string | null;
  job_level?: string | null; // junior, mid, senior, lead
  salary_min?: number | null;
  salary_max?: number | null;
  guessed_salary?: number | null;
  guessed_salary_min?: number | null;
  guessed_salary_max?: number | null;
  required_skills: string[];
  required_languages: string[];
  language_summary?: string | null;
  requirements: string[];
  job_description?: string | null;
  job_description_summary?: string | null;
  deprecated_perks?: string[] | null;
  company_description?: string | null;
  company_culture?: string | null;
  company_values?: string[] | null;
  apply_link?: string | null;
  source_url?: string | null;
  posted_at?: string | null;
  expires_at?: string | null;
  summer_job_internship?: boolean | null;
}

export interface JobRecommendationsResponse {
  jobs: Job[];
  total: number;
  has_more: boolean;
}

// Display maps for formatting job fields
export const displayMaps = {
  working_mode: {
    remote: 'Remote',
    hybrid: 'Hybrid',
    'on-site': 'On-site',
    onsite: 'On-site',
  } as Record<string, string>,
  employment_type: {
    'full-time': 'Full-time',
    fulltime: 'Full-time',
    'part-time': 'Part-time',
    parttime: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
    internship: 'Internship',
  } as Record<string, string>,
  contract_type: {
    permanent: 'Permanent',
    temporary: 'Temporary',
    contract: 'Contract',
    freelance: 'Freelance',
    'fixed-term': 'Fixed-term',
    'self-employed': 'Self-employed',
  } as Record<string, string>,
  job_level: {
    junior: 'Junior',
    mid: 'Mid-level',
    'mid-level': 'Mid-level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    staff: 'Staff',
    manager: 'Manager',
    director: 'Director',
    vp: 'VP',
    'c-level': 'C-Level',
    entry: 'Entry',
  } as Record<string, string>,
};
