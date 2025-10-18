'use client';

import { useState, useEffect } from 'react';
import { ProductTable } from '@/components/ProductTable/ProductTable';
import type { Product } from '@/types/product';

// サンプルデータ（後でAPIから取得）
const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'TEST_1758933102',
    asin: 'TEST_1758933102',
    title: 'テスト商品 - 在庫管理連携確認用',
    price: 12000,
    condition: 'Used',
    category: {
      id: 'N/A',
      name: 'N/A',
      confidence: 0,
    },
    ebayCategory: '未設定',
    marketplace: {
      id: 'yahoo',
      name: 'Yahoo',
      url: 'https://page.auctions.yahoo.co.jp/jp/auction/TEST_1758933102',
    },
    images: [],
    updatedAt: '2025-09-27T09:53:00Z',
    stock: {
      available: 1,
      location: 'Default',
    },
  },
  {
    id: 'l1200404917',
    asin: 'l1200404917',
    title: 'マツバのケンガー VS ポケモンカード e 1ED ポケカ ポケモンカー',
    price: 37777,
    condition: 'Used',
    category: {
      id: '11116',
      name: 'Trading Cards',
      confidence: 0.95,
    },
    ebayCategory: '11116',
    marketplace: {
      id: 'yahoo',
      name: 'Yahoo',
      url: 'https://page.auctions.yahoo.co.jp/jp/auction/l1200404917',
    },
    images: [
      {
        id: 'img1',
        url: 'https://placehold.co/300x300/667eea/ffffff?text=Pokemon+Card',
        alt: 'ポケモンカード',
      },
    ],
    updatedAt: '2025-09-27T15:52:00Z',
    stock: {
      available: 1,
      location: 'Default',
    },
  },
];

export default function EditingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    // データ取得（実際はAPIから）
    const fetchData = async () => {
      setLoading(true);
      try {
        // TODO: 実際のAPI呼び出し
        // const response = await fetch('/api/products');
        // const data = await response.json();
        // setProducts(data);
        
        // 一時的にサンプルデータを使用
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProducts(SAMPLE_PRODUCTS);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (product: Product) => {
    console.log('Edit product:', product);
  };

  const handleDelete = async (productId: string) => {
    console.log('Delete product:', productId);
    // TODO: 実際のAPI呼び出し
    // await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleSelect = (productId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('削除する商品を選択してください');
      return;
    }

    if (!confirm(`選択した${selectedIds.length}件の商品を削除しますか？`)) {
      return;
    }

    console.log('Bulk delete:', selectedIds);
    // TODO: 実際のAPI呼び出し
    setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
  };

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">商品データ編集</h1>
        <p className="text-muted-foreground">
          未出品データの確認・編集を行います
        </p>
      </div>

      {/* 操作パネル */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setProducts(SAMPLE_PRODUCTS);
                setLoading(false);
              }, 1000);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            データ再読み込み
          </button>

          {selectedIds.length > 0 && (
            <>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                選択した商品を削除 ({selectedIds.length})
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
              >
                選択解除
              </button>
            </>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {products.length}件の商品
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-card rounded-lg border shadow-sm">
        <ProductTable
          data={products}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSelect={handleSelect}
          selectedIds={selectedIds}
        />
      </div>
    </div>
  );
}
