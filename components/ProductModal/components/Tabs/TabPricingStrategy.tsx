'use client'

import { useState, useEffect } from 'react'

interface TabPricingStrategyProps {
  product: any
  marketplace?: string
  marketplaceName?: string
}

interface PricingStrategy {
  name: string
  label: string
  price: number
  profitMargin: number
  profitAmount: number
  description: string
  recommended?: boolean
}

export function TabPricingStrategy({ product, marketplace, marketplaceName }: TabPricingStrategyProps) {
  const [strategies, setStrategies] = useState<PricingStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // 🚾 デバッグ: productオブジェクト全体を確認
  console.log('🚾 TabPricingStrategy - Received product:', product)
  console.log('🚾 Product keys:', product ? Object.keys(product).filter(k => k.includes('profit')) : 'product is null')
  console.log('🚾 Direct access:', {
    profit_margin_percent: product?.profit_margin_percent,
    type: typeof product?.profit_margin_percent
  })

  // Browse APIの結果データ
  const browseResult = product?.ebay_api_data?.browse_result
  const browseItems = browseResult?.items || []

  // 🔥 中央値を計算
  const calculateMedianPrice = () => {
    const prices = browseItems
      .map((item: any) => parseFloat(item.price?.value || '0'))
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b)
    
    if (prices.length === 0) return 0
    const mid = Math.floor(prices.length / 2)
    return prices.length % 2 === 0
      ? (prices[mid - 1] + prices[mid]) / 2
      : prices[mid]
  }

  // 競合データ
  const smLowestPrice = product?.sm_lowest_price || 0
  const smAveragePrice = product?.sm_average_price || 0
  const smMedianPrice = product?.sm_median_price_usd || calculateMedianPrice()
  
  // 🔥 正しいDDP価格を取得（listing_data.ddp_price_usdを優先）
  const ddpPriceFromListing = parseFloat(product?.listing_data?.ddp_price_usd) || 0
  const ddpPrice = ddpPriceFromListing || product?.price_usd || product?.ddp_price_usd || 0
  
  console.log('[TabPricingStrategy] 💰 Price sources:', {
    listing_ddp: product?.listing_data?.ddp_price_usd,
    price_usd: product?.price_usd,
    ddp_price_usd: product?.ddp_price_usd,
    selected_ddpPrice: ddpPrice
  })
  
  // 🔥 デフォルト利益データ（profit_marginフィールドを完全に無視）
  console.log('[TabPricingStrategy] 🚾 RAW profit_margin_percent:', product?.profit_margin_percent, typeof product?.profit_margin_percent)
  console.log('[TabPricingStrategy] 🚾 RAW profit_amount_usd:', product?.profit_amount_usd, typeof product?.profit_amount_usd)
  
  // 🔥 WORKAROUND: profit_margin_percentがない場場合、listing_dataから取得
  const profitMarginFromListing = parseFloat(product?.listing_data?.profit_margin_percent) || 0
  const defaultProfitMargin = parseFloat(product?.profit_margin_percent) || profitMarginFromListing || 0
  const defaultProfitAmount = parseFloat(product?.profit_amount_usd) || 0
  
  console.log('[TabPricingStrategy] 🚾 listing_data.profit_margin_percent:', product?.listing_data?.profit_margin_percent)
  console.log('[TabPricingStrategy] 🚾 PARSED defaultProfitMargin:', defaultProfitMargin)
  console.log('[TabPricingStrategy] 🚾 PARSED defaultProfitAmount:', defaultProfitAmount)

  useEffect(() => {
    console.log('💰 TabPricingStrategy - データ確認:', {
      ddpPrice,
      smLowestPrice,
      smAveragePrice,
      smMedianPrice,
      defaultProfitMargin,
      defaultProfitAmount,
      product_price_usd: product?.price_usd,
      product_profit_margin_percent: product?.profit_margin_percent,
      product_profit_amount_usd: product?.profit_amount_usd
    })
    calculateStrategies()
  }, [product])

  const calculateStrategies = () => {
    const strategies: PricingStrategy[] = []

    // 🔥 デフォルト価格戦略（必ず追加）
    strategies.push({
      name: 'default',
      label: 'デフォルト計算',
      price: ddpPrice || smAveragePrice || smLowestPrice || 0,
      profitMargin: defaultProfitMargin,
      profitAmount: defaultProfitAmount,
      description: 'システム推奨の価格設定（目標利益率15%）',
      recommended: true
    })

    // 🔥 競合最安値戦略
    if (smLowestPrice > 0) {
      const profit = calculateProfit(smLowestPrice)
      strategies.push({
        name: 'lowest',
        label: '競合最安値',
        price: smLowestPrice,
        profitMargin: profit.margin,
        profitAmount: profit.amount,
        description: '競合の最安値で出品（価格競争力重視）'
      })
    }

    // 🔥 中央値戦略
    if (smMedianPrice > 0) {
      const profit = calculateProfit(smMedianPrice)
      strategies.push({
        name: 'median',
        label: '中央値',
        price: smMedianPrice,
        profitMargin: profit.margin,
        profitAmount: profit.amount,
        description: '競合の中央値で出品（安定重視）'
      })
    }

    // 🔥 平均価格戦略
    if (smAveragePrice > 0) {
      const profit = calculateProfit(smAveragePrice)
      strategies.push({
        name: 'average',
        label: '平均価格',
        price: smAveragePrice,
        profitMargin: profit.margin,
        profitAmount: profit.amount,
        description: '競合の平均価格で出品'
      })
    }

    // 🔥 最安+10%戦略
    if (smLowestPrice > 0) {
      const lowestPlus10 = smLowestPrice * 1.1
      const profit = calculateProfit(lowestPlus10)
      strategies.push({
        name: 'lowest_plus',
        label: '最安+10%',
        price: lowestPlus10,
        profitMargin: profit.margin,
        profitAmount: profit.amount,
        description: '最安値より少し高め（利益と競争力のバランス）'
      })
    }

    setStrategies(strategies)

    // 既存の選択を復元
    if (product?.selected_pricing_strategy) {
      setSelectedStrategy(product.selected_pricing_strategy)
    } else {
      setSelectedStrategy('default')
    }
  }

  // 🔥 利益計算
  const calculateProfit = (sellingPrice: number) => {
    const costJPY = product?.price_jpy || product?.current_price || 0
    const weightKg = (product?.listing_data?.weight_g || 500) / 1000
    const exchangeRate = 150

    const costUSD = costJPY / exchangeRate
    const shippingCost = weightKg <= 1 ? 12.99 : weightKg <= 2 ? 18.99 : 24.99
    const ebayFee = sellingPrice * 0.1515
    const paypalFee = sellingPrice * 0.0349 + 0.49

    const totalCost = costUSD + shippingCost + ebayFee + paypalFee
    const profit = sellingPrice - totalCost
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0

    return {
      amount: parseFloat(profit.toFixed(2)),
      margin: parseFloat(margin.toFixed(2))
    }
  }

  // 🔥 価格戦略を選択
  const handleSelectStrategy = async (strategy: PricingStrategy) => {
    setSelectedStrategy(strategy.name)
    setIsUpdating(true)

    try {
      const response = await fetch(`/api/products/${product.id}/pricing-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: strategy.name,
          price: strategy.price,
          profitMargin: strategy.profitMargin,
          profitAmount: strategy.profitAmount
        })
      })

      if (response.ok) {
        console.log('✅ 価格戦略を更新しました:', strategy)
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('❌ 価格戦略更新エラー:', error)
        alert(`価格戦略の更新に失敗しました: ${error.error}`)
      }
    } catch (error) {
      console.error('❌ エラー:', error)
      alert('価格戦略の更新中にエラーが発生しました')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e0e0e0' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>💰 価格戦略を選択</h3>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
          競合データを元に最適な価格戦略を選択してください
        </p>
      </div>

      {/* 競合データサマリー（横並び・コンパクト） */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)',
        border: '2px solid #4caf50',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#2e7d32' }}>
          📊 競合データ
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', fontSize: '0.75rem' }}>
          <div>
            <div style={{ color: '#666', marginBottom: '0.15rem' }}>競合数</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2e7d32' }}>
              {product?.sm_competitor_count || 0}件
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: '0.15rem' }}>日本人セラー</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1976d2' }}>
              {product?.sm_jp_seller_count || 0}件
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: '0.15rem' }}>最安値</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff5722' }}>
              ${smLowestPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: '0.15rem' }}>中央値</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#9c27b0' }}>
              ${smMedianPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: '0.15rem' }}>平均価格</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              ${smAveragePrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 価格戦略カード（横並び・スクロール可能） */}
      <div style={{ 
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: '0.5rem'
      }}>
        {strategies.map((strategy) => {
          const isSelected = selectedStrategy === strategy.name
          const isRecommended = strategy.recommended

          return (
            <div
              key={strategy.name}
              style={{
                minWidth: '280px',
                maxWidth: '320px',
                padding: '1rem',
                border: `2px solid ${isSelected ? '#4caf50' : (isRecommended ? '#1976d2' : '#e0e0e0')}`,
                borderRadius: '8px',
                background: isSelected ? '#f1f8f4' : (isRecommended ? '#e3f2fd' : 'white'),
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                opacity: isUpdating ? 0.6 : 1,
                height: 'fit-content'
              }}
              onClick={() => !isUpdating && handleSelectStrategy(strategy)}
            >
              {/* バッジ */}
              {(isRecommended || isSelected) && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '8px',
                  background: isSelected ? '#4caf50' : '#1976d2',
                  color: 'white',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '8px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  {isSelected ? '✓ 使用中' : '★ おすすめ'}
                </div>
              )}

              {/* 戦略名 */}
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                {strategy.label}
              </div>

              {/* 価格（大きく表示） */}
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                color: isSelected ? '#4caf50' : '#1976d2',
                marginBottom: '0.5rem'
              }}>
                ${strategy.price.toFixed(2)}
              </div>

              {/* 利益データ（横並び） */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '0.5rem',
                marginBottom: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#666' }}>利益率</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: strategy.profitMargin >= 10 ? '#4caf50' : strategy.profitMargin > 0 ? '#ff9800' : '#f44336'
                  }}>
                    {strategy.profitMargin.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#666' }}>利益額</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: strategy.profitAmount >= 0 ? '#4caf50' : '#f44336'
                  }}>
                    ${strategy.profitAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* 説明 */}
              <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem' }}>
                {strategy.description}
              </div>

              {/* ボタン */}
              <button
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: isSelected ? '#4caf50' : '#e0e0e0',
                  color: isSelected ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                disabled={isUpdating}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectStrategy(strategy)
                }}
              >
                {isUpdating ? '更新中...' : isSelected ? '✓ 使用中' : 'この価格を使用'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
