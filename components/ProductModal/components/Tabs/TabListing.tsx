'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';
import { getCategoryMapping, mergeItemSpecificsToFormData, type ItemSpecificField } from '@/app/tools/editing/config/ebayItemSpecificsMapping';
import { convertYahooToEbayCondition, EBAY_CONDITION_NAMES } from '@/lib/conditionMapping';

export interface TabListingProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabListing({ product, marketplace, marketplaceName }: TabListingProps) {
  const listingData = (product as any)?.listing_data || {};
  const ebayData = (product as any)?.ebay_api_data || {};
  
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
  
  const [basicFormData, setBasicFormData] = useState({
    title: '',
    price: 0,
    quantity: 1,
    condition: 'Used',
    conditionId: 3000,
    category: '',
    categoryId: '',
  });

  const [euFormData, setEuFormData] = useState({
    euCompanyName: '',
    euAddressLine1: '',
    euAddressLine2: '',
    euCity: '',
    euStateOrProvince: '',
    euPostalCode: '',
    euCountry: '',
    euEmail: '',
    euPhone: '',
    euContactUrl: '',
  });

  // 🔥 productが変わったらbasicFormDataを更新
  useEffect(() => {
    if (product) {
      const listingData = (product as any)?.listing_data || {};
      const ebayData = (product as any)?.ebay_api_data || {};
      
      // 🔄 Yahoo状態をeBay状態に変換
      const yahooCondition = listingData.condition || (product as any)?.condition_name || (product as any)?.condition || 'Used';
      const convertedCondition = convertYahooToEbayCondition(yahooCondition);
      
      console.log('[TabListing] 🔄 Updating basicFormData from product:', {
        english_title: (product as any)?.english_title,
        title: (product as any)?.title,
        ddp_price_usd: listingData.ddp_price_usd,
        price_usd: (product as any)?.price_usd,
        yahoo_condition: yahooCondition,
        ebay_condition: convertedCondition.ebayCondition,
        condition_id: convertedCondition.conditionId,
      });

      setBasicFormData({
        title: (product as any)?.english_title || (product as any)?.title || '',
        price: listingData.ddp_price_usd || (product as any)?.price_usd || product?.price || 0,
        quantity: product?.stock?.available || 1,
        condition: convertedCondition.ebayCondition,
        conditionId: convertedCondition.conditionId,
        category: ebayData.category_name || product?.category?.name || '',
        categoryId: ebayData.category_id || product?.category?.id || '',
      });
    }
  }, [product]);

  // 🔥 productが変わったらeuFormDataを更新
  useEffect(() => {
    if (product) {
      const listingData = (product as any)?.listing_data || {};
      
      setEuFormData({
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
    }
  }, [product]);

  const [itemSpecificsData, setItemSpecificsData] = useState<Record<string, string>>({});
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [otherSpecifics, setOtherSpecifics] = useState<Record<string, string>>({});
  const [hasMirrorData, setHasMirrorData] = useState(false); // SellerMirrorデータの有無

  const categoryId = ebayData.category_id || ebayData.listing_reference?.suggestedCategory;
  const categoryMapping = getCategoryMapping(categoryId);

  useEffect(() => {
    if (!product) return;

    console.log("[TabListing DEBUG] ==================== START ====================");
    console.log("[TabListing DEBUG] product:", product);
    console.log("[TabListing DEBUG] product keys:", Object.keys(product || {}));
    console.log("[TabListing DEBUG] ebayData:", ebayData);
    console.log("[TabListing DEBUG] ebayData keys:", Object.keys(ebayData || {}));
    console.log("[TabListing DEBUG] product.ebay_api_data:", (product as any)?.ebay_api_data);
    console.log("[TabListing DEBUG] ebayData.listing_reference:", ebayData.listing_reference);
    
    const mirrorItems = ebayData.listing_reference?.referenceItems || [];
    
    console.log("[TabListing DEBUG] mirrorItems:", mirrorItems);
    console.log("[TabListing DEBUG] mirrorItems.length:", mirrorItems.length);
    
    // 各アイテムの詳細を確認
    mirrorItems.forEach((item: any, index: number) => {
      console.log(`[TabListing DEBUG] mirrorItems[${index}]:`, {
        hasDetails: item.hasDetails,
        itemSpecifics: item.itemSpecifics,
        itemSpecificsKeys: item.itemSpecifics ? Object.keys(item.itemSpecifics) : 'なし'
      });
    });
    
    console.log("[TabListing DEBUG] ==================== END ====================");
    const allItemSpecifics: Record<string, Record<string, number>> = {};
    
    console.log("[TabListing] Processing mirrorItems...");
    mirrorItems.forEach((item: any, index: number) => {
      console.log(`[TabListing] Item ${index}:`, {
        hasDetails: item.hasDetails,
        hasItemSpecifics: !!item.itemSpecifics,
        itemSpecificsCount: item.itemSpecifics ? Object.keys(item.itemSpecifics).length : 0
      });
      
      // hasDetailsチェックを削除 - itemSpecificsがあれば使用
      if (item.itemSpecifics && typeof item.itemSpecifics === 'object') {
        Object.entries(item.itemSpecifics).forEach(([key, value]) => {
          if (!allItemSpecifics[key]) {
            allItemSpecifics[key] = {};
          }
          allItemSpecifics[key][value as string] = (allItemSpecifics[key][value as string] || 0) + 1;
        });
      }
    });

    const mostCommonSpecifics: Record<string, string> = {};
    Object.entries(allItemSpecifics).forEach(([key, valueCounts]) => {
      const sortedValues = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
      if (sortedValues.length > 0) {
        mostCommonSpecifics[key] = sortedValues[0][0];
      }
    });
    
    console.log("[TabListing] 集計結果:");
    console.log("  - 取得したキー数:", Object.keys(mostCommonSpecifics).length);
    console.log("  - キー一覧:", Object.keys(mostCommonSpecifics));
    console.log("  - 最頻値:", mostCommonSpecifics);
    
    // SellerMirrorデータの有無を設定
    const hasMirror = Object.keys(mostCommonSpecifics).length > 0;
    setHasMirrorData(hasMirror);
    console.log("[TabListing] hasMirrorData:", hasMirror);

    const savedSpecifics = (product as any)?.ebay_listing_data?.itemSpecifics || {};
    
    if (hasMirror) {
      // ケース1: SellerMirrorデータがある場合
      // マッピング定義を無視して、取得した全データを表示
      const finalData = {
        ...mostCommonSpecifics,  // SellerMirrorから取得した全データ
        ...savedSpecifics        // 手動編集データで上書き
      };
      
      console.log("[TabListing] SellerMirrorデータを使用:", finalData);
      setItemSpecificsData(finalData);
      
      // 自動入力フラグ
      const autoFilled = new Set<string>();
      Object.keys(mostCommonSpecifics).forEach(key => {
        if (!savedSpecifics[key]) {
          autoFilled.add(key);
        }
      });
      setAutoFilledFields(autoFilled);
      
      // ✅ SM分析データがある場合は警告を出さない
      setOtherSpecifics({});
      
    } else if (categoryId) {
      // ケース2: SellerMirrorデータなし → eBay APIから必須項目を取得
      console.log(`[TabListing] カテゴリID ${categoryId} の必須項目を取得中...`);
      // エラーを無視して続行
      loadCategorySpecifics(categoryId, savedSpecifics).catch(err => {
        console.warn('[TabListing] カテゴリ必須項目の取得に失敗しましたが、処理を続行します:', err);
      });
    } else {
      // ケース3: カテゴリIDもない場合はフォールバック
      const mergedData = mergeItemSpecificsToFormData(
        savedSpecifics, 
        categoryMapping
      );
      
      console.log("[TabListing] カテゴリマッピングをフォールバックとして使用:", mergedData);
      setItemSpecificsData(mergedData);
      setAutoFilledFields(new Set());
      setOtherSpecifics({});
    }

  }, [product, categoryId]); // categoryIdも依存配列に追加

  // ✅ eBay APIから動的にカテゴリ別必須項目を取得する関数
  const loadCategorySpecifics = async (catId: string, savedSpecifics: Record<string, string>) => {
    try {
      console.log(`[TabListing] 🔍 カテゴリ ${catId} の必須項目をeBay APIから取得中...`);
      
      const response = await fetch('/api/ebay/category-specifics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: catId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`[TabListing] ✅ 必須項目: ${data.requiredFields.length}件`);
        console.log(`[TabListing] ✅ 推奨項目: ${data.recommendedFields.length}件`);
        console.log(`[TabListing] Required Fields:`, data.requiredFields);
        console.log(`[TabListing] Recommended Fields:`, data.recommendedFields);
        
        // 既存の保存済みデータを表示
        setItemSpecificsData(savedSpecifics);
        
        // 未入力の必須項目をチェック
        const missingFields: Record<string, string> = {};
        
        data.requiredFields.forEach((field: any) => {
          if (!savedSpecifics[field.name]) {
            missingFields[field.name] = '';
          }
        });
        
        // 推奨項目もチェック
        data.recommendedFields.forEach((field: any) => {
          if (!savedSpecifics[field.name]) {
            missingFields[field.name] = '';
          }
        });
        
        console.log(`[TabListing] 📋 未入力の必須・推奨項目:`, missingFields);
        setOtherSpecifics(missingFields);
        
      } else {
        console.error('[TabListing] ❌ API呼び出し失敗:', data.error);
        // フォールバック: 固定カテゴリマッピングを使用
        const mergedData = mergeItemSpecificsToFormData(savedSpecifics, categoryMapping);
        setItemSpecificsData(mergedData);
        setOtherSpecifics({});
      }
    } catch (error) {
      console.error('[TabListing] ❌ カテゴリ必須項目取得エラー:', error);
      // フォールバック: 固定カテゴリマッピングを使用
      const mergedData = mergeItemSpecificsToFormData(savedSpecifics, categoryMapping);
      setItemSpecificsData(mergedData);
      setOtherSpecifics({});
    }
  };

  const handleBasicFieldChange = (field: string, value: string | number) => {
    setBasicFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEuFieldChange = (field: string, value: string) => {
    setEuFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemSpecificChange = (field: string, value: string) => {
    setItemSpecificsData(prev => ({
      ...prev,
      [field]: value
    }));
    setAutoFilledFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(field);
      return newSet;
    });
  };

  const handleSave = () => {
    const allData = {
      ...basicFormData,
      ...euFormData,
      itemSpecifics: itemSpecificsData,
    };
    console.log('[TabListing] Saving data:', allData);
    alert('保存機能は実装中です\n\nデータ:\n' + JSON.stringify(allData, null, 2));
  };

  const handleReset = () => {
    if (confirm('入力内容をリセットしますか?')) {
      setItemSpecificsData({});
      setAutoFilledFields(new Set());
    }
  };

  const isEUDataComplete = euFormData.euCompanyName && 
                          euFormData.euCompanyName !== 'N/A' &&
                          euFormData.euAddressLine1 && 
                          euFormData.euCity && 
                          euFormData.euPostalCode && 
                          euFormData.euCountry;

  const mirrorItems = ebayData.listing_reference?.referenceItems || [];
  const detailedItemsCount = mirrorItems.filter((item: any) => item.hasDetails).length;

  const renderField = (field: ItemSpecificField) => {
    const value = itemSpecificsData[field.name] || '';
    const hasAutoFilled = autoFilledFields.has(field.name);

    return (
      <div key={field.name} style={{ marginBottom: '0.75rem' }}>
        <label style={{
          fontSize: '0.8rem',
          fontWeight: field.required ? 600 : 500,
          color: field.required ? '#dc3545' : '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.25rem'
        }}>
          {field.label}
          {field.required && <span style={{ color: '#dc3545' }}>*</span>}
          {hasAutoFilled && (
            <span style={{ color: '#28a745', fontSize: '0.7rem', fontWeight: 'normal' }}>
              ✓ 自動
            </span>
          )}
        </label>
        
        {field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => handleItemSpecificChange(field.name, e.target.value)}
            style={{
              width: '100%',
              padding: '0.35rem',
              fontSize: '0.8rem',
              border: `1px solid ${field.required && !value ? '#dc3545' : '#ced4da'}`,
              borderRadius: '4px',
              backgroundColor: hasAutoFilled ? '#e7f3ff' : 'white'
            }}
          >
            <option value="">選択してください</option>
            
            {/* SellerMirrorで取得した値を選択肢として追加 */}
            {value && !field.options?.includes(value) && (
              <option value={value}>{value} (取得値)</option>
            )}
            
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleItemSpecificChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            style={{
              width: '100%',
              padding: '0.35rem',
              fontSize: '0.8rem',
              border: `1px solid ${field.required && !value ? '#dc3545' : '#ced4da'}`,
              borderRadius: '4px',
              backgroundColor: hasAutoFilled ? '#e7f3ff' : 'white'
            }}
          />
        )}
        
        {field.description && (
          <div style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '0.15rem' }}>
            {field.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: '1rem', 
      display: 'flex', 
      flexDirection: 'column',
      overflowY: 'auto',
      background: '#f8f9fa'
    }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>
            <i className="fas fa-edit"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 出品情報
          </h3>
          
          {marketplace === 'ebay' && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: detailedItemsCount > 0 ? '#28a745' : '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {detailedItemsCount > 0 ? (
                <>
                  <i className="fas fa-check-circle"></i>
                  {detailedItemsCount}件の詳細情報から自動入力済み
                </>
              ) : (
                <>
                  <i className="fas fa-info-circle"></i>
                  Mirrorタブで「詳細を取得」すると、自動的に入力されます
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#6c757d',
              background: 'white',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-undo"></i> リセット
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.4rem 1.2rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'white',
              background: '#28a745',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-save"></i> 保存
          </button>
        </div>
      </div>
      
      {/* 警告 */}
      {marketplace === 'ebay' && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '0.6rem', marginBottom: '0.75rem', flexShrink: 0 }}>
          <h5 style={{ margin: '0 0 0.3rem 0', fontSize: '0.85rem', color: '#856404' }}>
            <i className="fas fa-exclamation-triangle"></i> eBay必須項目
          </h5>
          <div style={{ fontSize: '0.75rem', color: '#856404' }}>
            ✓ タイトル (80文字以内) ✓ 価格 (USD) ✓ カテゴリ ✓ 商品状態 ✓ Item Specifics (必須項目) ✓ 画像 (1枚以上) ✓ EU責任者情報 (EU出品時)
          </div>
        </div>
      )}

      {/* レスポンシブ 3カラムレイアウト */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: hasMirrorData 
          ? 'minmax(200px, 25%) minmax(0, 1fr) minmax(250px, 30%)'
          : 'minmax(250px, 30%) minmax(0, 1fr)',
        gap: '1rem',
        marginBottom: '1rem',
        flexShrink: 0
      }}>
        {/* 左カラム: 基本情報 */}
        <div style={{ 
          padding: '0.75rem',
          background: 'white',
          borderRadius: '6px',
          border: '1px solid #e9ecef',
          height: 'fit-content'
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem 0', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            color: '#495057',
            borderBottom: '2px solid #e9ecef',
            paddingBottom: '0.5rem'
          }}>
            <i className="fas fa-info-circle"></i> 基本情報
          </h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
              タイトル <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              className={styles.formInput}
              value={basicFormData.title}
              onChange={(e) => handleBasicFieldChange('title', e.target.value)}
              rows={3}
              maxLength={80}
              style={{ resize: 'vertical', width: '100%', fontSize: '0.8rem', padding: '0.4rem' }}
            />
            <div style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '0.15rem' }}>
              {basicFormData.title.length}/80 文字
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
              価格 (USD) <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input 
              className={styles.formInput} 
              type="number" 
              value={basicFormData.price}
              onChange={(e) => handleBasicFieldChange('price', Number(e.target.value))}
              step="0.01"
              min="0"
              placeholder="例: 35.00"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
              数量 <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input 
              className={styles.formInput} 
              type="number" 
              value={basicFormData.quantity}
              onChange={(e) => handleBasicFieldChange('quantity', Number(e.target.value))}
              min="1"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
              状態 <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <select 
              className={styles.formSelect}
              value={basicFormData.condition}
              onChange={(e) => {
                const newCondition = e.target.value;
                const newConditionId = conditionMapping[newCondition] || 3000;
                handleBasicFieldChange('condition', newCondition);
                handleBasicFieldChange('conditionId', newConditionId);
              }}
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
            >
              <option value="New">New (新品)</option>
              <option value="Like New">Like New (未使用に近い)</option>
              <option value="Used">Used (中古)</option>
              <option value="Very Good">Very Good (目立った傷なし)</option>
              <option value="Good">Good (やや傷あり)</option>
              <option value="Acceptable">Acceptable (傷あり)</option>
              <option value="For Parts">For Parts (ジャンク)</option>
            </select>
            <div style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '0.15rem' }}>
              Condition ID: {basicFormData.conditionId}
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
              カテゴリID <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input 
                  className={styles.formInput} 
                  value={basicFormData.categoryId}
                  onChange={(e) => handleBasicFieldChange('categoryId', e.target.value)}
                  placeholder="例: 69528"
                  style={{ fontSize: '0.8rem', padding: '0.4rem', width: '100%' }}
                />
                {basicFormData.category && (
                  <div style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '0.15rem' }}>
                    {basicFormData.category}
                  </div>
                )}
              </div>
              {basicFormData.categoryId && (
                <button
                  onClick={() => handleBasicFieldChange('categoryId', '')}
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6c757d',
                    background: 'white',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="カテゴリIDをクリア"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              <button
                onClick={async () => {
                  if (basicFormData.categoryId) {
                    console.log('[TabListing] 手動で必須項目を取得:', basicFormData.categoryId);
                    const savedSpecifics = (product as any)?.ebay_listing_data?.itemSpecifics || {};
                    await loadCategorySpecifics(basicFormData.categoryId, savedSpecifics);
                    alert(`カテゴリID ${basicFormData.categoryId} の必須項目を取得しました。\nコンソールログを確認してください。`);
                  }
                }}
                disabled={!basicFormData.categoryId}
                style={{
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'white',
                  background: basicFormData.categoryId ? '#0064d2' : '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: basicFormData.categoryId ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap'
                }}
                title="カテゴリIDから必須項目を取得"
              >
                <i className="fas fa-sync"></i> 取得
              </button>
            </div>
          </div>
        </div>

        {/* 右カラム: Item Specifics + その他の詳細 */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Item Specifics */}
          <div style={{ 
            padding: '0.75rem',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            {marketplace === 'ebay' ? (
              <>
                <div style={{ 
                  marginBottom: '1rem',
                  padding: '0.6rem',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem', color: '#495057' }}>
                    <i className="fas fa-tags"></i> カテゴリ
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                    {categoryMapping.categoryName} (ID: {categoryMapping.categoryId})
                  </div>
                </div>
                
                {/* SellerMirrorデータがある場合の表示 */}
                {hasMirrorData && (
                  <div style={{ 
                    marginBottom: '1rem',
                    padding: '0.6rem',
                    background: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#0c5460', fontWeight: 600, marginBottom: '0.3rem' }}>
                      <i className="fas fa-check-circle"></i> SellerMirrorデータを使用しています
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0c5460' }}>
                      取得した競合商品のItem Specificsが自動入力されています。全ての項目は任意です。
                    </div>
                  </div>
                )}

                {/* 必須項目：SellerMirrorデータがない場合のみ表示 */}
                {!hasMirrorData && categoryMapping.requiredFields.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      padding: '0.4rem 0.6rem',
                      background: '#fff5f5',
                      borderLeft: '3px solid #dc3545',
                      marginBottom: '0.75rem'
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        color: '#dc3545',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-exclamation-circle"></i>
                        必須項目
                      </h4>
                    </div>
                    
                    {categoryMapping.requiredFields.map(renderField)}
                  </div>
                )}

                {/* Item Specifics表示 */}
                {hasMirrorData ? (
                  /* SellerMirrorデータがある場合：全てのフィールドを動的生成 */
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      padding: '0.4rem 0.6rem',
                      background: '#d1ecf1',
                      borderLeft: '3px solid #17a2b8',
                      marginBottom: '0.75rem'
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        color: '#0c5460',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-tags"></i>
                        Item Specifics (SellerMirrorデータ)
                      </h4>
                    </div>
                    
                    {/* 全てのItem Specificsを動的に表示 */}
                    {Object.entries(itemSpecificsData).map(([key, value]) => {
                      const hasAutoFilled = autoFilledFields.has(key);
                      
                      // 必須・推奨チェック
                      const isRequired = categoryMapping.requiredFields.some(f => f.name === key);
                      const isRecommended = categoryMapping.recommendedFields.some(f => f.name === key);
                      
                      return (
                        <div key={key} style={{ marginBottom: '0.75rem' }}>
                          <label style={{
                            fontSize: '0.8rem',
                            fontWeight: isRequired ? 600 : 500,
                            color: isRequired ? '#dc3545' : '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            {key}
                            {isRequired && <span style={{ color: '#dc3545', fontSize: '0.7rem' }}>* 必須</span>}
                            {!isRequired && isRecommended && <span style={{ color: '#0064d2', fontSize: '0.7rem' }}>★ 推奨</span>}
                            {hasAutoFilled && (
                              <span style={{ color: '#28a745', fontSize: '0.7rem', fontWeight: 'normal' }}>
                                ✓ 自動
                              </span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleItemSpecificChange(key, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.35rem',
                              fontSize: '0.8rem',
                              border: `1px solid ${isRequired && !value ? '#dc3545' : '#ced4da'}`,
                              borderRadius: '4px',
                              backgroundColor: hasAutoFilled ? '#e7f3ff' : 'white'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* SellerMirrorデータがない場合：カテゴリマッピングを使用 */
                  categoryMapping.recommendedFields.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        padding: '0.4rem 0.6rem',
                        background: '#f0f7ff',
                        borderLeft: '3px solid #0064d2',
                        marginBottom: '0.75rem'
                      }}>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          color: '#0064d2',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <i className="fas fa-star"></i>
                          推奨項目
                        </h4>
                      </div>
                      
                      {categoryMapping.recommendedFields.map(renderField)}
                    </div>
                  )
                )}
              </>
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6c757d' 
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
                <p>{marketplaceName}の詳細設定は開発中です</p>
              </div>
            )}
          </div>

          {/* その他の詳細 */}
          {Object.keys(otherSpecifics).length > 0 && (
            <div style={{ 
              padding: '0.75rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                marginBottom: '0.75rem',
                color: '#856404',
                borderBottom: '2px solid #ffc107',
                paddingBottom: '0.5rem'
              }}>
                <i className="fas fa-exclamation-triangle"></i> 未入力の必須・推奨項目
              </h4>
              
              <div style={{ 
                fontSize: '0.75rem',
                color: '#856404',
                marginBottom: '0.75rem',
                padding: '0.5rem',
                background: '#fff3cd',
                borderRadius: '4px'
              }}>
                以下の項目はSellerMirrorで取得できませんでした。必要に応じて手動入力してください。
              </div>
              
              {Object.keys(otherSpecifics).map(key => {
                const field = [...categoryMapping.requiredFields, ...categoryMapping.recommendedFields]
                  .find(f => f.name === key);
                
                if (!field) return null;
                
                const isRequired = categoryMapping.requiredFields.some(f => f.name === key);
                
                return (
                  <div key={key} style={{ marginBottom: '0.75rem' }}>
                    <label style={{
                      fontSize: '0.8rem',
                      fontWeight: isRequired ? 600 : 500,
                      color: isRequired ? '#dc3545' : '#495057',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      {field.label}
                      {isRequired && <span style={{ color: '#dc3545', fontSize: '0.7rem' }}>* 必須</span>}
                      {!isRequired && <span style={{ color: '#0064d2', fontSize: '0.7rem' }}>★ 推奨</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        value={otherSpecifics[key] || ''}
                        onChange={(e) => handleItemSpecificChange(key, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.35rem',
                          fontSize: '0.8rem',
                          border: `1px solid ${isRequired ? '#dc3545' : '#ced4da'}`,
                          borderRadius: '4px',
                          backgroundColor: 'white'
                        }}
                      >
                        <option value="">選択してください</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={otherSpecifics[key] || ''}
                        onChange={(e) => handleItemSpecificChange(key, e.target.value)}
                        placeholder={field.placeholder || '入力してください'}
                        style={{
                          width: '100%',
                          padding: '0.35rem',
                          fontSize: '0.8rem',
                          border: `1px solid ${isRequired ? '#dc3545' : '#ced4da'}`,
                          borderRadius: '4px',
                          backgroundColor: 'white'
                        }}
                      />
                    )}
                    
                    {field.description && (
                      <div style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '0.15rem' }}>
                        {field.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EU責任者情報 */}
      {marketplace === 'ebay' && (
        <div style={{ 
          background: 'white',
          borderRadius: '6px',
          border: '1px solid #e9ecef',
          flexShrink: 0
        }}>
          <div style={{ 
            background: '#1976d2', 
            color: 'white', 
            padding: '0.6rem 0.75rem',
            borderRadius: '6px 6px 0 0',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <i className="fas fa-flag"></i> EU責任者情報 (GPSR対応)
          </div>
          <div style={{ padding: '0.75rem' }}>
            {!isEUDataComplete && (
              <div style={{ 
                padding: '0.6rem', 
                background: '#fff3cd', 
                border: '1px solid #ffc107',
                borderRadius: '4px',
                marginBottom: '0.75rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#856404' }}></i>
                <span>EU向け出品には責任者情報が必要です（GPSR規則）</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  会社名 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={euFormData.euCompanyName}
                  onChange={(e) => handleEuFieldChange('euCompanyName', e.target.value)}
                  placeholder="例: LEGO System A/S"
                  maxLength={100}
                  style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  住所1 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={euFormData.euAddressLine1}
                  onChange={(e) => handleEuFieldChange('euAddressLine1', e.target.value)}
                  placeholder="例: Aastvej 1"
                  maxLength={180}
                  style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  市 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={euFormData.euCity}
                  onChange={(e) => handleEuFieldChange('euCity', e.target.value)}
                  placeholder="例: Billund"
                  maxLength={64}
                  style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  郵便番号 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={euFormData.euPostalCode}
                  onChange={(e) => handleEuFieldChange('euPostalCode', e.target.value)}
                  placeholder="例: 7190"
                  maxLength={20}
                  style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  国コード <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={euFormData.euCountry}
                  onChange={(e) => handleEuFieldChange('euCountry', e.target.value.toUpperCase())}
                  placeholder="例: DK, FR, DE"
                  maxLength={2}
                  style={{ textTransform: 'uppercase', fontSize: '0.8rem', padding: '0.4rem' }}
                />
              </div>
            </div>

            <div style={{ 
              marginTop: '0.75rem', 
              padding: '0.6rem', 
              background: isEUDataComplete ? '#d4edda' : '#f8d7da',
              border: `1px solid ${isEUDataComplete ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className={`fas ${isEUDataComplete ? 'fa-check-circle' : 'fa-times-circle'}`} 
                 style={{ color: isEUDataComplete ? '#155724' : '#721c24' }}></i>
              <span style={{ color: isEUDataComplete ? '#155724' : '#721c24' }}>
                {isEUDataComplete 
                  ? 'EU責任者情報が完全です' 
                  : 'EU責任者情報が不完全です - 必須項目を入力してください'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
