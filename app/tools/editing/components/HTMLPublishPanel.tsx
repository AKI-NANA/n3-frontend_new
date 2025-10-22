'use client'

import React, { useState, useEffect } from 'react'
import { Code, Send, Globe, X } from 'lucide-react'
import { HTMLPublishModal } from './HTMLPublishModal'

interface Product {
  id: number
  sku: string
  title: string
  price: string
  condition: string
  brand: string
  description: string
  shipping_info: string
}

interface HTMLPublishPanelProps {
  selectedProducts: Product[]
  onPublish?: (result: any) => void
  onClose?: () => void
}

const MALLS = [
  { id: 'ebay', name: 'eBay', icon: '🌐', countries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'AU', 'CA'] },
  { id: 'yahoo', name: 'Yahoo!オークション', icon: '🇯🇵', countries: ['JP'] },
  { id: 'mercari', name: 'メルカリ', icon: '📦', countries: ['JP'] },
  { id: 'amazon', name: 'Amazon', icon: '🛒', countries: ['US', 'JP', 'UK', 'DE', 'FR'] },
]

/**
 * HTML生成・出品パネル
 * 編集画面に組み込み
 */
export function HTMLPublishPanel({
  selectedProducts,
  onPublish,
  onClose
}: HTMLPublishPanelProps) {
  const [selectedMall, setSelectedMall] = useState('ebay')
  const [selectedCountry, setSelectedCountry] = useState('US')
  const [modalOpen, setModalOpen] = useState(false)
  const [publishedCount, setPublishedCount] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  const currentMall = MALLS.find(m => m.id === selectedMall)
  const countries = currentMall?.countries || ['US']

  // 国選択が有効でなくなったら初期化
  useEffect(() => {
    if (!countries.includes(selectedCountry)) {
      setSelectedCountry(countries[0])
    }
  }, [selectedMall, selectedCountry, countries])

  const handlePublish = async () => {
    console.log('🔵 handlePublish called')
    console.log('selectedProducts:', selectedProducts)
    console.log('selectedProducts.length:', selectedProducts.length)
    
    if (selectedProducts.length === 0) {
      alert('商品を選択してください')
      console.error('❌ No products selected')
      return
    }

    console.log('✅ Opening modal')
    setIsClosing(false)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    console.log('🔴 Closing modal')
    setIsClosing(true)
    setModalOpen(false)
  }

  return (
    <>
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#146C94',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Code size={20} />
            HTML生成・出品
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="閉じる"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* モール選択 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>
              対象モール
            </label>
            <select
              value={selectedMall}
              onChange={(e) => setSelectedMall(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer'
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
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>
              国/地域
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {countries.map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* ステータス表示 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>
              選択商品数
            </label>
            <div style={{
              padding: '0.75rem',
              background: '#F6F1F1',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: 600,
              color: '#146C94'
            }}>
              {selectedProducts.length} 件
            </div>
          </div>
        </div>

        {/* 情報 */}
        <div style={{
          padding: '1rem',
          background: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          color: '#1565c0',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Globe size={16} />
          <span>
            選択した商品を {selectedMall.toUpperCase()} ({selectedCountry}) に出品します。
            テンプレートを選択してHTMLを生成・確認してから出品してください。
          </span>
        </div>

        {/* ボタン */}
        <button
          onClick={handlePublish}
          disabled={selectedProducts.length === 0}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            background: selectedProducts.length === 0 ? '#ccc' : '#19A7CE',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedProducts.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: selectedProducts.length === 0 ? 0.5 : 1
          }}
        >
          <Send size={18} />
          HTML生成・出品
        </button>

        {publishedCount > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            color: '#155724',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            ✓ {publishedCount}件を出品しました
          </div>
        )}
      </div>

      {/* モーダル - 常にレンダリング、isOpenで制御 */}
      {selectedProducts.length > 0 && (
        <HTMLPublishModal
          isOpen={modalOpen && !isClosing}
          onClose={handleModalClose}
          product={selectedProducts[0]}
          mallType={selectedMall}
          countryCode={selectedCountry}
        />
      )}
    </>
  )
}
