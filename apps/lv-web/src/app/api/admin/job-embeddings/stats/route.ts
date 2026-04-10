import type { AdminJobEmbeddingStats } from '@/types/admin';
import { prisma } from '@repo/db';
import { requireAdminAuth } from '@repo/lib';
import { NextResponse } from 'next/server';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) {
    return authError;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<[{ total: number; with_embeddings: number }]>(
      `SELECT COUNT(*)::int AS total, COUNT(job_embedding)::int AS with_embeddings FROM "Job"`
    );

    const row = rows[0];
    const totalJobs = row?.total ?? 0;
    const jobsWithEmbeddings = row?.with_embeddings ?? 0;
    const missingEmbeddings = Math.max(0, totalJobs - jobsWithEmbeddings);

    const stats: AdminJobEmbeddingStats = {
      totalJobs,
      jobsWithEmbeddings,
      missingEmbeddings,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching job embedding stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
