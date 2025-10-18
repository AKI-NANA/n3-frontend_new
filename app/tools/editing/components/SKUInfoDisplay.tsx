// app/tools/editing/components/SKUInfoDisplay.tsx
'use client'

import { useState } from 'react'
import type { Product } from '../types/product'

interface SKUInfoDisplayProps {
  product: Product | null
}

export function SKUInfoDisplay({ product }: SKUInfoDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!product) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6c757d',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        商品を選択してください
      </div>
    )
  }

  // SKU解析
  const sku = product.sku || ''
  const masterKey = product.master_key || ''

  const skuParts = {
    store: sku.substring(0, 1),
    year: sku.substring(1, 2),
    id: sku.substring(2, 4),
    checksum: sku.substring(4, 5)
  }

  const mkParts = masterKey.split('-')
  const masterKeyInfo = {
    stockType: mkParts[0] || '',
    supplier: mkParts[1] || '',
    category: mkParts[2] || '',
    condition: mkParts[3] || '',
    id: mkParts[4] || '',
    yearMonth: mkParts[5] || '',
    marketplace: mkParts[6] || '',
    shipFrom: mkParts[7] || '',
    weight: mkParts[8] || '',
    price: mkParts[9] || ''
  }

  return (
    <div style={{
      border: '2px solid #e3e8ef',
      borderRadius: '8px',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{
        margin: '0 0 1rem 0',
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#212529'
      }}>
        SKU情報 - {product.english_title || product.title}
      </h3>

      {/* 公開SKU */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            color: '#6c757d',
            textTransform: 'uppercase'
          }}>
            公開用SKU（eBay/Shopee表示用）
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.15rem 0.4rem',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '4px',
            fontWeight: 600
          }}>
            競合対策OK
          </span>
        </div>
        
        <div style={{
          fontSize: '2rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          color: '#212529',
          letterSpacing: '3px',
          marginBottom: '1rem'
        }}>
          {sku}
        </div>

        {/* SKU構造 */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.75rem', fontWeight: 600 }}>
            SKU構造の説明:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#007bff',
                fontFamily: 'monospace',
                marginBottom: '0.25rem'
              }}>
                {skuParts.store}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>ストアコード</div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>N3 = "N"</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#28a745',
                fontFamily: 'monospace',
                marginBottom: '0.25rem'
              }}>
                {skuParts.year}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>年コード</div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>2025=H</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#ffc107',
                fontFamily: 'monospace',
                marginBottom: '0.25rem'
              }}>
                {skuParts.id}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>商品ID</div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>36進数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#6c757d',
                fontFamily: 'monospace',
                marginBottom: '0.25rem'
              }}>
                {skuParts.checksum}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>チェックサム</div>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>検証用</div>
            </div>
          </div>
        </div>
      </div>

      {/* トグルボタン */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: showDetails ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          marginBottom: showDetails ? '1.5rem' : 0
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        {showDetails ? '▼ 内部管理情報を隠す' : '▶ 内部管理情報を表示（社外秘）'}
      </button>

      {/* Master Key詳細 */}
      {showDetails && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              color: '#856404',
              textTransform: 'uppercase'
            }}>
              Master Key（内部管理用）
            </span>
            <span style={{
              fontSize: '0.7rem',
              padding: '0.2rem 0.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              ⚠️ 社外秘
            </span>
          </div>
          
          <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            fontFamily: 'monospace',
            color: '#856404',
            wordBreak: 'break-all',
            marginBottom: '1.5rem',
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #ffc107'
          }}>
            {masterKey}
          </div>

          {/* 詳細情報グリッド */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            fontSize: '0.85rem'
          }}>
            {[
              { label: '在庫区分', value: masterKeyInfo.stockType === 'ST' ? '✓ 有在庫' : '⚠ 無在庫', color: masterKeyInfo.stockType === 'ST' ? '#28a745' : '#ffc107' },
              { label: '仕入先', value: masterKeyInfo.supplier === 'YAH' ? 'Yahoo Auction' : masterKeyInfo.supplier, color: '#007bff' },
              { label: 'カテゴリ', value: masterKeyInfo.category, color: '#6610f2' },
              { label: '商品状態', value: 
                  masterKeyInfo.condition === 'N' ? '新品' :
                  masterKeyInfo.condition === 'U' ? '中古' :
                  masterKeyInfo.condition === 'E' ? '美品' :
                  masterKeyInfo.condition === 'L' ? '新品同様' : masterKeyInfo.condition,
                color: masterKeyInfo.condition === 'N' ? '#28a745' : '#6c757d'
              },
              { label: '販路', value: masterKeyInfo.marketplace === 'EBY' ? 'eBay' : masterKeyInfo.marketplace, color: '#e83e8c' },
              { label: '発送国', value: masterKeyInfo.shipFrom === 'JP' ? '🇯🇵 日本' : masterKeyInfo.shipFrom, color: '#fd7e14' },
              { label: '重量帯', value: `${masterKeyInfo.weight}g`, color: '#20c997' },
              { label: '登録年月', value: `20${masterKeyInfo.yearMonth.substring(0,2)}/${masterKeyInfo.yearMonth.substring(2,4)}`, color: '#6c757d' }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #ffc107'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: '#856404', 
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem'
                }}>
                  {item.label}
                </div>
                <div style={{ 
                  fontSize: '1rem', 
                  color: item.color,
                  fontWeight: 600
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* 警告メッセージ */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fff',
            border: '2px solid #dc3545',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#721c24'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <span>重要：情報管理について</span>
            </div>
            <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0, lineHeight: '1.6' }}>
              <li>この情報は<strong>社外秘</strong>です</li>
              <li>競合や顧客に<strong>絶対に見せないでください</strong></li>
              <li>仕入先情報の漏洩は事業に深刻な影響を与えます</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
