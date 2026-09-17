import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Container({ className, size = 'lg', children, ...props }: ContainerProps) {
  const sizes = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn('mx-auto px-4 sm:px-6 lg:px-8 w-full', sizes[size], className)} {...props}>
      {children}
    </div>
  );
}
