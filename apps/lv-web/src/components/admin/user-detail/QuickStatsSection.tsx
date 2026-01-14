import { Card, CardContent } from '@/components/ui/card';
import type { AdminUserStats } from '@/types/admin';

interface QuickStatsSectionProps {
  stats: AdminUserStats | null;
  statsLoading: boolean;
}

export function QuickStatsSection({ stats, statsLoading }: QuickStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600/80">Total Messages</p>
              <p className="text-2xl font-bold text-blue-700">
                {statsLoading ? '...' : stats?.messageCount ?? '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600/80">Total Learnings</p>
              <p className="text-2xl font-bold text-amber-700">
                {statsLoading ? '...' : stats?.learningCount ?? '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
