import { jobListSelect, mapDbJobToUiJob } from '@/lib/jobs/jobMapper';
import { prisma } from '@repo/db';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .filter((token) => token.length > 2);

export async function GET(_: Request, context: RouteContext) {
  const { userId } = await context.params;
  const now = new Date();

  try {
    const [learnings, jobs] = await Promise.all([
      prisma.learning.findMany({
        where: { userId },
        select: { summary: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.job.findMany({
        where: {
          job_is_active: true,
          OR: [{ last_day_to_apply: null }, { last_day_to_apply: { gte: now } }],
        },
        orderBy: { published_date: 'desc' },
        select: jobListSelect,
        take: 200,
      }),
    ]);

    if (learnings.length === 0 || jobs.length === 0) {
      return NextResponse.json({ jobs: [], total: 0, has_more: false });
    }

    const profileTokens = new Set(
      tokenize(learnings.map((learning) => learning.summary).join(' '))
    );

    const scoredJobs = jobs
      .map((job) => {
        const titleTokens = tokenize(job.job_title || '');
        const roleTokens = tokenize(job.role_industry || '');
        const skillTokens = (job.required_skills || []).flatMap((skill) => tokenize(skill));

        const titleScore = titleTokens.reduce(
          (score, token) => score + (profileTokens.has(token) ? 2 : 0),
          0
        );
        const roleScore = roleTokens.reduce(
          (score, token) => score + (profileTokens.has(token) ? 2 : 0),
          0
        );
        const skillScore = skillTokens.reduce(
          (score, token) => score + (profileTokens.has(token) ? 3 : 0),
          0
        );

        return {
          job,
          score: titleScore + roleScore + skillScore,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    const recommendedJobs = scoredJobs.map((item) => mapDbJobToUiJob(item.job));

    return NextResponse.json({
      jobs: recommendedJobs,
      total: recommendedJobs.length,
      has_more: false,
    });
  } catch (error) {
    console.error('Error fetching job recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
