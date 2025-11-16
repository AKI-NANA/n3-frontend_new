'use client'

import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  limit,
} from "firebase/firestore";
import {
  Filter,
  BarChart2,
  PieChart,
  TrendingUp,
  X,
  Check,
  Search,
  Calendar,
  ChevronDown,
  Download,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// グローバル変数（Canvas環境から提供されるもの）
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// Firebase初期化と認証
let db = null;
let auth = null;
let userId = null;

if (Object.keys(firebaseConfig).length > 0) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// データのモックアップ関数 (Supabase RPC/高性能クエリのシミュレーション)
// 実際にはバックエンドでフィルタリング・集計が行われるが、ここではクライアント側でシミュレートする
const generateMockRepositoryData = (count = 500) => {
  const statuses = ["Promoted", "Rejected", "Pending"];
  const veroRisks = ["リスク高", "リスク中", "リスク低"];
  const sources = [
    "eBay API",
    "Amazon API",
    "singlestar.jp",
    "Mercari Scraper",
  ];
  const htsCodes = [
    "8471.50",
    "9504.50",
    "8517.62",
    "8471.49",
    "9006.53",
    "9506.99",
    "8521.90",
    "9017.20",
    "8473.30",
    "9503.00",
  ];

  const mockData = [];
  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const veroRisk = veroRisks[Math.floor(Math.random() * veroRisks.length)];
    const marketVolume = Math.round(Math.random() * 500 + 50);
    const htsCode = htsCodes[Math.floor(Math.random() * htsCodes.length)];
    const researchDate = new Date(
      Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    mockData.push({
      id: `R${i.toString().padStart(4, "0")}`,
      rawTitle: `[${status}] High-End Item ${i} - ${
        sources[Math.floor(Math.random() * sources.length)]
      }`,
      researchDate: researchDate,
      dataSource: sources[Math.floor(Math.random() * sources.length)],
      veroRisk: veroRisk,
      status: status,
      marketVolume: marketVolume,
      htsCode: htsCode,
      geminiSupplier: `Supplier A (¥${Math.floor(
        Math.random() * 5000 + 1000
      )})`,
      claudeHTSLog: `Reasoning for ${htsCode}: Based on component analysis and trade agreements.`,
      veroSafeTitle: `Item ${i} - Collectible Vintage Goods`,
    });
  }
  return mockData;
};

// VEROリスクのカラー定義
const VERO_COLORS = {
  リスク高: "#ef4444", // Red
  リスク中: "#f97316", // Orange
  リスク低: "#22c55e", // Green
};

// フィルタリングパネルコンポーネント
const FilterPanel = ({ filters, setFilters, data }) => {
  const uniqueSources = useMemo(
    () => [...new Set(data.map((d) => d.dataSource))],
    [data]
  );
  const uniqueStatuses = useMemo(
    () => [...new Set(data.map((d) => d.status))],
    [data]
  );
  const uniqueVeroRisks = useMemo(
    () => [...new Set(data.map((d) => d.veroRisk))],
    [data]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === prev[key] ? "" : value, // トグル機能
    }));
  };

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      {/* データ取得元フィルタ */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          データ取得元
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          value={filters.dataSource}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, dataSource: e.target.value }))
          }
        >
          <option value="">すべて</option>
          {uniqueSources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* VEROリスク判定フィルタ */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          VEROリスク
        </label>
        <div className="flex space-x-2">
          {uniqueVeroRisks.map((r) => (
            <button
              key={r}
              onClick={() => handleFilterChange("veroRisk", r)}
              className={`flex-1 py-1 px-2 rounded-lg transition-all text-xs font-medium ${
                filters.veroRisk === r
                  ? `bg-opacity-100 text-white`
                  : `bg-opacity-20 text-gray-800 hover:bg-opacity-30`
              }`}
              style={{
                backgroundColor:
                  filters.veroRisk === r
                    ? VERO_COLORS[r]
                    : VERO_COLORS[r] + "33",
                color: filters.veroRisk === r ? "white" : VERO_COLORS[r],
              }}
            >
              {r.replace("リスク", "")}
            </button>
          ))}
        </div>
      </div>

      {/* ステータスフィルタ */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          ステータス
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value }))
          }
        >
          <option value="">すべて</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* 取得期間フィルタ (簡略化) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          取得期間 (直近)
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          value={filters.period}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, period: e.target.value }))
          }
        >
          <option value="all">全期間</option>
          <option value="90d">直近3ヶ月間</option>
          <option value="30d">直近1ヶ月間</option>
          <option value="7d">直近7日間</option>
        </select>
      </div>
    </div>
  );
};

// グラフ描画コンポーネント
const VisualizationDashboard = ({ filteredData }) => {
  // 1. リサーチ成功率 (Promoted / 総数)
  const successRateData = useMemo(() => {
    const total = filteredData.length;
    const promoted = filteredData.filter((d) => d.status === "Promoted").length;
    const rejected = filteredData.filter((d) => d.status === "Rejected").length;
    const pending = total - promoted - rejected;

    return [
      { name: "Promoted (成功)", value: promoted, color: "#10b981" }, // Emerald
      { name: "Rejected (却下)", value: rejected, color: "#f87171" }, // Red
      { name: "Pending (未処理)", value: pending, color: "#facc15" }, // Yellow
    ];
  }, [filteredData]);

  // 2. VEROリスク分布 (円グラフ)
  const veroDistributionData = useMemo(() => {
    const counts = filteredData.reduce((acc, d) => {
      acc[d.veroRisk] = (acc[d.veroRisk] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map((risk) => ({
      name: risk,
      value: counts[risk],
      color: VERO_COLORS[risk],
    }));
  }, [filteredData]);

  // 3. 市場流通数と成功率の相関 (散布図)
  const correlationData = useMemo(() => {
    return filteredData.map((d) => ({
      marketVolume: d.marketVolume,
      success: d.status === "Promoted" ? 1 : 0, // Promoted=1, Others=0
      name: d.rawTitle,
    }));
  }, [filteredData]);

  // 4. HTSコードの頻度 (棒グラフ)
  const htsFrequencyData = useMemo(() => {
    const counts = filteredData.reduce((acc, d) => {
      acc[d.htsCode] = (acc[d.htsCode] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts)
      .map((code) => ({ name: code, count: counts[code] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* グラフ 1: リサーチ成功率 */}
      <DashboardCard title="リサーチ成功率 (Promotedへの移行)">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPieChart>
            <Pie
              data={successRateData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {successRateData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-gray-500 mt-2">
          総リサーチデータ数: {filteredData.length}件
        </p>
      </DashboardCard>

      {/* グラフ 2: VEROリスク分布 */}
      <DashboardCard title="VEROリスク分布 (却下理由分析)">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPieChart>
            <Pie
              data={veroDistributionData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
            >
              {veroDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-gray-500 mt-2">
          リスクの高いカテゴリの特定に役立ちます。
        </p>
      </DashboardCard>

      {/* グラフ 3: HTSコードの頻度 (トップ10) */}
      <DashboardCard title="HTSコードの頻度 (トップ10)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={htsFrequencyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* グラフ 4: 市場流通数と成功率の相関 */}
      <DashboardCard title="市場流通数と成功率の相関 (散布図)">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="marketVolume"
              name="市場流通数"
              unit="件"
            />
            <YAxis
              type="number"
              dataKey="success"
              name="Promoted"
              domain={[0, 1]}
              tickFormatter={(val) => (val === 1 ? "Yes" : "No")}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={correlationData} fill="#0ea5e9" />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-gray-500 mt-2">
          PromotedデータはY軸1.0にプロットされます。
        </p>
      </DashboardCard>
    </div>
  );
};

// ヘルパーコンポーネント
const DashboardCard = ({ title, children }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 transition duration-300 hover:shadow-xl">
    <h3 className="flex items-center text-lg font-bold text-gray-800 border-b pb-2 mb-3">
      <BarChart2 className="w-5 h-5 mr-2 text-blue-600" />
      {title}
    </h3>
    {children}
  </div>
);

// モーダルコンポーネント
const DetailModal = ({ item, onClose }) => {
  if (!item) return null;

  const riskColor = VERO_COLORS[item.veroRisk] || "#9ca3af";

  const renderDetailRow = (label, value, isLog = false) => (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
      <div
        className={`p-3 rounded-lg ${
          isLog
            ? "bg-gray-100 text-sm font-mono whitespace-pre-wrap"
            : "bg-white font-medium text-gray-800 border"
        }`}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            個別リサーチデータ詳細: {item.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex space-x-4">
            {/* Status Chip */}
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                item.status === "Promoted"
                  ? "bg-green-100 text-green-700"
                  : item.status === "Rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {item.status}
            </span>

            {/* VERO Chip */}
            <span
              className="px-3 py-1 text-sm font-semibold rounded-full text-white"
              style={{ backgroundColor: riskColor }}
            >
              VERO: {item.veroRisk}
            </span>

            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
              From: {item.dataSource}
            </span>
          </div>

          {renderDetailRow(
            "生のタイトル / 価格",
            `${item.rawTitle} | Market Volume: ${item.marketVolume}件`
          )}

          {renderDetailRow("Gemini/AI 仕入れ先候補", item.geminiSupplier)}

          {renderDetailRow("VERO回避用タイトル", item.veroSafeTitle)}

          {renderDetailRow(
            "ClaudeによるHTSコード推定ロジック",
            item.claudeHTSLog,
            true
          )}

          {renderDetailRow("推定HTSコード", item.htsCode)}
        </div>
      </div>
    </div>
  );
};

// メインコンポーネント
const ResearchAnalyticsDashboard = () => {
  const [mockData] = useState(generateMockRepositoryData(500)); // 500件のモックデータを生成
  const [filters, setFilters] = useState({
    dataSource: "",
    veroRisk: "",
    status: "",
    period: "90d", // 初期値は直近3ヶ月
    search: "",
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Firestore認証ロジック
  useEffect(() => {
    if (!db || !auth) {
      console.error("Firebase is not initialized.");
      return;
    }

    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
        setIsAuthReady(true);
        userId = auth.currentUser?.uid || "anonymous";
      } catch (error) {
        console.error("Firebase authentication failed:", error);
        setIsAuthReady(true);
        userId = "anonymous-error";
      }
    };

    authenticate();
  }, []);

  // データのフィルタリングと集計 (Supabase RPCの代わり)
  const filteredData = useMemo(() => {
    if (!mockData) return [];

    let data = mockData;

    // 1. 取得期間フィルタリング
    const now = new Date();
    if (filters.period !== "all") {
      const days = parseInt(filters.period.replace("d", ""));
      const dateLimit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      data = data.filter((d) => new Date(d.researchDate) >= dateLimit);
    }

    // 2. その他のフィルタリング
    if (filters.dataSource) {
      data = data.filter((d) => d.dataSource === filters.dataSource);
    }
    if (filters.veroRisk) {
      data = data.filter((d) => d.veroRisk === filters.veroRisk);
    }
    if (filters.status) {
      data = data.filter((d) => d.status === filters.status);
    }
    if (filters.search) {
      const lowerSearch = filters.search.toLowerCase();
      data = data.filter(
        (d) =>
          d.rawTitle.toLowerCase().includes(lowerSearch) ||
          d.id.toLowerCase().includes(lowerSearch)
      );
    }

    return data;
  }, [mockData, filters]);

  // フィルタリング結果の一覧表示
  const DataList = ({ data, onSelect }) => (
    <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              生タイトル / 期間
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              VEROリスク
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              HTSコード
            </th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.slice(0, 10).map(
            (
              item // UI負荷軽減のため上位10件のみ表示
            ) => (
              <tr
                key={item.id}
                className="hover:bg-blue-50 cursor-pointer transition"
                onClick={() => onSelect(item)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="font-semibold text-gray-800 truncate max-w-xs">
                    {item.rawTitle}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.researchDate} ({item.dataSource})
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === "Promoted"
                        ? "bg-green-100 text-green-800"
                        : item.status === "Rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                  <span
                    className="p-1 rounded"
                    style={{ backgroundColor: VERO_COLORS[item.veroRisk] }}
                  >
                    {item.veroRisk}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.htsCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 transition"
                  >
                    詳細
                  </button>
                </td>
              </tr>
            )
          )}
          {filteredData.length > 10 && (
            <tr>
              <td
                colSpan="6"
                className="px-6 py-3 text-center text-sm text-gray-500 bg-gray-50"
              >
                ... さらに {filteredData.length - 10}{" "}
                件のデータがフィルタリングされています。
              </td>
            </tr>
          )}
          {filteredData.length === 0 && (
            <tr>
              <td
                colSpan="6"
                className="px-6 py-3 text-center text-sm text-gray-500"
              >
                該当するリサーチデータはありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading Authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-md p-4 sticky top-0 z-10">
        <h1 className="flex items-center text-2xl font-extrabold text-gray-900">
          <TrendingUp className="w-7 h-7 mr-3 text-blue-600" />
          リサーチ分析ダッシュボード
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          リサーチ戦略の成功/失敗要因をデータ駆動で分析します。
        </p>
      </header>

      {/* フィルタリングパネル */}
      <FilterPanel filters={filters} setFilters={setFilters} data={mockData} />

      <main className="p-6">
        {/* 検索バーとアクション */}
        <div className="mb-6 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="タイトルまたはIDで検索..."
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <button className="flex items-center bg-green-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-green-600 transition shadow-lg">
            <Download className="w-5 h-5 mr-2" />
            CSVエクスポート ({filteredData.length} 件)
          </button>
        </div>

        {/* 可視化ダッシュボード */}
        <VisualizationDashboard filteredData={filteredData} />

        {/* 個別データ一覧 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Layers className="w-5 h-5 mr-2 text-blue-600" />
            フィルタリング結果一覧 (Top 10表示)
          </h2>
          <DataList data={filteredData} onSelect={setSelectedItem} />
        </div>
      </main>

      {/* 詳細モーダル */}
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
};

export default ResearchAnalyticsDashboard;
