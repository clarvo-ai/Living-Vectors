import { PYAPI_URL } from '@/config';

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
  const response = await fetch(`${getBaseUrl()}/api/admin/evaluate-learning`, {
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
  };
}
