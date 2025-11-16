'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabOverviewProps {
  product: Product | null;
  marketplace: string;
}

export function TabOverview({ product, marketplace }: TabOverviewProps) {
  const [showSKUDetails, setShowSKUDetails] = useState(false);

  if (!product) {
    return <div style={{ padding: '1.5rem' }}>商品データがありません</div>;
  }

  // 🔍 デバッグ: 受け取った商品データを確認
  console.log('🎯 TabOverview - product:', {
    id: product.id,
    sku: product.sku,
    master_key: (product as any)?.master_key,
    price_jpy: product.price_jpy,
    price_usd: (product as any)?.price_usd,
    listing_data: product.listing_data,
    sm_analyzed_at: (product as any)?.sm_analyzed_at,
    sm_sales_count: (product as any)?.sm_sales_count,
    sm_competitor_count: (product as any)?.sm_competitor_count,
    sm_lowest_price: (product as any)?.sm_lowest_price,
    sm_profit_margin: (product as any)?.sm_profit_margin,
    sm_profit_amount_usd: (product as any)?.sm_profit_amount_usd,
  });

  // SKU解析
  const sku = product.sku || '';
  const masterKey = (product as any)?.master_key || '';
  
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

  // 🎯 DBから取得した実データを使用（profit_marginフィールドを完全に無視）
  const purchasePrice = product.price_jpy || (product as any)?.purchase_price_jpy || 0;
  const sellingPriceUSD = (product as any)?.price_usd || product.listing_data?.ddp_price_usd || 0;
  // 🔥 正しい利益データを使用（profit_margin_percent と profit_amount_usd のみ）
  const profitMargin = parseFloat((product as any)?.profit_margin_percent) || parseFloat(product.listing_data?.profit_margin) || 0;
  const profitAmount = parseFloat((product as any)?.profit_amount_usd) || parseFloat(product.listing_data?.profit_amount_usd) || 0;

  // SM分析データ
  const smData = {
    analyzed: !!(product as any)?.sm_analyzed_at,
    salesCount: (product as any)?.sm_sales_count || 0,
    competitorCount: (product as any)?.sm_competitor_count || 0,
    lowestPrice: (product as any)?.sm_lowest_price || 0,
    profitMargin: (product as any)?.sm_profit_margin || 0,
    profitAmount: (product as any)?.sm_profit_amount_usd || 0,
  };

  // データ完全性スコア計算
  const calculateCompleteness = () => {
    let score = 0;
    let total = 0;

    // 基本情報 (30点)
    total += 30;
    if (product.title) score += 10;
    if ((product as any)?.english_title) score += 10;
    if (product.price_jpy) score += 10;

    // 画像 (20点)
    total += 20;
    const imageCount = product.listing_data?.image_count || (product as any)?.images?.length || 0;
    score += Math.min(imageCount * 2, 20);

    // カテゴリ・サイズ (20点)
    total += 20;
    if (product.category_name || product.ebay_api_data?.category_name) score += 10;
    if (product.listing_data?.weight_g) score += 5;
    if (product.listing_data?.length_cm) score += 5;

    // HTS・関税 (15点)
    total += 15;
    if ((product as any)?.hts_code && (product as any).hts_code !== '要確認') score += 10;
    if ((product as any)?.origin_country) score += 5;

    // SM分析 (15点)
    total += 15;
    if (smData.analyzed) score += 15;

    return Math.round((score / total) * 100);
  };

  const completeness = calculateCompleteness();

  return (
    <div style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
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
          {showSKUDetails ? '▼ 詳細を隠す' : '▶ Master Key詳細（社外秘）'}
        </button>

        {/* Master Key詳細情報 */}
        {showSKUDetails && masterKey && (
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

      {/* 💰 価格・利益情報 */}
      <div className={styles.dataSection} style={{ marginBottom: '1.5rem' }}>
        <h4 className={styles.sectionHeader}>
          <i className="fas fa-dollar-sign"></i> 価格・利益情報
        </h4>
        <div style={{ padding: '1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem'
          }}>
            {/* 仕入れ値（円） */}
            <div style={{
              padding: '0.75rem',
              background: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                仕入れ値
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc3545' }}>
                ¥{purchasePrice.toLocaleString()}
              </div>
            </div>

            {/* 出品価格（USD） */}
            <div style={{
              padding: '0.75rem',
              background: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                出品価格（DDP）
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#007bff' }}>
                ${sellingPriceUSD.toFixed(2)}
              </div>
            </div>

            {/* 利益率 */}
            <div style={{
              padding: '0.75rem',
              background: profitMargin >= 30 ? '#d4edda' : profitMargin >= 15 ? '#fff3cd' : '#f8d7da',
              borderRadius: '6px',
              border: `1px solid ${profitMargin >= 30 ? '#c3e6cb' : profitMargin >= 15 ? '#ffeaa7' : '#f5c6cb'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                利益率
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: profitMargin >= 30 ? '#28a745' : profitMargin >= 15 ? '#ffc107' : '#dc3545'
              }}>
                {profitMargin.toFixed(1)}%
              </div>
            </div>

            {/* 利益額 */}
            <div style={{
              padding: '0.75rem',
              background: profitAmount > 0 ? '#d4edda' : '#f8d7da',
              borderRadius: '6px',
              border: `1px solid ${profitAmount > 0 ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                利益額
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: profitAmount > 0 ? '#28a745' : '#dc3545'
              }}>
                ${profitAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 市場調査結果（SellerMirror） */}
      <div className={styles.dataSection} style={{ marginBottom: '1.5rem' }}>
        <h4 className={styles.sectionHeader}>
          <i className="fas fa-chart-line"></i> 市場調査結果（SellerMirror）
        </h4>
        <div style={{ padding: '1rem' }}>
          {smData.analyzed ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* 販売数 */}
                <div style={{
                  padding: '0.75rem',
                  background: '#e3f2fd',
                  borderRadius: '6px',
                  border: '1px solid #90caf9'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#1976d2', marginBottom: '0.25rem' }}>
                    <i className="fas fa-shopping-cart"></i> 販売数
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1565c0' }}>
                    {smData.salesCount}個
                  </div>
                </div>

                {/* 競合数 */}
                <div style={{
                  padding: '0.75rem',
                  background: '#fff3e0',
                  borderRadius: '6px',
                  border: '1px solid #ffb74d'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#f57c00', marginBottom: '0.25rem' }}>
                    <i className="fas fa-users"></i> 競合数
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef6c00' }}>
                    {smData.competitorCount}件
                  </div>
                </div>

                {/* 最安値 */}
                <div style={{
                  padding: '0.75rem',
                  background: '#fce4ec',
                  borderRadius: '6px',
                  border: '1px solid #f8bbd0'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#c2185b', marginBottom: '0.25rem' }}>
                    <i className="fas fa-tag"></i> 最安値（送料込）
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ad1457' }}>
                    ${smData.lowestPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* 最安値での利益 */}
              <div style={{
                padding: '1rem',
                background: smData.profitMargin > 0 ? '#e8f5e9' : '#ffebee',
                borderRadius: '6px',
                border: `1px solid ${smData.profitMargin > 0 ? '#a5d6a7' : '#ef9a9a'}`
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#424242' }}>
                  📈 最安値で出品した場合の予測
                </div>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: '#6c757d' }}>利益率: </span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: smData.profitMargin > 0 ? '#2e7d32' : '#c62828'
                    }}>
                      {smData.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#6c757d' }}>利益額: </span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: smData.profitAmount > 0 ? '#2e7d32' : '#c62828'
                    }}>
                      ${smData.profitAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: '#f8f9fa',
              borderRadius: '6px',
              color: '#6c757d'
            }}>
              <i className="fas fa-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
              <p style={{ margin: 0 }}>SellerMirror分析が実行されていません</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                編集画面で「SM分析」ボタンをクリックしてください
              </p>
            </div>
          )}
        </div>
      </div>

      {/* データ完全性インジケーター */}
      <div style={{ 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '0.75rem' 
        }}>
          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
            <i className="fas fa-clipboard-check"></i> データ完全性
          </h5>
          <span style={{ 
            fontSize: '1.2rem', 
            fontWeight: 700, 
            color: completeness >= 80 ? '#28a745' : completeness >= 60 ? '#ffc107' : '#dc3545'
          }}>
            {completeness}%
          </span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '8px', 
          background: '#e9ecef', 
          borderRadius: '4px', 
          overflow: 'hidden' 
        }}>
          <div style={{ 
            width: `${completeness}%`, 
            height: '100%', 
            background: completeness >= 80 ? '#28a745' : completeness >= 60 ? '#ffc107' : '#dc3545',
            transition: 'width 0.3s ease' 
          }}></div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6c757d' }}>
          {completeness < 80 && (
            <div>
              <strong>改善ポイント:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {!(product as any)?.english_title && <li>英語タイトルの追加</li>}
                {!(product as any)?.hts_code && <li>HTSコードの取得</li>}
                {!smData.analyzed && <li>SellerMirror分析の実行</li>}
                {!product.listing_data?.html_description && <li>HTML説明文の作成</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
