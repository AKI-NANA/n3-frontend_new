'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabOverviewProps {
  product: Product | null;
  marketplace: string;
}

interface ProcessStep {
  id: string;
  name: string;
  status: 'waiting' | 'processing' | 'complete' | 'error';
}

export function TabOverview({ product, marketplace }: TabOverviewProps) {
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([
    { id: 'step1', name: '1. データ取得', status: 'complete' },
    { id: 'step2', name: '2. ツール実行', status: 'waiting' },
    { id: 'step3', name: '3. データ統合', status: 'waiting' },
    { id: 'step4', name: '4. 出品準備', status: 'waiting' },
  ]);

  const [showSKUDetails, setShowSKUDetails] = useState(false);

  // SKU解析
  const sku = product?.sku || '';
  const masterKey = (product as any)?.master_key || '';
  
  console.log('TabOverview - product:', product);
  console.log('TabOverview - sku:', sku);
  console.log('TabOverview - masterKey:', masterKey);
  const skuParts = {
    store: sku.substring(0, 1),
    year: sku.substring(1, 2),
    id: sku.substring(2, 4),
    checksum: sku.substring(4, 5)
  };
  const mkParts = masterKey.split('-');
  const masterKeyInfo = {
    stockType: mkParts[0] || '',
    supplier: mkParts[1] || '',
    category: mkParts[2] || '',
    condition: mkParts[3] || '',
    id: mkParts[4] || '',
    yearMonth: mkParts[5] || '',
    marketplace: mkParts[6] || '',
    shipFrom: mkParts[7] || '',
    weight: mkParts[8] || '',
    price: mkParts[9] || ''
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'var(--ilm-complete)';
      case 'processing': return 'var(--ilm-processing)';
      case 'error': return 'var(--ilm-error)';
      default: return 'var(--ilm-text-secondary)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'complete': return '✓ 完了';
      case 'processing': return '⟳ 処理中';
      case 'error': return '✗ エラー';
      default: return '待機中';
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* SKU情報セクション */}
      <div style={{
        border: '2px solid #e3e8ef',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            color: '#6c757d',
            textTransform: 'uppercase'
          }}>
            公開用SKU（eBay/Shopee表示用）
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.15rem 0.4rem',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '4px',
            fontWeight: 600,
            marginLeft: '0.5rem'
          }}>
            競合対策OK
          </span>
        </div>
        
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          color: '#212529',
          letterSpacing: '2px',
          marginBottom: '0.75rem'
        }}>
          {sku}
        </div>

        {/* SKU構造説明 */}
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #dee2e6',
          marginBottom: '0.75rem'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '0.5rem', fontWeight: 600 }}>
            SKU構造：
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#007bff', fontFamily: 'monospace' }}>
                {skuParts.store}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>ストア<br/>N3="N"</div>
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#28a745', fontFamily: 'monospace' }}>
                {skuParts.year}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>年コード<br/>2025=H</div>
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffc107', fontFamily: 'monospace' }}>
                {skuParts.id}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>商品ID<br/>36進数</div>
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6c757d', fontFamily: 'monospace' }}>
                {skuParts.checksum}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>チェック<br/>検証用</div>
            </div>
          </div>
        </div>

        {/* トグルボタン */}
        <button
          onClick={() => setShowSKUDetails(!showSKUDetails)}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: showSKUDetails ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          {showSKUDetails ? '▼ 詳細を隠す' : '▶ 詳細を表示（社外秘）'}
        </button>

        {/* 詳細情報 */}
        {showSKUDetails && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              color: '#856404',
              wordBreak: 'break-all',
              marginBottom: '0.75rem'
            }}>
              Master Key: {masterKey}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
              fontSize: '0.75rem'
            }}>
              <div>
                <strong>在庫区分:</strong> {masterKeyInfo.stockType === 'ST' ? '有在庫' : '無在庫'}
              </div>
              <div>
                <strong>仕入先:</strong> {masterKeyInfo.supplier === 'YAH' ? 'Yahoo' : masterKeyInfo.supplier}
              </div>
              <div>
                <strong>カテゴリ:</strong> {masterKeyInfo.category}
              </div>
              <div>
                <strong>状態:</strong> {masterKeyInfo.condition === 'N' ? '新品' : masterKeyInfo.condition === 'U' ? '中古' : masterKeyInfo.condition}
              </div>
            </div>
          </div>
        )}
      </div>

      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--ilm-text-primary)' }}>
        <i className="fas fa-dashboard"></i> 全ツール統合状況
      </h3>
      
      {/* ツールステータスグリッド */}
      <div className={styles.statusGrid}>
        <div className={`${styles.statusCard} ${styles.complete}`}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-check-circle"></i> 基本情報
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>完了</p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#28a745' }}>
            ✓ タイトル ✓ 価格 ✓ 画像
          </div>
        </div>
        
        <div className={`${styles.statusCard} ${styles.partial}`}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-images"></i> 画像
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>
            {product?.images?.length || 0}枚取得済み
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#ffc107' }}>
            選択: {product?.selectedImages?.length || 0}/12枚
          </div>
        </div>
        
        <div className={`${styles.statusCard} ${styles.processing}`}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-tools"></i> ツール実行
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>準備完了</p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#17a2b8' }}>
            5種類のツール利用可能
          </div>
        </div>
        
        <div className={`${styles.statusCard} ${styles.missing}`}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-file-alt"></i> HTML
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>未作成</p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc3545' }}>
            HTML編集タブで作成
          </div>
        </div>
      </div>

      {/* 処理フロー */}
      <div className={styles.dataSection} style={{ marginTop: '1.5rem' }}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-info-circle"></i> 処理フロー
        </div>
        <div style={{ padding: '1rem' }}>
          {processSteps.map((step) => (
            <div 
              key={step.id}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.4rem 0', 
                borderBottom: '1px solid #e9ecef' 
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--ilm-text-secondary)' }}>
                {step.name}
              </span>
              <span 
                style={{ 
                  fontWeight: 600, 
                  color: getStatusColor(step.status)
                }}
              >
                {getStatusText(step.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 商品情報プレビュー */}
      <div className={styles.dataSection} style={{ marginTop: '1.5rem' }}>
        <h4 className={styles.sectionHeader}>
          <i className="fas fa-info-circle"></i> 商品情報サマリー
        </h4>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#6c757d' }}>
                タイトル
              </label>
              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid #e9ecef' }}>
                {product?.title || 'N/A'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#6c757d' }}>
                ASIN / ID
              </label>
              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid #e9ecef' }}>
                {product?.asin || product?.id || 'N/A'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#6c757d' }}>
                価格
              </label>
              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid #e9ecef' }}>
                ¥{product?.price?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#6c757d' }}>
                在庫
              </label>
              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid #e9ecef' }}>
                {product?.stock?.available || 0}個
              </div>
            </div>
          </div>

          {/* カテゴリ情報 */}
          {product?.category && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '6px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#1976d2' }}>
                <i className="fas fa-tags"></i> カテゴリ
              </div>
              <div style={{ fontSize: '0.85rem', color: '#424242' }}>
                {product.category.name}
                {product.category.confidence && (
                  <span style={{ marginLeft: '0.5rem', color: '#1976d2' }}>
                    (信頼度: {(product.category.confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* データ完全性インジケーター */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
            <i className="fas fa-clipboard-check"></i> データ完全性
          </h5>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ilm-success)' }}>
            85%
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: '85%', height: '100%', background: 'var(--ilm-success)', transition: 'width 0.3s ease' }}></div>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6c757d' }}>
          推奨: HTML説明文の作成で完全性を向上
        </div>
      </div>
    </div>
  );
}
