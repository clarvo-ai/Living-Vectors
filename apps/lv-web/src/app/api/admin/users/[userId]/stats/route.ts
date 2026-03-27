import { prisma } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { NextRequest, NextResponse } from 'next/server';

export interface AdminUserStats {
  messageCount: number;
  learningCount: number;
}

interface RouteParams {
  params: Promise<{
    userId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth();
  if (authError) {
    return authError;
  }

  try {
    const { userId } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count persisted conversation messages and learnings.
    // For interviews that end early, conversation rows may be missing while
    // learnings still carry source message snippets in Learning.messages.
    const [conversationMessageCount, learningCount, learningMessageSources] = await Promise.all([
      prisma.conversationMessage.count({ where: { userId } }),
      prisma.learning.count({ where: { userId } }),
      prisma.learning.findMany({
        where: { userId },
        select: { messages: true },
      }),
    ]);

    const derivedMessageCount = new Set(
      learningMessageSources
        .flatMap((learning) => learning.messages)
        .map((message) => message.trim())
        .filter((message) => message.length > 0)
    ).size;

    const messageCount = Math.max(conversationMessageCount, derivedMessageCount);

    const stats: AdminUserStats = {
      messageCount,
      learningCount,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
