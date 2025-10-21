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
    title: (product as any)?.english_title || (product as any)?.title || '',
    price: listingData.ddp_price_usd || (product as any)?.price_usd || product?.price || 0,
    quantity: product?.stock?.available || 1,
    condition: currentCondition,
    conditionId: conditionId,
    category: ebayData.category_name || product?.category?.name || '',
    categoryId: ebayData.category_id || product?.category?.id || '',
    // EU責任者情報
    euCompanyName: listingData.eu_responsible_company_name || '',
    euAddressLine1: listingData.eu_responsible_address_line1 || '',
    euAddressLine2: listingData.eu_responsible_address_line2 || '',
    euCity: listingData.eu_responsible_city || '',
    euStateOrProvince: listingData.eu_responsible_state_or_province || '',
    euPostalCode: listingData.eu_responsible_postal_code || '',
    euCountry: listingData.eu_responsible_country || '',
    euEmail: listingData.eu_responsible_email || '',
    euPhone: listingData.eu_responsible_phone || '',
    euContactUrl: listingData.eu_responsible_contact_url || '',
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // EU責任者情報の完全性チェック
  const isEUDataComplete = formData.euCompanyName && 
                          formData.euCompanyName !== 'N/A' &&
                          formData.euAddressLine1 && 
                          formData.euCity && 
                          formData.euPostalCode && 
                          formData.euCountry;

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
            {marketplace === 'ebay' && ' ✓ EU責任者情報 (EU出品時)'}
          </div>
        </div>
      )}
      
      {/* 基本情報セクション */}
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

      {/* EU責任者情報セクション（eBayのみ表示） */}
      {marketplace === 'ebay' && (
        <div className={styles.dataSection} style={{ marginTop: '1rem' }}>
          <div className={styles.sectionHeader} style={{ background: '#1976d2', color: 'white' }}>
            <i className="fas fa-flag"></i> EU責任者情報 (GPSR対応)
          </div>
          <div style={{ padding: '1rem' }}>
            {!isEUDataComplete && (
              <div style={{ 
                padding: '0.75rem', 
                background: '#fff3cd', 
                border: '1px solid #ffc107',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#856404' }}></i>
                <span>
                  EU向け出品には責任者情報が必要です（GPSR規則）。製造者名から自動取得されます。
                </span>
              </div>
            )}

            <div className={styles.formGrid}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  会社名 / Company Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euCompanyName}
                  onChange={(e) => handleChange('euCompanyName', e.target.value)}
                  placeholder="例: LEGO System A/S"
                  maxLength={100}
                />
              </div>
            </div>

            <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  住所1 / Address Line 1 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euAddressLine1}
                  onChange={(e) => handleChange('euAddressLine1', e.target.value)}
                  placeholder="例: Aastvej 1"
                  maxLength={180}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  住所2 / Address Line 2
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euAddressLine2}
                  onChange={(e) => handleChange('euAddressLine2', e.target.value)}
                  placeholder="建物名・部屋番号など（任意）"
                  maxLength={180}
                />
              </div>
            </div>

            <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  市 / City <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euCity}
                  onChange={(e) => handleChange('euCity', e.target.value)}
                  placeholder="例: Billund"
                  maxLength={64}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  州/県 / State or Province
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euStateOrProvince}
                  onChange={(e) => handleChange('euStateOrProvince', e.target.value)}
                  placeholder="該当する場合のみ"
                  maxLength={100}
                />
              </div>
            </div>

            <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  郵便番号 / Postal Code <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euPostalCode}
                  onChange={(e) => handleChange('euPostalCode', e.target.value)}
                  placeholder="例: 7190"
                  maxLength={20}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  国コード / Country <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.euCountry}
                  onChange={(e) => handleChange('euCountry', e.target.value.toUpperCase())}
                  placeholder="ISO 2文字 (例: DK, FR, DE)"
                  maxLength={2}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  メールアドレス / Email
                </label>
                <input 
                  type="email" 
                  className={styles.formInput} 
                  value={formData.euEmail}
                  onChange={(e) => handleChange('euEmail', e.target.value)}
                  placeholder="例: contact@company.eu"
                  maxLength={250}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  電話番号 / Phone
                </label>
                <input 
                  type="tel" 
                  className={styles.formInput} 
                  value={formData.euPhone}
                  onChange={(e) => handleChange('euPhone', e.target.value)}
                  placeholder="例: +45 79 50 60 70"
                  maxLength={50}
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                連絡先URL / Contact URL
              </label>
              <input 
                type="url" 
                className={styles.formInput} 
                value={formData.euContactUrl}
                onChange={(e) => handleChange('euContactUrl', e.target.value)}
                placeholder="例: https://www.company.eu/contact"
                maxLength={250}
              />
            </div>

            {/* EU情報ステータス */}
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: isEUDataComplete ? '#d4edda' : '#f8d7da',
              border: `1px solid ${isEUDataComplete ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '6px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className={`fas ${isEUDataComplete ? 'fa-check-circle' : 'fa-times-circle'}`} 
                 style={{ color: isEUDataComplete ? '#155724' : '#721c24' }}></i>
              <span style={{ color: isEUDataComplete ? '#155724' : '#721c24' }}>
                {isEUDataComplete 
                  ? 'EU責任者情報が完全です - eBay EU出品可能' 
                  : 'EU責任者情報が不完全です - 必須項目（*）を入力してください'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
