'use client';

import { useState } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabListingProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabListing({ product, marketplace, marketplaceName }: TabListingProps) {
  const listingData = (product as any)?.listing_data || {};
  const ebayData = (product as any)?.ebay_api_data || {};
  
  // eBay Condition IDマッピング
  const conditionMapping: { [key: string]: number } = {
    'New': 1000,
    'Like New': 1500,
    'Used': 3000,
    'Very Good': 4000,
    'Good': 5000,
    'Acceptable': 6000,
    'For Parts': 7000,
  };
  
  const currentCondition = listingData.condition || 'Used';
  const conditionId = conditionMapping[currentCondition] || 3000;
  
  const [formData, setFormData] = useState({
    title: (product as any)?.english_title || (product as any)?.title || '', // 英語タイトルを優先
    price: listingData.ddp_price_usd || (product as any)?.price_usd || product?.price || 0,
    quantity: product?.stock?.available || 1,
    condition: currentCondition,
    conditionId: conditionId,
    category: ebayData.category_name || product?.category?.name || '',
    categoryId: ebayData.category_id || product?.category?.id || '',
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-edit"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 出品情報編集
      </h3>
      
      {/* マーケットプレイス別の警告 */}
      {marketplace === 'ebay' && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#856404' }}>
            <i className="fas fa-exclamation-triangle"></i> eBay必須項目
          </h5>
          <div style={{ fontSize: '0.8rem', color: '#856404' }}>
            ✓ タイトル (80文字以内) ✓ 価格 (USD) ✓ カテゴリ ✓ 商品状態 ✓ 画像 (1枚以上)
          </div>
        </div>
      )}
      
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>基本情報</div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                タイトル
              </label>
              <input 
                className={styles.formInput} 
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                価格 (USD)
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.price}
                onChange={(e) => handleChange('price', Number(e.target.value))}
                step="0.01"
                placeholder="例: 35.00"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                数量
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                状態
              </label>
              <select 
                className={styles.formSelect}
                value={formData.condition}
                onChange={(e) => {
                  const newCondition = e.target.value;
                  const newConditionId = conditionMapping[newCondition] || 3000;
                  setFormData(prev => ({ ...prev, condition: newCondition, conditionId: newConditionId }));
                }}
              >
                <option value="New">New (新品)</option>
                <option value="Like New">Like New (未使用に近い)</option>
                <option value="Used">Used (中古)</option>
                <option value="Very Good">Very Good (目立った傷なし)</option>
                <option value="Good">Good (やや傷あり)</option>
                <option value="Acceptable">Acceptable (傷あり)</option>
                <option value="For Parts">For Parts (ジャンク)</option>
              </select>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                Condition ID: {formData.conditionId}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                カテゴリ
              </label>
              <input 
                className={styles.formInput} 
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
