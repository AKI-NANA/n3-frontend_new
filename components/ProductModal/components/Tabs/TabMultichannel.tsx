'use client';

/**
 * 多販路変換タブ
 * プラットフォーム選択、データ変換、CSV生成
 */

import { useState, useEffect } from 'react';
import type { Product } from '@/types/product';
import type {
  Platform,
  TransformedProductData,
  PricingResult,
} from '@/lib/multichannel/types';
import { getAllPlatforms, getPlatformConfig } from '@/lib/multichannel/platformConfigs';
import { downloadCSV } from '@/lib/multichannel/csvGenerator';
import { calculateDuty, calculatePlatformFeeEnhanced, type EnhancedPricingResult } from '@/lib/pricing/PlatformPricing';

interface TabMultichannelProps {
  product: Product | null;
}

// リアルタイムプレビューデータ
interface PricingPreview {
  dutyCost: number;
  platformFee: number;
  estimatedPrice: number;
  profitMargin: number;
  currency: string;
}

export function TabMultichannel({ product }: TabMultichannelProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ebay');
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedData, setTransformedData] = useState<TransformedProductData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(null);

  const platforms = getAllPlatforms();

  // プラットフォーム変更時にリアルタイムプレビューを計算
  useEffect(() => {
    if (!product) {
      setPricingPreview(null);
      return;
    }

    const calculatePreview = () => {
      const config = getPlatformConfig(selectedPlatform);
      const priceJpy = (product as any).price_jpy || 1000; // デフォルト値
      const htsCode = (product as any).hts_code || '9504.40'; // デフォルトHSコード
      const category = (product as any).category || 'DEFAULT';

      // 国コードを決定
      const countryMap: Record<string, string> = {
        amazon_us: 'US',
        amazon_au: 'AU',
        amazon_jp: 'JP',
        ebay: 'US',
        coupang: 'KR',
        qoo10: 'SG',
        shopee: 'SG',
        mercari: 'JP',
        shopify: 'US',
      };
      const targetCountry = countryMap[selectedPlatform] || 'US';

      // 為替レート（簡易版）
      const exchangeRates: Record<string, number> = {
        USD: 150,
        AUD: 100,
        KRW: 0.11,
        SGD: 110,
        JPY: 1,
      };
      const exchangeRate = exchangeRates[config.currency] || 150;

      // 関税計算
      const dutyCostJpy = calculateDuty(htsCode, priceJpy, targetCountry);
      const dutyCost = dutyCostJpy / exchangeRate;

      // 仮の販売価格（簡易版）
      const baseCost = priceJpy / exchangeRate;
      const estimatedPrice = baseCost * 1.5; // 仮に1.5倍

      // プラットフォーム手数料
      const platformFee = calculatePlatformFeeEnhanced(
        selectedPlatform,
        targetCountry,
        category,
        estimatedPrice
      );

      // 利益率計算（簡易版）
      const totalCost = baseCost + dutyCost + platformFee;
      const profit = estimatedPrice - totalCost;
      const profitMargin = (profit / estimatedPrice) * 100;

      setPricingPreview({
        dutyCost: Math.round(dutyCost * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        estimatedPrice: Math.round(estimatedPrice * 100) / 100,
        profitMargin: Math.round(profitMargin * 10) / 10,
        currency: config.currency,
      });
    };

    calculatePreview();
  }, [selectedPlatform, product]);

  // 変換を実行
  const handleTransform = async () => {
    if (!product) return;

    setIsTransforming(true);
    setError(null);

    try {
      const response = await fetch('/api/products/transform-multichannel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku: product.sku,
          targetPlatform: selectedPlatform,
          targetCountry: 'US',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '変換に失敗しました');
      }

      const result = await response.json();
      setTransformedData(result.data);
    } catch (err) {
      console.error('[TabMultichannel] 変換エラー:', err);
      setError(err instanceof Error ? err.message : '変換に失敗しました');
    } finally {
      setIsTransforming(false);
    }
  };

  // CSVダウンロード
  const handleDownloadCSV = () => {
    if (!transformedData) return;

    downloadCSV({
      platform: selectedPlatform,
      products: [transformedData],
      includeHeaders: true,
      encoding: 'utf-8',
    });
  };

  const selectedConfig = getPlatformConfig(selectedPlatform);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        多販路変換エンジン
      </h2>

      {!product && (
        <div
          style={{
            padding: '20px',
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
          }}
        >
          商品が選択されていません
        </div>
      )}

      {product && (
        <>
          {/* プラットフォーム選択 */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}
            >
              1. ターゲットプラットフォームを選択
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {platforms.map((platform) => {
                const config = getPlatformConfig(platform);
                const isSelected = platform === selectedPlatform;

                return (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${
                        isSelected ? config.imageRequirements ? '#3b82f6' : '#d1d5db' : '#e5e7eb'
                      }`,
                      borderRadius: '8px',
                      background: isSelected ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {config.displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {config.currency} · {config.primaryLanguage.toUpperCase()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* プラットフォーム情報 */}
          <div
            style={{
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>
              {selectedConfig.displayName} の要件
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ color: '#6b7280' }}>主要言語:</span>{' '}
                {selectedConfig.primaryLanguage.toUpperCase()}
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>通貨:</span> {selectedConfig.currency}
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>最大画像枚数:</span>{' '}
                {selectedConfig.maxImages}枚
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>手数料:</span>{' '}
                {selectedConfig.feeStructure.baseFeePercent}%
              </div>
            </div>
          </div>

          {/* リアルタイムプレビュー */}
          {pricingPreview && (
            <div
              style={{
                padding: '20px',
                background: '#f0fdf4',
                border: '2px solid #10b981',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <h4 style={{ fontWeight: '600', marginBottom: '16px', color: '#065f46' }}>
                💰 価格シミュレーション（リアルタイムプレビュー）
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    関税コスト (概算)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#dc2626' }}>
                    {pricingPreview.dutyCost.toFixed(2)} {pricingPreview.currency}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    プラットフォーム手数料 (概算)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#ea580c' }}>
                    {pricingPreview.platformFee.toFixed(2)} {pricingPreview.currency}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    推定販売価格
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#2563eb' }}>
                    {pricingPreview.estimatedPrice.toFixed(2)} {pricingPreview.currency}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    利益率 (シミュレーション)
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: pricingPreview.profitMargin > 20 ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {pricingPreview.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                }}
              >
                ※ これは概算です。実際の価格は「変換」ボタンをクリックして確認してください。
              </div>
            </div>
          )}

          {/* 変換実行 */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}
            >
              2. データ変換を実行
            </h3>
            <button
              onClick={handleTransform}
              disabled={isTransforming}
              style={{
                padding: '12px 24px',
                background: isTransforming ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isTransforming ? 'not-allowed' : 'pointer',
              }}
            >
              {isTransforming ? '変換中...' : `${selectedConfig.displayName}向けに変換`}
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div
              style={{
                padding: '16px',
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <strong>エラー:</strong> {error}
            </div>
          )}

          {/* 変換結果 */}
          {transformedData && (
            <div style={{ marginBottom: '32px' }}>
              <h3
                style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}
              >
                3. 変換結果
              </h3>

              {/* 警告 */}
              {transformedData.warnings.length > 0 && (
                <div
                  style={{
                    padding: '16px',
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <strong>警告:</strong>
                  <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                    {transformedData.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* データプレビュー */}
              <div
                style={{
                  padding: '20px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <strong>タイトル:</strong>
                  <div style={{ marginTop: '4px', color: '#374151' }}>
                    {transformedData.title}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>価格:</strong>
                  <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: '600' }}>
                    {transformedData.price} {transformedData.currency}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>在庫:</strong> {transformedData.stockQuantity}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>画像:</strong> {transformedData.images.length}枚
                </div>
              </div>

              {/* CSV生成 */}
              <button
                onClick={handleDownloadCSV}
                style={{
                  padding: '12px 24px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                CSVをダウンロード
              </button>
            </div>
          )}

          {/* 使い方 */}
          <div
            style={{
              padding: '20px',
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>使い方</h4>
            <ol style={{ marginLeft: '20px' }}>
              <li>ターゲットプラットフォームを選択します</li>
              <li>「変換」ボタンをクリックしてデータを変換します</li>
              <li>
                変換結果を確認し、問題がなければ「CSVをダウンロード」をクリックします
              </li>
              <li>
                ダウンロードしたCSVファイルを各プラットフォームにアップロードします
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
