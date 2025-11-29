import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Use PYAPI_URL for server-side (Docker internal) or NEXT_PUBLIC_PYAPI_URL for client-side
// Note: This will be read at request time, not at module load time

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversation_history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Prepare conversation history for Python API
    const history = conversation_history || [];

    // Determine Python API URL based on environment
    // In Docker: Containers communicate via internal network using service names (lv-pyapi:8080)
    // Outside Docker: Use localhost or environment variables for flexibility
    // We detect Docker by checking if DATABASE_URL contains '@db:' (Docker service name)
    // This is more reliable than checking for container existence
    const isDocker = process.env.DATABASE_URL?.includes('@db:');
    const apiUrl = isDocker 
      ? 'http://lv-pyapi:8080'  // Docker internal network
      : (process.env.PYAPI_URL || process.env.NEXT_PUBLIC_PYAPI_URL || 'http://localhost:8091');
    // Fallback order: PYAPI_URL (server-side env) > NEXT_PUBLIC_PYAPI_URL (client-side env) > localhost:8091 (default)

    // Call Python API for AI response
    const pyapiResponse = await fetch(`${apiUrl}/api/interview/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_history: history.map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!pyapiResponse.ok) {
      const errorData = await pyapiResponse.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('Python API error:', errorData);
      return NextResponse.json(
        { error: errorData.detail || 'Failed to get AI response' },
        { status: pyapiResponse.status }
      );
    }

    const data = await pyapiResponse.json();

    // Return a Message object matching the Message interface
    const aiMessage = {
      id: data.id || Date.now().toString(),
      role: data.role || ('ai' as const),
      content: data.content || '',
      timestamp: data.timestamp || new Date().toISOString(),
    };

    return NextResponse.json(aiMessage);
  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
