// 📁 格納パス: components/dashboard/KPICard.tsx
// 依頼内容: KPIサマリー表示用の再利用可能なカードコンポーネントを独立。

import React from "react";
import { Card } from "@/components/ui/card";
import { clsx } from "clsx";

interface KPICardProps {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
}

/**
 * ダッシュボードで利用される、売上や利益などの単一KPIを表示するカード。
 */
const KPICard: React.FC<KPICardProps> = ({ title, value, trend, icon }) => {
  return (
    <Card className="p-4 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-500">{title}</h4>
        <div className="text-blue-500">{icon}</div>
      </div>
      <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
      {trend && (
        <p
          className={clsx(
            "text-sm mt-1",
            trend.startsWith("+") ? "text-green-600" : "text-red-600"
          )}
        >
          {trend} vs. 前月
        </p>
      )}
    </Card>
  );
};

export default KPICard;
