'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabListingProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabListing({ product, marketplace, marketplaceName }: TabListingProps) {
  console.log('[TabListing] Rendering with:', { product, marketplace, marketplaceName });

  if (!product) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ textAlign: 'center', color: '#6c757d' }}>
          商品データが読み込まれていません
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-edit"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 出品情報（テスト版）
      </h3>
      
      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
        <p>デバッグモード: 現在基本的な表示のみ確認中</p>
        <p>Product ID: {product.id}</p>
        <p>Title: {(product as any)?.title}</p>
      </div>

      <div style={{ border: '2px solid #dc3545', padding: '1rem', borderRadius: '8px' }}>
        <h4>2カラムレイアウトテスト</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '30% 70%', 
          gap: '1.5rem',
          minHeight: '300px'
        }}>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
            <h5>左カラム（基本情報）</h5>
            <p>ここに基本情報が表示されます</p>
          </div>
          <div style={{ background: '#e7f3ff', padding: '1rem', borderRadius: '8px' }}>
            <h5>右カラム（Item Specifics）</h5>
            <p>ここにItem Specificsが表示されます</p>
          </div>
        </div>
      </div>
    </div>
  );
}
