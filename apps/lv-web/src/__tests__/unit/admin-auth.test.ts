import { getServerSession } from 'next-auth';

// Mock database before importing requireAdminAuth
jest.mock('@repo/db', () => ({
  prisma: {},
}));

// Mock Prisma adapter before importing requireAdminAuth
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

import { requireAdminAuth } from '@repo/lib';

const mockGetServerSession = getServerSession as jest.Mock;

describe('requireAdminAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await requireAdminAuth();

    expect(result?.status).toBe(401);
    expect((await result?.json()).error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user', async () => {
    mockGetServerSession.mockResolvedValue({ user: null });

    const result = await requireAdminAuth();

    expect(result?.status).toBe(401);
    expect((await result?.json()).error).toBe('Unauthorized');
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', role: 'USER' },
    });

    const result = await requireAdminAuth();

    expect(result?.status).toBe(403);
    expect((await result?.json()).error).toBe('Forbidden - Admin access required');
  });

  it('returns null for ADMIN user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', role: 'ADMIN' },
    });

    const result = await requireAdminAuth();

    expect(result).toBeNull();
  });
});
