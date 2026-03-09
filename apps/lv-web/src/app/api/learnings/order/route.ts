import { prisma } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

type OrderEntry = { id: string; order_index: number };

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: OrderEntry[] = await request.json();

    if (!Array.isArray(body) || body.some((e) => typeof e.id !== 'string' || typeof e.order_index !== 'number')) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // Only update learnings that belong to the authenticated user
    const ids = body.map((e) => e.id);
    const owned = await prisma.learning.findMany({
      where: { id: { in: ids }, userId: session.user.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((l) => l.id));

    await prisma.$transaction(
      body
        .filter((e) => ownedIds.has(e.id))
        .map((e) =>
          prisma.learning.update({
            where: { id: e.id },
            data: { order_index: e.order_index },
          })
        )
    );

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.error('Error updating learning order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
