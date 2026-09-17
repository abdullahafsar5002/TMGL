import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  color?: string;
  isLoading?: boolean;
}

export function StatCard({ label, value, icon: Icon, path, color = 'bg-tmgl-green-50 text-tmgl-green-700 border-tmgl-green-200', isLoading }: StatCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className={cn('p-4 rounded-xl border text-left transition-all', path && 'hover:shadow-md cursor-pointer', color)}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-bold">
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : value}
      </p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );

  if (path) {
    return <button onClick={() => navigate(path)} className="text-left w-full">{content}</button>;
  }
  return content;
}
