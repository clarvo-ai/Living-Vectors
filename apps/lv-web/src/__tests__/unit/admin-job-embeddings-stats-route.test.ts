jest.mock('@repo/db', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
  },
}));

jest.mock('@repo/lib', () => ({
  requireAdminAuth: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { prisma } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { GET } from '../../app/api/admin/job-embeddings/stats/route';

const mockQuery = prisma.$queryRawUnsafe as jest.Mock;
const mockRequireAdminAuth = requireAdminAuth as jest.Mock;

describe('GET /api/admin/job-embeddings/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue(null);
  });

  it('returns counts derived from the Job table', async () => {
    mockQuery.mockResolvedValueOnce([{ total: 100, with_embeddings: 73 }]);

    const res = await GET();

    expect(mockRequireAdminAuth).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*)::int AS total'),
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM "Job"'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalJobs: 100,
      jobsWithEmbeddings: 73,
      missingEmbeddings: 27,
    });
  });

  it('never returns a negative missingEmbeddings count', async () => {
    mockQuery.mockResolvedValueOnce([{ total: 10, with_embeddings: 15 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalJobs: 10,
      jobsWithEmbeddings: 15,
      missingEmbeddings: 0,
    });
  });

  it('treats an empty query result as zero jobs', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalJobs: 0,
      jobsWithEmbeddings: 0,
      missingEmbeddings: 0,
    });
  });

  it('returns the auth error response when the caller is not an admin', async () => {
    mockRequireAdminAuth.mockResolvedValueOnce({
      status: 403,
      json: async () => ({ error: 'Forbidden - Admin access required' }),
    });

    const res = await GET();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.status).toBe(403);
  });

  it('returns 500 when the database query fails', async () => {
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: 'Internal server error' });
    logSpy.mockRestore();
  });
});
