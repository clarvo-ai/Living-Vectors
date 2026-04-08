import { prisma } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export type CompletedTasksResponse =
  | { count: number; status: 200 }
  | { error: 'Unauthorized'; status: 401 }
  | { error: 'Internal server error'; status: 500 };

export async function GET(): Promise<NextResponse<CompletedTasksResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', status: 401 } as const, { status: 401 });
    }

    const count = await prisma.completedTask.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ count, status: 200 } as const);
  } catch (error) {
    console.error('Error fetching completed tasks count:', error);
    return NextResponse.json({ error: 'Internal server error', status: 500 } as const, {
      status: 500,
    });
  }
}
