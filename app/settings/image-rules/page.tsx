'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ImageRule {
  id?: string
  marketplace: string
  watermark_enabled: boolean
  watermark_image_url: string | null
  watermark_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  watermark_opacity: number
  watermark_scale: number
  skip_watermark_for_amazon: boolean
  auto_resize: boolean
  target_size_px: number
  quality: number
}

const MARKETPLACES = [
  { id: 'ebay', name: 'eBay', icon: '🛒' },
  { id: 'shopee', name: 'Shopee', icon: '🛍️' },
  { id: 'amazon-global', name: 'Amazon 海外', icon: '📦' },
  { id: 'amazon-jp', name: 'Amazon 日本', icon: '🏪' },
  { id: 'coupang', name: 'Coupang', icon: '🚀' },
  { id: 'shopify', name: 'Shopify', icon: '💼' },
]

const DEFAULT_RULE: Omit<ImageRule, 'marketplace'> = {
  watermark_enabled: false,
  watermark_image_url: null,
  watermark_position: 'bottom-right',
  watermark_opacity: 0.8,
  watermark_scale: 0.15,
  skip_watermark_for_amazon: true,
  auto_resize: true,
  target_size_px: 1600,
  quality: 90,
}

export default function ImageRulesSettingsPage() {
  const router = useRouter()
  const [rules, setRules] = useState<Record<string, ImageRule>>({})
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('ebay')
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingWatermark, setUploadingWatermark] = useState(false)

  // 初回ロード時にルールを取得
  useEffect(() => {
    const fetchRules = async () => {
      const newRules: Record<string, ImageRule> = {}

      for (const mp of MARKETPLACES) {
        try {
          const response = await fetch(`/api/image-rules?marketplace=${mp.id}`)
          if (response.ok) {
            const data = await response.json()
            newRules[mp.id] = data
          } else {
            newRules[mp.id] = { ...DEFAULT_RULE, marketplace: mp.id }
          }
        } catch (error) {
          console.error(`${mp.name}のルール取得エラー:`, error)
          newRules[mp.id] = { ...DEFAULT_RULE, marketplace: mp.id }
        }
      }

      setRules(newRules)
    }

    fetchRules()
  }, [])

  // 現在選択中のルール
  const currentRule = rules[selectedMarketplace] || { ...DEFAULT_RULE, marketplace: selectedMarketplace }

  // ルールを更新
  const updateRule = (updates: Partial<ImageRule>) => {
    setRules((prev) => ({
      ...prev,
      [selectedMarketplace]: {
        ...prev[selectedMarketplace],
        ...updates,
      },
    }))
  }

  // ウォーターマーク画像をアップロード
  const handleWatermarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingWatermark(true)

    try {
      // TODO: Supabase Storage にアップロードする処理を実装
      // 現在はモックURLを使用
      const mockUrl = URL.createObjectURL(file)

      updateRule({
        watermark_image_url: mockUrl,
      })

      alert('✓ ウォーターマーク画像をアップロードしました')
    } catch (error) {
      console.error('アップロードエラー:', error)
      alert('アップロード中にエラーが発生しました')
    } finally {
      setUploadingWatermark(false)
    }
  }

  // 設定を保存
  const handleSave = async () => {
    setIsSaving(true)

    try {
      const rule = currentRule

      // IDがある場合は更新、ない場合は作成
      const method = rule.id ? 'PUT' : 'POST'
      const response = await fetch('/api/image-rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      })

      if (!response.ok) {
        throw new Error('保存に失敗しました')
      }

      const data = await response.json()

      // 保存後のデータで更新
      setRules((prev) => ({
        ...prev,
        [selectedMarketplace]: data,
      }))

      alert(`✓ ${MARKETPLACES.find((m) => m.id === selectedMarketplace)?.name}の設定を保存しました`)
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存中にエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
              <i className="fas fa-image"></i> 画像ルール設定
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#6c757d', fontSize: '0.95rem' }}>
              モール・アカウント別のウォーターマーク設定を管理
            </p>
          </div>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <i className="fas fa-arrow-left"></i> 戻る
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
          {/* 左側: マーケットプレイス選択 */}
          <div>
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
                マーケットプレイス
              </h3>

              {MARKETPLACES.map((mp) => (
                <div
                  key={mp.id}
                  onClick={() => setSelectedMarketplace(mp.id)}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedMarketplace === mp.id ? '#e3f2fd' : 'transparent',
                    border:
                      selectedMarketplace === mp.id ? '2px solid #1976d2' : '2px solid transparent',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{mp.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{mp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      {rules[mp.id]?.watermark_enabled ? (
                        <span style={{ color: '#28a745' }}>
                          <i className="fas fa-check-circle"></i> 有効
                        </span>
                      ) : (
                        <span style={{ color: '#dc3545' }}>
                          <i className="fas fa-times-circle"></i> 無効
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側: 設定フォーム */}
          <div>
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', fontWeight: 600 }}>
                {MARKETPLACES.find((m) => m.id === selectedMarketplace)?.name} の設定
              </h2>

              {/* ウォーターマーク有効化 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={currentRule.watermark_enabled}
                    onChange={(e) => updateRule({ watermark_enabled: e.target.checked })}
                    style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
                  />
                  ウォーターマークを有効にする
                </label>
              </div>

              {/* ウォーターマーク画像アップロード */}
              {currentRule.watermark_enabled && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      ウォーターマーク画像 (PNG推奨)
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleWatermarkUpload}
                      disabled={uploadingWatermark}
                      style={{ display: 'block', marginBottom: '0.5rem' }}
                    />
                    {currentRule.watermark_image_url && (
                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={currentRule.watermark_image_url}
                          alt="ウォーターマーク"
                          style={{ maxWidth: '200px', maxHeight: '100px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 位置 */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      位置
                    </label>
                    <select
                      value={currentRule.watermark_position}
                      onChange={(e) =>
                        updateRule({
                          watermark_position: e.target.value as ImageRule['watermark_position'],
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                      }}
                    >
                      <option value="top-left">左上</option>
                      <option value="top-right">右上</option>
                      <option value="bottom-left">左下</option>
                      <option value="bottom-right">右下</option>
                      <option value="center">中央</option>
                    </select>
                  </div>

                  {/* 透過度 */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      透過度: {Math.round(currentRule.watermark_opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentRule.watermark_opacity}
                      onChange={(e) => updateRule({ watermark_opacity: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* スケール */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      サイズ: {Math.round(currentRule.watermark_scale * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={currentRule.watermark_scale}
                      onChange={(e) => updateRule({ watermark_scale: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              )}

              {/* Amazon例外処理 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={currentRule.skip_watermark_for_amazon}
                    onChange={(e) => updateRule({ skip_watermark_for_amazon: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Amazon出品時はウォーターマークを適用しない
                </label>
              </div>

              {/* 画像最適化設定 */}
              <div
                style={{
                  marginTop: '2rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid #dee2e6',
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
                  画像最適化設定
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    目標サイズ (px)
                  </label>
                  <input
                    type="number"
                    value={currentRule.target_size_px}
                    onChange={(e) => updateRule({ target_size_px: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    JPEG品質: {currentRule.quality}
                  </label>
                  <input
                    type="range"
                    min="70"
                    max="100"
                    step="5"
                    value={currentRule.quality}
                    onChange={(e) => updateRule({ quality: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* 保存ボタン */}
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isSaving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> 保存中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i> 設定を保存
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
