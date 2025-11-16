'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabDataProps {
  product: Product | null;
}

export function TabData({ product }: TabDataProps) {
  // 🔥 強制デバッグログ
  console.log('📍 TabDataコンポーネントがレンダリングされました');
  console.log('  product:', product);
  console.log('  product.id:', product?.id);
  console.log('  product.title:', product?.title);
  console.log('  product.title_en:', (product as any)?.title_en);
  console.log('  product.english_title:', (product as any)?.english_title);
  
  const listingData = (product as any)?.listing_data || {};
  const scrapedData = (product as any)?.scraped_data || {};
  const ebayData = (product as any)?.ebay_api_data || {};
  
  const lowestPriceItem = ebayData?.research?.lowestPriceItem;
  const smSalesCount = (product as any)?.sm_sales_count;
  const researchSoldCount = (product as any)?.research_sold_count;
  
  // 🔥 翻訳状態管理
  const [translating, setTranslating] = useState(false);
  
  // 🔥 productが更新されたらformDataも更新
  const [formData, setFormData] = useState({
    // 共通データ
    productId: (product as any)?.source_item_id || product?.asin || product?.id || '',
    dbId: product?.id || '',
    
    // 🔥 日本語データ
    title: product?.title || '',
    description: product?.description || '',
    condition: listingData.condition || scrapedData.condition || '',
    
    // 🔥 英語データ
    englishTitle: (product as any)?.english_title || '',
    englishDescription: (product as any)?.english_description || '',
    englishCondition: (product as any)?.english_condition || '',
    
    price: (product as any)?.price_usd || product?.price || 0,
    
    // 手動入力
    weight: listingData.weight_g || '',
    cost: (product as any)?.price_jpy || product?.cost || '',
    length: listingData.length_cm || '',
    width: listingData.width_cm || '',
    height: listingData.height_cm || '',
    generatedSku: product?.sku || `${product?.marketplace?.id || 'UNKNOWN'}-${product?.id || 'ID'}-${Date.now()}`,
  });

  // 🔥 productが変わったらformDataを再初期化
  useEffect(() => {
    if (product) {
      console.log('🔄 TabData: productが更新されました', {
        id: product.id,
        title: product.title,
        title_型: typeof product.title,
        english_title: (product as any)?.english_title,
        english_title_型: typeof (product as any)?.english_title,
        title_en: (product as any)?.title_en,
        description: product.description?.substring(0, 50),
        english_description: (product as any)?.english_description?.substring(0, 50)
      });
      
      // 🔥 DBの生データを表示
      console.table({
        'DB.title (日本語)': product.title || '(空)',
        'DB.title_en': (product as any)?.title_en || '(空)',
        'DB.english_title': (product as any)?.english_title || '(空)',
        '→ formData.titleにセットする値': product.title || '(空)',
        '→ formData.englishTitleにセットする値': (product as any)?.title_en || (product as any)?.english_title || '(空)'
      });
      
      const listingData = (product as any)?.listing_data || {};
      const scrapedData = (product as any)?.scraped_data || {};
      
      setFormData({
        productId: (product as any)?.source_item_id || product?.asin || product?.id || '',
        dbId: product?.id || '',
        title: product?.title || '', // 🔥 product.titleを直接参照
        description: product?.description || '', // 🔥 product.descriptionを直接参照
        condition: listingData.condition || scrapedData.condition || '',
        englishTitle: (product as any)?.title_en || (product as any)?.english_title || '', // 🔥 title_enを優先
        englishDescription: (product as any)?.description_en || (product as any)?.english_description || '',
        englishCondition: (product as any)?.english_condition || listingData.condition_en || '',
        price: (product as any)?.price_usd || product?.price || 0,
        weight: listingData.weight_g || '',
        cost: (product as any)?.price_jpy || product?.cost || '',
        length: listingData.length_cm || '',
        width: listingData.width_cm || '',
        height: listingData.height_cm || '',
        generatedSku: product?.sku || `${product?.marketplace?.id || 'UNKNOWN'}-${product?.id || 'ID'}-${Date.now()}`,
      });
    }
  }, [product]); // 🔥 product全体を監視して、変更があれば再読み込み

  const handleChange = (field: string, value: string | number) => {
    // 📊 数値フィールドの四捨五入処理
    let processedValue = value;
    
    if (typeof value === 'number') {
      // 価格関連フィールド：小数点第2位まで
      if (['price', 'cost'].includes(field)) {
        processedValue = Math.round(value * 100) / 100;
      }
      // 重量・サイズ：小数点第1位まで
      else if (['weight', 'length', 'width', 'height'].includes(field)) {
        processedValue = Math.round(value * 10) / 10;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
  };

  // 🔥 翻訳実行
  const handleTranslate = async () => {
    if (!formData.title && !formData.description && !formData.condition) {
      alert('翻訳する日本語データがありません');
      return;
    }

    // 🔥 タイトルと説明の両方が翻訳済みの場合のみ確認
    if (formData.englishTitle && formData.englishDescription) {
      const confirmed = confirm('タイトルと説明は既に翻訳済みです。\n\n再翻訳しますか？');
      if (!confirmed) return;
    }

    setTranslating(true);
    try {
      const response = await fetch('/api/tools/translate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?.id,
          title: formData.title,
          description: formData.description,
          condition: formData.condition,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ APIエラー:', errorText);
        throw new Error(`APIエラー: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 翻訳APIレスポンス:', result);
        
        // 🔥 stateを更新（これにより画面に表示される）
        const newFormData = {
          ...formData,
          englishTitle: result.translations.title || formData.englishTitle,
          englishDescription: result.translations.description || formData.englishDescription,
          englishCondition: result.translations.condition || formData.englishCondition,
        };
        
        setFormData(newFormData);
        
        console.log('✅ 翻訳完了:', {
          englishTitle: newFormData.englishTitle,
          englishDescription: newFormData.englishDescription?.substring(0, 50),
          englishCondition: newFormData.englishCondition
        });
        
        alert('✓ 翻訳が完了し、データベースに保存しました\n\nモーダルを閉じて再度開くと更新が表示されます。');
      } else {
        alert('✗ 翻訳に失敗しました: ' + (result.error || '不明なエラー'));
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      alert('✗ 翻訳エラー: ' + (error.message || 'ネットワークエラーが発生しました'));
    } finally {
      setTranslating(false);
    }
  };

  // 🔥 自動保存機能
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const handleSave = async (showAlert = true) => {
    setSaveStatus('saving');
    
    const saveData = {
      id: product?.id,
      updates: {
        // 🔥 日本語フィールド
        title: formData.title,
        description: formData.description,
        condition_name: formData.condition,
        
        // 🔥 英語フィールド（products_masterの独立カラム）
        english_title: formData.englishTitle,
        english_description: formData.englishDescription,
        english_condition: formData.englishCondition,
        
        // 🔥 互換性のためのエイリアス
        title_en: formData.englishTitle,
        description_en: formData.englishDescription,
        
        // 📦 listing_data内のデータ
        listing_data: {
          ...listingData,
          condition: formData.condition,
          condition_en: formData.englishCondition,
          weight_g: formData.weight,
          length_cm: formData.length,
          width_cm: formData.width,
          height_cm: formData.height,
        }
      }
    };
    
    console.log('💾 TabData: 保存開始');
    console.log('  productId:', product?.id);
    console.log('  送信データ:', JSON.stringify(saveData, null, 2));
    
    try {
      const response = await fetch('/api/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData)
      });

      console.log('  APIレスポンスステータス:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 保存APIエラー:', errorText);
        throw new Error(`保存失敗: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ 保存APIレスポンス:', result);
      console.log('💾 保存されたデータ:');
      console.log('  - 英語タイトル:', formData.englishTitle);
      console.log('  - 英語説明:', formData.englishDescription?.substring(0, 50) + '...');
      console.log('  - 英語状態:', formData.englishCondition);
      
      if (result.success) {
        setSaveStatus('saved');
        
        // 🔥 保存後にページを再読み込み
        console.log('🔔 product-updatedイベントを発行');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('product-updated', { 
            detail: { productId: product?.id } 
          }));
        }
        
        if (showAlert) {
          alert('✓ データ確認タブを保存しました');
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        if (showAlert) {
          alert('✗ 保存に失敗しました: ' + (result.error || ''));
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setSaveStatus('error');
      if (showAlert) {
        alert('✗ 保存エラーが発生しました: ' + error.message);
      }
    }
  };

  // 🎯 スクレイピングデータから必要な情報を抽出
  const category = scrapedData?.category || 'N/A';
  const condition = scrapedData?.condition || formData.condition || 'N/A';
  const imageCount = 
    product?.gallery_images?.length ||
    scrapedData?.images?.length ||
    0;
  
  // 価格情報
  const priceJPY = (product as any)?.price_jpy || formData.cost || 0;
  const priceUSD = (product as any)?.price_usd || formData.price || (priceJPY / 152);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-database"></i> データソース別確認・編集
      </h3>
      
      {/* 📝 基本情報・価格確認セクション */}
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          📝 基本情報・価格確認
        </div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.dataGrid}>
            <div>
              <p className="text-sm text-gray-500">日本語タイトル</p>
              <p className="font-semibold">{formData.title || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">英語タイトル (翻訳結果)</p>
              <p className="font-semibold text-blue-600">{formData.englishTitle || 'N/A (翻訳待ち)'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">商品SKU</p>
              <p className="font-semibold">{formData.generatedSku || 'N/A'}</p>
            </div>
            
            {/* 💰 価格情報の表示 (P0修正: 通貨マーク正確化) */}
            <div>
              <p className="text-sm text-gray-500">仕入れ値（円）</p>
              <p className="font-semibold text-green-700">¥{priceJPY.toLocaleString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">出品価格（ドル）</p>
              <p className="font-semibold text-blue-600">${priceUSD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">利益率</p>
              <p className="font-semibold">{product?.profit_margin?.toFixed(2) || 'N/A'} %</p>
            </div>
          </div>
        </div>
      </div>

      {/* 📦 スクレイピング詳細データセクション */}
      <div className={styles.dataSection} style={{ marginTop: '1rem' }}>
        <div className={styles.sectionHeader}>
          📦 スクレイピング詳細データ
        </div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.dataGrid}>
            {/* カテゴリーの表示 */}
            <div>
              <p className="text-sm text-gray-500">カテゴリー</p>
              <p className="font-semibold text-purple-600">{category}</p>
            </div>
            {/* 商品状態の表示 */}
            <div>
              <p className="text-sm text-gray-500">商品状態</p>
              <p className="font-semibold">{condition}</p>
            </div>
            {/* 画像数の表示 */}
            <div>
              <p className="text-sm text-gray-500">画像数</p>
              <p className="font-semibold">{imageCount} 枚</p>
            </div>
            {/* 🔥 ブランドの表示 */}
            <div>
              <p className="text-sm text-gray-500">ブランド</p>
              <p className="font-semibold text-blue-600">{product.scraped_data?.brand || '未設定'}</p>
            </div>
            {/* 🔥 発送までの日数の表示 */}
            <div>
              <p className="text-sm text-gray-500">発送までの日数</p>
              <p className="font-semibold text-green-600">{product.scraped_data?.lead_time || '未設定'}</p>
            </div>
          </div>

          {/* 🔥 カテゴリー階層の表示 */}
          {product.scraped_data?.category_hierarchy && product.scraped_data.category_hierarchy.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p className="text-sm text-gray-500 mb-2">カテゴリー階層</p>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                {product.scraped_data.category_hierarchy.map((cat: string, index: number) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#e3f2fd',
                      color: '#1976d2',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 500
                    }}>
                      {cat}
                    </span>
                    {index < product.scraped_data.category_hierarchy.length - 1 && (
                      <i className="fas fa-chevron-right" style={{ color: '#999', fontSize: '0.7rem' }}></i>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <p className="text-sm text-gray-500 mb-1">日本語商品説明</p>
            <div className="border border-gray-200 p-3 rounded-md bg-gray-50 whitespace-pre-wrap text-sm max-h-48 overflow-auto">
              {formData.description || '説明文なし'}
            </div>
          </div>
        </div>
      </div>
      
      {/* 共通データセクション */}
      <div className={styles.dataSection} style={{ marginTop: '1rem' }}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-database"></i> 編集可能データ
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
            {/* 🔥 Master Key表示 (P0修正) */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#9c27b0' }}>
                <i className="fas fa-key"></i> Master Key
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={(product as any)?.master_key || 'N/A'}
                readOnly
                style={{ background: '#f3e5f5', color: '#9c27b0', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* 🔥 タイトル（日本語・英語） */}
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              商品タイトル（日本語）
            </label>
            <input 
            type="text" 
            className={styles.formInput} 
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="日本語タイトルを入力"
            autoComplete="off"
              data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#1976d2' }}>
              商品タイトル（英語）
            </label>
            <input 
            type="text" 
            className={styles.formInput} 
            value={formData.englishTitle}
            onChange={(e) => handleChange('englishTitle', e.target.value)}
            placeholder="English title"
            style={{ borderColor: '#1976d2' }}
            autoComplete="off"
              data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
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
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                小数点第2位まで自動丸め
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                商品状態（日本語）
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                placeholder="例: 新品"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
          </div>

          {/* 🔥 商品状態（英語） */}
          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#1976d2' }}>
              商品状態（英語）
            </label>
            <input 
            type="text" 
            className={styles.formInput} 
            value={formData.englishCondition}
            onChange={(e) => handleChange('englishCondition', e.target.value)}
            placeholder="例: New"
            style={{ borderColor: '#1976d2' }}
              autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
          </div>

          {/* 🔥 商品説明（日本語） */}
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              商品説明（日本語）
            </label>
            <textarea 
            className={styles.formTextarea} 
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            placeholder="日本語の商品説明を入力"
            autoComplete="off"
              data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
          </div>

          {/* 🔥 商品説明（英語） */}
          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#1976d2' }}>
              商品説明（英語）
            </label>
            <textarea 
            className={styles.formTextarea} 
            value={formData.englishDescription}
            onChange={(e) => handleChange('englishDescription', e.target.value)}
            rows={3}
            placeholder="English product description"
            style={{ borderColor: '#1976d2' }}
            autoComplete="off"
              data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
          </div>

          {/* 🔥 翻訳ボタン */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #1976d2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1976d2', marginBottom: '0.25rem' }}>
                  <i className="fas fa-language"></i> 自動翻訳
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  日本語データを英語に翻訳します
                </div>
              </div>
              <button
                onClick={handleTranslate}
                disabled={translating}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: translating ? '#ccc' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: translating ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {translating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    翻訳中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-language"></i>
                    日本語→英語に翻訳
                  </>
                )}
              </button>
            </div>
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
                step="0.1"
                autoComplete="off"
              />
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                小数点第1位まで自動丸め
              </div>
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
                step="0.01"
                autoComplete="off"
              />
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                小数点第2位まで自動丸め
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
          サイズ (cm)
          </label>
          <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
          <input 
            type="number" 
            className={styles.formInput} 
            value={formData.length || ''}
            onChange={(e) => handleChange('length', e.target.value ? Number(e.target.value) : '')}
            placeholder="長さ（cm）"
            min="0"
              step="0.1"
              autoComplete="off"
          />
          <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem', textAlign: 'center' }}>
            小数点第1位まで
          </div>
          </div>
          <div>
          <input 
              type="number" 
              className={styles.formInput} 
            value={formData.width || ''}
            onChange={(e) => handleChange('width', e.target.value ? Number(e.target.value) : '')}
            placeholder="幅（cm）"
            min="0"
            step="0.1"
            autoComplete="off"
          />
            <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem', textAlign: 'center' }}>
                小数点第1位まで
                </div>
              </div>
              <div>
                <input 
                  type="number" 
                  className={styles.formInput} 
                  value={formData.height || ''}
                  onChange={(e) => handleChange('height', e.target.value ? Number(e.target.value) : '')}
                  placeholder="高さ（cm）"
                  min="0"
                  step="0.1"
                  autoComplete="off"
                />
                <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem', textAlign: 'center' }}>
                  小数点第1位まで
                </div>
              </div>
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
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {/* 保存状態表示 */}
            {saveStatus !== 'idle' && (
              <div style={{ 
                fontSize: '0.85rem', 
                color: saveStatus === 'saved' ? '#4caf50' : saveStatus === 'saving' ? '#1976d2' : '#f44336',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {saveStatus === 'saving' && (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    保存中...
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <i className="fas fa-check-circle"></i>
                    保存完了
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <i className="fas fa-exclamation-circle"></i>
                    保存失敗
                  </>
                )}
              </div>
            )}
            
            <button 
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={() => handleSave(true)}
              disabled={saveStatus === 'saving'}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                opacity: saveStatus === 'saving' ? 0.6 : 1,
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer'
              }}
            >
              <i className="fas fa-save"></i> データ確認タブを保存
            </button>
          </div>
        </div>
      </div>

      {/* HTS/関税情報セクション */}
      {((product as any)?.hts_code || (product as any)?.origin_country || (product as any)?.duty_rate !== undefined) && (
        <div className={styles.dataSection} style={{ marginTop: '1rem' }}>
          <div className={styles.sectionHeader}>
            <i className="fas fa-globe-americas"></i> 関税情報（AI取得データ）
          </div>
          <div style={{ padding: '1rem' }}>
            <div className={styles.dataGrid}>
              {(product as any)?.hts_code && (
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                    HTSコード
                  </label>
                  <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px' }}>
                    {(product as any).hts_code}
                  </div>
                </div>
              )}
              {(product as any)?.origin_country && (
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                    原産国
                  </label>
                  <div style={{ fontSize: '0.9rem', background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px' }}>
                    {(product as any).origin_country}
                  </div>
                </div>
              )}
              {(product as any)?.duty_rate !== undefined && (
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                    関税率
                  </label>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    color: (product as any).duty_rate > 0 ? '#dc3545' : '#28a745',
                    background: '#f8f9fa', 
                    padding: '0.5rem', 
                    borderRadius: '4px' 
                  }}>
                    {(product as any).duty_rate}%
                  </div>
                </div>
              )}
            </div>

            {lowestPriceItem && lowestPriceItem.itemWebUrl && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '2px solid #1976d2' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#1976d2' }}>
                  <i className="fas fa-link"></i> 最安値商品の詳細
                </h4>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <strong>商品ID:</strong> {lowestPriceItem.itemId}
                  </div>
                  {lowestPriceItem.price && (
                    <div>
                      <strong>商品価格:</strong> ${lowestPriceItem.price.toFixed(2)}
                    </div>
                  )}
                  {lowestPriceItem.shippingCost !== undefined && (
                    <div>
                      <strong>送料:</strong> ${lowestPriceItem.shippingCost.toFixed(2)}
                    </div>
                  )}
                  {lowestPriceItem.totalPrice && (
                    <div>
                      <strong>合計（送料込）:</strong> <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1976d2' }}>${lowestPriceItem.totalPrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <a
                  href={lowestPriceItem.itemWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    background: '#1976d2',
                    color: 'white',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1565c0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#1976d2'}
                >
                  <i className="fas fa-external-link-alt"></i>
                  最安値商品をeBayで確認
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* リサーチ結果セクション */}
      {((product as any)?.research_lowest_price || (product as any)?.research_sold_count || (product as any)?.research_competitor_count || smSalesCount) && (
        <div className={styles.dataSection} style={{ marginTop: '1rem', background: '#f3e5f5' }}>
          <div className={styles.sectionHeader} style={{ background: '#9c27b0', color: 'white' }}>
            <i className="fas fa-chart-line"></i> リサーチ結果（競合分析）
          </div>
          <div style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              販売実績
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {smSalesCount !== null && smSalesCount !== undefined && (
                <div style={{ textAlign: 'center', background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: 600 }}>
                    販売数（SM）
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7b1fa2' }}>
                    {smSalesCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>SellerMirror</div>
                </div>
              )}
              {researchSoldCount !== null && researchSoldCount !== undefined && (
                <div style={{ textAlign: 'center', background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: 600 }}>
                    リサーチ販売数
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9c27b0' }}>
                    {researchSoldCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>90日間</div>
                </div>
              )}
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
              競合分析
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {(product as any)?.research_competitor_count !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: 600 }}>
                    競合数
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57c00' }}>
                    {(product as any).research_competitor_count}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>出品中</div>
                </div>
              )}
              {(product as any)?.research_lowest_price && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: 600 }}>
                    最安値（送料込）
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1976d2' }}>
                    ${(product as any).research_lowest_price.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>USD</div>
                </div>
              )}
              {(product as any)?.research_profit_margin !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: 600 }}>
                    最安利益率
                  </div>
                  <div style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 'bold',
                    color: (product as any).research_profit_margin > 15 ? '#4caf50' : 
                           (product as any).research_profit_margin > 0 ? '#ff9800' : '#f44336'
                  }}>
                    {(product as any).research_profit_margin.toFixed(1)}%
                  </div>
                </div>
              )}
              {(product as any)?.research_profit_amount !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: 600 }}>
                    最安利益額
                  </div>
                  <div style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 'bold',
                    color: (product as any).research_profit_amount > 0 ? '#4caf50' : '#f44336'
                  }}>
                    ${(product as any).research_profit_amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>USD</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* データ完全性チェック */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px' }}>
        <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1976d2' }}>
          <i className="fas fa-info-circle"></i> データ完全性
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>日本語タイトル:</span>
            <strong>{formData.title ? '✓' : '✗'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>英語タイトル:</span>
            <strong style={{ color: formData.englishTitle ? '#4caf50' : '#f44336' }}>
              {formData.englishTitle ? '✓' : '✗'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>日本語説明:</span>
            <strong>{formData.description ? '✓' : '✗'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>英語説明:</span>
            <strong style={{ color: formData.englishDescription ? '#4caf50' : '#f44336' }}>
              {formData.englishDescription ? '✓' : '✗'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>価格:</span>
            <strong>{formData.price > 0 ? '✓' : '✗'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>状態:</span>
            <strong>{formData.condition ? '✓' : '✗'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
