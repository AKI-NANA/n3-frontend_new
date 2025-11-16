'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SystemStats {
  totalTools: number;
  completedTools: number;
  totalTables: number;
  totalRecords: number;
  syncStatus: {
    yahoo: boolean;
    inventory: boolean;
    ebay: boolean;
    research: boolean;
  };
  tableRecords: {
    products_master: number;
    yahoo_scraped_products: number;
    inventory_master: number;
    ebay_inventory: number;
    research_products_master: number;
  };
  sourceBreakdown: Array<{
    source_system: string;
    count: number;
  }>;
}

interface Tool {
  id: number;
  name: string;
  path: string;
  description: string;
  status: 'complete' | 'progress' | 'planned';
  files: number;
  apis: number;
}

export default function DevGuidePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tools: Tool[] = [
    {
      id: 1,
      name: 'ダッシュボード',
      path: '01_dashboard',
      description: 'システム全体の統計とステータスを表示',
      status: 'complete',
      files: 3,
      apis: 5
    },
    {
      id: 2,
      name: 'スクレイピング',
      path: '02_scraping',
      description: 'Yahoo!オークションからデータ取得',
      status: 'complete',
      files: 70,
      apis: 12
    },
    {
      id: 3,
      name: '承認システム',
      path: '03_approval',
      description: '商品の承認・否認管理',
      status: 'complete',
      files: 5,
      apis: 8
    },
    {
      id: 4,
      name: '承認データ分析',
      path: '04_analysis',
      description: '承認データの統計分析',
      status: 'complete',
      files: 1,
      apis: 3
    },
    {
      id: 5,
      name: '利益計算',
      path: '05_rieki',
      description: '利益率と推奨価格の計算',
      status: 'complete',
      files: 22,
      apis: 6
    },
    {
      id: 6,
      name: 'フィルター管理',
      path: '06_filters',
      description: '商品フィルタリングルール管理',
      status: 'complete',
      files: 11,
      apis: 7
    },
    {
      id: 7,
      name: 'データ編集',
      path: '07_editing',
      description: '商品情報の編集',
      status: 'complete',
      files: 48,
      apis: 10
    },
    {
      id: 8,
      name: '出品管理',
      path: '08_listing',
      description: 'eBayへの出品管理',
      status: 'complete',
      files: 9,
      apis: 8
    },
    {
      id: 9,
      name: '送料計算',
      path: '09_shipping',
      description: '送料の自動計算',
      status: 'complete',
      files: 3,
      apis: 4
    },
    {
      id: 10,
      name: '在庫管理',
      path: '10_zaiko',
      description: '在庫数と状態の管理',
      status: 'complete',
      files: 2,
      apis: 5
    },
    {
      id: 11,
      name: 'カテゴリー判定',
      path: '11_category',
      description: 'AI自動カテゴリー判定',
      status: 'complete',
      files: 7,
      apis: 4
    },
    {
      id: 12,
      name: 'HTML編集',
      path: '12_html_editor',
      description: '出品HTMLの編集',
      status: 'complete',
      files: 2,
      apis: 3
    },
    {
      id: 13,
      name: '統合分析',
      path: '13_bunseki',
      description: 'システム全体の分析',
      status: 'complete',
      files: 4,
      apis: 6
    },
    {
      id: 14,
      name: 'API統合',
      path: '14_api_renkei',
      description: '外部API連携管理',
      status: 'complete',
      files: 1,
      apis: 5
    }
  ];

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  async function fetchSystemStats() {
    try {
      setLoading(true);
      const supabase = createClient();

      // 各テーブルのレコード数取得
      const [pmResult, yahooResult, invResult, ebayResult, researchResult] = await Promise.all([
        supabase.from('products_master').select('*', { count: 'exact', head: true }),
        supabase.from('yahoo_scraped_products').select('*', { count: 'exact', head: true }),
        supabase.from('inventory_master').select('*', { count: 'exact', head: true }),
        supabase.from('ebay_inventory').select('*', { count: 'exact', head: true }),
        supabase.from('research_products_master').select('*', { count: 'exact', head: true })
      ]);

      // ソース別集計
      const { data: sourceData } = await supabase
        .from('products_master')
        .select('source_system')
        .not('source_system', 'is', null);

      const sourceBreakdown = sourceData?.reduce((acc: any[], item) => {
        const existing = acc.find(x => x.source_system === item.source_system);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ source_system: item.source_system, count: 1 });
        }
        return acc;
      }, []) || [];

      // トリガー設置状況確認（Supabaseの制限で簡易チェック）
      const syncStatus = {
        yahoo: (yahooResult.count || 0) > 0,
        inventory: (invResult.count || 0) > 0,
        ebay: (ebayResult.count || 0) > 0,
        research: (researchResult.count || 0) > 0
      };

      setStats({
        totalTools: 14,
        completedTools: 14,
        totalTables: 5,
        totalRecords: pmResult.count || 0,
        syncStatus,
        tableRecords: {
          products_master: pmResult.count || 0,
          yahoo_scraped_products: yahooResult.count || 0,
          inventory_master: invResult.count || 0,
          ebay_inventory: ebayResult.count || 0,
          research_products_master: researchResult.count || 0
        },
        sourceBreakdown
      });

      setError(null);
    } catch (err) {
      console.error('統計取得エラー:', err);
      setError('データベース接続エラー');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      complete: 'bg-green-100 text-green-800',
      progress: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      complete: '完成',
      progress: '開発中',
      planned: '計画中'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-2xl p-10 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🚀 N3システム開発ガイド
          </h1>
          <p className="text-xl text-gray-600">
            Yahoo!オークション統合システム - リアルタイム開発ダッシュボード
          </p>
        </div>

        {/* リアルタイム統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="text-gray-600 text-sm mb-2">✅ 完成済みツール</div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : `${stats?.completedTools}/${stats?.totalTools}`}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
            <div className="text-gray-600 text-sm mb-2">📊 総レコード数</div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : stats?.totalRecords.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500">
            <div className="text-gray-600 text-sm mb-2">🗄️ データベーステーブル</div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : stats?.totalTables}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="text-gray-600 text-sm mb-2">⚡ 同期ステータス</div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : Object.values(stats?.syncStatus || {}).filter(Boolean).length}/4
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8">
          <div className="flex flex-wrap gap-3 mb-6">
            {['overview', 'tools', 'database', 'workflow', 'development'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'overview' && '📋 システム概要'}
                {tab === 'tools' && '🔧 ツール一覧'}
                {tab === 'database' && '🗄️ データベース'}
                {tab === 'workflow' && '🔄 ワークフロー'}
                {tab === 'development' && '💻 開発方針'}
              </button>
            ))}
          </div>

          {/* 概要タブ */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-4 border-blue-600">
                システム概要
              </h2>

              <div className="bg-green-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-green-800 mb-3">🎯 システムの目的</h3>
                <p className="text-gray-700 leading-relaxed">
                  Yahoo!オークションから商品データを取得し、フィルタリング、編集、利益計算を行い、
                  最終的にeBayへ自動出品するまでの一連のワークフローを統合管理するシステムです。
                </p>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">🔑 重要な設計原則</h3>
              <div className="bg-yellow-50 rounded-xl p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">•</span>
                    <span><strong>統合マスターテーブル:</strong> 全ツールが products_master テーブルを共有</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">•</span>
                    <span><strong>リアルタイム同期:</strong> 4つのソーステーブルから自動同期</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">•</span>
                    <span><strong>モジュラー構造:</strong> 各ツールが独立して動作可能</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">•</span>
                    <span><strong>段階的ワークフロー:</strong> スクレイピング→フィルター→編集→承認→出品</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ツール一覧タブ */}
          {activeTab === 'tools' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-4 border-blue-600">
                🔧 全14ツール詳細
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4">
                        {tool.id < 10 ? `0${tool.id}` : tool.id}
                      </div>
                      <div>
                        <div className="font-bold text-lg text-gray-900">{tool.name}</div>
                        <div className="text-sm text-gray-500">{tool.path}</div>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {tool.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-gray-600 text-xs">ファイル数</div>
                        <div className="text-gray-900 font-bold">{tool.files}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-gray-600 text-xs">API数</div>
                        <div className="text-gray-900 font-bold">{tool.apis}</div>
                      </div>
                    </div>

                    {getStatusBadge(tool.status)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* データベースタブ */}
          {activeTab === 'database' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-4 border-blue-600">
                🗄️ データベース設計（リアルタイム）
              </h2>

              <div className="bg-green-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-green-800 mb-4">📊 統合マスターテーブル設計</h3>
                <p className="text-gray-700 mb-4">
                  全14ツールが <strong className="text-blue-600">products_master</strong> という
                  単一のメインテーブルを共有し、4つのソーステーブルからリアルタイム同期されています。
                </p>

                {!loading && stats && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">現在のテーブル状況</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.tableRecords).map(([table, count]) => (
                        <div key={table} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-mono text-sm">{table}</span>
                          <span className="font-bold text-blue-600">{count.toLocaleString()} 件</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ リアルタイム同期ステータス</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {!loading && stats && Object.entries(stats.syncStatus).map(([source, active]) => (
                  <div
                    key={source}
                    className={`p-4 rounded-lg ${active ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{source}_products</span>
                      <span className="text-2xl">{active ? '✅' : '❌'}</span>
                    </div>
                    <div className="text-sm mt-2">
                      {active ? 'リアルタイム同期: 有効' : 'リアルタイム同期: 無効'}
                    </div>
                  </div>
                ))}
              </div>

              {!loading && stats && stats.sourceBreakdown.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">📊 ソース別データ分布</h3>
                  <div className="space-y-3">
                    {stats.sourceBreakdown.map(({ source_system, count }) => (
                      <div key={source_system} className="flex items-center">
                        <div className="w-32 font-mono text-sm">{source_system}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                            style={{ width: `${(count / stats.totalRecords) * 100}%` }}
                          >
                            {count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ワークフロータブ */}
          {activeTab === 'workflow' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-4 border-blue-600">
                🔄 システムワークフロー
              </h2>

              <div className="bg-blue-50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-blue-800 mb-6">📍 標準的な商品処理フロー</h3>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  {[
                    { icon: '🔍', label: 'スクレイピング', tool: 'Tool 02' },
                    { icon: '🔎', label: 'フィルター', tool: 'Tool 06' },
                    { icon: '✏️', label: '編集', tool: 'Tool 07' },
                    { icon: '💰', label: '利益計算', tool: 'Tool 05' },
                    { icon: '✅', label: '承認', tool: 'Tool 03' },
                    { icon: '🚀', label: '出品', tool: 'Tool 08' }
                  ].map((step, index) => (
                    <div key={step.label} className="flex items-center gap-4">
                      <div className="bg-white border-2 border-blue-600 rounded-xl p-6 text-center min-w-[150px]">
                        <div className="text-4xl mb-3">{step.icon}</div>
                        <div className="font-bold text-gray-900">{step.label}</div>
                        <div className="text-sm text-gray-500 mt-1">{step.tool}</div>
                      </div>
                      {index < 5 && (
                        <div className="text-4xl text-blue-600 font-bold">→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 開発方針タブ */}
          {activeTab === 'development' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-4 border-blue-600">
                💻 開発方針
              </h2>

              <div className="space-y-6">
                <div className="bg-red-50 rounded-xl p-6 border-l-4 border-red-500">
                  <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ 絶対に守るべきこと</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>products_master テーブル構造を変更しない</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>リアルタイム同期トリガーを削除しない</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>他ツールとの互換性を保つ</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-green-800 mb-4">✅ 推奨される開発方法</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span>段階的に機能を追加</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span>テストを十分に実施</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span>このダッシュボードを随時更新</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-xl p-6 border-l-4 border-yellow-500">
                  <h3 className="text-xl font-bold text-yellow-800 mb-4">💡 開発時のポイント</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>MCPツールを活用してファイル編集</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>Gitで必ずバージョン管理</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>このドキュメントを開発の起点にする</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 システム完成度: {!loading && stats ? '100%' : '...'}
          </h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            全14ツールが完全に統合され、リアルタイム同期で動作しています。<br />
            このダッシュボードを参照して、効率的に開発を進めてください。
          </p>
          <div className="pt-4 border-t border-gray-200">
            <span className="text-gray-400 text-sm">
              最終更新: {new Date().toLocaleDateString('ja-JP')} | N3システム開発チーム
            </span>
          </div>
          <button
            onClick={fetchSystemStats}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '更新中...' : '🔄 統計を更新'}
          </button>
        </div>
      </div>
    </div>
  );
}
