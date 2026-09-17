import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-tmgl-charcoal-400" />
      </div>
      <p className="text-base font-semibold text-tmgl-charcoal-700">{title}</p>
      {description && <p className="text-sm text-tmgl-charcoal-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
