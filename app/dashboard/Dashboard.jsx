import React, { useState, useEffect } from "react";
import {
  Activity,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

// Tailwind CSSでCardのようなスタイルを再現するコンポーネント
const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border bg-white shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div
    className={`flex flex-row items-center justify-between pb-2 ${className}`}
  >
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-sm font-medium text-gray-500 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`pt-4 ${className}`}>{children}</div>
);

// --- 簡易的なSVGトレンドライン（スパークライン）コンポーネント ---
const Sparkline = ({ data, color }) => {
  if (!data || data.length < 2) return <div className="h-8 w-full"></div>;

  const width = 100;
  const height = 30;
  const strokeWidth = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  // ゼロ除算防止
  const range = max - min === 0 ? 1 : max - min;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 mt-2">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        points={points}
      />
    </svg>
  );
};
// --- 模擬データとサービスロジック (エラー解消のためインライン化) ---

// 模擬KPIデータ (トレンドデータ trendData を追加)
const mockKPIs = [
  {
    title: "総受注数",
    value: "1,234",
    change: "前月比 +12.5%",
    icon: Activity,
    changeColor: "text-green-600",
    changeArrow: "▲",
    trendColor: "#10B981", // Green
    trendData: [50, 60, 40, 80, 100],
  },
  {
    title: "在庫商品数",
    value: "5,678",
    change: "稼働中: 4,321",
    icon: ShoppingCart,
    changeColor: "text-blue-600",
    changeArrow: "◆",
    trendColor: "#3B82F6", // Blue
    trendData: [100, 95, 88, 80, 75],
  },
  {
    title: "新規登録ユーザー",
    value: "78",
    change: "前月比 +2.1%",
    icon: Users,
    changeColor: "text-green-600",
    changeArrow: "▲",
    trendColor: "#10B981", // Green
    trendData: [20, 22, 25, 28, 30],
  },
  {
    title: "EC総合売上",
    value: "¥45,000,000",
    change: "前年同期比 -5.0%",
    icon: TrendingUp,
    changeColor: "text-red-600",
    changeArrow: "▼",
    trendColor: "#EF4444", // Red
    trendData: [100, 90, 95, 85, 80],
  },
];

// 模擬アクティビティデータ
const mockActivities = [
  { time: "5分前", description: "新規商品登録: SKU-12345 (Amazon)" },
  { time: "1時間前", description: "在庫更新: 50件のSKUが自動更新" },
  { time: "2時間前", description: "注文確定: 注文ID#98765が出荷待ちへ" },
  { time: "昨日", description: "AI予測レポート生成完了" },
];

// 模擬低スコア改善アイテムデータ
const mockLowScoreItems = [
  { id: 1, name: "商品A (低評価レビュー)", score: 2.1, marketplace: "楽天" },
  {
    id: 2,
    name: "商品B (在庫過多アラート)",
    score: 1.5,
    marketplace: "Amazon",
  },
  { id: 3, name: "商品C (商品画像が古い)", score: 2.9, marketplace: "自社EC" },
];

// 模擬データ取得関数
const fetchDashboardData = () => {
  return new Promise((resolve) => {
    // ネットワーク遅延を模擬
    setTimeout(() => {
      resolve({
        kpis: mockKPIs,
        activities: mockActivities,
        lowScoreItems: mockLowScoreItems,
      });
    }, 500);
  });
};

// --- メインコンポーネント ---

const DashboardPage = () => {
  const [data, setData] = useState({
    kpis: [],
    activities: [],
    lowScoreItems: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchDashboardData().then((fetchedData) => {
      setData(fetchedData);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-gray-700">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        NAGANO-3 EC統合ダッシュボード
      </h1>

      {/* 1. KPIサマリー */}
      <div className="grid gap-6 mb-10 md:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi, index) => (
          <Card key={index} className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle>{kpi.title}</CardTitle>
                <kpi.icon className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  {kpi.value}
                </div>
                <p className={`text-sm ${kpi.changeColor}`}>
                  {kpi.changeArrow} {kpi.change}
                </p>
              </CardContent>
            </div>
            {/* トレンドグラフを追加 */}
            {kpi.trendData && (
              <div className="px-6 pb-4">
                <Sparkline data={kpi.trendData} color={kpi.trendColor} />
                <p className="text-xs text-gray-400 mt-1">
                  過去5ヶ月のトレンド
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* 2. AI分析とアラート */}
      <div className="grid gap-6 mb-10 lg:grid-cols-3">
        {/* 主要機能ステータス */}
        <Card className="lg:col-span-1">
          <CardHeader className="mb-4 border-b pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800">
              主要機能ステータス
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0"></span>
                <span className="text-gray-700">
                  商品管理システム - <span className="font-medium">稼働中</span>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0"></span>
                <span className="text-gray-700">
                  在庫管理システム - <span className="font-medium">稼働中</span>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0"></span>
                <span className="text-gray-700">
                  受注管理システム - <span className="font-medium">稼働中</span>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-yellow-500 flex-shrink-0"></span>
                <span className="text-gray-700">
                  AI制御システム - <span className="font-medium">テスト中</span>
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 低スコア改善アイテム */}
        <Card className="lg:col-span-2">
          <CardHeader className="mb-4 border-b pb-2">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg font-semibold text-gray-800">
                AI推奨 改善アイテム
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {data.lowScoreItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg"
                >
                  <span className="flex items-center text-gray-700">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                    {item.name}
                  </span>
                  <span className="text-sm font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    スコア: {item.score.toFixed(1)} ({item.marketplace})
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 3. 最近のアクティビティ */}
      <Card>
        <CardHeader className="mb-4 border-b pb-2">
          <CardTitle className="text-lg font-semibold text-gray-800">
            最近のアクティビティ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {data.activities.map((activity, index) => (
              <div
                key={index}
                className="flex justify-between items-start text-sm border-l-2 border-indigo-300 pl-4 py-1"
              >
                <p className="text-gray-700">{activity.description}</p>
                <span className="text-gray-500 text-xs font-light ml-4 flex-shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        body {
          font-family: "Inter", sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  );
};

// 必須: メインコンポーネントを App としてエクスポート
export default function App() {
  return <DashboardPage />;
}
