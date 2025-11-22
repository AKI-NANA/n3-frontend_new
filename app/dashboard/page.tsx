// app/dashboard/page.tsx (UPDATED: 会計・AI経営分析ハブを統合)
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  BarChart2,
  Check,
  Lightbulb,
  Brain,
  TrendingDown,
  PieChart,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

// --- エラー解消のための模擬データとサービスロジックのインライン実装 ---

// 模擬KPIデータ取得関数
const getMedianFinalProfit = () => 18500; // 確定利益の中央値 (新規KPI)

// 模擬カテゴリー別利益成績データ取得関数
const getCategoryProfitPerformance = () => [
  { category: "ホビー・フィギュア", medianProfit: 35000 },
  { category: "アパレル", medianProfit: 18000 },
  { category: "家電・カメラ", medianProfit: 12000 },
  { category: "日用品", medianProfit: 8000 },
];

// 模擬低スコア改善アイテムデータ取得関数
const getLowScoreItemsForImprovement = () => [
  { orderId: "SKU-001", category: "アパレル", seoScore: 55 },
  { orderId: "SKU-005", category: "日用品", seoScore: 48 },
  { orderId: "SKU-012", category: "家電・カメラ", seoScore: 62 },
];

// --- 既存のモックデータ ---
const MOCK_OUTSTANDING_INVOICE_COUNT = 7; // 出荷管理から連携される
const MOCK_LISTING_LIMIT_REACHED = true;

// ダッシュボードコンポーネント
export default function DashboardPage() {
  // インライン化した模擬アナリティクスサービスの呼び出し
  const medianProfit = useMemo(() => getMedianFinalProfit(), []);
  const categoryPerformance = useMemo(() => getCategoryProfitPerformance(), []);
  const lowScoreItems = useMemo(() => getLowScoreItemsForImprovement(), []);

  // 会計データの状態管理
  const [financialData, setFinancialData] = useState<any>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 会計データを取得
  useEffect(() => {
    async function fetchAccountingData() {
      try {
        // 財務サマリーを取得
        const financialRes = await fetch('/api/accounting/financial-summary?period=MONTHLY');
        const financialJson = await financialRes.json();
        if (financialJson.success) {
          setFinancialData(financialJson.data);
        }

        // 経費内訳を取得
        const expenseRes = await fetch('/api/accounting/expense-breakdown?period=MONTHLY');
        const expenseJson = await expenseRes.json();
        if (expenseJson.success) {
          setExpenseBreakdown(expenseJson.data);
        }

        // AI分析結果を取得
        const aiRes = await fetch('/api/accounting/ai-analysis?limit=1');
        const aiJson = await aiRes.json();
        if (aiJson.success && aiJson.data.length > 0) {
          setAiAnalysis(aiJson.data[0]);
        }
      } catch (error) {
        console.error('会計データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAccountingData();
  }, []);

  // フォーマットヘルパー
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  // 経費内訳の円グラフ用データ
  const expensePieData = expenseBreakdown.slice(0, 5).map(item => ({
    name: item.account_title,
    value: item.total_amount,
  }));

  // 円グラフの色
  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold text-indigo-800 border-b pb-2">
        総合EC管理システム v2.0 ダッシュボード
      </h1>

      {/* 🚨 最重要アラートハブ (税務調査対策・ペナルティ回避) */}
      <Card className="border-4 border-red-500 shadow-xl bg-red-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-6 w-6" /> 🚨 最重要アラートハブ
            (即時対応必須)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 経費証明不一致アラート (指示書 IV.) */}
          {MOCK_OUTSTANDING_INVOICE_COUNT > 0 && (
            <div className="p-3 bg-red-100 rounded-lg border border-red-300 flex justify-between items-center">
              <p className="font-semibold text-red-800">
                <span className="text-2xl font-extrabold mr-2">
                  {MOCK_OUTSTANDING_INVOICE_COUNT}
                </span>{" "}
                件の出荷済み受注に対し、**送料証明書が紐付けられていません**。
              </p>
              <Button variant="destructive" size="sm">
                請求書登録へ
              </Button>
            </div>
          )}

          {/* 出品枠上限アラート (指示書 II.) */}
          {MOCK_LISTING_LIMIT_REACHED && (
            <div className="p-3 bg-yellow-100 rounded-lg border border-yellow-300 flex justify-between items-center">
              <p className="font-semibold text-yellow-800">
                eBay出品枠が上限に達しています。自動出品は停止中です。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-yellow-800 border-yellow-800"
              >
                枠管理へ
              </Button>
            </div>
          )}

          {/* アラートがない場合 */}
          {!MOCK_OUTSTANDING_INVOICE_COUNT && !MOCK_LISTING_LIMIT_REACHED && (
            <div className="text-center text-green-600 font-medium py-3">
              <Check className="h-5 w-5 inline mr-2" />{" "}
              現在、緊急対応を要するアラートはありません。
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🧠 AI経営方針提言パネル (指示書 III.B) */}
      {aiAnalysis && (
        <Card className="border-4 border-purple-500 shadow-xl bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-purple-700">
              <Brain className="h-6 w-6" /> 🧠 AI経営方針提言
            </CardTitle>
            <span className="text-sm text-gray-500">
              分析日: {aiAnalysis.analysis_date}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 現状の評価 */}
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">📊 現状の評価</h3>
              <p className="text-gray-700">{aiAnalysis.evaluation_summary}</p>
            </div>

            {/* 主要KPI */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg shadow">
                <p className="text-sm text-gray-500">粗利率</p>
                <p className="text-2xl font-bold text-green-600">
                  {aiAnalysis.gross_profit_rate?.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <p className="text-sm text-gray-500">純利益率</p>
                <p className="text-2xl font-bold text-blue-600">
                  {aiAnalysis.net_profit_rate?.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <p className="text-sm text-gray-500">経費率</p>
                <p className="text-2xl font-bold text-orange-600">
                  {aiAnalysis.expense_ratio?.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 課題点 */}
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">⚠️ 課題点</h3>
              <ul className="list-disc list-inside space-y-1">
                {aiAnalysis.issues.map((issue: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{issue}</li>
                ))}
              </ul>
            </div>

            {/* 経営方針の提言 */}
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">💡 経営方針の提言</h3>
              <ul className="space-y-2">
                {aiAnalysis.policy_recommendation.map((recommendation: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">{idx + 1}.</span>
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIサマリー (指示書 I.A) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 1. 確定利益の中央値 (新規KPI) */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              確定利益の中央値
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {formatCurrency(medianProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              純利益の安定性を評価
            </p>
          </CardContent>
        </Card>

        {/* 2. 総受注数 (既存) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              総受注数 (今月)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">前月比 +15%</p>
          </CardContent>
        </Card>

        {/* 3. 在庫商品数 (既存) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">在庫商品数</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5,678</div>
            <p className="text-xs text-muted-foreground">稼働中: 4,321</p>
          </CardContent>
        </Card>

        {/* 4. 平均SEO状態スコア (新規KPI) */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              平均SEO状態スコア
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">88.5</div>
            <p className="text-xs text-muted-foreground">
              改善タスク: {lowScoreItems.length}件
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細分析セクション (指示書 I.B) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. カテゴリー別利益成績 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart2 className="h-5 w-5 text-purple-600" />{" "}
              カテゴリー別利益成績 (中央値ベース)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryPerformance.map((item, index) => (
                <div key={item.category} className="flex items-center">
                  <span className="w-1/4 text-sm font-medium text-gray-700">
                    {item.category}
                  </span>
                  <div className="w-3/4 flex items-center">
                    <div className="relative flex-grow h-3 bg-gray-200 rounded-full mr-4">
                      {/* 簡易な幅シミュレーション: medianProfitの値を最大100%として表示 */}
                      <div
                        className="absolute h-3 bg-purple-500 rounded-full"
                        style={{
                          width: `${Math.min(100, item.medianProfit / 500)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold w-[120px] text-right">
                      {formatCurrency(item.medianProfit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. SEO改善タスク */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="h-5 w-5 text-orange-600" />{" "}
              SEO改善推奨アイテム
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {lowScoreItems.length > 0 ? (
                lowScoreItems.map((item) => (
                  <li
                    key={item.orderId}
                    className="flex justify-between items-center border-b pb-2 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.orderId}
                      </p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <span className="font-bold text-orange-500">
                      {item.seoScore}{" "}
                      <span className="text-xs text-gray-500">点</span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">
                  現在、改善が必要なアイテムはありません。
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 会計分析セクション (指示書 III.A) */}
      {financialData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 月次P/Lサマリー */}
          <Card className="border-t-4 border-t-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-indigo-600" />{" "}
                月次P/Lサマリー
              </CardTitle>
              <p className="text-sm text-gray-500">
                {financialData.periodStart} 〜 {financialData.periodEnd}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">総売上</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(financialData.totalRevenue)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">売上原価</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(financialData.totalCOGS)}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">粗利</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialData.grossProfit)}
                  </p>
                  <p className="text-xs text-gray-500">
                    粗利率: {financialData.grossProfitRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">総経費</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(financialData.totalExpenses)}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                <p className="text-sm text-gray-500">純利益</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(financialData.netProfit)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  純利益率: {financialData.netProfitRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 経費の内訳（円グラフ） */}
          <Card className="border-t-4 border-t-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <PieChart className="h-5 w-5 text-orange-600" />{" "}
                経費の内訳
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expensePieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatCurrency(Number(value))}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {expenseBreakdown.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-700">{item.account_title}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {formatCurrency(item.total_amount)} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  経費データがありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
