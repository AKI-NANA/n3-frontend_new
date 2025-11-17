'use client';

import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { VeroRiskDistribution } from '@/lib/research-analytics/types';
import { Shield } from 'lucide-react';

interface VeroRiskChartProps {
  data: VeroRiskDistribution[];
  isLoading?: boolean;
}

const COLORS = {
  high: '#dc2626', // red-600
  medium: '#f59e0b', // yellow-600
  low: '#16a34a', // green-600
  unknown: '#6b7280', // gray-500
};

const RISK_LABELS: Record<string, string> = {
  high: 'リスク高',
  medium: 'リスク中',
  low: 'リスク低',
  unknown: '不明',
};

export function VeroRiskChart({ data, isLoading }: VeroRiskChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">VEROリスク分布</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">読み込み中...</div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">VEROリスク分布</h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          データがありません
        </div>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: RISK_LABELS[item.risk_level] || item.risk_level,
    value: item.count,
    percentage: item.percentage,
    risk_level: item.risk_level,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            件数: {data.value.toLocaleString()}件
          </p>
          <p className="text-sm text-gray-600">
            割合: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">VEROリスク分布</h3>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.risk_level as keyof typeof COLORS] || COLORS.unknown}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
