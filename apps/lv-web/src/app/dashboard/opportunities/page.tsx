'use client';

import { getMatchedJobs } from '@/lib/services/pyapi';
import { Job } from '@/types/job';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/components/dialog';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, JobDetailView, JobGridCard, JobGridSkeletonList } from './components';

const VIEWED_STORAGE_KEY_PREFIX = 'opportunities-viewed-';

function getViewedJobIds(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${VIEWED_STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function setViewedJobIds(userId: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${VIEWED_STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // ignore
  }
}

export type JobListView = 'all' | 'unseen' | 'viewed';

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<JobListView>('all');
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Require auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch job recommendations on mount
  const fetchRecommendations = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Primary: pyapi vector-similarity matches
      try {
        const matchResponse = await getMatchedJobs(session.user.id);
        if (matchResponse.jobs.length > 0) {
          setJobs(matchResponse.jobs);
          return;
        }
      } catch {
        // No embedding yet
      }

      // No recommendations found — show empty state
      setJobs([]);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load opportunities');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchRecommendations();
    }
  }, [session?.user?.id, fetchRecommendations]);

  // Hydrate viewed job IDs from localStorage (client-only)
  useEffect(() => {
    if (session?.user?.id) {
      setViewedIds(getViewedJobIds(session.user.id));
    }
  }, [session?.user?.id]);

  const filteredJobs = useMemo(() => {
    if (viewFilter === 'all') return jobs;
    if (viewFilter === 'unseen') return jobs.filter((j) => !viewedIds.has(j.id));
    return jobs.filter((j) => viewedIds.has(j.id));
  }, [jobs, viewFilter, viewedIds]);

  // Trigger recommendation algorithm when no jobs found
  const handleGenerateRecommendations = async () => {
    if (!session?.user?.id) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await getMatchedJobs(session.user.id);
      setJobs(response.jobs);
    } catch (err) {
      console.error('Error fetching matched jobs:', err);
      setError('Failed to generate recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    if (session?.user?.id) {
      const next = new Set(viewedIds);
      next.add(job.id);
      setViewedIds(next);
      setViewedJobIds(session.user.id, next);
    }
  };

  const handleCloseDetail = () => {
    setSelectedJob(null);
  };

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
        />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-white border border-gray-200">
                <Sparkles className="w-5 h-5 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Recommended for You</h1>
            </div>
            <p className="text-gray-600 ml-12">
              Jobs matched to your skills and preferences based on your profile
            </p>
          </div>
          <Link
            href="/dashboard/edit"
            style={{
              flexShrink: 0,
              marginTop: 18,
              border: 'none',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              padding: '10px 14px',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Edit Criteria
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && <JobGridSkeletonList count={6} />}
        {/* Empty State */}
        {!isLoading && jobs.length === 0 && (
          <EmptyState onRetry={handleGenerateRecommendations} isLoading={isGenerating} />
        )}

        {/* View filter + Job Grid */}
        {!isLoading && jobs.length > 0 && (
          <>
            <Tabs
              value={viewFilter}
              onValueChange={(v) => setViewFilter(v as JobListView)}
              className="mb-4"
            >
              <TabsList className="bg-gray-100">
                <TabsTrigger value="all">Show all jobs</TabsTrigger>
                <TabsTrigger value="unseen">Unseen jobs</TabsTrigger>
                <TabsTrigger value="viewed">Viewed jobs</TabsTrigger>
              </TabsList>
            </Tabs>
            {filteredJobs.length === 0 ? (
              <p className="text-gray-500 text-sm py-6">
                {viewFilter === 'unseen' && 'No unseen jobs.'}
                {viewFilter === 'viewed' && 'No viewed jobs yet. Open a job to mark it as viewed.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.map((job) => (
                  <JobGridCard
                    key={job.id}
                    job={job}
                    onClick={() => handleJobClick(job)}
                    isViewed={viewedIds.has(job.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Job Detail Modal */}
        <Dialog open={!!selectedJob} onOpenChange={() => handleCloseDetail()}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none [&>button]:hidden">
            <DialogTitle className="sr-only">Job Details</DialogTitle>
            {selectedJob && <JobDetailView job={selectedJob} onClose={handleCloseDetail} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
