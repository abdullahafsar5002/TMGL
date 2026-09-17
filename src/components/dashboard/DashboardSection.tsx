import type { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardSection({ title, action, children }: DashboardSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-tmgl-charcoal-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
