import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ className, variant = 'rectangular', width, height, lines = 1 }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-tmgl-charcoal-200 rounded';

  if (variant === 'circular') {
    return (
      <div
        className={cn(baseClass, 'rounded-full', className)}
        style={{ width: width ?? 40, height: height ?? 40 }}
      />
    );
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClass, 'h-4 rounded', className)}
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('border border-tmgl-charcoal-200 rounded-xl p-6 space-y-4', className)}>
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" lines={1} />
            <Skeleton variant="text" lines={1} />
          </div>
        </div>
        <Skeleton variant="text" lines={3} />
      </div>
    );
  }

  return (
    <div
      className={cn(baseClass, className)}
      style={{ width: width ?? '100%', height: height ?? 200 }}
    />
  );
}

export function TournamentCardSkeleton() {
  return (
    <div className="border border-tmgl-charcoal-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" lines={1} className="w-1/3" />
        <Skeleton variant="rectangular" width={60} height={24} className="rounded-full" />
      </div>
      <Skeleton variant="text" lines={2} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={28} className="rounded-full" />
        <Skeleton variant="rectangular" width={80} height={28} className="rounded-full" />
      </div>
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-tmgl-charcoal-100">
      <Skeleton variant="circular" width={32} height={32} />
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" lines={1} className="w-1/3" />
        <Skeleton variant="text" lines={1} className="w-1/4" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton variant="text" lines={1} className="w-16" />
        <Skeleton variant="text" lines={1} className="w-12" />
      </div>
    </div>
  );
}

export function DashboardStatSkeleton() {
  return (
    <div className="border border-tmgl-charcoal-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="text" lines={1} className="w-16" />
      </div>
      <Skeleton variant="text" lines={1} className="w-1/2" />
      <Skeleton variant="text" lines={1} className="w-1/3" />
    </div>
  );
}