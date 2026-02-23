'use client';

import { Card, CardContent, CardHeader } from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';

export function JobGridSkeleton() {
  return (
    <Card className="border-gray-200/80 bg-white/80 backdrop-blur-sm overflow-hidden">
      {/* Gradient accent bar skeleton */}
      <div className="h-1 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 space-y-3">
        {/* Location & Work Mode skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Skills skeleton */}
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-18 rounded-full" />
        </div>

        {/* Salary skeleton */}
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export function JobGridSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <JobGridSkeleton key={index} />
      ))}
    </div>
  );
}
