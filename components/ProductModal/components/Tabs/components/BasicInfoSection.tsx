'use client';

import type { Product } from '@/types/product';
import styles from '../../../FullFeaturedModal.css';

export interface BasicInfoSectionProps {
  product: Product | null;
  formData: {
    title: string;
    price: number;
    quantity: number;
    condition: string;
    conditionId: number;
    category: string;
    categoryId: string;
  };
  conditionMapping: { [key: string]: number };
  onChange: (field: string, value: string | number) => void;
  marketplace: string;
}

export function BasicInfoSection({ 
  product, 
  formData, 
  conditionMapping,
  onChange,
  marketplace
}: BasicInfoSectionProps) {
  
  return (
    <div>
      <h4 style={{ 
        margin: '0 0 1rem 0', 
        fontSize: '0.95rem', 
        fontWeight: 600,
        color: '#495057'
      }}>
        <i className="fas fa-info-circle"></i> 基本情報
      </h4>

      {/* タイトル */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '0.4rem', 
          fontSize: '0.85rem' 
        }}>
          タイトル <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <textarea
          className={styles.formInput}
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          rows={3}
          maxLength={80}
          style={{ resize: 'vertical' }}
        />
        <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.2rem' }}>
          {formData.title.length}/80 文字
        </div>
      </div>

      {/* 価格 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '0.4rem', 
          fontSize: '0.85rem' 
        }}>
          価格 (USD) <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <input 
          className={styles.formInput} 
          type="number" 
          value={formData.price}
          onChange={(e) => onChange('price', Number(e.target.value))}
          step="0.01"
          min="0"
          placeholder="例: 35.00"
        />
      </div>

      {/* 数量 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '0.4rem', 
          fontSize: '0.85rem' 
        }}>
          数量 <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <input 
          className={styles.formInput} 
          type="number" 
          value={formData.quantity}
          onChange={(e) => onChange('quantity', Number(e.target.value))}
          min="1"
        />
      </div>

      {/* 状態 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '0.4rem', 
          fontSize: '0.85rem' 
        }}>
          状態 <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <select 
          className={styles.formSelect}
          value={formData.condition}
          onChange={(e) => {
            const newCondition = e.target.value;
            const newConditionId = conditionMapping[newCondition] || 3000;
            onChange('condition', newCondition);
            onChange('conditionId', newConditionId);
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
        <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.2rem' }}>
          Condition ID: {formData.conditionId}
        </div>
      </div>

      {/* カテゴリ */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 600, 
          marginBottom: '0.4rem', 
          fontSize: '0.85rem' 
        }}>
          カテゴリ <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <input 
          className={styles.formInput} 
          value={formData.category}
          onChange={(e) => onChange('category', e.target.value)}
          readOnly
          style={{ background: '#f8f9fa' }}
        />
        {formData.categoryId && (
          <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.2rem' }}>
            ID: {formData.categoryId}
          </div>
        )}
      </div>
    </div>
  );
}
