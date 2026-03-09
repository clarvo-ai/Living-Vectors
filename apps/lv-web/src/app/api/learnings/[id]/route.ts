import { prisma } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the learning belongs to the authenticated user before updating
    const learning = await prisma.learning.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!learning) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (learning.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.learning.update({
      where: { id },
      data: { soft_delete: true },
    });

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.error('Error soft-deleting learning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
