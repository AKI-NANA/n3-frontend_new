'use client'

import { useState, useEffect } from 'react'
import styles from '../../FullFeaturedModal.module.css'
import type { Product } from '@/types/product'

export interface TabImageOptimizationProps {
  product: Product | null
  marketplace: string
  marketplaceName: string
  onSave?: (updates: any) => void
}

interface ZoomVariant {
  variant: 'P1' | 'P2' | 'P3'
  zoom: number
  url: string
  label: string
  description: string
}

interface ImageRule {
  watermark_enabled: boolean
  watermark_image_url: string | null
  watermark_position: string
  watermark_opacity: number
  watermark_scale: number
  skip_watermark_for_amazon: boolean
}

export function TabImageOptimization({
  product,
  marketplace,
  marketplaceName,
  onSave,
}: TabImageOptimizationProps) {
  // 状態管理
  const [selectedVariant, setSelectedVariant] = useState<'P1' | 'P2' | 'P3'>('P2')
  const [customZoom, setCustomZoom] = useState<number>(1.15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [variants, setVariants] = useState<ZoomVariant[]>([])
  const [imageRules, setImageRules] = useState<ImageRule | null>(null)
  const [previewMarketplace, setPreviewMarketplace] = useState(marketplace)

  // P1/P2/P3 のプリセット定義
  const ZOOM_PRESETS: ZoomVariant[] = [
    {
      variant: 'P1',
      zoom: 1.0,
      url: '',
      label: 'P1 - オリジナル',
      description: 'ズーム率 1.0（元のサイズ）',
    },
    {
      variant: 'P2',
      zoom: 1.15,
      url: '',
      label: 'P2 - 推奨',
      description: 'ズーム率 1.15（推奨）',
    },
    {
      variant: 'P3',
      zoom: 1.30,
      url: '',
      label: 'P3 - 最大',
      description: 'ズーム率 1.30（最大拡大）',
    },
  ]

  // メイン画像を取得
  const mainImage = product?.images?.[0]?.url || ''

  // 画像ルールを取得
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch(`/api/image-rules?marketplace=${previewMarketplace}`)
        if (response.ok) {
          const data = await response.json()
          setImageRules(data)
        } else {
          // デフォルトルール
          setImageRules({
            watermark_enabled: false,
            watermark_image_url: null,
            watermark_position: 'bottom-right',
            watermark_opacity: 0.8,
            watermark_scale: 0.15,
            skip_watermark_for_amazon: true,
          })
        }
      } catch (error) {
        console.error('画像ルール取得エラー:', error)
      }
    }

    fetchRules()
  }, [previewMarketplace])

  // P1/P2/P3を生成
  const handleGenerateVariants = async () => {
    if (!product?.sku || !mainImage) {
      alert('SKUまたはメイン画像が見つかりません')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/image-optimization/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: mainImage,
          sku: product.sku,
        }),
      })

      if (!response.ok) {
        throw new Error('画像生成に失敗しました')
      }

      const data = await response.json()
      setVariants(data.variants)
      alert('✓ P1/P2/P3の画像生成が完了しました')
    } catch (error) {
      console.error('画像生成エラー:', error)
      alert('画像生成中にエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // バリアントを選択
  const handleSelectVariant = (variant: 'P1' | 'P2' | 'P3', zoom: number) => {
    setSelectedVariant(variant)
    setCustomZoom(zoom)

    // listing_dataに保存
    if (onSave) {
      onSave({
        listing_data: {
          ...product?.listing_data,
          selected_image_variant: variant,
          custom_zoom: zoom,
        },
      })
    }

    alert(`✓ ${variant}を選択しました（ズーム率: ${zoom}）`)
  }

  // カスタムズーム率を保存
  const handleSaveCustomZoom = () => {
    if (onSave) {
      onSave({
        listing_data: {
          ...product?.listing_data,
          custom_zoom: customZoom,
        },
      })
    }

    alert(`✓ カスタムズーム率を保存しました: ${customZoom}`)
  }

  // ウォーターマークを適用するか判定
  const shouldShowWatermark =
    imageRules?.watermark_enabled &&
    imageRules.watermark_image_url &&
    !(previewMarketplace.startsWith('amazon') && imageRules.skip_watermark_for_amazon)

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 600 }}>
        <i className="fas fa-magic"></i> 画像最適化とルール
      </h3>

      {/* 説明 */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#1976d2',
        }}
      >
        <strong>機能:</strong> P1/P2/P3の自動画像生成、ズーム率調整、モール別ウォーターマーク適用
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* 左側: P1/P2/P3 候補生成 */}
        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            <i className="fas fa-images"></i> P1/P2/P3 自動生成
          </h4>

          {/* 生成ボタン */}
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleGenerateVariants}
            disabled={isGenerating || !mainImage}
            style={{
              width: '100%',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> 生成中...
              </>
            ) : (
              <>
                <i className="fas fa-cogs"></i> P1/P2/P3を生成
              </>
            )}
          </button>

          {/* バリアント候補 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ZOOM_PRESETS.map((preset) => {
              const generatedVariant = variants.find((v) => v.variant === preset.variant)
              const imageUrl = generatedVariant?.url || mainImage
              const isSelected = selectedVariant === preset.variant

              return (
                <div
                  key={preset.variant}
                  onClick={() => handleSelectVariant(preset.variant, preset.zoom)}
                  style={{
                    border: isSelected ? '3px solid #4caf50' : '2px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isSelected ? '#f1f8f4' : 'white',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#4caf50',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <i className="fas fa-check"></i> 選択中
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* サムネイル */}
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={preset.label}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    {/* 説明 */}
                    <div style={{ flex: 1 }}>
                      <h5
                        style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        {preset.label}
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>
                        {preset.description}
                      </p>
                      {generatedVariant && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: '#d4edda',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#155724',
                            display: 'inline-block',
                          }}
                        >
                          <i className="fas fa-check-circle"></i> 生成済み
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* カスタムズーム率調整 */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
            }}
          >
            <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
              <i className="fas fa-sliders-h"></i> カスタムズーム率
            </h5>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                ズーム率: <strong>{customZoom.toFixed(2)}</strong>
              </label>
              <input
                type="range"
                min="1.0"
                max="1.3"
                step="0.01"
                value={customZoom}
                onChange={(e) => setCustomZoom(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#6c757d',
                  marginTop: '0.25rem',
                }}
              >
                <span>1.0</span>
                <span>1.15</span>
                <span>1.3</span>
              </div>
            </div>

            <button
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={handleSaveCustomZoom}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <i className="fas fa-save"></i> ズーム率を保存
            </button>
          </div>
        </div>

        {/* 右側: プレビューと設定 */}
        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            <i className="fas fa-eye"></i> モール別プレビュー
          </h4>

          {/* モール選択 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              出品先を選択:
            </label>
            <select
              value={previewMarketplace}
              onChange={(e) => setPreviewMarketplace(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.9rem',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
              }}
            >
              <option value="ebay">eBay</option>
              <option value="shopee">Shopee</option>
              <option value="amazon-global">Amazon 海外</option>
              <option value="amazon-jp">Amazon 日本</option>
              <option value="coupang">Coupang</option>
              <option value="shopify">Shopify</option>
            </select>
          </div>

          {/* プレビュー */}
          <div
            style={{
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '1rem',
              background: '#f8f9fa',
            }}
          >
            <h5
              style={{
                margin: '0 0 1rem 0',
                fontSize: '0.9rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {previewMarketplace.toUpperCase()} プレビュー
            </h5>

            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={mainImage}
                alt="プレビュー"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {/* ウォーターマークのシミュレーション */}
              {shouldShowWatermark && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#495057',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  © N3 Store
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '1rem',
                fontSize: '0.8rem',
                color: '#6c757d',
                textAlign: 'center',
              }}
            >
              {shouldShowWatermark
                ? `✓ ウォーターマークが適用されます（${imageRules?.watermark_position}）`
                : '✗ ウォーターマークは適用されません'}
            </div>
          </div>

          {/* 設定情報 */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
            }}
          >
            <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
              <i className="fas fa-cog"></i> 適用される設定
            </h5>

            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: '#6c757d' }}>ウォーターマーク:</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600 }}>
                    {imageRules?.watermark_enabled ? (
                      <span style={{ color: '#28a745' }}>
                        <i className="fas fa-check-circle"></i> 有効
                      </span>
                    ) : (
                      <span style={{ color: '#dc3545' }}>
                        <i className="fas fa-times-circle"></i> 無効
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: '#6c757d' }}>位置:</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600 }}>
                    {imageRules?.watermark_position || '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: '#6c757d' }}>透過度:</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600 }}>
                    {imageRules?.watermark_opacity
                      ? `${Math.round(imageRules.watermark_opacity * 100)}%`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: '#6c757d' }}>選択中のズーム:</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600 }}>{customZoom.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {previewMarketplace.startsWith('amazon') && imageRules?.skip_watermark_for_amazon && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#fff3cd',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#856404',
                }}
              >
                <i className="fas fa-info-circle"></i>{' '}
                <strong>注意:</strong> Amazonへの出品時はウォーターマークを適用しません
              </div>
            )}
          </div>

          {/* 設定画面へのリンク */}
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <a
              href="/settings/image-rules"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: '#1976d2',
                textDecoration: 'none',
              }}
            >
              <i className="fas fa-external-link-alt"></i> ウォーターマーク設定を編集
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
