'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.css';
import type { Product } from '@/types/product';

export interface TabListingProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabListing({ product, marketplace, marketplaceName }: TabListingProps) {
  console.log('[TabListing DEBUG] Rendering...', { product, marketplace });

  if (!product) {
    return (
      <div style={{ padding: '2rem' }}>
        <h3>商品データなし</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', background: '#f0f0f0', minHeight: '400px' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#000' }}>
        🔧 デバッグモード: {marketplaceName} 出品情報
      </h3>

      <div style={{ 
        background: '#fff3cd', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <p><strong>このメッセージが表示されていれば、ファイルは正しく読み込まれています。</strong></p>
        <p>Product ID: {product.id}</p>
        <p>Marketplace: {marketplace}</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '30% 70%', 
        gap: '1.5rem',
        minHeight: '300px'
      }}>
        <div style={{ 
          background: '#e3f2fd', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '3px solid #2196f3'
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>左カラム（30%）</h4>
          <p>基本情報がここに表示されます</p>
          <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'white', borderRadius: '4px' }}>
            Title: {(product as any)?.title || 'N/A'}
          </div>
        </div>

        <div style={{ 
          background: '#f3e5f5', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '3px solid #9c27b0'
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>右カラム（70%）</h4>
          <p>Item Specificsがここに表示されます</p>
          
          {/* Mirror データの確認 */}
          <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'white', borderRadius: '4px' }}>
            <p><strong>Mirror 分析データ:</strong></p>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify((product as any)?.ebay_api_data?.listing_reference, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
