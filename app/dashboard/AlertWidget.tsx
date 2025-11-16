// 📁 格納パス: components/dashboard/AlertWidget.tsx
// 依頼内容: app/dashboard/page.tsxから最重要アラートウィジェットを分離・独立。

import React from "react";
import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { useDashboardData } from "@/store/useDashboardStore";
import clsx from "clsx";

/**
 * 総合ダッシュボードの最上部に表示される、ペナルティ/期日管理に関わる緊急アラートウィジェット
 */
const AlertWidget: React.FC = () => {
  const { alerts } = useDashboardData();
  const urgentCount = alerts?.urgent ?? 0;
  const paymentDueCount = alerts?.paymentDue ?? 0;
  const unhandledTasksCount = alerts?.unhandledTasks ?? 0;

  return (
    <Card
      className={clsx(
        "col-span-12 shadow-xl transition-shadow duration-300",
        urgentCount > 0
          ? "bg-red-600/90 text-white animate-pulse"
          : "bg-green-600/90 text-white"
      )}
    >
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="flex items-center text-xl font-bold whitespace-nowrap">
          <Zap className="w-6 h-6 mr-2" /> 🚨 最重要アラート・タスク
        </h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <div className="flex items-center">
            モール緊急通知:{" "}
            <span className="ml-2 text-2xl font-extrabold">
              {urgentCount} 件
            </span>
          </div>
          <div className="flex items-center">
            本日支払期限:{" "}
            <span className="ml-2 text-2xl font-extrabold">
              {paymentDueCount} 件
            </span>
          </div>
          <div className="flex items-center">
            未対応タスク:{" "}
            <span className="ml-2 text-2xl font-extrabold">
              {unhandledTasksCount} 件
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AlertWidget;
