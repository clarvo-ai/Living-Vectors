import { prisma } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export type Learning = {
  id: string;
  userId: string;
  summary: string;
  messages: string[];
  createdAt: string;
  updatedAt: string;
};

export type LearningsGetResponse =
  | { body: Learning[]; status: 200 }
  | { error: 'Unauthorized'; status: 401 }
  | { error: 'Internal server error'; status: 500 };

export async function GET(): Promise<NextResponse<LearningsGetResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', status: 401 } as const, { status: 401 });
    }

    const learnings = await prisma.learning.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        summary: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ body: learnings as unknown as Learning[], status: 200 } as const);
  } catch (error) {
    console.error('Error fetching learnings:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 500 } as const,
      { status: 500 }
    );
  }
}
