'use client';

/**
 * 在庫・原価詳細パネル
 *
 * SKUクリック時に起動するサイドパネル
 * - 仕入れ先別詳細の階層的リスト
 * - 価格計算の原価ベース明示
 * - 履歴データ表示（価格変動、在庫変動、HTML解析エラー履歴）
 */

import { useState, useEffect } from 'react';
import type {
  StockDetail,
  ListingLogsResponse,
  PriceHistory,
  StockHistory,
  HtmlParseError,
} from '@/types/listing';

interface StockDetailPanelProps {
  sku: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StockDetailPanel({
  sku,
  isOpen,
  onClose,
}: StockDetailPanelProps) {
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null);
  const [logs, setLogs] = useState<ListingLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'price' | 'errors'>(
    'stock'
  );

  useEffect(() => {
    if (sku && isOpen) {
      fetchData();
    }
  }, [sku, isOpen]);

  const fetchData = async () => {
    if (!sku) return;

    setIsLoading(true);
    try {
      // 1. 在庫詳細を取得
      // TODO: 実際のAPIエンドポイントを実装
      const stockDetailMock: StockDetail = {
        ownStock: 10,
        suppliers: [
          {
            supplierId: 'supplier_a',
            supplierName: '仕入れ先A',
            stockQuantity: 50,
            costJpy: 1000,
            priority: 1,
            isActive: true,
          },
          {
            supplierId: 'supplier_b',
            supplierName: '仕入れ先B',
            stockQuantity: 30,
            costJpy: 1200,
            priority: 2,
            isActive: true,
          },
        ],
        totalAvailable: 90,
        currentCostBasis: {
          supplierId: 'supplier_a',
          supplierName: '仕入れ先A',
          costJpy: 1000,
        },
      };
      setStockDetail(stockDetailMock);

      // 2. ログデータを取得
      const logsResponse = await fetch(`/api/listing/logs/${sku}`);
      const logsData: ListingLogsResponse = await logsResponse.json();
      setLogs(logsData);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP');
  };

  if (!isOpen || !sku) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
        <h2 className="text-lg font-bold">在庫・原価詳細</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
      </div>

      {/* SKU表示 */}
      <div className="px-4 py-3 bg-gray-100 border-b">
        <div className="text-xs text-gray-600">SKU</div>
        <div className="font-mono font-semibold">{sku}</div>
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center text-gray-500">読み込み中...</div>
      ) : (
        <>
          {/* タブナビゲーション */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${
                activeTab === 'stock'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              在庫詳細
            </button>
            <button
              onClick={() => setActiveTab('price')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${
                activeTab === 'price'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              価格履歴
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${
                activeTab === 'errors'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              エラー
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-4">
            {/* 在庫詳細タブ */}
            {activeTab === 'stock' && stockDetail && (
              <div className="space-y-4">
                {/* 合計在庫 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">合計利用可能在庫</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {stockDetail.totalAvailable}
                  </div>
                </div>

                {/* 自社有在庫 */}
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="text-sm font-semibold">自社有在庫</div>
                  <div className="text-2xl font-bold">{stockDetail.ownStock}</div>
                </div>

                {/* 仕入れ先別在庫 */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">無在庫仕入れ先</h3>
                  {stockDetail.suppliers.map((supplier) => (
                    <div
                      key={supplier.supplierId}
                      className={`mb-3 p-3 rounded-lg border-2 ${
                        supplier.supplierId ===
                        stockDetail.currentCostBasis.supplierId
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">
                            {supplier.supplierName}
                          </div>
                          <div className="text-xs text-gray-600">
                            優先度: {supplier.priority}
                          </div>
                        </div>
                        {supplier.supplierId ===
                          stockDetail.currentCostBasis.supplierId && (
                          <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                            原価ベース
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">在庫:</span>{' '}
                          <span className="font-semibold">
                            {supplier.stockQuantity}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">原価:</span>{' '}
                          <span className="font-semibold">
                            ¥{supplier.costJpy.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 価格履歴タブ */}
            {activeTab === 'price' && logs && (
              <div className="space-y-3">
                {logs.priceHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    価格変動履歴がありません
                  </div>
                ) : (
                  logs.priceHistory.map((history) => (
                    <div key={history.id} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono font-semibold">
                          ¥{history.priceJpy.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatDate(history.changedAt)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {history.platform} - {history.reason}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* エラータブ */}
            {activeTab === 'errors' && logs && (
              <div className="space-y-3">
                {logs.htmlParseErrors.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    エラーはありません
                  </div>
                ) : (
                  logs.htmlParseErrors.map((error) => (
                    <div
                      key={error.id}
                      className={`p-3 rounded-lg border-2 ${
                        error.resolvedAt
                          ? 'border-gray-300 bg-gray-50'
                          : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm">
                          {error.platform}
                        </span>
                        {error.resolvedAt ? (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                            解決済
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
                            未解決
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 mb-1">
                        {error.errorMessage}
                      </div>
                      <div className="text-xs text-gray-600">
                        検出: {formatDate(error.detectedAt)}
                      </div>
                      {error.resolvedAt && (
                        <div className="text-xs text-gray-600">
                          解決: {formatDate(error.resolvedAt)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
