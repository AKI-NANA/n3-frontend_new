// app/tools/editing/components/PricingStrategyModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Product } from '../types/product'

interface PricingStrategy {
  name: string
  price: number
  profitMargin: number
  profitAmount: number
  description: string
}

interface PricingStrategyModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onSelect: (strategy: PricingStrategy) => void
}

export function PricingStrategyModal({
  product,
  isOpen,
  onClose,
  onSelect
}: PricingStrategyModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('default')
  const [strategies, setStrategies] = useState<PricingStrategy[]>([])

  useEffect(() => {
    if (isOpen && product) {
      calculateStrategies()
    }
  }, [isOpen, product])

  const calculateStrategies = () => {
    // 🔥 デフォルト価格戦略
    const defaultStrategy: PricingStrategy = {
      name: 'default',
      price: product.ddp_price_usd || 0,
      profitMargin: product.default_profit_margin || 0,
      profitAmount: product.default_profit_amount_usd || 0,
      description: 'システム推奨の価格設定（目標利益率15%）'
    }

    // 🔥 競合最安値戦略
    const lowestPrice = product.sm_lowest_price || 0
    const lowestStrategy: PricingStrategy = {
      name: 'lowest',
      price: lowestPrice,
      profitMargin: calculateProfit(lowestPrice).margin,
      profitAmount: calculateProfit(lowestPrice).amount,
      description: '競合の最安値で出品（価格競争力重視）'
    }

    // 🔥 中央値戦略
    const medianPrice = product.sm_median_price_usd || 0
    const medianStrategy: PricingStrategy = {
      name: 'median',
      price: medianPrice,
      profitMargin: calculateProfit(medianPrice).margin,
      profitAmount: calculateProfit(medianPrice).amount,
      description: '競合の中央値で出品（バランス重視）'
    }

    setStrategies([defaultStrategy, lowestStrategy, medianStrategy])
  }

  // 🔥 利益計算（簡易版）
  const calculateProfit = (sellingPrice: number) => {
    const costJPY = product.price_jpy || 0
    const weightKg = (product.listing_data?.weight_g || 500) / 1000
    const exchangeRate = 150

    // コスト計算
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

  const handleSelect = () => {
    const strategy = strategies.find(s => s.name === selectedStrategy)
    if (strategy) {
      onSelect(strategy)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            価格戦略を選択
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {product.title || '商品'}
          </p>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4 space-y-4">
          {strategies.map((strategy) => (
            <button
              key={strategy.name}
              onClick={() => setSelectedStrategy(strategy.name)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedStrategy === strategy.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedStrategy === strategy.name}
                      onChange={() => setSelectedStrategy(strategy.name)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="font-medium text-gray-900">
                      {strategy.name === 'default' && 'デフォルト価格'}
                      {strategy.name === 'lowest' && '競合最安値'}
                      {strategy.name === 'median' && '中央値'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-6">
                    {strategy.description}
                  </p>
                </div>

                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ${strategy.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    利益率: <span className={strategy.profitMargin >= 15 ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                      {strategy.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    利益額: <span className="font-medium">
                      ${strategy.profitAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 詳細情報 */}
              {selectedStrategy === strategy.name && (
                <div className="mt-3 pt-3 border-t border-gray-200 ml-6 text-sm text-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div>仕入れ: ¥{product.price_jpy?.toLocaleString() || 0}</div>
                    <div>為替レート: 150円/USD</div>
                    <div>送料: ${calculateProfit(strategy.price).amount >= 0 ? '12.99-24.99' : '-'}</div>
                    <div>手数料: ~{(strategy.price * 0.1515).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </button>
          ))}

          {/* 競合情報 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">📊 競合データ</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">競合数</div>
                <div className="font-medium">{product.sm_competitor_count || 0}件</div>
              </div>
              <div>
                <div className="text-gray-600">日本人セラー</div>
                <div className="font-medium">{product.sm_jp_seller_count || 0}件</div>
              </div>
              <div>
                <div className="text-gray-600">最安-中央値</div>
                <div className="font-medium">
                  ${product.sm_lowest_price?.toFixed(2) || 0} - ${product.sm_median_price_usd?.toFixed(2) || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSelect}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            この価格を適用
          </button>
        </div>
      </div>
    </div>
  )
}
