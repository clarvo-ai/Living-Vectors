import { cn } from '@repo/ui/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const Spinner = ({ className, size = 16 }: SpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className={cn('animate-spin', className)} size={size} />
    </div>
  );
};
