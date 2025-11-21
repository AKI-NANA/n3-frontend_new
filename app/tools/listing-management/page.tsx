'use client';

/**
 * 統合出品データ管理UI - メインページ
 *
 * 多販路の出品状況を単一のUIで正確に把握し、
 * 在庫・価格ロジック（第1層/第4層）と出品データ（第3層）の操作を論理的に分離
 */

import { useState } from 'react';
import { IntegratedListingTable } from '@/components/listing/IntegratedListingTable';
import { ListingEditModal } from '@/components/listing/ListingEditModal';
import { StockDetailPanel } from '@/components/listing/StockDetailPanel';
import type { ListingItem } from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

export default function ListingManagementPage() {
  // State管理
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [isStockDetailOpen, setIsStockDetailOpen] = useState(false);
  const [editItem, setEditItem] = useState<ListingItem | null>(null);
  const [editPlatform, setEditPlatform] = useState<Platform>('ebay');
  const [editAccountId, setEditAccountId] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
            <div className="text-sm text-gray-600">総出品数</div>
            <div className="text-3xl font-bold text-blue-600">-</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">アクティブ出品</div>
            <div className="text-3xl font-bold text-green-600">-</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">エラー</div>
            <div className="text-3xl font-bold text-red-600">-</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">低在庫アラート</div>
            <div className="text-3xl font-bold text-yellow-600">-</div>
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
    </div>
  );
}
