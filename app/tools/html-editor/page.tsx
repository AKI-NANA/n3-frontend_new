'use client'

import React, { useState, useEffect } from 'react'
import { Save, FolderOpen, Eye, Play, Trash2, Globe, Check, Code, Zap, AlertCircle } from 'lucide-react'

// モール定義
const MALLS = [
  { id: 'ebay', name: 'eBay', icon: '🌐' },
  { id: 'yahoo', name: 'Yahoo!オークション', icon: '🇯🇵' },
  { id: 'mercari', name: 'メルカリ', icon: '📦' },
  { id: 'amazon', name: 'Amazon', icon: '🛒' },
]

// 国定義
const COUNTRIES = [
  { code: 'US', language: 'en', marketplace: 'ebay.com', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', language: 'en', marketplace: 'ebay.co.uk', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', language: 'ja', marketplace: 'yahoo.co.jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'DE', language: 'de', marketplace: 'ebay.de', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', language: 'fr', marketplace: 'ebay.fr', name: 'France', flag: '🇫🇷' },
  { code: 'IT', language: 'it', marketplace: 'ebay.it', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', language: 'es', marketplace: 'ebay.es', name: 'Spain', flag: '🇪🇸' },
  { code: 'AU', language: 'en', marketplace: 'ebay.com.au', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', language: 'en', marketplace: 'ebay.ca', name: 'Canada', flag: '🇨🇦' },
]

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #19A7CE; border-bottom: 3px solid #19A7CE; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #F6F1F1; padding: 20px; margin: 15px 0; border-left: 5px solid #19A7CE;">
    <h3 style="margin-top: 0; color: #146C94;">Product Details</h3>
    <ul style="margin: 0;">
      <li><strong>Condition:</strong> {{CONDITION}}</li>
      <li><strong>Brand:</strong> {{BRAND}}</li>
      <li><strong>Price:</strong> {{PRICE}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3 style="color: #146C94;">Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #AFD3E2; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0; color: #146C94;">Shipping Information</h3>
    <p>{{SHIPPING_INFO}}</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #F6F1F1; border-radius: 8px;">
    <p style="margin: 0; color: #146C94; font-size: 16px;">
      <strong>Questions? Feel free to contact us!</strong>
    </p>
  </div>
</div>`

interface SavedTemplate {
  id: number
  name: string
  mall_type: string
  country_code: string
  html_content: string
  is_default_preview: boolean
  created_at: string
  updated_at: string
}

interface PreviewData {
  title: string
  price: string
  condition: string
  brand: string
  description: string
  shipping_info: string
}

interface ModalState {
  isOpen: boolean
  selectedTemplates: SavedTemplate[]
  currentPreviewIndex: number
  generatedPreviews: { [key: string]: string }
}

export default function HTMLEditorPageV2() {
  // フォーム状態
  const [templateName, setTemplateName] = useState('')
  const [selectedMall, setSelectedMall] = useState('ebay')
  const [selectedCountry, setSelectedCountry] = useState('US')
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE)
  const [isDefaultPreview, setIsDefaultPreview] = useState(false)
  
  // テンプレート管理
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  
  // モーダル状態
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    selectedTemplates: [],
    currentPreviewIndex: 0,
    generatedPreviews: {}
  })

  // サンプルデータ
  const sampleData: PreviewData = {
    title: 'Pokemon Card Gengar VS 1st Edition Japanese Holo Rare',
    price: '$299.99',
    condition: 'Mint Condition',
    brand: 'Pokemon Company',
    description: 'Authentic Japanese Pokemon card from the original collection. Professionally graded and carefully stored.',
    shipping_info: 'Ships worldwide with tracking and insurance. Typically arrives in 7-14 business days.'
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/html-templates')
      const data = await response.json()
      if (data.success) {
        setSavedTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      showMessage('テンプレート読み込みに失敗しました', 'error')
    }
  }

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      showMessage('テンプレート名を入力してください', 'error')
      return
    }

    if (!htmlContent.trim()) {
      showMessage('HTMLを入力してください', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/html-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          html_content: htmlContent,
          mall_type: selectedMall,
          country_code: selectedCountry,
          is_default_preview: isDefaultPreview,
        }),
      })

      const data = await response.json()
      if (data.success) {
        showMessage(`✓ テンプレート保存: ${selectedMall}(${selectedCountry})`, 'success')
        setTemplateName('')
        setIsDefaultPreview(false)
        loadTemplates()
      } else {
        showMessage('✗ 保存に失敗しました', 'error')
      }
    } catch (error) {
      console.error('Save error:', error)
      showMessage('✗ 保存に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (id: number) => {
    if (!confirm('このテンプレートを削除しますか？')) return

    try {
      const response = await fetch(`/api/html-templates/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        showMessage('✓ テンプレートを削除しました', 'success')
        loadTemplates()
      }
    } catch (error) {
      console.error('Delete error:', error)
      showMessage('✗ 削除に失敗しました', 'error')
    }
  }

  const loadTemplate = (template: SavedTemplate) => {
    setTemplateName(template.name)
    setSelectedMall(template.mall_type)
    setSelectedCountry(template.country_code)
    setHtmlContent(template.html_content)
    setIsDefaultPreview(template.is_default_preview)
    showMessage('✓ テンプレートを読み込みました', 'success')
  }

  // 複数モール用プレビュー生成
  const generateMultiplePreviews = (templates: SavedTemplate[]) => {
    const previews: { [key: string]: string } = {}

    templates.forEach(template => {
      const key = `${template.id}_${template.mall_type}_${template.country_code}`
      let preview = template.html_content
      
      // サンプルデータ埋め込み
      preview = preview.replace(/\{\{TITLE\}\}/g, sampleData.title)
      preview = preview.replace(/\{\{PRICE\}\}/g, sampleData.price)
      preview = preview.replace(/\{\{CONDITION\}\}/g, sampleData.condition)
      preview = preview.replace(/\{\{BRAND\}\}/g, sampleData.brand)
      preview = preview.replace(/\{\{DESCRIPTION\}\}/g, sampleData.description)
      preview = preview.replace(/\{\{SHIPPING_INFO\}\}/g, sampleData.shipping_info)
      
      previews[key] = preview
    })

    return previews
  }

  // モーダルを開く
  const openPreviewModal = (templates: SavedTemplate[]) => {
    if (templates.length === 0) {
      showMessage('プレビューするテンプレートを選択してください', 'error')
      return
    }

    const previews = generateMultiplePreviews(templates)
    setModal({
      isOpen: true,
      selectedTemplates: templates,
      currentPreviewIndex: 0,
      generatedPreviews: previews
    })
  }

  // モーダルを閉じる
  const closePreviewModal = () => {
    setModal({
      isOpen: false,
      selectedTemplates: [],
      currentPreviewIndex: 0,
      generatedPreviews: {}
    })
  }

  // 現在のテンプレート
  const currentTemplate = modal.selectedTemplates[modal.currentPreviewIndex]
  const currentPreviewKey = currentTemplate 
    ? `${currentTemplate.id}_${currentTemplate.mall_type}_${currentTemplate.country_code}`
    : ''

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6F1F1 0%, #AFD3E2 100%)' }}>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Code size={32} />
            多モール対応 HTMLテンプレート編集
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
            eBay / Yahoo!オークション / メルカリ / Amazon 対応テンプレート作成
          </p>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            padding: '1rem',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* 左: エディタセクション */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: '#146C94' }}>テンプレート編集</h2>

            {/* モール選択 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#146C94' }}>
                対象モール
              </label>
              <select
                value={selectedMall}
                onChange={(e) => setSelectedMall(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #AFD3E2',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              >
                {MALLS.map(mall => (
                  <option key={mall.id} value={mall.id}>
                    {mall.icon} {mall.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 国選択 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#146C94' }}>
                国/地域
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #AFD3E2',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* テンプレート名 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#146C94' }}>
                テンプレート名
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="例: 2025_ebay_us"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #AFD3E2',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            {/* HTMLエディタ */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#146C94' }}>
                HTML (変数: {`{{TITLE}}, {{PRICE}}, {{CONDITION}}, {{BRAND}}, {{DESCRIPTION}}, {{SHIPPING_INFO}}`})
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="HTMLを入力..."
                style={{
                  width: '100%',
                  height: '400px',
                  padding: '1rem',
                  border: '2px solid #AFD3E2',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* デフォルト選択 */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F6F1F1', borderRadius: '8px', border: '1px solid #AFD3E2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isDefaultPreview}
                  onChange={(e) => setIsDefaultPreview(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600, color: '#146C94' }}>
                  ★ モーダルのデフォルト表示に設定
                </span>
              </label>
              <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.9rem', color: '#666' }}>
                このテンプレートを出品時のプレビューで最初に表示します
              </p>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={saveTemplate}
                disabled={loading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: '#19A7CE',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Save size={18} />
                保存
              </button>
            </div>
          </div>

          {/* 右: テンプレート一覧 */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen size={24} />
              テンプレート一覧
            </h2>

            <button
              onClick={loadTemplates}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                background: '#AFD3E2',
                color: '#146C94',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              更新
            </button>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {savedTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  <FolderOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>テンプレートがありません</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        border: '1px solid #AFD3E2',
                        borderRadius: '8px',
                        padding: '1rem',
                        background: '#F6F1F1',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: '#146C94' }}>{template.name}</h4>
                        {template.is_default_preview && <span style={{ fontSize: '1.2rem' }}>★</span>}
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666' }}>
                        {(template.mall_type ?? 'UNKNOWN').toUpperCase()} / {(template.country_code ?? 'N/A')}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => loadTemplate(template)}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            background: '#19A7CE',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          読込
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          style={{
                            padding: '0.5rem',
                            background: '#FEA5AD',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* プレビューボタン */}
            <button
              onClick={() => openPreviewModal(savedTemplates)}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                background: '#EA9ABB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Eye size={18} />
              全テンプレートをプレビュー
            </button>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {modal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          }}>
            {/* モーダルヘッダー */}
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={24} />
              HTMLプレビュー - テンプレート確認
            </h2>

            {/* テンプレート選択タブ */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
            }}>
              {modal.selectedTemplates.map((template, index) => {
                const isActive = index === modal.currentPreviewIndex
                const isDefault = template.is_default_preview
                
                return (
                  <button
                    key={`${template.id}_${template.mall_type}`}
                    onClick={() => setModal(prev => ({ ...prev, currentPreviewIndex: index }))}
                    style={{
                      padding: '0.75rem 1rem',
                      background: isActive ? '#19A7CE' : '#f0f0f0',
                      color: isActive ? 'white' : '#146C94',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{(template.mall_type ?? 'UNKNOWN').toUpperCase()} ({(template.country_code ?? 'N/A')})</span>
                    {isDefault && <span style={{ fontSize: '1.1rem' }}>★</span>}
                  </button>
                )
              })}
            </div>

            {/* プレビュー表示 */}
            {currentTemplate && (
              <div style={{
                flex: 1,
                border: '2px solid #AFD3E2',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{
                  background: '#F6F1F1',
                  padding: '1rem',
                  fontWeight: 600,
                  color: '#146C94',
                  fontSize: '0.9rem',
                }}>
                  📍 {(currentTemplate.mall_type ?? 'UNKNOWN').toUpperCase()} / {(currentTemplate.country_code ?? 'N/A')}
                  {currentTemplate.is_default_preview && ' ★ (デフォルト表示)'}
                </div>
                <iframe
                  style={{
                    flex: 1,
                    border: 'none',
                    width: '100%',
                    minHeight: '400px',
                  }}
                  srcDoc={modal.generatedPreviews[currentPreviewKey]}
                />
              </div>
            )}

            {/* クローズボタン */}
            <button
              onClick={closePreviewModal}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#AFD3E2',
                color: '#146C94',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
