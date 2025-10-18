'use client';

import { useState, useEffect } from 'react';
import { FullFeaturedModal } from '@/components/ProductModal/FullFeaturedModal';
import type { Product } from '@/types/product';

interface ProductTableProps {
  data: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onSelect: (productId: string) => void;
  selectedIds: string[];
}

export function ProductTable({ 
  data, 
  loading, 
  onEdit, 
  onDelete, 
  onSelect,
  selectedIds 
}: ProductTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  const handleEdit = (product: Product) => {
    console.log('Opening modal for product:', product);
    setCurrentProduct(product);
    setModalOpen(true);
  };

  const handleImageClick = (product: Product) => {
    // 画像クリックでもモーダルを開く
    handleEdit(product);
  };

  const formatPrice = (price?: number) => {
    if (!price) return '¥0';
    return `¥${price.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getSourceBadgeColor = (source?: string) => {
    const sourceLower = (source || '').toLowerCase();
    if (sourceLower.includes('yahoo')) return 'bg-purple-100 text-purple-800';
    if (sourceLower.includes('ebay')) return 'bg-blue-100 text-blue-800';
    if (sourceLower.includes('amazon')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">データを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-semibold mb-2">未出品データがありません</h3>
        <p className="text-sm text-muted-foreground">
          データ取得ツールから商品データを取得してください
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  className="rounded"
                  onChange={(e) => {
                    // 全選択機能は後で実装
                    console.log('Select all:', e.target.checked);
                  }}
                />
              </th>
              <th className="p-3 text-left text-sm font-semibold">画像</th>
              <th className="p-3 text-left text-sm font-semibold">Item ID</th>
              <th className="p-3 text-left text-sm font-semibold">商品名</th>
              <th className="p-3 text-left text-sm font-semibold">価格</th>
              <th className="p-3 text-left text-sm font-semibold">カテゴリ</th>
              <th className="p-3 text-left text-sm font-semibold">eBayカテゴリー</th>
              <th className="p-3 text-left text-sm font-semibold">状態</th>
              <th className="p-3 text-left text-sm font-semibold">ソース</th>
              <th className="p-3 text-left text-sm font-semibold">更新日時</th>
              <th className="p-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((product) => (
              <tr 
                key={product.id} 
                className="border-b hover:bg-muted/30 transition-colors"
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => onSelect(product.id)}
                  />
                </td>
                <td className="p-3">
                  <div 
                    className="w-16 h-16 bg-muted rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(product)}
                  >
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {product.asin || product.id}
                  </code>
                </td>
                <td className="p-3 max-w-xs">
                  <div className="font-medium text-sm line-clamp-2">
                    {product.title}
                  </div>
                  {product.marketplace?.url && (
                    <a
                      href={product.marketplace.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      元ページ
                    </a>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-semibold text-sm">
                    {formatPrice(product.price)}
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {product.category?.name || 'N/A'}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {product.ebayCategory || '未設定'}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    {product.condition || 'Used'}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded ${getSourceBadgeColor(product.marketplace?.name)}`}>
                    {product.marketplace?.name || 'Yahoo'}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {formatDate(product.updatedAt)}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`商品「${product.title}」を削除しますか？`)) {
                          onDelete(product.id);
                        }
                      }}
                      className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        // 承認機能は後で実装
                        console.log('Approve product:', product.id);
                      }}
                      className="p-2 hover:bg-green-500 hover:text-white rounded transition-colors"
                      title="承認"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 統合モーダル */}
      <FullFeaturedModal
        product={currentProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
