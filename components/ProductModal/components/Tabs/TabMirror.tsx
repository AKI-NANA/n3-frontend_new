'use client';

import { useMemo } from 'react';
import styles from '../../FullFeaturedModal.css';
import type { Product } from '@/types/product';
import { useMirrorSelectionStore } from '@/store/mirrorSelectionStore';

export interface TabMirrorProps {
  product: Product | null;
}

interface ReferenceItem {
  image: string;
  price: string;
  title: string;
  itemId: string;
  seller: string | { username: string };
  currency: string;
  condition: string;
  categoryId: string;
  categoryPath: string;
  shippingCost: string;
  shippingType: string;
  itemWebUrl?: string;
  hasDetails?: boolean;
  itemSpecifics?: Record<string, string>;
  localizedAspects?: Record<string, string>;
  itemLocation?: {
    city?: string;
    stateOrProvince?: string;
    country?: string;
  };
  quantitySold?: number;
}

export function TabMirror({ product }: TabMirrorProps) {
  const { selectedItems, toggleItem, getSelectedByProduct } = useMirrorSelectionStore();

  if (!product) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ textAlign: 'center', color: '#6c757d' }}>
          商品データが読み込まれていません
        </p>
      </div>
    );
  }

  // ebay_api_data.listing_reference からデータ取得
  const listingReference = product.ebay_api_data?.listing_reference;
  const referenceItems: ReferenceItem[] = listingReference?.referenceItems || [];
  const suggestedCategory = listingReference?.suggestedCategory;
  const suggestedCategoryPath = listingReference?.suggestedCategoryPath;
  const analyzedAt = listingReference?.analyzedAt;

  // カテゴリ情報
  const categoryId = product.ebay_api_data?.category_id || suggestedCategory;
  const categoryName = product.ebay_api_data?.category_name || suggestedCategoryPath;

  // この商品で選択されているアイテムID
  const selectedItemIds = useMemo(() => {
    return getSelectedByProduct(product.id);
  }, [selectedItems, product.id, getSelectedByProduct]);

  const hasData = referenceItems.length > 0 || categoryId || categoryName;

  if (!hasData) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffc107', 
          borderRadius: '8px', 
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            ⚠️ Mirror分析データがありません。「SM分析」ボタンから分析を実行してください。
          </p>
        </div>
      </div>
    );
  }

  // 選択された商品の価格統計
  const selectedReferenceItems = referenceItems.filter(item => selectedItemIds.includes(item.itemId));
  const prices = selectedReferenceItems
    .map(item => parseFloat(item.price))
    .filter(price => !isNaN(price))
    .sort((a, b) => a - b);

  const lowestPrice = prices.length > 0 ? prices[0] : null;
  const averagePrice = prices.length > 0 
    ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
    : null;
  const highestPrice = prices.length > 0 ? prices[prices.length - 1] : null;

  // ✅ 選択数をカウント（1つだけ選択可能）
  const selectedCount = selectedItemIds.length;

  // 全選択/全解除（実際は1つだけ選択）
  const handleToggleAll = () => {
    const allSelected = referenceItems.every(item => selectedItemIds.includes(item.itemId));
    
    if (allSelected) {
      // 全解除
      referenceItems.forEach(item => {
        if (selectedItemIds.includes(item.itemId)) {
          toggleItem(product.id, {
            productId: product.id,
            itemId: item.itemId,
            title: item.title,
            price: parseFloat(item.price),
            image: item.image,
            seller: getSellerName(item.seller),
            condition: item.condition,
            hasDetails: true // 選択=詳細取得対象
          });
        }
      });
    }
  };

  // 個別選択（1つだけ選択可能）
  const handleToggleItem = (item: ReferenceItem) => {
    // 既に選択されている商品があれば、先に解除
    if (selectedItemIds.length > 0 && !selectedItemIds.includes(item.itemId)) {
      // 既存の選択を全て解除
      referenceItems.forEach(refItem => {
        if (selectedItemIds.includes(refItem.itemId)) {
          toggleItem(product.id, {
            productId: product.id,
            itemId: refItem.itemId,
            title: refItem.title,
            price: parseFloat(refItem.price),
            image: refItem.image,
            seller: getSellerName(refItem.seller),
            condition: refItem.condition,
            hasDetails: true
          });
        }
      });
    }
    
    // 新しい商品を選択（またはトグル）
    toggleItem(product.id, {
      productId: product.id,
      itemId: item.itemId,
      title: item.title,
      price: parseFloat(item.price),
      image: item.image,
      seller: getSellerName(item.seller),
      condition: item.condition,
      hasDetails: true
    });
  };

  const getSellerName = (seller: string | { username: string }) => {
    return typeof seller === 'string' ? seller : seller?.username || '-';
  };

  const allSelected = referenceItems.length > 0 && referenceItems.every(item => selectedItemIds.includes(item.itemId));

  return (
    <div style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
          <i className="fas fa-search-dollar"></i> Mirror分析
        </h3>
        
        {analyzedAt && (
          <div style={{ 
            fontSize: '0.85rem', 
            color: selectedCount === 1 ? '#28a745' : '#6c757d',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className={selectedCount === 1 ? "fas fa-check-circle" : "fas fa-info-circle"}></i>
            分析日時: {new Date(analyzedAt).toLocaleString('ja-JP')} | 選択中: {selectedCount}/1件
            {selectedCount === 0 && (
              <span style={{ color: '#ffc107', fontWeight: 600 }}>
                （詳細取得する商品を1つ選択してください）
              </span>
            )}
          </div>
        )}
      </div>

      {/* 🎉 SellerMirror分析結果表示 */}
      {(product.sm_competitor_count > 0 || product.sm_lowest_price || product.sm_average_price) && (
        <div style={{ 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f0f7ff',
          border: '2px solid #0064d2',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem 0', 
            fontSize: '0.95rem', 
            fontWeight: 600,
            color: '#0064d2',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-chart-bar"></i>
            SellerMirror分析結果
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <div style={{ 
              padding: '0.75rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e3f2fd'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                競合数
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0064d2' }}>
                {product.sm_competitor_count || 0}件
              </div>
            </div>
            
            <div style={{ 
              padding: '0.75rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e3f2fd'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                最安値
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#28a745' }}>
                ${parseFloat(product.sm_lowest_price || '0').toFixed(2)}
              </div>
            </div>
            
            <div style={{ 
              padding: '0.75rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e3f2fd'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                平均価格
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0064d2' }}>
                ${parseFloat(product.sm_average_price || '0').toFixed(2)}
              </div>
            </div>
            
            <div style={{ 
              padding: '0.75rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e3f2fd'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                利益率
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 600, 
                color: parseFloat(product.sm_profit_margin || '0') > 0 ? '#28a745' : '#dc3545' 
              }}>
                {parseFloat(product.sm_profit_margin || '0').toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 市場調査データ表示 */}
      {product.market_research_summary && (
        <div style={{ 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#fff8e1',
          border: '2px solid #ffc107',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem 0', 
            fontSize: '0.95rem', 
            fontWeight: 600,
            color: '#f57c00',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-clipboard-list"></i>
            AI市場調査サマリー
          </h4>
          
          <div style={{ 
            fontSize: '0.9rem', 
            lineHeight: '1.6',
            color: '#5d4037',
            whiteSpace: 'pre-wrap'
          }}>
            {product.market_research_summary}
          </div>
        </div>
      )}

      {/* カテゴリ情報と価格統計を横並び */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* カテゴリ情報 */}
        <div style={{ 
          border: '1px solid #e9ecef', 
          borderRadius: '8px', 
          padding: '1rem',
          background: '#f8f9fa'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
            <i className="fas fa-tags"></i> カテゴリ情報
          </h4>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: '#6c757d' }}>カテゴリ名: </span>
              <span style={{ fontWeight: 600 }}>{categoryName || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#6c757d' }}>カテゴリID: </span>
              <span style={{ fontWeight: 600 }}>{categoryId || '-'}</span>
            </div>
          </div>
        </div>

        {/* 価格統計 */}
        <div style={{ 
          border: '1px solid #e9ecef', 
          borderRadius: '8px', 
          padding: '1rem',
          background: '#f8f9fa'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
            <i className="fas fa-chart-line"></i> 価格統計（選択中: {selectedItemIds.length}件）
          </h4>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: '#6c757d' }}>最安値: </span>
              <span style={{ fontWeight: 600, color: '#28a745' }}>
                {lowestPrice ? `$${lowestPrice.toFixed(2)}` : '-'}
              </span>
            </div>
            <div>
              <span style={{ color: '#6c757d' }}>平均価格: </span>
              <span style={{ fontWeight: 600, color: '#0064d2' }}>
                {averagePrice ? `$${averagePrice.toFixed(2)}` : '-'}
              </span>
            </div>
            <div>
              <span style={{ color: '#6c757d' }}>最高値: </span>
              <span style={{ fontWeight: 600, color: '#dc3545' }}>
                {highestPrice ? `$${highestPrice.toFixed(2)}` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 選択情報 */}
      <div style={{ 
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#e7f3ff',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#1976D2'
      }}>
        💡 詳細取得する商品を<strong>1つだけ</strong>選択してください。モーダルを閉じても選択は保持されます。テーブルの「一括詳細取得」ボタンで取得できます。
      </div>

      {/* 参照商品リスト */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
            <i className="fas fa-list"></i> 参照商品（{referenceItems.length}件）
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleToggleAll}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.85rem',
                border: '1px solid #0064d2',
                borderRadius: '4px',
                background: 'white',
                color: '#0064d2',
                cursor: 'pointer'
              }}
            >
              {allSelected ? '全解除' : '全選択'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {referenceItems.map((item, index) => {
            const isSelected = selectedItemIds.includes(item.itemId);

            return (
              <div 
                key={item.itemId || index}
                style={{ 
                  border: `2px solid ${isSelected ? '#0064d2' : '#e9ecef'}`,
                  borderRadius: '8px',
                  padding: '0.75rem',
                  background: isSelected ? '#f0f7ff' : 'white',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
              >
                {/* ✅ 選択中バッジ - 選択されている場合のみ表示 */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: '#0064d2',
                    color: 'white',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <i className="fas fa-check-circle"></i>
                    詳細取得対象
                  </div>
                )}

                {/* 商品カード */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '24px 60px 1fr auto',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}>
                  {/* ラジオボタン（1つだけ選択） */}
                  <input
                    type="radio"
                    name={`mirror-selection-${product.id}`}
                    checked={isSelected}
                    onChange={() => handleToggleItem(item)}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />

                  {/* 商品画像 */}
                  <img 
                    src={item.image} 
                    alt={item.title}
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/60x60/e9ecef/6c757d?text=No+Image'
                    }}
                  />

                  {/* 商品情報 */}
                  <div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 600, 
                      marginBottom: '0.25rem',
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {item.title}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      fontSize: '0.85rem',
                      color: '#6c757d'
                    }}>
                      <span>状態: {item.condition}</span>
                      <span>セラー: {getSellerName(item.seller)}</span>
                      <span>送料: {parseFloat(item.shippingCost) === 0 ? '無料' : `$${parseFloat(item.shippingCost).toFixed(2)}`}</span>
                    </div>
                  </div>

                  {/* 価格とリンクボタン */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 600, 
                      color: '#28a745'
                    }}>
                      ${parseFloat(item.price).toFixed(2)}
                    </div>
                    
                    {/* 🔗 eBayページへのリンクボタン */}
                    {item.itemWebUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.itemWebUrl, '_blank');
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'white',
                          background: '#0064d2',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#0052a3'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#0064d2'}
                        title="eBay商品ページを開く"
                      >
                        <i className="fas fa-external-link-alt"></i>
                        eBayで見る
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 価格設定の提案 */}
      {lowestPrice && averagePrice && selectedItemIds.length > 0 && (
        <div style={{ 
          padding: '1rem', 
          background: '#e7f3ff', 
          border: '1px solid #2196F3',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#1976D2' }}>
            <i className="fas fa-lightbulb"></i> 価格設定の提案（選択中の商品に基づく）
          </h4>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 競争力重視: <strong style={{ color: '#28a745' }}>${lowestPrice.toFixed(2)}</strong>（最安値）
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • バランス型: <strong style={{ color: '#0064d2' }}>${averagePrice.toFixed(2)}</strong>（平均価格）
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              • 利益重視: <strong style={{ color: '#ff9900' }}>${(lowestPrice * 1.1).toFixed(2)}</strong>（最安値+10%）
            </p>
            <p style={{ margin: '0.75rem 0 0 0', color: '#1976D2', fontWeight: 500 }}>
              💡 選択中の{selectedItemIds.length}件の商品から計算した価格です
            </p>
          </div>
        </div>
      )}

      {/* 🆕 新しいURLを登録するセクション */}
      <div style={{ 
        padding: '1rem', 
        background: '#fff8e1', 
        border: '2px solid #ffc107',
        borderRadius: '8px'
      }}>
        <h4 style={{ 
          margin: '0 0 0.75rem 0', 
          fontSize: '0.95rem', 
          fontWeight: 600,
          color: '#f57c00',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fas fa-plus-circle"></i>
          新しい競合商品URLを登録
        </h4>
        
        <div style={{ 
          fontSize: '0.85rem', 
          color: '#5d4037',
          marginBottom: '0.75rem',
          lineHeight: '1.5'
        }}>
          💡 データが取得できなかった場合、手動でeBay商品URLを登録して再分析できます。
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="eBay商品URLを入力 (https://www.ebay.com/itm/...)"
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.85rem',
              border: '2px solid #ffc107',
              borderRadius: '4px'
            }}
            id="newCompetitorUrl"
          />
          <button
            onClick={async () => {
              const input = document.getElementById('newCompetitorUrl') as HTMLInputElement;
              const url = input?.value?.trim();
              
              if (!url) {
                alert('⚠️ URLを入力してください');
                return;
              }
              
              if (!url.includes('ebay.com')) {
                alert('⚠️ 有効なeBay URLを入力してください');
                return;
              }
              
              try {
                const response = await fetch('/api/products/sm-analyze', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    productId: product.id,
                    competitorUrls: [url]
                  })
                });
                
                const result = await response.json();
                
                if (result.success) {
                  alert('✅ 競合商品を登録しました！ページをリロードしてください。');
                  input.value = '';
                  // ページをリロード
                  window.location.reload();
                } else {
                  alert(`❌ エラー: ${result.error}`);
                }
              } catch (error) {
                console.error('URL登録エラー:', error);
                alert('❌ URL登録中にエラーが発生しました');
              }
            }}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'white',
              background: '#ff9800',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-save"></i>
            登録
          </button>
        </div>
      </div>
    </div>
  );
}
