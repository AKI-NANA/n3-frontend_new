'use client';

import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabFinalProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabFinal({ product, marketplace, marketplaceName }: TabFinalProps) {
  const listingData = (product as any)?.listing_data || {};
  const englishTitle = (product as any)?.english_title || product?.title || '';
  const sku = product?.sku || '';
  const masterKey = (product as any)?.master_key || '';
  
  // 検証ロジック
  const validation = {
    hasTitle: englishTitle.length > 0,
    hasSKU: sku.length > 0,
    hasPrice: (listingData.ddp_price_usd || 0) > 0,
    hasProfit: ((product as any)?.profit_amount_usd || 0) > 0,
    hasCategory: !!(product as any)?.ebay_api_data?.category_id,
    hasShipping: !!listingData.shipping_service,
    hasHTML: !!listingData.html_description,
    hasImages: (product?.images?.length || 0) > 0,
    hasStock: (product?.stock?.available || 0) > 0,
  };
  
  const allValid = Object.values(validation).every(v => v);
  const profitAmount = (product as any)?.profit_amount_usd || 0;
  const isProfitable = profitAmount > 0;
  
  const handlePublish = () => {
    if (!allValid) {
      alert('❌ 出品できません\n\n必須項目が不足しています。各タブを確認してください。');
      return;
    }
    
    if (!isProfitable) {
      alert('⚠️ 警告\n\nこの商品は利益がマイナスです。本当に出品しますか？');
      return;
    }
    
    alert(`✓ ${marketplaceName}に出品処理を実行します`);
  };
  
  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-check-circle"></i> 最終確認・出品実行
      </h3>
      
      {/* 出品サマリー */}
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>出品データ</div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <strong>タイトル（英語）:</strong><br/>
              {englishTitle || 'N/A'}
            </div>
            <div>
              <strong>SKU:</strong><br/>
              {sku || 'N/A'}
            </div>
            <div>
              <strong>カテゴリ:</strong><br/>
              {(product as any)?.ebay_api_data?.category_name || 'N/A'}
            </div>
            <div>
              <strong>カテゴリID:</strong><br/>
              {(product as any)?.ebay_api_data?.category_id || 'N/A'}
            </div>
            <div>
              <strong>DDP価格:</strong><br/>
              ${listingData.ddp_price_usd || 0}
            </div>
            <div>
              <strong>DDU価格:</strong><br/>
              ${listingData.ddu_price_usd || 0}
            </div>
            <div>
              <strong>配送サービス:</strong><br/>
              {listingData.shipping_service || 'N/A'}
            </div>
            <div>
              <strong>送料:</strong><br/>
              ${listingData.shipping_cost_usd || 0}
            </div>
            <div>
              <strong>重量:</strong><br/>
              {listingData.weight_g || 0}g
            </div>
            <div>
              <strong>在庫数:</strong><br/>
              {product?.stock?.available || 0}個
            </div>
            <div>
              <strong>利益率:</strong><br/>
              <span style={{ color: ((product as any)?.profit_margin || 0) > 0 ? '#28a745' : '#dc3545', fontWeight: 700 }}>
                {(product as any)?.profit_margin || 0}%
              </span>
            </div>
            <div>
              <strong>利益額:</strong><br/>
              <span style={{ color: profitAmount > 0 ? '#28a745' : '#dc3545', fontWeight: 700, fontSize: '1.1rem' }}>
                ${profitAmount.toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* HTML存在確認 */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
            <strong>HTML:</strong> {listingData.html_description ? '✓ 生成済み' : '✗ 未作成'}
          </div>
        </div>
      </div>
      
      {/* 検証結果 */}
      <div className={styles.dataSection} style={{ marginTop: '1rem' }}>
        <div className={styles.sectionHeader}>
          {allValid ? '✓ 検証OK' : '✗ 検証エラー'}
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
            {[
              { key: 'hasTitle', label: 'タイトル（英語）', value: validation.hasTitle },
              { key: 'hasSKU', label: 'SKU', value: validation.hasSKU },
              { key: 'hasPrice', label: '価格', value: validation.hasPrice },
              { key: 'hasProfit', label: '利益', value: validation.hasProfit },
              { key: 'hasCategory', label: 'カテゴリ', value: validation.hasCategory },
              { key: 'hasShipping', label: '配送設定', value: validation.hasShipping },
              { key: 'hasHTML', label: 'HTML', value: validation.hasHTML },
              { key: 'hasImages', label: '画像', value: validation.hasImages },
              { key: 'hasStock', label: '在庫', value: validation.hasStock },
            ].map(item => (
              <div key={item.key} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem', 
                background: item.value ? '#d4edda' : '#f8d7da',
                borderRadius: '4px' 
              }}>
                <i 
                  className={item.value ? 'fas fa-check-circle' : 'fas fa-times-circle'} 
                  style={{ color: item.value ? '#28a745' : '#dc3545', fontSize: '1rem' }}
                ></i>
                <span>{item.label}: {item.value ? '✓' : '✗ 未設定'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 利益警告 */}
      {!isProfitable && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#fff3cd', 
          border: '2px solid #ffc107', 
          borderRadius: '6px' 
        }}>
          <strong style={{ color: '#856404' }}>⚠️ 警告:</strong> この商品は利益がマイナスです。出品前に価格を見直してください。
        </div>
      )}
      
      {/* 出品ボタン */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '2rem', 
        background: 'white', 
        border: '2px solid ' + (allValid && isProfitable ? '#28a745' : '#6c757d'), 
        borderRadius: '8px', 
        textAlign: 'center' 
      }}>
        <h4 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
          {allValid && isProfitable ? '✓ 出品準備完了' : '⚠️ 出品前の確認が必要です'}
        </h4>
        <p style={{ marginBottom: '1.5rem', color: '#6c757d' }}>
          {allValid && isProfitable 
            ? `すべての項目が設定されています。出品ボタンを押すと${marketplaceName}への出品処理が実行されます。` 
            : '必須項目を設定してから出品してください。'}
        </p>
        
        <button 
          className={`${styles.btn} ${allValid && isProfitable ? styles.btnSuccess : styles.btnSecondary}`}
          onClick={handlePublish}
          style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
          disabled={!allValid || !isProfitable}
        >
          <i className="fas fa-rocket"></i> {marketplaceName}に出品する
        </button>
      </div>
    </div>
  );
}
