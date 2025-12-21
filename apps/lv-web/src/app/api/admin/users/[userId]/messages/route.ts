import { prisma, MessageSender } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { NextRequest, NextResponse } from 'next/server';

export interface AdminUserMessage {
  messageId: string;
  sender: MessageSender;
  content: string;
  createdAt: Date;
}

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth();
  if (authError) {
    return authError;
  }

  try {
    const { userId } = params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch messages in chronological order
    const messages = await prisma.conversationMessage.findMany({
      where: { userId },
      select: {
        messageId: true,
        sender: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching user messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
