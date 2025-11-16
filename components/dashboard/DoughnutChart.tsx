// 📁 格納パス: components/dashboard/DoughnutChart.tsx
// 依頼内容: multi_marketplace_dashboard.htmlにあるドーナツチャートをReactコンポーネント化する。

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

// 仮のProps
interface DoughnutChartProps {
  data: { label: string; value: number }[];
  className?: string;
}

/**
 * モールごとの売上貢献度を視覚化するドーナツチャートウィジェット。
 * 実際には外部チャートライブラリ（例: react-chartjs-2）に依存します。
 */
const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, className }) => {
  // 実際にはここでChart.jsの描画ロジックを実装します。

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        {/* 描画エリアのプレースホルダー */}
        <div className="text-center">
          <p className="text-gray-800 font-bold mb-2">
            総売上: ${total.toLocaleString()}
          </p>
          <ul className="space-y-1 text-left text-xs">
            {data.map((item, index) => (
              <li key={index} className="flex justify-between">
                <span>{item.label}:</span>
                <span className="font-semibold ml-2">
                  {((item.value / total) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DoughnutChart;
