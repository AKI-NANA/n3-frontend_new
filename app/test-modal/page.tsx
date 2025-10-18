'use client';

/**
 * ProductModal テストページ
 * Full Featured Modal（Phase 2.5）のテスト
 */

import React, { useState } from 'react';
import { FullFeaturedModal } from '@/components/ProductModal';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestModalPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [testProductId, setTestProductId] = useState('TEST-001');

  // テスト用のダミー商品データ
  const testProduct: Product = {
    id: testProductId,
    asin: 'B0XXXXXXXXX',
    sku: 'SKU-TEST-001',
    title: 'ポケモンカード 旧裏 リザードン PSA10',
    description: 'レア商品です。状態は良好です。',
    price: 50000,
    cost: 30000,
    profit: 20000,
    images: [
      {
        id: 'img1',
        url: 'https://via.placeholder.com/400x400?text=Image+1',
        isMain: true,
        order: 1,
      },
      {
        id: 'img2',
        url: 'https://via.placeholder.com/400x400?text=Image+2',
        isMain: false,
        order: 2,
      },
      {
        id: 'img3',
        url: 'https://via.placeholder.com/400x400?text=Image+3',
        isMain: false,
        order: 3,
      },
      {
        id: 'img4',
        url: 'https://via.placeholder.com/400x400?text=Image+4',
        isMain: false,
        order: 4,
      },
    ],
    selectedImages: ['img1', 'img2'],
    category: {
      id: '183454',
      name: 'Trading Cards',
      path: ['Collectibles', 'Trading Cards'],
      confidence: 0.95,
    },
    stock: {
      available: 1,
      reserved: 0,
      location: 'Warehouse A',
    },
    marketplace: {
      id: 'ebay',
      name: 'eBay',
      status: 'draft',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleOpenModal = () => {
    if (!testProductId.trim()) {
      alert('商品IDを入力してください');
      return;
    }
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Full Featured Modal テスト</h1>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm">
            <strong>Phase 2.5完了:</strong> modal_systemの完全移植版です。
            すべてのタブとマーケットプレイス機能が動作します。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>モーダルテスト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">商品ID</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="商品IDを入力"
                  value={testProductId}
                  onChange={(e) => setTestProductId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleOpenModal}>モーダルを開く</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Full Featured Modalでダミー商品データを表示します
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">クイックテスト</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTestProductId('TEST-001');
                    setModalOpen(true);
                  }}
                >
                  商品1でテスト
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTestProductId('TEST-002');
                    setModalOpen(true);
                  }}
                >
                  商品2でテスト
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>実装完了機能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ 統合概要タブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ データ確認タブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ 画像選択タブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ ツール連携タブ ⭐</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ Mirror分析タブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ 出品情報タブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ 配送・在庫タブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ HTML編集タブ ⭐</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm">✅ 最終確認タブ</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>マーケットプレイス対応</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['eBay', 'Shopee', 'Amazon Global', 'Amazon JP', 'Coupang', 'Shopify'].map((mp) => (
                <div key={mp} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-sm">✅ {mp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>次のステップ (Phase 4-5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                <span className="text-sm">🔧 ツールAPI統合</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                <span className="text-sm">🔧 画像アップロード機能</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                <span className="text-sm">🔧 データ保存機能</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                <span className="text-sm">🔧 フォームバリデーション</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                <span className="text-sm">🔧 エラーハンドリング</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Featured Modal */}
      <FullFeaturedModal
        product={testProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
