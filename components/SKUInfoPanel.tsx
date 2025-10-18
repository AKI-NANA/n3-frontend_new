// components/SKUInfoPanel.tsx
'use client'

import { useState } from 'react'

interface SKUInfo {
  sku: string
  masterKey: string
  skuStore: string
  skuYear: string
  skuId: string
  skuChecksum: string
  mkStockType: string
  mkSupplier: string
  mkCategory: string
  mkCondition: string
  mkYearMonth: string
  mkMarketplace: string
  mkShipFrom: string
  mkWeight: string
  mkPrice: string
}

export function SKUInfoPanel({ skuInfo }: { skuInfo: SKUInfo }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div style={{
      border: '2px solid #e3e8ef',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      backgroundColor: '#f8f9fa'
    }}>
      {/* 公開SKU */}
      <div style={{ marginBottom: '1rem' }}>
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
            競合対策
          </span>
        </div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          color: '#212529',
          letterSpacing: '2px'
        }}>
          {skuInfo.sku}
        </div>
        
        {/* SKU解説 */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
            <strong>構造:</strong>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <div>
              <div style={{ 
                fontWeight: 700, 
                color: '#007bff',
                fontFamily: 'monospace',
                fontSize: '1.1rem'
              }}>
                {skuInfo.skuStore}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>ストア</div>
            </div>
            <div>
              <div style={{ 
                fontWeight: 700, 
                color: '#28a745',
                fontFamily: 'monospace',
                fontSize: '1.1rem'
              }}>
                {skuInfo.skuYear}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>年コード</div>
            </div>
            <div>
              <div style={{ 
                fontWeight: 700, 
                color: '#ffc107',
                fontFamily: 'monospace',
                fontSize: '1.1rem'
              }}>
                {skuInfo.skuId}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>ID(36進数)</div>
            </div>
            <div>
              <div style={{ 
                fontWeight: 700, 
                color: '#6c757d',
                fontFamily: 'monospace',
                fontSize: '1.1rem'
              }}>
                {skuInfo.skuChecksum}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>チェック</div>
            </div>
          </div>
        </div>
      </div>

      {/* トグルボタン */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          width: '100%',
          padding: '0.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: showDetails ? '1rem' : 0
        }}
      >
        {showDetails ? '▼ 内部情報を隠す' : '▶ 内部情報を表示（管理者のみ）'}
      </button>

      {/* Master Key（詳細情報） */}
      {showDetails && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '6px',
          padding: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              color: '#856404',
              textTransform: 'uppercase'
            }}>
              Master Key（内部管理用・非公開）
            </span>
            <span style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.4rem',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              社外秘
            </span>
          </div>
          
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'monospace',
            color: '#856404',
            wordBreak: 'break-all',
            marginBottom: '1rem'
          }}>
            {skuInfo.masterKey}
          </div>

          {/* 詳細解説 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            fontSize: '0.85rem'
          }}>
            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                在庫区分
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkStockType === 'ST' ? '✓ 有在庫' : '⚠ 無在庫'}
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                仕入先
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkSupplier === 'YAH' ? 'Yahoo Auction' : 
                 skuInfo.mkSupplier === 'AMZ' ? 'Amazon' :
                 skuInfo.mkSupplier === 'RAK' ? '楽天' : skuInfo.mkSupplier}
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                カテゴリ
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkCategory}
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                商品状態
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkCondition === 'N' ? '新品' :
                 skuInfo.mkCondition === 'U' ? '中古' :
                 skuInfo.mkCondition === 'E' ? '美品' : skuInfo.mkCondition}
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                販路
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkMarketplace === 'EBY' ? 'eBay' :
                 skuInfo.mkMarketplace === 'SHP' ? 'Shopee' : skuInfo.mkMarketplace}
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                発送国
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkShipFrom === 'JP' ? '🇯🇵 日本' :
                 skuInfo.mkShipFrom === 'US' ? '🇺🇸 アメリカ' :
                 skuInfo.mkShipFrom === 'CN' ? '🇨🇳 中国' : skuInfo.mkShipFrom}
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                重量帯
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                {skuInfo.mkWeight}g
              </div>
            </div>

            <div style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>
                登録年月
              </div>
              <div style={{ fontSize: '0.95rem', color: '#212529' }}>
                20{skuInfo.mkYearMonth.substring(0, 2)}/{skuInfo.mkYearMonth.substring(2, 4)}
              </div>
            </div>
          </div>

          {/* 警告 */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fff',
            border: '1px solid #dc3545',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: '#721c24'
          }}>
            <strong>⚠️ 重要:</strong> この情報は社外秘です。競合や顧客に絶対に見せないでください。
          </div>
        </div>
      )}
    </div>
  )
}
