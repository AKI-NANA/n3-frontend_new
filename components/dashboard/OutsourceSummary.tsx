// 📁 格納パス: components/dashboard/OutsourceSummary.tsx
// 依頼内容: 外注業務実績サマリー（II-6）のウィジェットを独立させる。

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Truck, MessageSquare } from "lucide-react";

// 外注実績の型（データはZustandから取得を想定）
interface OutsourceData {
  yesterdayShipping: number;
  yesterdayInquiry: number;
}

const mockOutsource: OutsourceData = {
  yesterdayShipping: 150, // 昨日の出荷処理件数
  yesterdayInquiry: 25, // 昨日の問い合わせ完了件数
};

/**
 * 外注スタッフの作業実績を表示し、業務進捗を管理者が把握するためのウィジェット。
 */
const OutsourceSummary: React.FC = () => {
  const data = mockOutsource; // 実際はZustandストア経由

  return (
    <Card className="col-span-12 sm:col-span-6 lg:col-span-4 p-4 shadow-md">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Users className="w-5 h-5 text-gray-600" /> 🧑‍💻 外注業務実績サマリー
      </h3>

      <div className="space-y-3">
        {/* 1. 出荷処理件数（昨日） */}
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <Truck className="w-4 h-4" /> 昨日の出荷処理完了件数
          </span>
          <span className="text-xl font-bold text-green-600">
            {data.yesterdayShipping} 件
          </span>
        </div>

        {/* 2. 問い合わせ完了件数（昨日） */}
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <MessageSquare className="w-4 h-4" /> 昨日の問い合わせ完了件数
          </span>
          <span className="text-xl font-bold text-green-600">
            {data.yesterdayInquiry} 件
          </span>
        </div>

        <p className="text-xs text-gray-500 pt-2">
          作業ログより集計。対目標達成率: **95%**
        </p>
      </div>
    </Card>
  );
};

export default OutsourceSummary;
