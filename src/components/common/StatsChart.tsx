import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';

interface StatsChartProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
}

export function StatsChart({ title, data }: StatsChartProps) {
  if (data.length === 0 || data.every(d => d.value === 0)) {
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

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, i) => {
            const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${width}%`,
                      backgroundColor: item.color || '#0B3D2E',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
