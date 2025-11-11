import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {

  // This is where we would be doing the actual AI service integration
  // from what I understood, we are doing this in python?
  // Im not sure but if we are doing it with nextjs, the logic would be here.
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // TODO: Replace this with actual AI service integration
    // For now, this is a simple mock response
    const aiResponseContent = `You said: "${message}". What a good answer! Next question...`;

    // Return a Message object matching the Message interface
    const aiMessage = {
      id: Date.now().toString(),
      role: 'ai' as const,
      content: aiResponseContent,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(aiMessage);
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
