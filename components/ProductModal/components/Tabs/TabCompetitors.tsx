// components/ProductModal/components/Tabs/TabCompetitors.tsx
// 🔥 Updated: 2025-11-14 23:10 - english_title直接使用
'use client';

import { useState } from 'react';
import styles from '../../FullFeaturedModal.css';
import type { Product } from '@/types/product';

export interface TabCompetitorsProps {
  product: Product | null;
}

export function TabCompetitors({ product }: TabCompetitorsProps) {
  const ebayData = (product as any)?.ebay_api_data || {};
  const researchData = ebayData?.research;
  const lowestPriceItem = researchData?.lowestPriceItem;
  const listingReference = ebayData?.listing_reference;
  const referenceItems = listingReference?.referenceItems || [];

  // 🔥 検索クエリの状態管理を追加
  const [searchQuery, setSearchQuery] = useState<string>((product as any)?.english_title || '');

  // 🔥 Browse APIの結果と除外リストを取得
  const browseResult = ebayData?.browse_result;
  const browseItems = browseResult?.items || [];
  const excludedItemIds = browseResult?.excludedItems || []; // 除外された商品ID

  // 🔥 チェックボックスの状態管理
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    // 初期化：除外されていない商品は全てチェック
    const initialChecked = new Set<string>()
    browseItems.forEach((item: any) => {
      if (!excludedItemIds.includes(item.itemId)) {
        initialChecked.add(item.itemId)
      }
    })
    return initialChecked
  })

  // 🔥 チェックボックスのトグル
  const handleToggleCheck = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // 🔥 再計算：チェックされた商品のみで価格を計算
  const handleRecalculate = async () => {
    if (!product?.id) return

    const validItems = browseItems.filter((item: any) => checkedItems.has(item.itemId))
    const excludedItems = browseItems
      .filter((item: any) => !checkedItems.has(item.itemId))
      .map((item: any) => item.itemId)

    try {
      const response = await fetch(`/api/products/${product.id}/recalculate-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validItems,
          excludedItems
        })
      })

      if (response.ok) {
        console.log('✅ 価格を再計算しました')
        alert('✅ 価格を再計算しました！ページをリロードします。')
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`❌ エラー: ${error.error}`)
      }
    } catch (error) {
      console.error('❌ 再計算エラー:', error)
      alert('❌ 再計算中にエラーが発生しました')
    }
  }

  // ✅ Browse APIの結果（sm_*カラム）を取得
  const smData = {
    lowestPrice: (product as any)?.sm_lowest_price,
    averagePrice: (product as any)?.sm_average_price,
    competitorCount: (product as any)?.sm_competitor_count,
    profitMargin: (product as any)?.sm_profit_margin,
    profitAmount: (product as any)?.sm_profit_amount_usd
  };
  
  const hasBrowseApiData = smData.lowestPrice > 0;

  // 🔥 各商品の選択状態を管理 + DBに保存された選択を復元
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    browseResult?.selectedItemId || 
    (browseItems.length > 0 ? (browseItems[0].itemId || '0') : null)
  );
  
  // 🔥 ローディング状態
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingBrowse, setIsFetchingBrowse] = useState(false); // 🔥 Browse API取得中

  // 🔥 Browse APIを実行して競合データを取得
  const handleFetchBrowseData = async () => {
    if (!product?.id) return

    setIsFetchingBrowse(true)

    try {
      console.log('🔍 Browse API実行開始')
      
      // 🔥 ユーザーが入力した検索クエリを使用
      const finalSearchQuery = searchQuery.trim()
      
      if (!finalSearchQuery) {
        alert('⚠️ 検索ワードを入力してください')
        setIsFetchingBrowse(false)
        return
      }

      console.log('🔍 最終検索クエリ:', finalSearchQuery)

      // ログ出力（デバッグ用）
      console.log('📦 ebay_api_data:', ebayData)
      console.log('📝 product全体:', product)
      console.log('📝 english_title:', (product as any).english_title)

      const response = await fetch('/api/ebay/browse/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          ebayTitle: finalSearchQuery,  // 🔥 ユーザーが修正したクエリを使用
          itemSpecifics: null,
          ebayCategoryId: (product as any).ebay_category_id,
          weightG: (product as any).listing_data?.weight_g || 500,
          actualCostJPY: (product as any).price_jpy || 0
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Browse API実行成功:', data)
        alert('✅ 競合データを更新しました！ページをリロードします。')
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('❌ Browse APIエラー:', error)
        alert(`❌ エラー: ${error.error}`)
      }
    } catch (error) {
      console.error('❌ Browse API実行エラー:', error)
      alert('❌ Browse API実行中にエラーが発生しました')
    } finally {
      setIsFetchingBrowse(false)
    }
  }

  // 🔥 精度レベルごとのスタイル定義
  const getMatchLevelStyle = (matchLevel: number) => {
    switch (matchLevel) {
      case 1: // 完全一致
        return {
          borderColor: '#1976d2',
          backgroundColor: '#e3f2fd',
          badgeColor: '#1976d2',
          badgeText: 'レベル1: 完全一致'
        };
      case 2: // 高精度
        return {
          borderColor: '#4caf50',
          backgroundColor: '#e8f5e9',
          badgeColor: '#4caf50',
          badgeText: 'レベル2: 高精度'
        };
      case 3: // 標準
        return {
          borderColor: '#ff9800',
          backgroundColor: '#fff3e0',
          badgeColor: '#ff9800',
          badgeText: 'レベル3: 標準'
        };
      default:
        return {
          borderColor: '#e0e0e0',
          backgroundColor: 'white',
          badgeColor: '#999',
          badgeText: 'レベル不明'
        };
    }
  };

  // 価格順にソート
  const sortedItems = [...referenceItems].sort((a, b) => {
    // ✅ 安全に価格を取得
    const getPriceValue = (item: any) => {
      const price = typeof item.price === 'number' ? item.price : 
                   typeof item.price === 'string' ? parseFloat(item.price) : 
                   item.price?.value ? parseFloat(item.price.value) : 0;
      const shipping = typeof item.shippingCost === 'number' ? item.shippingCost : 
                      typeof item.shippingCost === 'string' ? parseFloat(item.shippingCost) : 
                      item.shippingCost?.value ? parseFloat(item.shippingCost.value) : 0;
      return price + shipping;
    };
    return getPriceValue(a) - getPriceValue(b);
  });

  if (!researchData && sortedItems.length === 0 && !hasBrowseApiData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
        <p>競合商品データがありません</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          「リサーチ」または「SM分析」を実行してください
        </p>
      </div>
    );
  }

  // 🔥 選択された商品を計算に使用
  const handleSelectItem = async (item: any, totalPrice: number) => {
    const itemId = item.itemId || String(Date.now());
    setSelectedItemId(itemId);
    setIsUpdating(true);
    
    try {
      console.log(`💰 価格選択: ${totalPrice.toFixed(2)}`, item);
      
      // APIを呼び出して価格を更新
      const response = await fetch(`/api/products/${product?.id}/select-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItemId: itemId,
          selectedPrice: totalPrice,
          itemData: {
            title: item.title,
            price: item.price?.value || item.price,
            shippingCost: item.shippingOptions?.[0]?.shippingCost?.value || item.shippingCost?.value || 0,
            totalPrice,
            condition: item.condition,
            itemWebUrl: item.itemWebUrl,
            matchLevel: item.matchLevel,
            matchReason: item.matchReason
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 価格更新成功:', result);
        
        // ページをリロードして最新のデータを取得
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('❌ 価格更新失敗:', error);
        alert(`価格の更新に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('❌ エラー:', error);
      alert('価格の更新中にエラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* ヘッダー */}
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-chart-bar"></i> 競合商品分析
      </h3>

      {/* 🔥 検索窓を追加 */}
      <div style={{ 
        marginBottom: '1rem',
        padding: '1rem',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <label style={{ 
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          color: '#495057'
        }}>
          検索タイトル（修正可能）
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索ワードを入力..."
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            fontSize: '0.9rem',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ 
          marginTop: '0.5rem',
          fontSize: '0.8rem',
          color: '#6c757d'
        }}>
          💡 商品が見つからない場合は、検索ワードを短くしてみてください
        </div>
      </div>

      {/* 🔥 Browse API更新ボタン */}
      <button
        onClick={handleFetchBrowseData}
        disabled={isFetchingBrowse}
        style={{
          width: '100%',
          padding: '0.75rem 1.5rem',
          background: isFetchingBrowse ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: isFetchingBrowse ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem'
        }}
      >
        {isFetchingBrowse ? (
          <>
            <i className="fas fa-spinner fa-spin"></i>
            取得中...
          </>
        ) : (
          <>
            <i className="fas fa-sync-alt"></i>
            競合データを更新
          </>
        )}
      </button>

      {/* ✅ Browse APIの結果（最新） */}
      {hasBrowseApiData && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: '#e8f5e9',
          border: '1px solid #4caf50',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <i className="fas fa-sync-alt" style={{ fontSize: '1rem', color: '#4caf50' }}></i>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#2e7d32' }}>
              最新競合分析（Browse API）
            </h4>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>競合数</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2e7d32' }}>
                {smData.competitorCount}件
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>最安値</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1976d2' }}>
                ${smData.lowestPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>平均価格</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                ${smData.averagePrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>利益率</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: smData.profitMargin > 0 ? '#4caf50' : '#f44336' }}>
                {smData.profitMargin.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>利益額</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: smData.profitAmount > 0 ? '#4caf50' : '#f44336' }}>
                ${smData.profitAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Browse APIの商品リスト（最新） - 🔥精度レベル対応 + チェックボックス */}
      {browseItems.length > 0 && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '1rem', 
              fontWeight: 600,
              color: '#2e7d32'
            }}>
              <i className="fas fa-bolt"></i> 最新競合商品（Browse API） - 全{browseItems.length}件 (チェック済み: {checkedItems.size}件)
            </h4>
            
            {/* 🔥 再計算ボタン */}
            <button
              onClick={handleRecalculate}
              style={{
                padding: '0.5rem 1.5rem',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="fas fa-calculator"></i>
              チェック済み商品で再計算
            </button>
          </div>
          
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#666', 
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: '#fff3cd',
            borderRadius: '6px',
            border: '1px solid #ffc107'
          }}>
            <i className="fas fa-info-circle"></i> 
            {' '}検索タイトル: <strong>{browseResult?.searchTitle || '-'}</strong>
            {' '}| 🔍 不適合な商品のチェックを外し、「再計算」ボタンを押して正確な価格を計算します
          </div>

          {/* 🔥 精度レベルの凡例 */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', background: '#1976d2', borderRadius: '3px' }}></div>
              <span><strong>レベル1:</strong> 完全一致（最も信頼性が高い）</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', background: '#4caf50', borderRadius: '3px' }}></div>
              <span><strong>レベル2:</strong> 高精度（Card Name + Number一致）</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', background: '#ff9800', borderRadius: '3px' }}></div>
              <span><strong>レベル3:</strong> 標準（Card Nameのみ一致）</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {browseItems.map((item: any, index: number) => {
              // ✅ 価格を安全に取得
              const rawPrice = item.price?.value || item.price || 0;
              const itemPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice)) || 0;
              
              const rawShipping = item.shippingOptions?.[0]?.shippingCost?.value || 
                                 item.shippingOptions?.[0]?.shippingCost || 
                                 item.shippingCost?.value || 
                                 item.shippingCost || 0;
              const itemShipping = typeof rawShipping === 'number' ? rawShipping : parseFloat(String(rawShipping)) || 0;
              
              const totalPrice = itemPrice + itemShipping;
              
              // 🔥 精度レベルに応じたスタイルを取得
              const matchLevel = item.matchLevel || 3;
              const matchStyle = getMatchLevelStyle(matchLevel);
              const isSelected = selectedItemId === (item.itemId || String(index));
              const isRecommended = item.isRecommended || matchLevel <= 2;
              
              return (
                <div 
                  key={item.itemId || index}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid ${isSelected ? '#4caf50' : matchStyle.borderColor}`,
                    borderRadius: '6px',
                    background: isSelected ? '#f1f8f4' : matchStyle.backgroundColor,
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    position: 'relative',
                    transition: 'all 0.2s',
                    opacity: checkedItems.has(item.itemId || String(index)) ? 1 : 0.5
                  }}
                >
                  {/* 🔥 チェックボックス */}
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.itemId || String(index))}
                    onChange={() => handleToggleCheck(item.itemId || String(index))}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                  {/* 🔥 精度レベルバッジ */}
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '8px',
                    background: matchStyle.badgeColor,
                    color: 'white',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {matchLevel === 1 && <i className="fas fa-star"></i>}
                    {matchLevel === 2 && <i className="fas fa-check-circle"></i>}
                    {matchLevel === 3 && <i className="fas fa-info-circle"></i>}
                    {matchStyle.badgeText}
                  </div>

                  {/* 🔥 選択中バッジ */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '8px',
                      background: '#4caf50',
                      color: 'white',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      <i className="fas fa-check"></i> 使用中
                    </div>
                  )}

                  {/* 商品画像 */}
                  {item.image?.imageUrl && (
                    <img 
                      src={item.image.imageUrl} 
                      alt=""
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}

                  {/* 商品情報 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || 'タイトルなし'}
                    </div>
                    
                    {/* 🔥 マッチ理由を表示 */}
                    {item.matchReason && (
                      <div style={{ fontSize: '0.7rem', color: matchStyle.badgeColor, marginBottom: '0.25rem', fontWeight: 600 }}>
                        <i className="fas fa-fingerprint"></i> {item.matchReason}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <div>
                        <span style={{ color: '#666' }}>商品:</span>
                        <span style={{ fontWeight: 'bold', color: '#1976d2', marginLeft: '0.25rem' }}>
                          ${itemPrice.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#666' }}>送料:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '0.25rem' }}>
                          ${itemShipping.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#666' }}>合計:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isSelected ? '#4caf50' : '#333', marginLeft: '0.25rem' }}>
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#666' }}>状態:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '0.25rem' }}>
                          {item.condition || '-'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      <strong>セラー:</strong> {item.seller?.username || '-'}
                      {item.seller?.feedbackScore && (
                        <span> ({item.seller.feedbackScore} pts, {item.seller.feedbackPercentage}%)</span>
                      )}
                    </div>
                  </div>

                  {/* ボタングループ（右側） */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {item.itemWebUrl && (
                      <a
                        href={item.itemWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '0.4rem 0.75rem',
                          background: '#1976d2',
                          color: 'white',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className="fas fa-external-link-alt"></i> 商品ページ
                      </a>
                    )}
                    <button
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: isSelected ? '#4caf50' : (isRecommended ? '#1976d2' : '#f5f5f5'),
                        color: (isSelected || isRecommended) ? 'white' : '#333',
                        border: (isSelected || isRecommended) ? 'none' : '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        opacity: isUpdating ? 0.6 : 1
                      }}
                      onClick={() => handleSelectItem(item, totalPrice)}
                      disabled={isUpdating}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isUpdating) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {isUpdating ? (
                        <><i className="fas fa-spinner fa-spin"></i> 更新中...</>
                      ) : isSelected ? (
                        <><i className="fas fa-check"></i> 使用中</>
                      ) : isRecommended ? (
                        <><i className="fas fa-star"></i> 推奨</>
                      ) : (
                        'この価格を使用'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔥 Browse API結果が0件の場合のメッセージ */}
      {browseItems.length === 0 && (
        <div style={{ 
          padding: '2rem',
          textAlign: 'center',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginBottom: '1.5rem'
        }}>
          <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3, color: '#6c757d' }}></i>
          <p style={{ fontSize: '1rem', color: '#495057', marginBottom: '0.5rem' }}>
            該当する商品が見つかりませんでした
          </p>
          <p style={{ fontSize: '0.85rem', color: '#6c757d' }}>
            検索ワードを短くするか、別のキーワードで検索してください
          </p>
        </div>
      )}

      {/* 🔥 SM分析の結果は完全に非表示（Browse API結果がない場合のみ表示） */}
      {browseItems.length === 0 && false && (
        <>
          {/* 最安値商品（リサーチ結果） */}
          {lowestPriceItem && (
            <div style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className="fas fa-trophy" style={{ fontSize: '1.5rem' }}></i>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
              最安値商品（リサーチ結果）
            </h4>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <strong>タイトル:</strong> {lowestPriceItem.title}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>商品価格</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  ${typeof lowestPriceItem.price === 'number' ? lowestPriceItem.price.toFixed(2) : 
                     typeof lowestPriceItem.price === 'string' ? parseFloat(lowestPriceItem.price).toFixed(2) : 
                     lowestPriceItem.price?.value ? parseFloat(lowestPriceItem.price.value).toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>送料</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  ${typeof lowestPriceItem.shippingCost === 'number' ? lowestPriceItem.shippingCost.toFixed(2) : 
                     typeof lowestPriceItem.shippingCost === 'string' ? parseFloat(lowestPriceItem.shippingCost).toFixed(2) : 
                     lowestPriceItem.shippingCost?.value ? parseFloat(lowestPriceItem.shippingCost.value).toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>合計</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                  ${typeof lowestPriceItem.totalPrice === 'number' ? lowestPriceItem.totalPrice.toFixed(2) : 
                     typeof lowestPriceItem.totalPrice === 'string' ? parseFloat(lowestPriceItem.totalPrice).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              <strong>状態:</strong> {lowestPriceItem.condition} | 
              <strong> セラー:</strong> {
                typeof lowestPriceItem.seller === 'string' 
                  ? lowestPriceItem.seller 
                  : lowestPriceItem.seller?.username || '-'
              }
            </div>
          </div>

          {lowestPriceItem.itemWebUrl && (
            <a
              href={lowestPriceItem.itemWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#667eea',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'transform 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <i className="fas fa-external-link-alt"></i>
              eBayで商品を確認
            </a>
          )}
        </div>
      )}

      {/* SM分析の競合商品リスト (✅ Browse API結果がない場合のみ表示) */}
      {!hasBrowseApiData && sortedItems.length > 0 && (
        <div>
          <h4 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1rem', 
            fontWeight: 600,
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            <i className="fas fa-list"></i> SM分析の競合商品（価格順）
          </h4>
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#666', 
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <i className="fas fa-info-circle"></i> 
            {' '}全{sortedItems.length}件の競合商品を価格の安い順に表示しています
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {sortedItems.map((item: any, index: number) => {
              // ✅ 安全に価格を取得
              const itemPrice = typeof item.price === 'number' ? item.price : 
                               typeof item.price === 'string' ? parseFloat(item.price) : 
                               item.price?.value ? parseFloat(item.price.value) : 0;
              const itemShipping = typeof item.shippingCost === 'number' ? item.shippingCost : 
                                  typeof item.shippingCost === 'string' ? parseFloat(item.shippingCost) : 
                                  item.shippingCost?.value ? parseFloat(item.shippingCost.value) : 0;
              const totalPrice = itemPrice + itemShipping;
              const isLowest = index === 0;
              
              return (
                <div 
                  key={item.itemId || index}
                  style={{
                    padding: '1rem',
                    border: isLowest ? '2px solid #4caf50' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    background: isLowest ? '#f1f8f4' : 'white',
                    position: 'relative'
                  }}
                >
                  {isLowest && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '10px',
                      background: '#4caf50',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      <i className="fas fa-star"></i> SM最安値
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    {/* 商品画像 */}
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt=""
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #e0e0e0'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                    {/* 商品情報 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {item.title || 'タイトルなし'}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>商品価格</div>
                          <div style={{ fontWeight: 'bold', color: '#1976d2' }}>
                            ${typeof item.price === 'number' ? item.price.toFixed(2) : 
                               typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : 
                               item.price?.value ? parseFloat(item.price.value).toFixed(2) : '0.00'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>送料</div>
                          <div style={{ fontWeight: 'bold' }}>
                            ${typeof item.shippingCost === 'number' ? item.shippingCost.toFixed(2) : 
                               typeof item.shippingCost === 'string' ? parseFloat(item.shippingCost).toFixed(2) : 
                               item.shippingCost?.value ? parseFloat(item.shippingCost.value).toFixed(2) : '0.00'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>合計</div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isLowest ? '#4caf50' : '#333' }}>
                            ${totalPrice.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>状態</div>
                          <div style={{ fontWeight: 'bold' }}>
                            {item.condition || '-'}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                        <strong>セラー:</strong> {
                          typeof item.seller === 'string' 
                            ? item.seller 
                            : item.seller?.username || '-'
                        }
                        {item.sellerFeedbackScore && typeof item.sellerFeedbackScore === 'number' && (
                          <span> ({item.sellerFeedbackScore} pts, {item.sellerFeedbackPercentage}%)</span>
                        )}
                        {item.seller?.feedbackScore && typeof item.seller.feedbackScore === 'number' && (
                          <span> ({item.seller.feedbackScore} pts, {item.seller.feedbackPercentage}%)</span>
                        )}
                      </div>

                      {/* eBayリンク */}
                      {item.itemWebUrl && (
                        <a
                          href={item.itemWebUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '0.75rem',
                            padding: '0.5rem 1rem',
                            background: '#1976d2',
                            color: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#1565c0'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#1976d2'}
                        >
                          <i className="fas fa-external-link-alt"></i>
                          商品ページを開く
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
