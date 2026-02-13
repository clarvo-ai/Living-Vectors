import { jobListSelect, mapDbJobToUiJob } from '@/lib/jobs/jobMapper';
import { prisma } from '@repo/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const now = new Date();

    const jobs = await prisma.job.findMany({
      where: {
        job_is_active: true,
        OR: [{ last_day_to_apply: null }, { last_day_to_apply: { gte: now } }],
      },
      orderBy: {
        published_date: 'desc',
      },
      select: jobListSelect,
      take: 100,
    });

    return NextResponse.json({
      jobs: jobs.map(mapDbJobToUiJob),
      total: jobs.length,
      has_more: jobs.length === 100,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
