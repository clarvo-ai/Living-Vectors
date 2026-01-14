import { prisma, User } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { NextRequest, NextResponse } from 'next/server';

export type AdminUserDetail = Pick<
  User,
  'id' | 'name' | 'email' | 'createdAt' | 'first_name' | 'last_name' | 'role'
>;

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
    const user: AdminUserDetail | null = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        first_name: true,
        last_name: true,
        role: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
