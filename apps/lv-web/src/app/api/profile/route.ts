import { prisma, User } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Type-safe profile type based on the exact fields returned by the API
export type UserProfile = Pick<
  User,
  'id' | 'name' | 'first_name' | 'last_name' | 'email' | 'phone' | 'bio'
>;

// Fully typed response types for the GET endpoint
export type ProfileGetResponse =
  | { body: UserProfile; status: 200 }
  | { error: 'Unauthorized'; status: 401 }
  | { error: 'User not found'; status: 404 }
  | { error: 'Internal server error'; status: 500 };

export async function GET(): Promise<NextResponse<ProfileGetResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', status: 401 } as const, { status: 401 });
    }

    const user: UserProfile | null = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        bio: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found', status: 404 } as const, { status: 404 });
    }

    return NextResponse.json({ body: user, status: 200 } as const);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error', status: 500 } as const, {
      status: 500,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, first_name, last_name, phone, bio } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        bio: bio || null,
      },
      select: {
        id: true,
        name: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        bio: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
