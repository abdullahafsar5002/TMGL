import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface ActivityItemProps {
  description: string;
  timestamp: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ActivityItem({ description, timestamp, path, icon: Icon }: ActivityItemProps) {
  const content = (
    <div className="flex items-center justify-between p-3 rounded-lg border border-tmgl-charcoal-200 hover:border-tmgl-green-300 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-tmgl-green-700 shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-tmgl-charcoal-900 truncate">{description}</p>
          <p className="text-xs text-tmgl-charcoal-500">{new Date(timestamp).toLocaleDateString()}</p>
        </div>
      </div>
      {path && <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />}
    </div>
  );

  if (path) {
    return (
      <Link to={path} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
