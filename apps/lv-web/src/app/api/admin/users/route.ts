import { prisma, User, UserRole } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { NextRequest, NextResponse } from 'next/server';

export type AdminUserListItem = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

// return all users for the /admin/users page
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
                createdAt: true,
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

// update the role of a single user
export async function PATCH(req: NextRequest) {
    const authError = await requireAdminAuth();
    if (authError) {
        return authError;
    }

    try {
        const body = await req.json();
        const { id, role } = body;

        if (typeof id !== 'string' || !id || typeof role !== 'string' || !['user', 'admin'].includes(role)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const prismaRole = role === 'admin' ? UserRole.ADMIN : UserRole.USER;

        const updated = await prisma.user.update({
            where: { id },
            data: { role: prismaRole },
            select: { id: true, role: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        console.error('Error updating user role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}