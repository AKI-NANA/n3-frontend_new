'use client';

import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { HtsCodeFrequency } from '@/lib/research-analytics/types';
import { FileText } from 'lucide-react';

interface HtsCodeChartProps {
  data: HtsCodeFrequency[];
  isLoading?: boolean;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // yellow-500
  '#ef4444', // red-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
];

export function HtsCodeChart({ data, isLoading }: HtsCodeChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">HTSコード頻度 TOP 10</h3>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">読み込み中...</div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">HTSコード頻度 TOP 10</h3>
        </div>
        <div className="h-96 flex items-center justify-center text-gray-400">
          データがありません
        </div>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    hts_code: item.hts_code,
    count: item.count,
    success_rate: item.success_rate,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">HTSコード: {data.hts_code}</p>
          <p className="text-sm text-gray-600">
            出現回数: {data.count.toLocaleString()}件
          </p>
          <p className="text-sm text-gray-600">
            成功率: {data.success_rate.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">HTSコード頻度 TOP 10</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        関税分類の傾向を把握し、推定難易度の高いカテゴリを特定
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{
            top: 5,
            right: 30,
            left: 100,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={{ value: '件数', position: 'insideBottom', offset: -5 }} />
          <YAxis
            type="category"
            dataKey="hts_code"
            width={90}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="count" name="出現回数" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 成功率の表示 */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-semibold mb-2">各HTSコードの成功率</h4>
        <div className="grid grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm p-2 rounded hover:bg-gray-50"
            >
              <span className="font-mono text-xs">{item.hts_code}</span>
              <span
                className={`font-semibold ${
                  item.success_rate >= 50
                    ? 'text-green-600'
                    : item.success_rate >= 30
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {item.success_rate.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
