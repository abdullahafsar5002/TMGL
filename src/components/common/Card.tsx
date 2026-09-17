import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'hover';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white border border-tmgl-charcoal-200 shadow-sm',
    elevated: 'bg-white shadow-md border border-tmgl-charcoal-100',
    bordered: 'bg-white border-2 border-tmgl-charcoal-200',
    hover: 'bg-white border border-tmgl-charcoal-200 shadow-sm hover:shadow-md',
  };

  return (
    <div className={cn('rounded-xl p-4 sm:p-6 transition-all', variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-bold text-tmgl-charcoal-900 tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-tmgl-charcoal-500 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {children}
    </div>
  );
}
