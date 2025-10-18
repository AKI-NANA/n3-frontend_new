'use client'

import React, { useState, useEffect } from 'react'
import { Save, FolderOpen, Eye, Play, Trash2, Globe, Check } from 'lucide-react'

const COUNTRIES = [
  { code: 'US', language: 'en', marketplace: 'ebay.com', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', language: 'en', marketplace: 'ebay.co.uk', name: 'United Kingdom', flag: '🇬🇧' },
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
      <li><strong>Language:</strong> {{LANGUAGE}}</li>
      <li><strong>Rarity:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3 style="color: #146C94;">Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #AFD3E2; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0; color: #146C94;">Shipping Information</h3>
    <p>Items are carefully protected with sleeves and top loaders, shipped with tracking.</p>
    <p>Standard delivery: 7-14 business days</p>
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
  html_content: string
  created_at: string
  updated_at: string
}

export default function HTMLEditorPage() {
  const [templateName, setTemplateName] = useState('')
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE || '')
  const [previewHtml, setPreviewHtml] = useState('')
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([])
  const [defaultSettings, setDefaultSettings] = useState<{ [key: string]: number | null }>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadTemplates()
    loadDefaults()
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
    }
  }

  const loadDefaults = async () => {
    try {
      const response = await fetch('/api/html-templates/get-defaults')
      const data = await response.json()
      if (data.success) {
        setDefaultSettings(data.defaults || {})
      }
    } catch (error) {
      console.error('Failed to load defaults:', error)
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
        }),
      })

      const data = await response.json()
      if (data.success) {
        showMessage('✓ テンプレートを保存しました', 'success')
        setTemplateName('')
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
    setTemplateName(template.name || '')
    setHtmlContent(template.html_content || '')
    showMessage('✓ テンプレートを読み込みました', 'success')
  }

  const setAsDefault = async (templateId: number, countryCode: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/html-templates/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          country_code: countryCode,
        }),
      })

      const data = await response.json()
      if (data.success) {
        const country = COUNTRIES.find(c => c.code === countryCode)
        showMessage(`✓ ${country?.flag} ${countryCode}のデフォルトに設定しました`, 'success')
        loadDefaults() // デフォルト設定を再読み込み
      } else {
        showMessage('✗ 設定に失敗しました', 'error')
      }
    } catch (error) {
      console.error('Set default error:', error)
      showMessage('✗ 設定に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const generatePreview = () => {
    if (!htmlContent || htmlContent.trim() === '') {
      showMessage('HTMLを入力してください', 'error')
      return
    }

    const sampleData = {
      title: 'Pokemon Card Gengar VS 1st Edition Japanese Holo Rare',
      condition: 'Used',
      language: 'Japanese',
      rarity: 'Rare',
      description: 'Authentic Japanese Pokemon card in excellent condition. Carefully stored and ready for collectors.',
    }

    const preview = htmlContent
      .replace(/\{\{TITLE\}\}/g, sampleData.title)
      .replace(/\{\{CONDITION\}\}/g, sampleData.condition)
      .replace(/\{\{LANGUAGE\}\}/g, sampleData.language)
      .replace(/\{\{RARITY\}\}/g, sampleData.rarity)
      .replace(/\{\{DESCRIPTION\}\}/g, sampleData.description)

    setPreviewHtml(preview)
    showMessage('✓ プレビューを生成しました', 'success')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6F1F1 0%, #AFD3E2 100%)' }}>
      <div style={{ padding: '2rem' }}>
        {/* ヘッダー */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={32} />
            多言語対応 HTMLテンプレート編集
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
            8言語対応 - eBay各国向け商品説明テンプレート作成
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
          }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* エディタセクション */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#146C94' }}>HTMLエディタ</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={saveTemplate}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
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

            {/* テンプレート名 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#146C94' }}>
                テンプレート名
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="例: 2025_template_us"
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
                HTML (変数: {`{{TITLE}}, {{CONDITION}}, {{LANGUAGE}}, {{RARITY}}, {{DESCRIPTION}}`})
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

            {/* プレビューボタン */}
            <button
              onClick={generatePreview}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#EA9ABB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              <Play size={18} />
              プレビュー生成
            </button>
          </div>

          {/* プレビューセクション */}
          {previewHtml && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={24} />
                プレビュー
              </h2>
              <div
                style={{
                  border: '2px solid #AFD3E2',
                  borderRadius: '8px',
                  padding: '2rem',
                  background: '#F6F1F1',
                  minHeight: '400px',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}

          {/* 保存済みテンプレート */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={24} />
                保存済みテンプレート
              </h2>
              <button
                onClick={loadTemplates}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#AFD3E2',
                  color: '#146C94',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                更新
              </button>
            </div>

            {savedTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                <FolderOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>保存済みテンプレートがありません</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      border: '2px solid #AFD3E2',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      background: '#F6F1F1',
                    }}
                  >
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#146C94', fontSize: '1.1rem' }}>
                      {template.name}
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666' }}>
                      {new Date(template.created_at).toLocaleDateString('ja-JP')}
                    </p>

                    {/* デフォルト設定ボタン */}
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#146C94' }}>
                        デフォルトに設定:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {COUNTRIES.map((country) => {
                          const isDefault = defaultSettings[country.code] === template.id
                          return (
                            <button
                              key={country.code}
                              onClick={() => setAsDefault(template.id, country.code)}
                              disabled={loading}
                              title={`${country.name}のデフォルトに設定${isDefault ? ' (設定済み)' : ''}`}
                              style={{
                                padding: '0.4rem 0.6rem',
                                background: isDefault ? '#19A7CE' : 'white',
                                border: isDefault ? '2px solid #146C94' : '1px solid #AFD3E2',
                                borderRadius: '6px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1.2rem',
                                transition: 'all 0.2s',
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                if (!isDefault) {
                                  e.currentTarget.style.background = '#AFD3E2'
                                  e.currentTarget.style.transform = 'scale(1.05)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isDefault) {
                                  e.currentTarget.style.background = 'white'
                                  e.currentTarget.style.transform = 'scale(1)'
                                }
                              }}
                            >
                              {country.flag}
                              {isDefault && (
                                <span style={{
                                  position: 'absolute',
                                  top: '-4px',
                                  right: '-4px',
                                  background: '#146C94',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                }}>
                                  ✓
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => loadTemplate(template)}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          background: '#19A7CE',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                        }}
                      >
                        読込
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        style={{
                          padding: '0.6rem',
                          background: '#FEA5AD',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
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
        </div>
      </div>
    </div>
  )
}
