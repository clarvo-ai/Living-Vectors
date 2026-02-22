'use client';

import { Button } from '@repo/ui/components/button';
import { Briefcase, RefreshCw, Settings, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  onRetry?: () => void;
  isLoading?: boolean;
}

export function EmptyState({ onRetry, isLoading }: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
      <div className="mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-gray-400" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
        No Job Recommendations Yet
      </h2>

      <p className="text-gray-600 text-center max-w-md mb-8 leading-relaxed">
        We don&apos;t have any job recommendations for you at the moment. Have a conversation with
        our AI to help us understand your preferences better.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <Button
          onClick={() => router.push('/dashboard/interview')}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-500/25 transition-all duration-300"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Start Interview
        </Button>

        <Button
          onClick={() => router.push('/dashboard/profile')}
          variant="outline"
          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 rounded-lg transition-all duration-300"
        >
          <Settings className="w-4 h-4 mr-2" />
          Update Profile
        </Button>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          disabled={isLoading}
          className="mt-6 text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Generating recommendations...' : 'Try generating recommendations'}
        </Button>
      )}
    </div>
  );
}
