import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tmgl-gold disabled:cursor-not-allowed disabled:opacity-50 touch-target select-none';

    const variants = {
      primary: 'bg-tmgl-charcoal-950 text-white hover:bg-tmgl-charcoal-800 active:bg-black shadow-sm',
      secondary: 'bg-tmgl-gold-600 text-white hover:bg-tmgl-gold-500 active:bg-tmgl-gold-700 shadow-sm',
      gold: 'bg-tmgl-gold text-tmgl-charcoal-950 hover:bg-tmgl-gold-400 active:bg-tmgl-gold-600 font-semibold shadow-sm',
      outline: 'border border-tmgl-charcoal-700 bg-white text-tmgl-charcoal-900 hover:border-tmgl-gold-500 hover:bg-tmgl-gold-50 active:bg-tmgl-gold-100',
      ghost: 'text-tmgl-charcoal-700 hover:bg-tmgl-charcoal-100 active:bg-tmgl-charcoal-200',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs min-h-[38px]',
      md: 'px-4 py-2.5 text-sm min-h-[44px]',
      lg: 'px-6 py-3.5 text-base min-h-[50px]'
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
