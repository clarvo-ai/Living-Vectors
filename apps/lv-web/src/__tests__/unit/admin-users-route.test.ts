// Tests for the PATCH /api/admin/users route (role change endpoint).
// A mock prisma client is used in place of a real database — calls to
// prisma.user.update are intercepted so we can verify the correct data
// would be written without touching any real DB.

jest.mock('@repo/db', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
}));

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@repo/lib', () => ({
  requireAdminAuth: jest.fn(),
}));

import { prisma } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import type { NextRequest } from 'next/server';
import { PATCH } from '../../app/api/admin/users/route';

const mockUserUpdate = prisma.user.update as jest.Mock;
const mockRequireAdminAuth = requireAdminAuth as jest.Mock;

// Build a minimal NextRequest-like object with a JSON body
const makeRequest = (body: unknown) =>
  ({ json: async () => body }) as unknown as NextRequest;

describe('PATCH /api/admin/users - role change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Authenticated admin by default
    mockRequireAdminAuth.mockResolvedValue(null);
  });

  it('writes the ADMIN role to the database and returns the updated record', async () => {
    mockUserUpdate.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' });

    const req = makeRequest({ id: 'user-1', role: 'admin' });
    const res = await PATCH(req);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'ADMIN' },
      select: { id: true, role: true },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'user-1', role: 'ADMIN' });
  });

  it('writes the USER role to the database and returns the updated record', async () => {
    mockUserUpdate.mockResolvedValueOnce({ id: 'user-2', role: 'USER' });

    const req = makeRequest({ id: 'user-2', role: 'user' });
    const res = await PATCH(req);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { role: 'USER' },
      select: { id: true, role: true },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'user-2', role: 'USER' });
  });

  it('returns 400 and does not touch the database for an invalid role value', async () => {
    const req = makeRequest({ id: 'user-1', role: 'superadmin' });
    const res = await PATCH(req);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Invalid request body' });
  });

  it('returns 400 and does not touch the database when id is missing', async () => {
    const req = makeRequest({ role: 'admin' });
    const res = await PATCH(req);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it('returns 403 and does not touch the database when caller is not an admin', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      status: 403,
      json: async () => ({ error: 'Forbidden - Admin access required' }),
    });

    const req = makeRequest({ id: 'user-1', role: 'admin' });
    const res = await PATCH(req);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(res.status).toBe(403);
  });

  it('returns 500 when the database update throws', async () => {
    mockUserUpdate.mockRejectedValueOnce(new Error('DB connection lost'));

    const req = makeRequest({ id: 'user-1', role: 'admin' });
    const res = await PATCH(req);

    expect(mockUserUpdate).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: 'Internal server error' });
  });
});
