import { requireAdminAuth } from '@repo/lib';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();

    const pyapiUrl = process.env.PYAPI_URL || process.env.NEXT_PUBLIC_PYAPI_URL;
    const res = await fetch(`${pyapiUrl}/api/learnings/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Evaluation failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      accuracy: data.accuracy ?? null,
      relevance: data.relevance ?? null,
      coherence: data.coherence ?? null,
      overallScore: data.overall_score ?? null,
      feedback: data.feedback ?? null,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error evaluating learning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
