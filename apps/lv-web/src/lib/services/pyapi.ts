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

export async function uploadJobs(fileUrl: string): Promise<{ message: string; status: number }> {
  const response = await fetch(`${getBaseUrl()}/api/upload-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: fileUrl }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload jobs: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}
