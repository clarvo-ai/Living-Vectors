import { isPhoneCharactersValid, PROFILE_FIELD_LIMITS } from '@/lib/profile-validation';
import { prisma, User } from '@repo/db';
import { authOptions } from '@repo/lib';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const nullableTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value == null) return null;
    if (typeof value !== 'string') return value;

    const trimmedValue = value.trim();
    return trimmedValue === '' ? null : trimmedValue;
  }, z.string().max(maxLength).nullable());

const profileUpdateSchema = z
  .object({
    name: nullableTrimmedString(PROFILE_FIELD_LIMITS.displayName),
    first_name: nullableTrimmedString(PROFILE_FIELD_LIMITS.firstName),
    last_name: nullableTrimmedString(PROFILE_FIELD_LIMITS.lastName),
    phone: nullableTrimmedString(PROFILE_FIELD_LIMITS.phone).refine(
      (value) => isPhoneCharactersValid(value),
      {
        message: 'Phone number invalid',
      }
    ),
    bio: nullableTrimmedString(PROFILE_FIELD_LIMITS.bio),
  })
  .strict();

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
    const parsedPayload = profileUpdateSchema.safeParse(body);

    if (!parsedPayload.success) {
      const firstIssue = parsedPayload.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Invalid profile input',
        },
        { status: 400 }
      );
    }

    const { name, first_name, last_name, phone, bio } = parsedPayload.data;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        first_name,
        last_name,
        phone,
        bio,
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
