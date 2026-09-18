import { Target, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'gold';
}

export function StatsCard({ label, value, icon, trend, variant = 'default' }: StatsCardProps) {
  const variantStyles = {
    default: 'text-gray-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    gold: 'text-amber-500',
  };

  return (
    <Card variant="bordered">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</p>
            {trend && (
              <p className="text-xs text-gray-500 mt-1">{trend}</p>
            )}
          </div>
          {icon && (
            <div className="text-gray-400">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PracticeStatsCards({ stats }: { stats: {
  roundsPlayed: number;
  averageScore: string;
  bestScore: string;
  averageToPar: string;
}}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        label="Rounds Played"
        value={stats.roundsPlayed}
        icon={<Target className="h-5 w-5" />}
      />
      <StatsCard
        label="Average Score"
        value={stats.averageScore}
        icon={<BarChart3 className="h-5 w-5" />}
      />
      <StatsCard
        label="Best Score"
        value={stats.bestScore}
        icon={<Award className="h-5 w-5" />}
        variant="gold"
      />
      <StatsCard
        label="Avg To Par"
        value={stats.averageToPar}
        icon={<TrendingUp className="h-5 w-5" />}
        variant={stats.averageToPar.startsWith('-') ? 'success' : stats.averageToPar === 'E' ? 'default' : 'warning'}
      />
    </div>
  );
}
