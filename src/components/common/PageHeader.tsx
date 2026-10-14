import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. "Events". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Buttons or controls aligned to the right on wide screens. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The standard page heading used across the app: an optional eyebrow, a
 * display-serif title, supporting copy, and right-aligned actions.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
            {eyebrow}
          </p>
        )}
        <h1 className={cn('font-display text-display-lg text-tmgl-charcoal-950', eyebrow && 'mt-1')}>
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-tmgl-charcoal-600">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
