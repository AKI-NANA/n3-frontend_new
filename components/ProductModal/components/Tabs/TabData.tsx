'use client';

import { useState } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabDataProps {
  product: Product | null;
}

export function TabData({ product }: TabDataProps) {
  const listingData = (product as any)?.listing_data || {};
  const scrapedData = (product as any)?.scraped_data || {};
  const ebayData = (product as any)?.ebay_api_data || {};
  
  const [formData, setFormData] = useState({
    // 共通データ
    productId: (product as any)?.source_item_id || product?.asin || product?.id || '',
    dbId: product?.id || '',
    title: (product as any)?.english_title || product?.title || '',
    price: (product as any)?.price_usd || product?.price || 0,
    condition: listingData.condition || scrapedData.condition || '', // scraped_dataからも取得
    description: product?.description || '',
    
    // 手動入力
    weight: listingData.weight_g || '',
    cost: (product as any)?.price_jpy || product?.cost || '',
    length: listingData.length_cm || '',
    width: listingData.width_cm || '',
    height: listingData.height_cm || '',
    generatedSku: product?.sku || `${product?.marketplace?.id || 'UNKNOWN'}-${product?.id || 'ID'}-${Date.now()}`,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saving data:', formData);
    alert('✓ データ確認タブを保存しました');
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-database"></i> データソース別確認・編集
      </h3>
      
      {/* 共通データセクション */}
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-database"></i> 共通データ
        </div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                商品ID / ASIN
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={formData.productId}
                readOnly
                style={{ background: '#f8f9fa' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                データベースID
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={formData.dbId}
                readOnly
                style={{ background: '#f8f9fa' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              商品タイトル
            </label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="商品名を入力"
            />
          </div>

          <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                価格（USD）
              </label>
              <input 
                type="number" 
                className={styles.formInput} 
                value={formData.price}
                onChange={(e) => handleChange('price', Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder="例: 35.00"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                商品状態
              </label>
              <select 
                className={styles.formSelect}
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
              >
                <option value="">選択してください</option>
                <option value="新品">新品 / New</option>
                <option value="未使用に近い">未使用に近い / Like New</option>
                <option value="目立った傷や汚れなし">目立った傷や汚れなし / Very Good</option>
                <option value="やや傷や汚れあり">やや傷や汚れあり / Good</option>
                <option value="傷や汚れあり">傷や汚れあり / Acceptable</option>
                <option value="全体的に状態が悪い">全体的に状態が悪い / Poor</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              商品説明
            </label>
            <textarea 
              className={styles.formTextarea} 
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="商品の説明を入力"
            />
          </div>
        </div>
      </div>

      {/* 手動入力・追加情報セクション */}
      <div className={styles.dataSection} style={{ marginTop: '1rem' }}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-edit"></i> 手動入力・追加情報
        </div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                重量 (g)
              </label>
              <input 
                type="number" 
                className={styles.formInput} 
                value={formData.weight || ''}
                onChange={(e) => handleChange('weight', e.target.value ? Number(e.target.value) : '')}
                placeholder="配送料計算用（例: 10g）"
                min="0"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                仕入れコスト (円)
              </label>
              <input 
                type="number" 
                className={styles.formInput} 
                value={formData.cost || ''}
                onChange={(e) => handleChange('cost', e.target.value ? Number(e.target.value) : '')}
                placeholder="利益計算用（例: 20円）"
                min="0"
              />
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              サイズ (cm)
            </label>
            <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <input 
                type="number" 
                className={styles.formInput} 
                value={formData.length || ''}
                onChange={(e) => handleChange('length', e.target.value ? Number(e.target.value) : '')}
                placeholder="長さ（cm）"
                min="0"
                step="0.1"
              />
              <input 
                type="number" 
                className={styles.formInput} 
                value={formData.width || ''}
                onChange={(e) => handleChange('width', e.target.value ? Number(e.target.value) : '')}
                placeholder="幅（cm）"
                min="0"
                step="0.1"
              />
              <input 
                type="number" 
                className={styles.formInput} 
                value={formData.height || ''}
                onChange={(e) => handleChange('height', e.target.value ? Number(e.target.value) : '')}
                placeholder="高さ（cm）"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              システム生成SKU
            </label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={formData.generatedSku}
              readOnly
              style={{ background: '#f8f9fa' }}
            />
            <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
              SKUは自動生成されます: [ストアコード][年][商品ID36進数][チェックサム]
            </div>
          </div>
          
          {/* 保存ボタン */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="fas fa-save"></i> データ確認タブを保存
            </button>
          </div>
        </div>
      </div>

      {/* データ完全性チェック */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px' }}>
        <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1976d2' }}>
          <i className="fas fa-info-circle"></i> データ完全性
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>タイトル:</span>
            <strong>{formData.title ? '✓' : '✗'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>価格:</span>
            <strong>{formData.price > 0 ? '✓' : '✗'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>状態:</span>
            <strong>{formData.condition ? '✓' : '✗'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>説明文:</span>
            <strong>{formData.description ? '✓' : '✗'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
