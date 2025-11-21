// app/zaiko/tanaoroshi/components/GroupingBoxSidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import { InventoryProduct } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, XCircle, Package, Layers } from 'lucide-react'

interface GroupingBoxSidebarProps {
  selectedProducts: InventoryProduct[]
  onClearSelection: () => void
  onCreateVariation: () => void
  onCreateBundle: () => void
}

interface CompatibilityCheck {
  isCompatible: boolean
  ddpCostCheck: {
    passed: boolean
    minCost: number
    maxCost: number
    difference: number
    differencePercent: number
  }
  weightCheck: {
    passed: boolean
    minWeight: number
    maxWeight: number
    ratio: number
  }
  categoryCheck: {
    passed: boolean
    categories: string[]
  }
  shippingPolicy: {
    id: string | null
    name: string | null
    score: number | null
  } | null
  warnings: string[]
}

export function GroupingBoxSidebar({
  selectedProducts,
  onClearSelection,
  onCreateVariation,
  onCreateBundle
}: GroupingBoxSidebarProps) {
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(null)
  const [loading, setLoading] = useState(false)

  // 最大DDPコストベースの価格シミュレーション
  const maxDdpCost = selectedProducts.length > 0
    ? Math.max(...selectedProducts.map(p => p.cost_price || 0))
    : 0

  const totalExcessProfit = selectedProducts.reduce((sum, p) => {
    const actualCost = p.cost_price || 0
    return sum + (maxDdpCost - actualCost)
  }, 0)

  // 適合性チェックを実行
  useEffect(() => {
    if (selectedProducts.length < 2) {
      setCompatibility(null)
      return
    }

    checkCompatibility()
  }, [selectedProducts])

  const checkCompatibility = async () => {
    setLoading(true)
    try {
      const costs = selectedProducts.map(p => p.cost_price || 0)
      const weights = selectedProducts
        .map(p => p.source_data?.weight_g || 0)
        .filter(w => w > 0)

      const minCost = Math.min(...costs)
      const maxCost = Math.max(...costs)
      const costDiff = maxCost - minCost
      const costDiffPercent = minCost > 0 ? (costDiff / minCost) * 100 : 0

      const minWeight = weights.length > 0 ? Math.min(...weights) : 0
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
      const weightRatio = minWeight > 0 ? maxWeight / minWeight : 0

      // カテゴリーチェック
      const categories = [
        ...new Set(
          selectedProducts
            .map(p => p.category)
            .filter(Boolean)
        )
      ]

      const ddpCheckPassed = costDiff <= 20 || costDiffPercent <= 10
      const weightCheckPassed = weights.length === 0 || weightRatio <= 1.5
      const categoryCheckPassed = categories.length <= 1

      const warnings: string[] = []
      if (!ddpCheckPassed) {
        warnings.push(`DDPコスト差が大きすぎます（$${costDiff.toFixed(2)}, ${costDiffPercent.toFixed(1)}%）`)
      }
      if (!weightCheckPassed) {
        warnings.push(`重量差が大きすぎます（最大/最小: ${(weightRatio * 100).toFixed(0)}%）`)
      }
      if (!categoryCheckPassed) {
        warnings.push(`複数のカテゴリーが混在しています（${categories.length}件）`)
      }

      // 配送ポリシー推薦を取得
      let shippingPolicy = null
      if (maxWeight > 0) {
        try {
          const response = await fetch('/api/shipping-policies/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              maxWeightKg: maxWeight / 1000,
              maxDdpCostUsd: maxCost,
              minWeightKg: minWeight / 1000,
              minDdpCostUsd: minCost,
              limit: 1
            })
          })

          const data = await response.json()
          if (data.success && data.summary?.bestMatch) {
            shippingPolicy = {
              id: data.summary.bestMatch.id,
              name: data.summary.bestMatch.name,
              score: parseFloat(data.summary.bestMatch.score)
            }
          }
        } catch (error) {
          console.error('配送ポリシー取得エラー:', error)
        }
      }

      setCompatibility({
        isCompatible: ddpCheckPassed && weightCheckPassed && categoryCheckPassed,
        ddpCostCheck: {
          passed: ddpCheckPassed,
          minCost,
          maxCost,
          difference: costDiff,
          differencePercent: costDiffPercent
        },
        weightCheck: {
          passed: weightCheckPassed,
          minWeight,
          maxWeight,
          ratio: weightRatio
        },
        categoryCheck: {
          passed: categoryCheckPassed,
          categories: categories as string[]
        },
        shippingPolicy,
        warnings
      })
    } catch (error) {
      console.error('適合性チェックエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  if (selectedProducts.length === 0) {
    return (
      <div className="w-96 bg-slate-100 p-4 border-l border-slate-200 flex flex-col items-center justify-center text-center">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium mb-2">商品が選択されていません</p>
        <p className="text-sm text-slate-400">
          商品カードのチェックボックスをクリックして選択してください
        </p>
      </div>
    )
  }

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-200 bg-purple-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-purple-900">
            <Layers className="inline w-5 h-5 mr-2" />
            Grouping Box
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-slate-600 hover:text-slate-900"
          >
            クリア
          </Button>
        </div>
        <p className="text-sm text-purple-700">
          {selectedProducts.length}個の商品を選択中
        </p>
      </div>

      {/* 適合性チェック結果 */}
      {selectedProducts.length >= 2 && compatibility && (
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            {compatibility.isCompatible ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700">バリエーション作成可能</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-700">バリエーション作成不可</span>
              </>
            )}
          </div>

          {/* DDPコストチェック */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              {compatibility.ddpCostCheck.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">DDPコスト近接</span>
            </div>
            <div className="text-xs text-slate-600 ml-6">
              範囲: ${compatibility.ddpCostCheck.minCost.toFixed(2)} - ${compatibility.ddpCostCheck.maxCost.toFixed(2)}
              <br />
              差額: ${compatibility.ddpCostCheck.difference.toFixed(2)} ({compatibility.ddpCostCheck.differencePercent.toFixed(1)}%)
            </div>
          </div>

          {/* 重量チェック */}
          {compatibility.weightCheck.maxWeight > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                {compatibility.weightCheck.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm font-medium">重量許容範囲</span>
              </div>
              <div className="text-xs text-slate-600 ml-6">
                範囲: {compatibility.weightCheck.minWeight}g - {compatibility.weightCheck.maxWeight}g
                <br />
                比率: {(compatibility.weightCheck.ratio * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {/* カテゴリーチェック */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              {compatibility.categoryCheck.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">カテゴリー一致</span>
            </div>
            <div className="text-xs text-slate-600 ml-6">
              {compatibility.categoryCheck.categories.length > 0
                ? compatibility.categoryCheck.categories.join(', ')
                : '未設定'}
            </div>
          </div>

          {/* 警告 */}
          {compatibility.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3">
              {compatibility.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-yellow-800 mb-1 last:mb-0">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* 配送ポリシー推薦 */}
          {compatibility.shippingPolicy && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
              <div className="text-xs font-semibold text-blue-900 mb-1">
                推薦配送ポリシー
              </div>
              <div className="text-xs text-blue-700">
                {compatibility.shippingPolicy.name}
                <br />
                スコア: {compatibility.shippingPolicy.score?.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 価格シミュレーション（最大DDPコストベース） */}
      {selectedProducts.length >= 2 && (
        <div className="p-4 border-b border-slate-200 bg-green-50">
          <h4 className="font-semibold text-green-900 mb-3">💰 価格シミュレーション</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-800">統一 Item Price:</span>
              <span className="text-lg font-bold text-green-600">
                ${maxDdpCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-800">追加利益合計:</span>
              <span className="text-md font-semibold text-green-600">
                +${totalExcessProfit.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-green-700 mt-2">
              ※ 最大DDPコスト戦略により、構造的に赤字リスクはゼロです
            </p>
          </div>
        </div>
      )}

      {/* 選択商品リスト */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="font-semibold text-slate-900 mb-3">選択中の商品</h4>
        <div className="space-y-2">
          {selectedProducts.map(product => {
            const cost = product.cost_price || 0
            const excessProfit = maxDdpCost - cost

            return (
              <div
                key={product.id}
                className="bg-slate-50 rounded-lg p-3 border border-slate-200"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=No+Image'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {product.product_name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {product.sku || 'SKU未設定'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        ${cost.toFixed(2)}
                      </Badge>
                      {selectedProducts.length >= 2 && excessProfit > 0 && (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          +${excessProfit.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <Button
          onClick={onCreateVariation}
          disabled={!compatibility?.isCompatible || selectedProducts.length < 2}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300"
        >
          <Layers className="w-4 h-4 mr-2" />
          バリエーション作成（eBay）
        </Button>
        <Button
          onClick={onCreateBundle}
          disabled={selectedProducts.length < 1}
          variant="outline"
          className="w-full border-green-300 text-green-700 hover:bg-green-50"
        >
          <Package className="w-4 h-4 mr-2" />
          セット品作成（全モール）
        </Button>
        <p className="text-xs text-slate-500 text-center mt-2">
          {selectedProducts.length < 2
            ? '2個以上の商品を選択してください'
            : compatibility?.isCompatible
            ? 'バリエーション作成の準備完了'
            : '条件を満たしていません'}
        </p>
      </div>
    </div>
  )
}
