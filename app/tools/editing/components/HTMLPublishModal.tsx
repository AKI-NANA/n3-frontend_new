'use client'

import React, { useState, useEffect } from 'react'
import { Eye, Send, AlertCircle, Loader, Check } from 'lucide-react'

interface HTMLTemplate {
  id: number
  name: string
  mall_type: string
  country_code: string
  html_content: string
  is_default_preview: boolean
}

interface ProductData {
  id: number
  sku: string
  title: string
  price: string
  condition: string
  brand: string
  description: string
  shipping_info: string
}

interface HTMLPublishModalProps {
  isOpen: boolean
  onClose: () => void
  product: ProductData | null
  mallType: string
  countryCode: string
}

/**
 * HTMLプレビュー・生成モーダル
 * 出品管理画面から使用
 */
export function HTMLPublishModal({
  isOpen,
  onClose,
  product,
  mallType,
  countryCode
}: HTMLPublishModalProps) {
  const [templates, setTemplates] = useState<HTMLTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<HTMLTemplate | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [generatedListingId, setGeneratedListingId] = useState<string | null>(null)

  // マウント時にテンプレート読み込み
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, mallType, countryCode])

  // テンプレート読み込み
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/html-templates')
      const data = await response.json()
      
      if (data.success) {
        // モール・国別でフィルタリング
        const filtered = data.templates.filter(
          (t: HTMLTemplate) => t.mall_type === mallType && t.country_code === countryCode
        )
        
        setTemplates(filtered)
        
        // デフォルトプレビュー用を自動選択
        const defaultTemplate = filtered.find((t: HTMLTemplate) => t.is_default_preview)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate)
        } else if (filtered.length > 0) {
          setSelectedTemplate(filtered[0])
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      showMessage('テンプレート読み込みに失敗しました', 'error')
    }
  }

  // プレビュー生成
  const generatePreview = () => {
    if (!selectedTemplate || !product) return

    setGenerating(true)
    
    try {
      // プレースホルダーを置換
      let html = selectedTemplate.html_content
      
      // 🔥 英語データを優先使用
      const englishTitle = (product as any)?.english_title || (product as any)?.title_en || product.title
      const englishDescription = (product as any)?.english_description || (product as any)?.description_en || product.description
      const englishCondition = (product as any)?.english_condition || product.condition
      
      html = html.replace(/\{\{TITLE\}\}/g, englishTitle || '')
      html = html.replace(/\{\{PRICE\}\}/g, product.price || '')
      html = html.replace(/\{\{CONDITION\}\}/g, englishCondition || '')
      html = html.replace(/\{\{BRAND\}\}/g, product.brand || '')
      html = html.replace(/\{\{DESCRIPTION\}\}/g, englishDescription || '')
      html = html.replace(/\{\{SHIPPING_INFO\}\}/g, product.shipping_info || '')
      
      setPreview(html)
      showMessage('プレビューを生成しました', 'success')
    } catch (error) {
      console.error('Preview generation error:', error)
      showMessage('プレビュー生成に失敗しました', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // HTML生成・出品
  const publishHTML = async () => {
    if (!selectedTemplate || !product) {
      showMessage('テンプレートと商品を選択してください', 'error')
      return
    }

    if (!preview) {
      showMessage('先にプレビューを生成してください', 'error')
      return
    }

    setPublishing(true)
    
    try {
      // API呼び出し: 動的HTML生成
      const response = await fetch('/api/listings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          template_id: selectedTemplate.id,
          mall_type: mallType,
          country_code: countryCode,
          product_data: {
            title: product.title,
            price: product.price,
            condition: product.condition,
            brand: product.brand,
            description: product.description,
            shipping_info: product.shipping_info
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedListingId(data.listing_id)
        showMessage(`✓ HTML生成完了: ${data.listing_id}`, 'success')
        
        // 3秒後に自動クローズ
        setTimeout(() => {
          onClose()
          setGeneratedListingId(null)
        }, 3000)
      } else {
        showMessage(`エラー: ${data.message}`, 'error')
      }
    } catch (error) {
      console.error('Publish error:', error)
      showMessage('出品に失敗しました', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  if (!isOpen || !product) return null

  const messageColor = {
    success: '#d4edda',
    error: '#f8d7da',
    info: '#d1ecf1'
  }

  const messageBorder = {
    success: '#c3e6cb',
    error: '#f5c6cb',
    info: '#bee5eb'
  }

  const messageTextColor = {
    success: '#155724',
    error: '#721c24',
    info: '#0c5460'
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '1000px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        position: 'relative'
      }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={24} />
            HTML生成・出品
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            {product.title} - {mallType.toUpperCase()} ({countryCode})
          </p>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            padding: '1rem',
            background: messageColor[message.type],
            color: messageTextColor[message.type],
            borderRadius: '8px',
            marginBottom: '1rem',
            border: `1px solid ${messageBorder[message.type]}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message.type === 'success' && <Check size={20} />}
            {message.type === 'error' && <AlertCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* コンテンツ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1, minHeight: 0, marginBottom: '1.5rem' }}>
          {/* 左: テンプレート選択 */}
          <div style={{
            border: '1px solid #AFD3E2',
            borderRadius: '8px',
            padding: '1rem',
            background: '#F6F1F1',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#146C94' }}>
              テンプレート選択
            </h3>

            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>
                  {mallType.toUpperCase()} ({countryCode}) 対応テンプレートがありません
                </p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: selectedTemplate?.id === template.id ? '#19A7CE' : 'white',
                        color: selectedTemplate?.id === template.id ? 'white' : '#146C94',
                        border: selectedTemplate?.id === template.id ? 'none' : '1px solid #AFD3E2',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedTemplate?.id !== template.id) {
                          e.currentTarget.style.background = '#AFD3E2'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTemplate?.id !== template.id) {
                          e.currentTarget.style.background = 'white'
                        }
                      }}
                    >
                      <span>{template.name}</span>
                      {template.is_default_preview && <span style={{ fontSize: '1rem' }}>★</span>}
                    </button>
                  ))}
                </div>

                <button
                  onClick={generatePreview}
                  disabled={generating || !selectedTemplate}
                  style={{
                    padding: '0.75rem 1rem',
                    background: generating ? '#ccc' : '#EA9ABB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: generating ? 0.6 : 1
                  }}
                >
                  {generating ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={18} />}
                  {generating ? 'プレビュー生成中...' : 'プレビュー生成'}
                </button>
              </>
            )}
          </div>

          {/* 右: プレビュー */}
          <div style={{
            border: '1px solid #AFD3E2',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#F6F1F1'
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              background: '#146C94',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              プレビュー
            </div>

            {preview ? (
              <iframe
                style={{
                  flex: 1,
                  border: 'none',
                  width: '100%',
                }}
                srcDoc={preview}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                textAlign: 'center'
              }}>
                <p>テンプレートを選択してプレビューを生成してください</p>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#AFD3E2',
              color: '#146C94',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            キャンセル
          </button>

          <button
            onClick={publishHTML}
            disabled={publishing || !preview || generatedListingId !== null}
            style={{
              padding: '0.75rem 1.5rem',
              background: publishing ? '#ccc' : '#19A7CE',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: publishing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: publishing ? 0.6 : 1
            }}
          >
            {publishing ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            {publishing ? '出品中...' : 'HTML生成・出品'}
          </button>
        </div>

        {/* 成功メッセージ */}
        {generatedListingId && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            color: '#155724',
            textAlign: 'center',
            fontWeight: 600
          }}>
            ✓ 出品完了！ {generatedListingId}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .modal-overlay {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
