import { PYAPI_URL } from '@/config';
import { JobRecommendationsResponse } from '@/types/job';

export interface PyAPIHealthResponse {
  status: string;
  service: string;
}

export interface PyAPIUser {
  id: string;
  email: string;
  name: string;
}

const getBaseUrl = (): string => {
  return PYAPI_URL || '';
};

export async function checkHealth(): Promise<PyAPIHealthResponse> {
  const response = await fetch(`${getBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error(`PyAPI health check failed: ${response.statusText}`);
  }
  return response.json();
}

export async function getHello(): Promise<{ message: string }> {
  const response = await fetch(`${getBaseUrl()}/`);
  if (!response.ok) {
    throw new Error(`PyAPI hello failed: ${response.statusText}`);
  }
  return response.json();
}

export async function getUser(userId: string): Promise<PyAPIUser> {
  const response = await fetch(`${getBaseUrl()}/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
}

export async function uploadJobs(filename: string): Promise<{ message: string; status: number }> {
  const response = await fetch(`${getBaseUrl()}/api/upload-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: filename }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Extract the error message from the response body
    throw new Error(data.message || `Failed to upload jobs: ${response.statusText}`);
  }

  return data;
}

export interface LearningEvaluationResult {
  accuracy: number | null;
  relevance: number | null;
  coherence: number | null;
  overallScore: number | null;
  feedback: string | null;
  evaluatedAt: string | null;
}

/**
 * Evaluate a learning statement using an LLM judge.
 * Routes through the Next.js proxy to enforce admin auth.
 */
export async function evaluateLearning(
  summary: string,
  messages: string[]
): Promise<LearningEvaluationResult> {
  const response = await fetch(`${getBaseUrl()}/api/learnings/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary, messages }),
  });

  if (!response.ok) {
    throw new Error(`Evaluation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    accuracy: data.accuracy ?? null,
    relevance: data.relevance ?? null,
    coherence: data.coherence ?? null,
    overallScore: data.overall_score ?? null,
    feedback: data.feedback ?? null,
    evaluatedAt: new Date().toISOString(),
interface PyAPIMatchJob {
  id: string;
  job_title: string;
  company_name: string;
  company_industry?: string | null;
  role_industry?: string | null;
  city?: string | null;
  country?: string | null;
  working_mode?: string | null;
  employment_type?: string | null;
  contract_type?: string | null;
  job_level?: string | null;
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
  similarity: number;
}

interface PyAPIMatchResponse {
  jobs: PyAPIMatchJob[];
  total: number;
  has_more: boolean;
}

export async function getMatchedJobs(
  userId: string,
  perPage = 20
): Promise<JobRecommendationsResponse> {
  const pyapiBaseUrl = getBaseUrl();
  if (!pyapiBaseUrl) throw new Error('PyAPI URL not configured');

  const url = `${pyapiBaseUrl}/api/jobs/match?user_id=${encodeURIComponent(userId)}&per_page=${perPage}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch matched jobs: ${response.status} ${response.statusText}`);
  }

  const data: PyAPIMatchResponse = await response.json();

  return {
    jobs: data.jobs.map(({ similarity: _similarity, ...job }) => job),
    total: data.total,
    has_more: data.has_more,
  };
}
