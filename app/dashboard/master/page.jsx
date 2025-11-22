'use client';

/**
 * ==============================================================================
 * MasterDashboard V1.0 - 総合ダッシュボード
 * ==============================================================================
 * すべてのモールに対応した受注・出荷・出品データを一元集約し、
 * アカウントヘルス維持のために必要な情報とアクションリンクを提供する。
 *
 * 技術スタック:
 * - React (Hooks)
 * - Next.js App Router
 * - Tailwind CSS v4
 * - Firebase (Auth/データ管理)
 * - Google Gemini API (AI分析)
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, onSnapshot, where } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  Brain,
  Bell,
  ExternalLink,
  Activity,
  Store,
  MessageSquare,
  Star,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

// ==============================================================================
// 定数・設定
// ==============================================================================

const __DASHBOARD_VERSION = "Master V1.0";
const __APP_ID = process.env.NEXT_PUBLIC_APP_ID || "order_manager_v2";

// Firebase設定（環境変数から取得）
const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-order-manager",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Gemini API設定
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

// モール定義
const ALL_MALLS_DATA = [
  {
    id: 'ebay',
    name: 'eBay',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    url: 'https://www.ebay.com/sh/dash',
    stats: { unshipped: 0, messages: 0, rating: 0, sales: 0, danger: false, riskUrl: 'https://www.ebay.com/sh/performance' }
  },
  {
    id: 'shopee',
    name: 'Shopee',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    buttonBg: 'bg-red-600 hover:bg-red-700',
    url: 'https://seller.shopee.jp/',
    stats: { unshipped: 0, messages: 0, rating: 0, sales: 0, danger: false, riskUrl: 'https://seller.shopee.jp/account-health' }
  },
  {
    id: 'amazon',
    name: 'Amazon',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
    buttonBg: 'bg-orange-600 hover:bg-orange-700',
    url: 'https://sellercentral.amazon.co.jp/',
    stats: { unshipped: 0, messages: 0, rating: 0, sales: 0, danger: false, riskUrl: 'https://sellercentral.amazon.co.jp/performance/dashboard' }
  },
  {
    id: 'coupang',
    name: 'Coupang',
    textColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-500',
    buttonBg: 'bg-sky-600 hover:bg-sky-700',
    url: 'https://sell.coupang.com/',
    stats: { unshipped: 0, messages: 0, rating: 0, sales: 0, danger: false, riskUrl: 'https://sell.coupang.com/dashboard' }
  },
  {
    id: 'mercari',
    name: 'メルカリ',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-500',
    buttonBg: 'bg-pink-600 hover:bg-pink-700',
    url: 'https://www.mercari.com/jp/',
    stats: { unshipped: 0, messages: 0, rating: 0, sales: 0, danger: false, riskUrl: 'https://www.mercari.com/jp/mypage' }
  },
  {
    id: 'buyma',
    name: 'BUYMA',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    buttonBg: 'bg-purple-600 hover:bg-purple-700',
    url: 'https://www.buyma.com/',
    stats: { unshipped: 0, messages: 0, rating: 0, sales: 0, danger: false, riskUrl: 'https://www.buyma.com/my/' }
  },
];

// 初期グローバル統計
const INITIAL_GLOBAL_STATS = {
  totalSales: 0,
  yoySales: 0,
  unprocessedOrders: 0,
  urgentTasks: 0,
  overallProfitRate: 0,
};

// 初期アラート
const INITIAL_ALERTS = [];

// ==============================================================================
// Firebase初期化とデータ取得フック
// ==============================================================================

/**
 * Firebase初期化
 */
const initializeFirebase = () => {
  if (getApps().length === 0) {
    const app = initializeApp(FIREBASE_CONFIG, 'master-dashboard');
    return { app, db: getFirestore(app), auth: getAuth(app) };
  }
  const app = getApps()[0];
  return { app, db: getFirestore(app), auth: getAuth(app) };
};

/**
 * Firebase認証フック
 */
const useFirebaseAuth = () => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { auth } = initializeFirebase();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setLoading(false);
      } else {
        try {
          // カスタムトークン認証を試行
          const customToken = process.env.NEXT_PUBLIC_FIREBASE_AUTH_TOKEN;
          if (customToken) {
            await signInWithCustomToken(auth, customToken);
          } else {
            // Anonymous認証にフォールバック
            await signInAnonymously(auth);
          }
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return { userId, loading, error };
};

/**
 * 受注データ取得フック
 */
const useOrdersData = (userId) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const { db } = initializeFirebase();
    const ordersPath = `artifacts/${__APP_ID}/users/${userId}/orders`;
    const ordersRef = collection(db, ordersPath);

    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { orders, loading };
};

/**
 * グローバル統計計算
 */
const calculateGlobalStats = (orders) => {
  if (!orders || orders.length === 0) {
    return INITIAL_GLOBAL_STATS;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 30日間の売上
  const last30DaysOrders = orders.filter(o => new Date(o.date) >= thirtyDaysAgo);
  const totalSales = last30DaysOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // 前日の売上
  const yesterdayOrders = orders.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate >= yesterday && orderDate < now;
  });
  const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // 前日比計算
  const avgDailySales = totalSales / 30;
  const yoySales = avgDailySales > 0 ? ((yesterdaySales - avgDailySales) / avgDailySales * 100) : 0;

  // 未処理注文数
  const unprocessedOrders = orders.filter(o =>
    o.shippingStatus === 'pending' || o.shippingStatus === 'processing'
  ).length;

  // 緊急タスク数（期限迫る、未払い、トラブル）
  const urgentTasks = orders.filter(o => {
    if (o.shippingStatus === 'pending' && o.deadline) {
      const deadlineDate = new Date(o.deadline);
      const daysUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline <= 2;
    }
    return o.paymentStatus === 'unpaid' || o.aiScore < 30;
  }).length;

  // 総合利益率
  const totalProfit = last30DaysOrders.reduce((sum, o) => sum + ((o.totalAmount || 0) - (o.costPrice || 0)), 0);
  const overallProfitRate = totalSales > 0 ? (totalProfit / totalSales * 100) : 0;

  return {
    totalSales: Math.round(totalSales),
    yoySales: Math.round(yoySales * 10) / 10,
    unprocessedOrders,
    urgentTasks,
    overallProfitRate: Math.round(overallProfitRate * 10) / 10,
  };
};

/**
 * モール別統計計算
 */
const calculateMallStats = (orders) => {
  const mallStats = {};

  ALL_MALLS_DATA.forEach(mall => {
    const mallOrders = orders.filter(o =>
      o.mall && o.mall.toLowerCase() === mall.id.toLowerCase()
    );

    // 未発送数
    const unshipped = mallOrders.filter(o =>
      o.shippingStatus === 'pending' || o.shippingStatus === 'processing'
    ).length;

    // 未回答メッセージ数（モックデータ）
    const messages = 0;

    // セラー評価（モックデータ）
    const rating = mall.id === 'amazon' ? 98.2 : 4.85;

    // 売上（30日間）
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sales = mallOrders
      .filter(o => new Date(o.date) >= thirtyDaysAgo)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 危険度判定
    const danger = unshipped > 5 || messages > 3;

    mallStats[mall.id] = {
      unshipped,
      messages,
      rating,
      sales: Math.round(sales),
      danger,
      riskUrl: mall.stats.riskUrl
    };
  });

  return mallStats;
};

/**
 * アラート生成
 */
const generateAlerts = (orders, mallStats) => {
  const alerts = [];
  let alertId = 1;

  Object.entries(mallStats).forEach(([mallId, stats]) => {
    const mall = ALL_MALLS_DATA.find(m => m.id === mallId);

    if (stats.unshipped > 5) {
      alerts.push({
        id: alertId++,
        mall: mall.name,
        type: 'Performance',
        message: `未発送注文が${stats.unshipped}件あります。出荷遅延のリスクがあります。`,
        severity: stats.unshipped > 10 ? 'danger' : 'warning'
      });
    }

    if (stats.messages > 3) {
      alerts.push({
        id: alertId++,
        mall: mall.name,
        type: 'Messages',
        message: `未回答メッセージが${stats.messages}件あります。24時間以内に対応してください。`,
        severity: 'warning'
      });
    }
  });

  return alerts;
};

// ==============================================================================
// ユーティリティ関数
// ==============================================================================

/**
 * ステータスカラー取得
 */
const getStatusColor = (count, dangerThreshold) => {
  if (count > dangerThreshold) return 'text-red-600 bg-red-100 border-red-400';
  if (count > 0) return 'text-yellow-600 bg-yellow-100 border-yellow-400';
  return 'text-green-600 bg-green-100 border-green-400';
};

// ==============================================================================
// UIコンポーネント
// ==============================================================================

/**
 * グローバルKPIカード
 */
const GlobalStatCard = ({ title, value, unit, icon: Icon, color, change, changeColor }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
    <div className={`text-3xl font-extrabold ${color} mb-2 flex items-center gap-3`}>
      <Icon className="w-8 h-8" />
      <span>{value}{unit}</span>
    </div>
    <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</div>
    {change !== undefined && change !== null && (
      <div className={`text-xs mt-2 flex items-center gap-1 ${changeColor}`}>
        {change > 0 ? '↑' : '↓'} {Math.abs(change)}% (前日比)
      </div>
    )}
  </div>
);

/**
 * モールヘルスカード
 */
const MallHealthCard = ({ mall, stats }) => {
  const { unshipped, messages, rating, sales, danger, riskUrl } = stats;
  const ratingText = mall.id === 'amazon' ? `${rating}%` : `${rating.toFixed(2)} / 5.0`;

  return (
    <div className={`p-5 rounded-xl shadow-md border-l-4 ${danger ? mall.borderColor + ' ' + mall.bgColor : 'border-gray-200 bg-white dark:bg-gray-800'} hover:shadow-lg transition-all`}>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
        <a
          href={mall.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-lg font-bold flex items-center gap-2 ${mall.textColor} hover:underline`}
        >
          <Store className="w-5 h-5" />
          {mall.name}
          <ExternalLink className="w-4 h-4" />
        </a>
        <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
          ¥{sales.toLocaleString()}
        </span>
      </div>

      {/* 統計グリッド */}
      <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
        {/* 未発送注文 */}
        <a
          href={riskUrl || mall.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-3 rounded-lg border flex flex-col items-center justify-center cursor-pointer hover:shadow-sm transition ${getStatusColor(unshipped, 5)}`}
        >
          <Package className="w-6 h-6 mb-1" />
          <span className="text-xl font-bold">{unshipped}</span>
          <span className="mt-1">未発送注文</span>
        </a>

        {/* 未回答メッセージ */}
        <a
          href={mall.url + '/messages'}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-3 rounded-lg border flex flex-col items-center justify-center cursor-pointer hover:shadow-sm transition ${getStatusColor(messages, 0)}`}
        >
          <MessageSquare className="w-6 h-6 mb-1" />
          <span className="text-xl font-bold">{messages}</span>
          <span className="mt-1">未回答メッセージ</span>
        </a>

        {/* セラー評価 */}
        <div className="p-3 rounded-lg border flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700">
          <Star className="w-6 h-6 mb-1 text-yellow-500" />
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{ratingText}</span>
          <span className="mt-1 text-gray-600 dark:text-gray-300">セラー評価</span>
        </div>

        {/* 緊急リスク */}
        <div className="p-3 rounded-lg border flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700">
          {danger ? (
            <AlertTriangle className="w-6 h-6 mb-1 text-red-500" />
          ) : (
            <CheckCircle className="w-6 h-6 mb-1 text-green-500" />
          )}
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {danger ? '要対応' : '正常'}
          </span>
          <span className="mt-1 text-gray-600 dark:text-gray-300">緊急リスク</span>
        </div>
      </div>
    </div>
  );
};

/**
 * サイドバーリンク
 */
const SidebarLink = ({ icon: Icon, text, url, colorClasses, isExternal = false }) => {
  const className = `flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition text-white ${colorClasses} cursor-pointer`;

  if (isExternal) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon className="w-5 h-5" />
        <span className="flex-1">{text}</span>
        <ExternalLink className="w-4 h-4" />
      </a>
    );
  }

  return (
    <Link href={url} className={className}>
      <Icon className="w-5 h-5" />
      {text}
    </Link>
  );
};

// ==============================================================================
// メインコンポーネント
// ==============================================================================

export default function MasterDashboard() {
  // Firebase認証
  const { userId, loading: authLoading, error: authError } = useFirebaseAuth();

  // 受注データ取得
  const { orders, loading: ordersLoading } = useOrdersData(userId);

  // 状態管理
  const [aiHealthAnalysis, setAiHealthAnalysis] = useState('AIによる総合ヘルスチェックを実行してください...');
  const [aiLoading, setAiLoading] = useState(false);

  // 統計計算（メモ化）
  const stats = useMemo(() => calculateGlobalStats(orders), [orders]);
  const mallStatsMap = useMemo(() => calculateMallStats(orders), [orders]);
  const mallData = useMemo(() =>
    ALL_MALLS_DATA.map(mall => ({
      ...mall,
      stats: mallStatsMap[mall.id] || mall.stats
    })),
    [mallStatsMap]
  );
  const alerts = useMemo(() => generateAlerts(orders, mallStatsMap), [orders, mallStatsMap]);

  /**
   * AIヘルスチェック実行
   */
  const runAiHealthCheck = useCallback(async () => {
    if (!GEMINI_API_KEY) {
      setAiHealthAnalysis(
        '<div class="p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">' +
        '<p class="font-bold mb-2">⚠️ Gemini API Keyが設定されていません</p>' +
        '<p class="text-sm">環境変数 <code class="bg-yellow-200 px-1 rounded">NEXT_PUBLIC_GEMINI_API_KEY</code> を設定してください。</p>' +
        '</div>'
      );
      return;
    }

    setAiLoading(true);
    setAiHealthAnalysis(
      '<div class="text-center py-8 text-blue-600">' +
      '<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>' +
      '<p>AIが全モールデータを分析中...</p>' +
      '</div>'
    );

    const prompt = `
現在の全モールのKPIは以下の通りです。

【全体統計】
- 全体売上（30日）: ${stats.totalSales.toLocaleString()}円 (前日比 ${stats.yoySales > 0 ? '+' : ''}${stats.yoySales}%)
- 未処理注文総数: ${stats.unprocessedOrders}件
- 緊急タスク総数: ${stats.urgentTasks}件
- 総合利益率: ${stats.overallProfitRate}%

【各モールの状況】
${mallData.map(m =>
  `- ${m.name}: 未発送${m.stats.unshipped}件, メッセージ${m.stats.messages}件, 評価${m.stats.rating}, 売上¥${m.stats.sales.toLocaleString()}`
).join('\n')}

これらのデータに基づき、以下の2点を提案してください：
1. **最も致命的なリスク**（具体的なモールと理由を明記）
2. **今週優先すべきビジネス戦略**（具体的なアクションを3つ箇条書きで提案）

HTML形式で、視覚的に分かりやすく回答してください。
`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI分析結果を取得できませんでした。';

      setAiHealthAnalysis(
        '<div class="prose prose-sm max-w-none">' +
        '<h4 class="font-bold text-lg text-blue-700 mb-3 flex items-center gap-2">' +
        '🤖 AI総合ヘルスチェック結果' +
        '</h4>' +
        analysisText +
        '</div>'
      );
    } catch (error) {
      console.error('AI Health Check Error:', error);
      setAiHealthAnalysis(
        '<div class="p-4 bg-red-50 border border-red-300 rounded-lg text-red-800">' +
        '<p class="font-bold mb-2">❌ AI分析中にエラーが発生しました</p>' +
        `<p class="text-sm">${error.message}</p>` +
        '</div>'
      );
    } finally {
      setAiLoading(false);
    }
  }, [stats, mallData]);

  // ローディング状態
  if (authLoading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-800">認証エラー</h2>
          </div>
          <p className="text-red-700">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 font-sans">
      {/* サイドバー */}
      <aside className="w-64 bg-gray-800 dark:bg-gray-950 p-4 shadow-2xl space-y-6 flex flex-col h-screen sticky top-0 overflow-y-auto">
        {/* ロゴ */}
        <div className="border-b border-gray-700 pb-4 mb-3">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-400" />
            {__DASHBOARD_VERSION}
          </h1>
        </div>

        {/* 内部ツールリンク */}
        <nav className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2">システムツール</p>
          <SidebarLink icon={Activity} text="総合ダッシュボード" url="/dashboard/master" colorClasses="bg-blue-500 hover:bg-blue-600" />
          <SidebarLink icon={ShoppingCart} text="受注管理" url="/management/orders/v2" colorClasses="bg-indigo-500 hover:bg-indigo-600" />
          <SidebarLink icon={Package} text="出荷管理" url="/management/shipping" colorClasses="bg-purple-500 hover:bg-purple-600" />
          <SidebarLink icon={Store} text="eBayダッシュボード" url="/ebay" colorClasses="bg-red-500 hover:bg-red-600" />
        </nav>

        {/* モール別リンク */}
        <nav className="pt-4 border-t border-gray-700 space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2">モール別リンク</p>
          {mallData.map(m => (
            <SidebarLink
              key={m.id}
              icon={Store}
              text={m.name}
              url={m.url}
              colorClasses={m.buttonBg}
              isExternal
            />
          ))}
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* ヘッダー */}
        <header className="mb-6 flex justify-between items-center border-b border-gray-300 dark:border-gray-700 pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">グローバルサマリー</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              全{orders.length}件の注文データを分析中
            </p>
          </div>
          <button
            onClick={runAiHealthCheck}
            disabled={aiLoading}
            className="py-3 px-5 rounded-lg text-white font-semibold flex items-center gap-2 transition bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
          >
            {aiLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Brain className="w-5 h-5" />
            )}
            {aiLoading ? '分析中...' : '総合AIヘルスチェック'}
          </button>
        </header>

        {/* グローバルKPI */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlobalStatCard
            title="全体売上 (30日)"
            value={(stats.totalSales / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
            unit="万円"
            icon={TrendingUp}
            color="text-blue-600"
            change={stats.yoySales}
            changeColor={stats.yoySales > 0 ? 'text-green-600' : 'text-red-600'}
          />
          <GlobalStatCard
            title="未処理注文総数"
            value={stats.unprocessedOrders}
            unit="件"
            icon={Clock}
            color="text-red-600"
          />
          <GlobalStatCard
            title="緊急タスク総数"
            value={stats.urgentTasks}
            unit="件"
            icon={AlertTriangle}
            color="text-yellow-600"
          />
          <GlobalStatCard
            title="総合利益率"
            value={stats.overallProfitRate}
            unit="%"
            icon={DollarSign}
            color="text-green-600"
          />
        </section>

        {/* モール別アカウントヘルス */}
        <section className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
            モール別アカウントヘルス
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mallData.map(mall => (
              <MallHealthCard key={mall.id} mall={mall} stats={mall.stats} />
            ))}
          </div>
        </section>

        {/* AI分析とアラート */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AIヘルスチェック結果 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-500" />
              AI総合戦略レポート
            </h3>
            <div
              dangerouslySetInnerHTML={{ __html: aiHealthAnalysis }}
              className="text-gray-700 dark:text-gray-300"
            />
          </div>

          {/* 緊急アラート */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-6 h-6 text-red-500" />
              緊急アラート・要対応事項
            </h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>現在、緊急対応が必要なアラートはありません。</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'danger'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-100">
                        [{alert.mall}] {alert.type}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-medium">
                        詳細/対応
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
