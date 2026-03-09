import { prisma } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export type Learning = {
  id: string;
  userId: string;
  summary: string;
  messages: string[];
  createdAt: string;
  updatedAt: string;
};

export type LearningsPostResponse =
  | { body: Learning; status: 201 }
  | { error: 'Unauthorized'; status: 401 }
  | { error: 'Bad request'; status: 400 }
  | { error: 'Internal server error'; status: 500 };

export async function POST(request: NextRequest): Promise<NextResponse<LearningsPostResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', status: 401 } as const, { status: 401 });
    }

    const body = await request.json();
    const { summary, messages } = body;

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return NextResponse.json({ error: 'Bad request', status: 400 } as const, { status: 400 });
    }

    const learning = await prisma.learning.create({
      data: {
        userId: session.user.id,
        summary: summary.trim(),
        messages: messages ?? [],
        soft_delete: false,
      },
      select: {
        id: true,
        userId: true,
        summary: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { body: learning as unknown as Learning, status: 201 } as const,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating learning:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 500 } as const,
      { status: 500 }
    );
  }
}

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
      where: { userId: session.user.id, soft_delete: false },
      orderBy: { createdAt: 'desc' }, //Need to be changed to something else later
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
