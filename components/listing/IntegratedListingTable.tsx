'use client';

/**
 * 統合出品データ管理テーブル
 *
 * TanStack Query でデータ取得、フィルタリング、ソート、ページネーションを実装
 */

import { useState } from 'react';
import type {
  ListingItem,
  ListingFilter,
  ListingSort,
  MallStatus,
  PerformanceGrade,
} from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

interface IntegratedListingTableProps {
  onSkuClick?: (sku: string) => void;
  onEditClick?: (item: ListingItem, platform: Platform) => void;
}

// プラットフォームアイコンマッピング
const PLATFORM_ICONS: Record<Platform, string> = {
  ebay: '🔵',
  amazon_us: '🟠',
  amazon_au: '🟠',
  amazon_jp: '🟠',
  coupang: '🟣',
  qoo10: '🟢',
  shopee: '🟡',
  mercari: '🔴',
  shopify: '🟢',
};

// ステータス色マッピング
const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-500',
  Inactive: 'bg-red-500',
  Error: 'bg-yellow-500',
};

// グレード色マッピング
const GRADE_COLORS: Record<PerformanceGrade, string> = {
  'A+': 'text-green-600 font-bold',
  A: 'text-green-500',
  B: 'text-blue-500',
  C: 'text-yellow-500',
  D: 'text-orange-500',
  F: 'text-red-600 font-bold',
};

export function IntegratedListingTable({
  onSkuClick,
  onEditClick,
}: IntegratedListingTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<ListingFilter>({});
  const [sort, setSort] = useState<ListingSort>({
    field: 'sku',
    order: 'asc',
  });
  const [items, setItems] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // データ取得関数
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        filters: JSON.stringify(filters),
        sort: JSON.stringify(sort),
      });

      const response = await fetch(
        `/api/listing/integrated?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.items) {
        setItems(data.items);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回ロード（useEffect代替）
  // TODO: TanStack Query に置き換え

  // モールステータス表示コンポーネント
  const MallStatusBadges = ({ statuses }: { statuses: MallStatus[] }) => (
    <div className="flex flex-wrap gap-1">
      {statuses.map((status, index) => (
        <div
          key={index}
          className="relative inline-flex items-center"
          title={`${status.platform}: ${status.status}${status.errorMessage ? ` - ${status.errorMessage}` : ''}`}
        >
          <span className="text-lg">{PLATFORM_ICONS[status.platform]}</span>
          <span
            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${STATUS_COLORS[status.status]}`}
          ></span>
        </div>
      ))}
    </div>
  );

  // 価格変動頻度アイコン
  const PriceChangeIndicator = ({ frequency }: { frequency: number }) => {
    if (frequency > 10) {
      return <span title={`${frequency}回変動`}>🔥🔥</span>;
    }
    if (frequency > 5) {
      return <span title={`${frequency}回変動`}>🔥</span>;
    }
    if (frequency > 0) {
      return <span title={`${frequency}回変動`}>📈</span>;
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* フィルターバー */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <input
            type="text"
            placeholder="SKU / タイトル検索"
            className="px-3 py-2 border rounded"
            value={filters.searchQuery || ''}
            onChange={(e) => {
              setFilters({ ...filters, searchQuery: e.target.value });
              setPage(1);
            }}
          />

          {/* 最小在庫数 */}
          <input
            type="number"
            placeholder="最小在庫数"
            className="px-3 py-2 border rounded"
            value={filters.minStock || ''}
            onChange={(e) => {
              setFilters({
                ...filters,
                minStock: e.target.value ? parseInt(e.target.value) : undefined,
              });
              setPage(1);
            }}
          />

          {/* 検索ボタン */}
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            検索
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2 border text-left">SKU</th>
              <th className="px-4 py-2 border text-left">タイトル</th>
              <th className="px-4 py-2 border text-left">カテゴリ</th>
              <th className="px-4 py-2 border text-center">在庫</th>
              <th className="px-4 py-2 border text-center">出品中</th>
              <th className="px-4 py-2 border text-center">スコア</th>
              <th className="px-4 py-2 border text-right">価格</th>
              <th className="px-4 py-2 border text-center">推奨先</th>
              <th className="px-4 py-2 border text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  読み込み中...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  データがありません
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.sku} className="hover:bg-gray-50">
                  {/* SKU */}
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => onSkuClick?.(item.sku)}
                      className="text-blue-600 hover:underline font-mono"
                    >
                      {item.sku}
                    </button>
                  </td>

                  {/* タイトル */}
                  <td className="px-4 py-2 border max-w-xs truncate">
                    {item.title}
                  </td>

                  {/* カテゴリ */}
                  <td className="px-4 py-2 border text-sm">{item.category}</td>

                  {/* 在庫 */}
                  <td className="px-4 py-2 border text-center">
                    <span
                      className={`font-semibold ${
                        item.totalStockCount === 0
                          ? 'text-red-600'
                          : item.totalStockCount < 5
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {item.totalStockCount}
                    </span>
                  </td>

                  {/* 出品中のモール */}
                  <td className="px-4 py-2 border">
                    <MallStatusBadges statuses={item.mallStatuses} />
                  </td>

                  {/* スコア */}
                  <td className="px-4 py-2 border text-center">
                    <span className={GRADE_COLORS[item.performanceGrade]}>
                      {item.performanceGrade}
                    </span>
                    <div className="text-xs text-gray-500">
                      ({item.performanceScore.toFixed(1)})
                    </div>
                  </td>

                  {/* 価格 */}
                  <td className="px-4 py-2 border text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>¥{item.currentPriceJpy.toLocaleString()}</span>
                      <PriceChangeIndicator
                        frequency={item.priceChangeFrequency}
                      />
                    </div>
                  </td>

                  {/* 推奨先 */}
                  <td className="px-4 py-2 border text-center">
                    {item.recommendedPlatform && (
                      <span title={item.recommendedPlatform}>
                        {PLATFORM_ICONS[item.recommendedPlatform]}
                      </span>
                    )}
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-2 border text-center">
                    <button
                      onClick={() =>
                        onEditClick?.(
                          item,
                          item.mallStatuses[0]?.platform || 'ebay'
                        )
                      }
                      className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          全 {total} 件中 {(page - 1) * pageSize + 1} -{' '}
          {Math.min(page * pageSize, total)} 件を表示
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            前へ
          </button>
          <span className="px-3 py-1">
            {page} / {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() =>
              setPage(Math.min(Math.ceil(total / pageSize), page + 1))
            }
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}
