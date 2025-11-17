'use client';

import { Card } from '@/components/ui/card';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import type { MarketVolumeCorrelation } from '@/lib/research-analytics/types';
import { TrendingUp } from 'lucide-react';

interface MarketVolumeScatterProps {
  data: MarketVolumeCorrelation[];
  isLoading?: boolean;
}

export function MarketVolumeScatter({ data, isLoading }: MarketVolumeScatterProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">市場流通数と成功率の相関</h3>
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
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">市場流通数と成功率の相関</h3>
        </div>
        <div className="h-96 flex items-center justify-center text-gray-400">
          データがありません
        </div>
      </Card>
    );
  }

  // Promoted と Non-Promoted に分ける
  const promotedData = data
    .filter((item) => item.is_promoted)
    .map((item) => ({
      x: item.market_volume,
      y: item.price,
      title: item.title,
    }));

  const nonPromotedData = data
    .filter((item) => !item.is_promoted)
    .map((item) => ({
      x: item.market_volume,
      y: item.price,
      title: item.title,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border max-w-xs">
          <p className="font-semibold text-sm mb-1">{data.title}</p>
          <p className="text-sm text-gray-600">
            市場流通数: {data.x.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">価格: ${data.y.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">市場流通数と成功率の相関</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        緑: Promoted（昇格済み）/ 赤: その他のステータス
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="市場流通数"
            label={{ value: '市場流通数', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="価格"
            label={{ value: '価格 ($)', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis range={[50, 200]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter
            name="Promoted"
            data={promotedData}
            fill="#16a34a"
            fillOpacity={0.6}
          />
          <Scatter
            name="非Promoted"
            data={nonPromotedData}
            fill="#dc2626"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
