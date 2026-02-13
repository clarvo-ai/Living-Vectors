import { Job } from '@/types/job';
import { Prisma } from '@repo/db';

export const jobListSelect = {
  id: true,
  job_title: true,
  company_name: true,
  company_industry: true,
  role_industry: true,
  city: true,
  country: true,
  working_mode: true,
  employment_type: true,
  contract_type: true,
  job_level: true,
  salary_min: true,
  salary_max: true,
  guessed_salary: true,
  guessed_salary_min: true,
  guessed_salary_max: true,
  required_skills: true,
  required_languages: true,
  language_summary: true,
  requirements: true,
  job_description: true,
  job_description_summary: true,
  deprecated_perks: true,
  company_description: true,
  company_culture: true,
  company_values: true,
  apply_link: true,
  source_url: true,
  published_date: true,
  last_day_to_apply: true,
} satisfies Prisma.JobSelect;

type SelectedJob = Prisma.JobGetPayload<{ select: typeof jobListSelect }>;

export function mapDbJobToUiJob(job: SelectedJob): Job {
  return {
    ...job,
    posted_at: job.published_date ? job.published_date.toISOString() : null,
    expires_at: job.last_day_to_apply ? job.last_day_to_apply.toISOString() : null,
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    guessed_salary: job.guessed_salary ?? null,
    guessed_salary_min: job.guessed_salary_min ?? null,
    guessed_salary_max: job.guessed_salary_max ?? null,
  };
}
