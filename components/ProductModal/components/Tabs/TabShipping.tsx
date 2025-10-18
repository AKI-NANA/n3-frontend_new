'use client';

import { useState } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabShippingProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabShipping({ product, marketplace, marketplaceName }: TabShippingProps) {
  const listingData = (product as any)?.listing_data || {};
  
  // 配送サービス名のマッピング
  const shippingServiceNames: { [key: string]: string } = {
    'EXP_15_20': 'ePacket (〜100g)',
    'EXP_36_28': 'ePacket (100-500g)',
    'EXP_51_20': 'ePacket (500g〜)',
    'Standard Shipping': 'Standard Shipping',
    'Expedited Shipping': 'Expedited Shipping',
    'Economy Shipping': 'Economy Shipping',
  };
  
  const shippingServiceCode = listingData.shipping_service || 'Standard Shipping';
  const shippingServiceName = shippingServiceNames[shippingServiceCode] || shippingServiceCode;
  
  const [formData, setFormData] = useState({
    shippingPolicy: shippingServiceCode,
    shippingPolicyName: shippingServiceName, // 表示用名称
    handlingTime: 10, // デフォルト10日
    weight: listingData.weight_g || '',
    shippingCost: listingData.shipping_cost_usd || '',
    stock: product?.stock?.available || 1,
    location: product?.stock?.location || 'Plus1', // デフォルトはPlus1
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-shipping-fast"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 配送・在庫設定
      </h3>
      
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>配送設定</div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                配送ポリシー
              </label>
              <select 
                className={styles.formSelect}
                value={formData.shippingPolicy}
                onChange={(e) => {
                  const code = e.target.value;
                  const name = shippingServiceNames[code] || code;
                  setFormData(prev => ({ ...prev, shippingPolicy: code, shippingPolicyName: name }));
                }}
              >
                <option value="EXP_15_20">ePacket (〜100g)</option>
                <option value="EXP_36_28">ePacket (100-500g)</option>
                <option value="EXP_51_20">ePacket (500g〜)</option>
                <option value="Standard Shipping">Standard Shipping</option>
                <option value="Expedited Shipping">Expedited Shipping</option>
                <option value="Economy Shipping">Economy Shipping</option>
              </select>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                選択中: {formData.shippingPolicyName} (Code: {formData.shippingPolicy})
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                ハンドリング時間（営業日）
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.handlingTime}
                onChange={(e) => handleChange('handlingTime', Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                重量（g）
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.weight || ''}
                onChange={(e) => handleChange('weight', e.target.value ? Number(e.target.value) : '')}
                placeholder="例: 10g"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                送料
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.shippingCost || ''}
                onChange={(e) => handleChange('shippingCost', e.target.value ? Number(e.target.value) : '')}
                placeholder="例: 5.00 USD"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>在庫管理</div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                在庫数
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.stock}
                onChange={(e) => handleChange('stock', Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                保管場所
              </label>
              <select
                className={styles.formSelect}
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              >
                <option value="Plus1">Plus1（日本倉庫）</option>
                <option value="Osaka">大阪（自社倉庫）</option>
                <option value="Dropship">無在庫（仕入先直送）</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
