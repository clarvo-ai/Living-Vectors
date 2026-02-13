'use client';

import { getAllJobs, getJobRecommendations, triggerJobRecommendations } from '@/lib/services/pyapi';
import { Job } from '@/types/job';
import { Dialog, DialogContent } from '@repo/ui/components/dialog';
import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, JobDetailView, JobGridCard, JobGridSkeletonList } from './components';

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isFallbackToAllJobs, setIsFallbackToAllJobs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const recommendationsResponse = await getJobRecommendations(session.user.id);

      if (recommendationsResponse.jobs.length > 0) {
        setJobs(recommendationsResponse.jobs);
        setIsFallbackToAllJobs(false);
      } else {
        const allJobsResponse = await getAllJobs();
        setJobs(allJobsResponse.jobs);
        setIsFallbackToAllJobs(true);
      }
    } catch (err) {
      console.error('Error fetching job recommendations:', err);

      try {
        const allJobsResponse = await getAllJobs();
        setJobs(allJobsResponse.jobs);
        setIsFallbackToAllJobs(true);
      } catch (allJobsError) {
        console.error('Error fetching all jobs:', allJobsError);
        setError('Failed to load opportunities');
        setJobs([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchRecommendations();
    }
  }, [session?.user?.id, fetchRecommendations]);

  // Trigger recommendation algorithm when no jobs found
  const handleGenerateRecommendations = async () => {
    if (!session?.user?.id) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await triggerJobRecommendations(session.user.id);

      if (response.jobs.length > 0) {
        setJobs(response.jobs);
        setIsFallbackToAllJobs(false);
      } else {
        const allJobsResponse = await getAllJobs();
        setJobs(allJobsResponse.jobs);
        setIsFallbackToAllJobs(true);
      }
    } catch (err) {
      console.error('Error generating job recommendations:', err);

      try {
        const allJobsResponse = await getAllJobs();
        setJobs(allJobsResponse.jobs);
        setIsFallbackToAllJobs(true);
      } catch (allJobsError) {
        console.error('Error fetching all jobs:', allJobsError);
        setError('Failed to load opportunities');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Recommended for You</h1>
          </div>
          <p className="text-gray-600 ml-12">
            {isFallbackToAllJobs
              ? 'Showing all active jobs because no personal recommendations are available yet'
              : 'Jobs matched to your skills and preferences based on your profile'}
          </p>
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

        {/* Job Grid */}
        {!isLoading && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobGridCard key={job.id} job={job} onClick={() => handleJobClick(job)} />
            ))}
          </div>
        )}

        {/* Job Detail Modal */}
        <Dialog open={!!selectedJob} onOpenChange={() => handleCloseDetail()}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none [&>button]:hidden">
            {selectedJob && <JobDetailView job={selectedJob} onClose={handleCloseDetail} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
