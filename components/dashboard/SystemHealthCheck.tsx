// 📁 格納パス: components/dashboard/SystemHealthCheck.tsx
// 依頼内容: API接続状態（II-7）のロジックを独立させる。ebay_api_integration_example.htmlのステータスインジケータを応用。

import React from "react";
import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { Activity } from "lucide-react";

// API接続ステータスデータの型定義
interface ServiceStatus {
  name: string;
  status: "ok" | "error" | "warning";
}

const serviceData: ServiceStatus[] = [
  { name: "eBay API", status: "ok" },
  { name: "Shopee API", status: "error" }, // 例としてエラー
  { name: "Amazon API", status: "ok" },
  { name: "Supabase DB", status: "ok" },
];

/**
 * 各モールおよびデータベースのAPI接続状態を表示するウィジェット。
 */
const SystemHealthCheck: React.FC = () => {
  return (
    <Card className="col-span-12 lg:col-span-4 p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-gray-600" /> ⚙️ システム健全性チェック
      </h3>
      <div className="space-y-3">
        {serviceData.map((service) => (
          <div
            key={service.name}
            className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0"
          >
            <span>{service.name}</span>
            <div className="flex items-center gap-2">
              {/* ステータスインジケータ */}
              <div
                className={clsx("w-3 h-3 rounded-full animate-pulse", {
                  "bg-green-500": service.status === "ok",
                  "bg-red-500": service.status === "error",
                  "bg-yellow-500": service.status === "warning",
                })}
              />
              <span
                className={clsx("font-medium", {
                  "text-green-600": service.status === "ok",
                  "text-red-600": service.status === "error",
                  "text-yellow-600": service.status === "warning",
                })}
              >
                {service.status === "ok"
                  ? "接続正常"
                  : service.status === "error"
                  ? "エラー"
                  : "警告"}
              </span>
            </div>
          </div>
        ))}
        <p className="pt-2 text-xs text-gray-500">最終データ同期: 30秒前</p>
      </div>
    </Card>
  );
};

export default SystemHealthCheck;
