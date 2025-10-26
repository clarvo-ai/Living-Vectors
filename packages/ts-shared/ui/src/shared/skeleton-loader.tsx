'use client';

import { cn } from '@repo/ui/lib/utils';
import { ReactNode } from 'react';
interface SkeletonLoaderProps {
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
  count?: number;
  loadingText?: string;
}

export const SkeletonLoader = ({
  children,
  isLoading = false,
  className,
  count = 1,
  loadingText,
}: SkeletonLoaderProps) => {
  if (!isLoading) return <>{children}</>;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="relative">
          <div
            className={cn('animate-pulse rounded-lg bg-gray-200/80 overflow-hidden', className)}
            aria-hidden="true"
          >
            <div className="invisible">{children}</div>
          </div>
          {loadingText && index === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-sm font-medium">{loadingText}</p>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// Optional: Export a simple skeleton for basic use cases
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200/80', className)} {...props} />;
};
