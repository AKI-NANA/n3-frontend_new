'use client';

/**
 * 統合出品データ管理UI - メインページ
 *
 * 多販路の出品状況を単一のUIで正確に把握し、
 * 在庫・価格ロジック（第1層/第4層）と出品データ（第3層）の操作を論理的に分離
 */

import { useState, useEffect } from 'react';
import { IntegratedListingTable } from '@/components/listing/IntegratedListingTable';
import { ListingEditModal } from '@/components/listing/ListingEditModal';
import { StockDetailPanel } from '@/components/listing/StockDetailPanel';
import { ExecutionLogsPanel } from '@/components/listing/ExecutionLogsPanel';
import type { ListingItem } from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

interface Stats {
  todayListingSuccess: number;
  fatalErrors: number;
  inventorySyncQueueLength: number;
  retryQueueLength: number;
}

export default function ListingManagementPage() {
  // State管理
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [isStockDetailOpen, setIsStockDetailOpen] = useState(false);
  const [editItem, setEditItem] = useState<ListingItem | null>(null);
  const [editPlatform, setEditPlatform] = useState<Platform>('ebay');
  const [editAccountId, setEditAccountId] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    todayListingSuccess: 0,
    fatalErrors: 0,
    inventorySyncQueueLength: 0,
    retryQueueLength: 0,
  });

  // 統計情報を取得
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 実行ログから今日の成功数を取得
        const executeResponse = await fetch('/api/listing/execute');
        const executeData = await executeResponse.json();

        // 在庫同期キューの長さを取得
        const syncResponse = await fetch('/api/inventory/sync');
        const syncData = await syncResponse.json();

        setStats({
          todayListingSuccess: executeData.stats?.recentSuccesses || 0,
          fatalErrors: executeData.stats?.recentFailures || 0,
          inventorySyncQueueLength: syncData.stats?.pending || 0,
          retryQueueLength: executeData.stats?.pendingRetries || 0,
        });
      } catch (error) {
        console.error('統計情報の取得エラー:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // 1分ごとに更新

    return () => clearInterval(interval);
  }, []);

  // SKUクリック（在庫・原価詳細パネルを開く）
  const handleSkuClick = (sku: string) => {
    setSelectedSku(sku);
    setIsStockDetailOpen(true);
  };

  // 編集ボタンクリック（編集モーダルを開く）
  const handleEditClick = (item: ListingItem, platform: Platform) => {
    setEditItem(item);
    setEditPlatform(platform);
    // TODO: 実際のaccountIdを取得
    setEditAccountId('default_account');
    setIsEditModalOpen(true);
  };

  // 編集モーダル保存後
  const handleEditSave = () => {
    // テーブルを再読み込み（TODO: TanStack Query でキャッシュ無効化）
    console.log('データが保存されました。テーブルを再読み込みします。');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            統合出品データ管理
          </h1>
          <p className="text-gray-600 mt-2">
            多販路の出品状況を一元管理し、在庫・価格ロジックとの連携を実現
          </p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 統計情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">今日の出品成功数</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.todayListingSuccess}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              直近50件の実行ログ
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">致命的エラー数</div>
            <div className="text-3xl font-bold text-red-600">
              {stats.fatalErrors}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              手動確認が必要
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">在庫同期待ち</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.inventorySyncQueueLength}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              キュー待機中
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">リトライ待ち</div>
            <div className="text-3xl font-bold text-orange-600">
              {stats.retryQueueLength}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              自動リトライ予定
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              一括操作
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              CSVエクスポート
            </button>
            <button
              onClick={() => setIsLogsOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              実行ログを表示
            </button>
          </div>
          <div className="flex gap-3">
            <a
              href="/tools/inventory"
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              棚卸しUIへ →
            </a>
            <a
              href="/tools/orders"
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              受注履歴へ →
            </a>
          </div>
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow">
          <IntegratedListingTable
            onSkuClick={handleSkuClick}
            onEditClick={handleEditClick}
          />
        </div>

        {/* 使い方ガイド */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">使い方</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              <strong>SKUクリック</strong>で在庫・原価詳細パネルを表示
            </li>
            <li>
              <strong>編集ボタン</strong>で出品データを編集（タイトル、説明文、バリエーションなど）
            </li>
            <li>
              <strong>モード切替</strong>で中古優先/新品優先を変更（価格が自動再計算されます）
            </li>
            <li>
              <strong>フィルター</strong>で絞り込み（SKU検索、在庫数、カテゴリなど）
            </li>
            <li>
              <strong>スコア</strong>は販売実績・利益率・在庫回転率から算出（A+が最高評価）
            </li>
          </ol>
        </div>
      </div>

      {/* モーダル・パネル */}
      <ListingEditModal
        item={editItem}
        platform={editPlatform}
        accountId={editAccountId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
      />

      <StockDetailPanel
        sku={selectedSku}
        isOpen={isStockDetailOpen}
        onClose={() => setIsStockDetailOpen(false)}
      />

      <ExecutionLogsPanel
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}
