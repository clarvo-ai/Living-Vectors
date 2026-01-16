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

export async function getGeminiResponse(
  userId: string,
  userMessage: string,
  goalIndex: number,
  questionIndex: number

): Promise<{ message: string; nextQuestionId: { goalIndex: number; questionIndex: number; }; completed: boolean; status: number }> {
  const response = await fetch(`${getBaseUrl()}/api/chat/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      userId: userId, 
      userAnswer: userMessage, 
      questionId: 
      {
        "goalIndex": goalIndex,
        "questionIndex": questionIndex
      } 
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get AI response: ${response.statusText}`);
  }

  return response.json();
}

export async function startConversation(
  /* userId: string, */
): Promise<{ message: string; goalCategory: string; questionId: { goalIndex: number; questionIndex: number } }> {
  const response = await fetch(`${getBaseUrl()}/api/chat/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get AI response: ${response.statusText}`);
  }

  return response.json();
}

export async function getTTS(text: string): Promise<Blob> {
  const response = await fetch(`${getBaseUrl()}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`TTS failed: ${response.statusText}`);
  }
  return response.blob();
}

export async function getSTT(audioBlob: Blob): Promise<{ transcript: string }> {
  const formData = new FormData();
  formData.append('file', audioBlob);

  const response = await fetch(`${getBaseUrl()}/api/stt`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`STT failed: ${response.statusText}`);
  }
  return response.json();
}
