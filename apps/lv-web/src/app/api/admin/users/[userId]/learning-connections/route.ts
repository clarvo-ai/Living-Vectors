import { prisma } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { NextRequest, NextResponse } from 'next/server';

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

    // Fetch learnings with their connected messages
    const learnings = await prisma.learning.findMany({
      where: { userId },
      select: {
        id: true,
        summary: true,
        createdAt: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(learnings);
  } catch (error) {
    console.error('Error fetching learning connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
