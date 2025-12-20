import { prisma, User } from '@repo/db';
import {requireAdminAuth} from '@repo/lib';
import { NextResponse } from 'next/server';

export type AdminUserListItem = Pick<User, 'id' | 'name' | 'email' | 'role'>;

export async function GET() {
    const authError = await requireAdminAuth();
    if (authError) {
        return authError;
    }

    try {
        const users: AdminUserListItem[] = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}