'use client';

import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabMirrorProps {
  product: Product | null;
}

export function TabMirror({ product }: TabMirrorProps) {
  if (!product) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ textAlign: 'center', color: '#6c757d' }}>
          商品データが読み込まれていません
        </p>
      </div>
    );
  }

  // リサーチデータから情報取得
  const researchData = product.listing_data?.research_data || {};
  const smData = researchData.sellerMirror || product.listing_data?.sm_data;
  const competitorsData = researchData.competitors;
  const categoryData = researchData.category;
  
  // 個別フィールドからも取得（後方互換性）
  const smLowestPrice = product.listing_data?.sm_lowest_price;
  const competitorsLowestPrice = product.listing_data?.competitors_lowest_price;
  const categoryName = product.listing_data?.category_name || product.category?.name;
  
  // リサーチ完了状態
  const isResearchCompleted = product.listing_data?.research_completed;
  const researchUpdatedAt = product.listing_data?.research_updated_at;

  const hasData = smData || competitorsData || categoryData || 
                  smLowestPrice || competitorsLowestPrice || categoryName;

  if (!hasData) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
          <i className="fas fa-search-dollar"></i> Mirror分析
        </h3>
        
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffc107', 
          borderRadius: '8px', 
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            ⚠️ リサーチデータがありません。「🔍 一括リサーチ」ボタンから分析を実行してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-search-dollar"></i> Mirror分析
      </h3>
      
      {isResearchCompleted && researchUpdatedAt && (
        <div style={{ 
          fontSize: '0.85rem', 
          color: '#28a745', 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fas fa-check-circle"></i>
          最終更新: {new Date(researchUpdatedAt).toLocaleString('ja-JP')}
        </div>
      )}

      {/* カテゴリ情報 */}
      {(categoryData || categoryName) && (
        <div className={styles.dataSection} style={{ marginBottom: '1.5rem' }}>
          <h4 className={styles.sectionHeader}>
            <i className="fas fa-tags"></i> カテゴリ情報
          </h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {categoryData?.name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>カテゴリ名:</span>
                <span>{categoryData.name}</span>
              </div>
            )}
            {categoryData?.ebay_category_id && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>eBayカテゴリID:</span>
                <span>{categoryData.ebay_category_id}</span>
              </div>
            )}
            {categoryData?.confidence && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>信頼度:</span>
                <span style={{ color: categoryData.confidence > 0.8 ? '#28a745' : '#ffc107' }}>
                  {Math.round(categoryData.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 競合分析（現在の最安値） */}
      {(competitorsData || competitorsLowestPrice) && (
        <div className={styles.dataSection} style={{ marginBottom: '1.5rem' }}>
          <h4 className={styles.sectionHeader}>
            <i className="fas fa-chart-line"></i> 競合分析（現在出品中の最安値）
          </h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {(competitorsData?.lowest_price || competitorsLowestPrice) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>現在の最安値:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#dc3545' }}>
                  ${competitorsData?.lowest_price || competitorsLowestPrice}
                </span>
              </div>
            )}
            {competitorsData?.average_price && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>平均価格:</span>
                <span style={{ fontSize: '1.05rem', color: '#6c757d' }}>
                  ${competitorsData.average_price}
                </span>
              </div>
            )}
            {competitorsData?.count && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>出品数:</span>
                <span>{competitorsData.count}件</span>
              </div>
            )}
            {competitorsData?.data?.condition && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>検索条件:</span>
                <span>{competitorsData.data.condition}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SellerMirror分析 */}
      {(smData || smLowestPrice) && (
        <div className={styles.dataSection}>
          <h4 className={styles.sectionHeader}>
            <i className="fas fa-mirror"></i> SellerMirror分析（過去の販売実績）
          </h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {(smData?.lowest_price || smLowestPrice) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>過去90日の最安値:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#28a745' }}>
                  ${smData?.lowest_price || smLowestPrice}
                </span>
              </div>
            )}
            {smData?.sold_count_90days && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>販売数（90日）:</span>
                <span style={{ fontSize: '1.05rem', color: '#28a745' }}>
                  {smData.sold_count_90days}個
                </span>
              </div>
            )}
            {smData?.confidence && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>データ信頼度:</span>
                <span style={{ color: smData.confidence > 80 ? '#28a745' : '#ffc107' }}>
                  {smData.confidence}%
                </span>
              </div>
            )}
            {smData?.data?.similar_items && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontWeight: 500 }}>類似商品数:</span>
                <span>{smData.data.similar_items}件</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 推奨販売価格の比較 */}
      {competitorsLowestPrice && smLowestPrice && (
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          background: '#e7f3ff', 
          border: '1px solid #2196F3',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#1976D2' }}>
            <i className="fas fa-lightbulb"></i> 価格分析サマリー
          </h4>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 現在の最安値: <strong style={{ color: '#dc3545' }}>${competitorsLowestPrice}</strong>
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 過去の最安値: <strong style={{ color: '#28a745' }}>${smLowestPrice}</strong>
            </p>
            <p style={{ margin: '0.75rem 0 0 0', color: '#1976D2', fontWeight: 500 }}>
              {competitorsLowestPrice < smLowestPrice 
                ? '⚠️ 現在の市場価格が下落傾向にあります'
                : '✅ 現在の市場価格は安定しています'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
