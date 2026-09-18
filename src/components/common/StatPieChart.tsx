import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface StatPieChartProps {
  title: string;
  items: StatItem[];
}

export function StatPieChart({ title, items }: StatPieChartProps) {
  const total = items.reduce((sum, item) => sum + (typeof item.value === 'number' ? item.value : 0), 0);

  if (total === 0) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">No data available</p>
        </CardContent>
      </Card>
    );
  }

  let cumulativePercent = 0;

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {items.map((item, i) => {
                const numValue = typeof item.value === 'number' ? item.value : 0;
                const percent = total > 0 ? (numValue / total) * 100 : 0;
                const dashArray = `${percent} ${100 - percent}`;
                const dashOffset = 100 - cumulativePercent;
                cumulativePercent += percent;

                return (
                  <circle
                    key={i}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke={item.color || '#6b7280'}
                    strokeWidth="3.5"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{total}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {items.map((item, i) => {
              const numValue = typeof item.value === 'number' ? item.value : 0;
              const percent = total > 0 ? Math.round((numValue / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color || '#6b7280' }}
                    />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {numValue} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
