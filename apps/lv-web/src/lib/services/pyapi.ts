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

export async function getJobRecommendations(userId: string): Promise<JobRecommendationsResponse> {
  const response = await fetch(`/api/jobs/recommendations/${userId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch job recommendations: ${response.statusText}`);
  }

  return response.json();
}

export async function triggerJobRecommendations(
  userId: string
): Promise<JobRecommendationsResponse> {
  const pyapiBaseUrl = getBaseUrl();

  if (pyapiBaseUrl) {
    try {
      const response = await fetch(`${pyapiBaseUrl}/api/jobs/recommendations/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        return response.json();
      }
    } catch {}
  }

  return getJobRecommendations(userId);
}

export async function getAllJobs(): Promise<JobRecommendationsResponse> {
  const response = await fetch('/api/jobs');

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.statusText}`);
  }

  return response.json();
}
