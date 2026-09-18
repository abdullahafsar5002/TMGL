import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';

interface DataPoint {
  label: string;
  value: number;
}

interface PerformanceChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
  showAverage?: boolean;
}

export function PerformanceChart({ title, data, color = '#0B3D2E', showAverage = true }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  const chartHeight = 160;
  const barWidth = Math.max(20, Math.min(40, 400 / data.length));

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 pt-4" style={{ minHeight: chartHeight + 30 }}>
            {data.map((d, i) => {
              const height = range > 0 ? ((d.value - min) / range) * (chartHeight - 20) + 20 : chartHeight / 2;
              return (
                <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: barWidth }}>
                  <span className="text-xs text-gray-600 font-medium">{d.value}</span>
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${height}px`,
                      backgroundColor: d.value <= average && showAverage ? '#10b981' : color,
                      opacity: d.value <= average ? 1 : 0.7,
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate max-w-[50px]">{d.label}</span>
                </div>
              );
            })}
          </div>
          {showAverage && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
              <span>Average: {average.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
