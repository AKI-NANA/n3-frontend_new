'use client'

import { useState } from 'react'
import styles from '../../FullFeaturedModal.module.css'
import { MarketResearchTab } from '@/app/tools/editing/components/MarketResearchTab'
import { PricingStrategyModal } from '@/app/tools/editing/components/PricingStrategyModal'

interface TabMarketResearchProps {
  product: any
  marketplace?: string
  marketplaceName?: string
}

export function TabMarketResearch({ product, marketplace, marketplaceName }: TabMarketResearchProps) {
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null)

  const handlePriceSelect = async (strategy: any) => {
    console.log('選択された価格戦略:', strategy)
    setSelectedStrategy(strategy)

    // TODO: 価格をDBに保存
    try {
      const response = await fetch(`/api/products/${product.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_usd: strategy.price,
          pricing_strategy: strategy.name,
          profit_margin: strategy.profitMargin,
          profit_amount_usd: strategy.profitAmount
        })
      })

      if (response.ok) {
        alert('価格を更新しました！')
      }
    } catch (error) {
      console.error('価格更新エラー:', error)
      alert('価格の更新に失敗しました')
    }
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
          📊 市場調査・価格戦略
        </h3>
        <button
          onClick={() => setShowPricingModal(true)}
          className={`${styles.btn} ${styles.btnPrimary}`}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
          }}
        >
          <i className="fas fa-calculator" style={{ marginRight: '0.5rem' }}></i>
          価格戦略を選択
        </button>
      </div>

      {/* 選択された価格戦略の表示 */}
      {selectedStrategy && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea15, #764ba215)',
          border: '2px solid #667eea',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                ✅ 選択中の価格戦略
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {selectedStrategy.name === 'default' && 'デフォルト価格'}
                {selectedStrategy.name === 'lowest' && '競合最安値'}
                {selectedStrategy.name === 'median' && '中央値'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#667eea' }}>
                ${selectedStrategy.price.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                利益率: {selectedStrategy.profitMargin.toFixed(1)}% | 
                利益額: ${selectedStrategy.profitAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 市場調査データ表示 */}
      <MarketResearchTab product={product} />

      {/* 価格選択モーダル */}
      <PricingStrategyModal
        product={product}
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSelect={handlePriceSelect}
      />
    </div>
  )
}
