'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';
import { SHOPEE_COUNTRIES, type ShopeeCountryCode } from '@/lib/shopee/translator';
import { validateShopeeListingData } from '@/lib/shopee/validator';

export interface TabShopeeProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

export function TabShopee({ product, marketplace, marketplaceName }: TabShopeeProps) {
  // フォームデータ
  const [formData, setFormData] = useState({
    targetCountry: 'TW' as ShopeeCountryCode,
    title: '',
    description: '',
    categoryId: 0,
    categoryPath: [] as string[],
    price: 0,
    currency: 'TWD',
    stock: 1,
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    brand: '',
    condition: 'New',
    sku: '',
    images: [] as string[],
    requiredAttributes: [] as string[],
    providedAttributes: {} as Record<string, string>,
  });

  const [isTransforming, setIsTransforming] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [transformedData, setTransformedData] = useState<any>(null);

  // 商品データが変わったらフォームを初期化
  useEffect(() => {
    if (product) {
      const listingData = (product as any)?.listing_data || {};

      setFormData({
        targetCountry: 'TW',
        title: (product as any)?.english_title || (product as any)?.title || '',
        description: (product as any)?.english_description || (product as any)?.description || '',
        categoryId: 0,
        categoryPath: [],
        price: 0,
        currency: 'TWD',
        stock: product?.stock?.available || 1,
        weight: listingData.weight_g ? listingData.weight_g / 1000 : 0.5,
        length: listingData.length_cm || 0,
        width: listingData.width_cm || 0,
        height: listingData.height_cm || 0,
        brand: listingData.brand || '',
        condition: listingData.condition || 'New',
        sku: product?.sku || '',
        images: (product as any)?.gallery_images || [],
        requiredAttributes: [],
        providedAttributes: {},
      });
    }
  }, [product]);

  // フィールド変更ハンドラ
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 国変更時の処理
  const handleCountryChange = (country: ShopeeCountryCode) => {
    const countryInfo = SHOPEE_COUNTRIES[country];
    setFormData((prev) => ({
      ...prev,
      targetCountry: country,
      currency: countryInfo.currency,
    }));
  };

  // Shopeeデータ変換実行
  const handleTransform = async () => {
    if (!product) return;

    setIsTransforming(true);
    setValidationResult(null);
    setTransformedData(null);

    try {
      console.log('[TabShopee] データ変換開始');

      // 変換API呼び出し
      const response = await fetch('/api/shopee/transform-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          targetCountry: formData.targetCountry,
          englishTitle: (product as any)?.english_title || (product as any)?.title || '',
          englishDescription: (product as any)?.english_description || (product as any)?.description || '',
          priceJpy: (product as any)?.price_jpy || (product as any)?.price || 0,
          weightG: ((product as any)?.listing_data?.weight_g) || 500,
          targetProfitRate: 0.25,
          domesticShippingJpy: 800,
          ebayCategory: (product as any)?.category?.name || '',
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('[TabShopee] データ変換成功', result.data);

        // 変換結果をフォームに反映
        setFormData((prev) => ({
          ...prev,
          title: result.data.title,
          description: result.data.description,
          categoryId: result.data.categoryId,
          categoryPath: result.data.categoryPath,
          price: result.data.priceLocal,
          weight: result.data.weightKg,
          requiredAttributes: result.data.requiredAttributes || [],
        }));

        setTransformedData(result.data);
        alert('Shopeeデータ変換が完了しました!');
      } else {
        console.error('[TabShopee] データ変換失敗', result.error);
        alert(`変換エラー: ${result.message || result.error}`);
      }
    } catch (error: any) {
      console.error('[TabShopee] データ変換エラー:', error);
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsTransforming(false);
    }
  };

  // バリデーション実行
  const handleValidate = () => {
    const result = validateShopeeListingData({
      title: formData.title,
      description: formData.description,
      categoryId: formData.categoryId,
      price: formData.price,
      stock: formData.stock,
      weight: formData.weight,
      images: formData.images,
      brand: formData.brand,
      condition: formData.condition,
      sku: formData.sku,
      targetCountry: formData.targetCountry,
      requiredAttributes: formData.requiredAttributes,
      providedAttributes: formData.providedAttributes,
    });

    setValidationResult(result);

    if (result.isValid) {
      alert('✓ バリデーション合格! Shopeeに出品可能です。');
    } else {
      alert(`✗ バリデーション失敗\n\nエラー: ${result.errors.length}件\n警告: ${result.warnings.length}件`);
    }
  };

  // CSV生成
  const handleGenerateCSV = async () => {
    try {
      console.log('[TabShopee] CSV生成開始');

      const listingData = {
        sku: formData.sku,
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        price: formData.price,
        stock: formData.stock,
        weight: formData.weight,
        length: formData.length,
        width: formData.width,
        height: formData.height,
        images: formData.images.slice(0, 9), // 最大9枚
        brand: formData.brand,
        condition: formData.condition,
      };

      const response = await fetch('/api/shopee/generate-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCountry: formData.targetCountry,
          products: [listingData],
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('[TabShopee] CSV生成成功');

        // CSVダウンロード
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.data.fileName;
        link.click();
        URL.revokeObjectURL(url);

        alert('CSVファイルをダウンロードしました!');
      } else {
        console.error('[TabShopee] CSV生成失敗', result.error);
        alert(`CSV生成エラー: ${result.message || result.error}`);
      }
    } catch (error: any) {
      console.error('[TabShopee] CSV生成エラー:', error);
      alert(`エラーが発生しました: ${error.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        background: '#f8f9fa',
      }}
    >
      {/* ヘッダー */}
      <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 600 }}>
          <i className="fas fa-shopping-bag"></i> Shopee 出品データ変換
        </h3>
        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
          eBayデータを選択した国の言語と通貨に自動変換します
        </div>
      </div>

      {/* 国選択 */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          flexShrink: 0,
        }}
      >
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600 }}>
          1. ターゲット国を選択
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
          {Object.entries(SHOPEE_COUNTRIES).map(([code, info]) => (
            <button
              key={code}
              onClick={() => handleCountryChange(code as ShopeeCountryCode)}
              style={{
                padding: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: formData.targetCountry === code ? '#ee4d2d' : 'white',
                color: formData.targetCountry === code ? 'white' : '#495057',
                border: `2px solid ${formData.targetCountry === code ? '#ee4d2d' : '#dee2e6'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {info.name}
              <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.8 }}>
                {info.currency}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 変換実行 */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          flexShrink: 0,
        }}
      >
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600 }}>
          2. データ変換を実行
        </h4>
        <button
          onClick={handleTransform}
          disabled={isTransforming}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'white',
            background: isTransforming ? '#6c757d' : '#28a745',
            border: 'none',
            borderRadius: '6px',
            cursor: isTransforming ? 'not-allowed' : 'pointer',
          }}
        >
          <i className={`fas ${isTransforming ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
          {isTransforming ? ' 変換中...' : ' 自動変換を実行'}
        </button>

        {transformedData && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>✓ 変換完了</div>
            <div>・翻訳: {transformedData.translationProvider}</div>
            <div>・為替: {transformedData.exchangeRateProvider}</div>
            <div>・価格: {transformedData.priceLocal.toFixed(2)} {transformedData.currency}</div>
            <div>・利益率: {(transformedData.profitRate * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* 変換結果プレビュー */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          flex: 1,
          overflow: 'auto',
        }}
      >
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>
          3. 変換結果を確認・編集
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* タイトル */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              商品タイトル ({formData.targetCountry === 'TW' ? '中文繁體' : SHOPEE_COUNTRIES[formData.targetCountry].language})
            </label>
            <textarea
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
            <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
              {formData.title.length} / 120 文字
            </div>
          </div>

          {/* 説明文 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              商品説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
            <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
              {formData.description.length} / 5000 文字
            </div>
          </div>

          {/* カテゴリ */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              カテゴリID
            </label>
            <input
              type="number"
              value={formData.categoryId}
              onChange={(e) => handleFieldChange('categoryId', Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>

          {/* 価格 */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              価格 ({formData.currency})
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleFieldChange('price', Number(e.target.value))}
              step="0.01"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>

          {/* 在庫 */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              在庫数
            </label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => handleFieldChange('stock', Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>

          {/* 重量 */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              重量 (kg)
            </label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => handleFieldChange('weight', Number(e.target.value))}
              step="0.01"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>
      </div>

      {/* バリデーション結果 */}
      {validationResult && (
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            flexShrink: 0,
          }}
        >
          <h4
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: validationResult.isValid ? '#28a745' : '#dc3545',
            }}
          >
            {validationResult.isValid ? '✓ バリデーション合格' : '✗ バリデーション失敗'}
          </h4>

          {validationResult.errors.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: '#dc3545', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                エラー ({validationResult.errors.length}件)
              </div>
              {validationResult.errors.map((err: any, idx: number) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#721c24', marginLeft: '1rem' }}>
                  • [{err.field}] {err.message}
                </div>
              ))}
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                警告 ({validationResult.warnings.length}件)
              </div>
              {validationResult.warnings.map((warn: any, idx: number) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#856404', marginLeft: '1rem' }}>
                  • [{warn.field}] {warn.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* アクションボタン */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1rem',
          flexShrink: 0,
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={handleValidate}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'white',
            background: '#0064d2',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-check-circle"></i> バリデーション実行
        </button>
        <button
          onClick={handleGenerateCSV}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'white',
            background: '#28a745',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-file-csv"></i> CSV出力
        </button>
      </div>
    </div>
  );
}
