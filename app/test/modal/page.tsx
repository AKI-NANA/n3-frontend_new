'use client';

import { useState } from 'react';
import { FullFeaturedModal } from '@/components/ProductModal';
import type { Product } from '@/types/product';

export default function ModalTestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  
  // テスト用のダミー商品データ
  const testProduct: Product = {
    id: 'TEST-001',
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
        Full Featured Modal テスト
      </h1>
      
      <p style={{ marginBottom: '2rem', color: '#6c757d' }}>
        Phase 2.5 modal_system完全移植のテストページです
      </p>
      
      <div style={{ 
        padding: '2rem', 
        background: 'hsl(var(--card))', 
        borderRadius: '8px', 
        border: '1px solid hsl(var(--border))' 
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>テスト商品</h2>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <strong>ID:</strong> {testProduct.id}
          </div>
          <div>
            <strong>タイトル:</strong> {testProduct.title}
          </div>
          <div>
            <strong>ASIN:</strong> {testProduct.asin}
          </div>
          <div>
            <strong>価格:</strong> ¥{testProduct.price.toLocaleString()}
          </div>
        </div>
        
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '1rem 2rem',
            background: 'hsl(var(--primary))',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <i className="fas fa-edit"></i>
          モーダルを開く
        </button>
      </div>
      
      {/* Full Featured Modal */}
      <FullFeaturedModal
        product={testProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
      
      {/* 実装状況 */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: '#f0fdf9', 
        borderRadius: '8px',
        border: '1px solid #80D8C3'
      }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#0d6e58' }}>
          ✅ 実装完了項目
        </h3>
        <ul style={{ lineHeight: 2, color: '#0d6e58' }}>
          <li>✅ CSS完全移植（FullFeaturedModal.module.css）</li>
          <li>✅ メインモーダル構造（FullFeaturedModal.tsx）</li>
          <li>✅ ModalHeader - ヘッダーコンポーネント</li>
          <li>✅ MarketplaceSelector - MP選択</li>
          <li>✅ TabNavigation - タブナビゲーション</li>
          <li>✅ ModalFooter - フッター</li>
          <li>✅ TabTools - ツール実行タブ（優先実装）⭐</li>
          <li>✅ TabHTML - HTML編集タブ（優先実装）⭐</li>
          <li>✅ TabOverview - 統合概要タブ</li>
          <li>✅ TabData - データ確認タブ</li>
          <li>✅ TabImages - 画像選択タブ</li>
          <li>✅ TabMirror - Mirror分析タブ</li>
          <li>✅ TabListing - 出品情報タブ</li>
          <li>✅ TabShipping - 配送・在庫タブ</li>
          <li>✅ TabFinal - 最終確認タブ</li>
        </ul>
      </div>
      
      {/* 次のステップ */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: '#fff3cd', 
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#856404' }}>
          📝 次のステップ
        </h3>
        <ul style={{ lineHeight: 2, color: '#856404' }}>
          <li>🔧 ツールAPI統合（カテゴリ判定、送料計算等）</li>
          <li>🔧 画像アップロード機能</li>
          <li>🔧 HTML保存機能</li>
          <li>🔧 フォームバリデーション</li>
          <li>🔧 エラーハンドリング</li>
          <li>🔧 ローディング状態管理</li>
          <li>🔧 レスポンシブ対応の微調整</li>
        </ul>
      </div>
    </div>
  );
}
