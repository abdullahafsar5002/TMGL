import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'gold' | 'danger' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-tmgl-charcoal-100 text-tmgl-charcoal-800 border-tmgl-charcoal-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    gold: 'bg-tmgl-gold-100 text-tmgl-gold-900 border-tmgl-gold-300 font-semibold',
    danger: 'bg-red-50 text-red-800 border-red-200',
    outline: 'bg-transparent text-tmgl-charcoal-700 border-tmgl-charcoal-300'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
