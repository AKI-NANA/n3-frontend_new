// /app/api/products/find-parent-candidates/route.ts
/**
 * 既存親SKU候補検索API
 *
 * 選択された商品と互換性のある既存のバリエーション親SKUを検索し、
 * 追加時の影響をシミュレーションします。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 検証定数
const MAX_DDP_COST_DIFFERENCE_USD = 20
const MAX_DDP_COST_DIFFERENCE_PERCENT = 0.10
const MAX_WEIGHT_RATIO = 1.5

interface ParentCandidate {
  parent_sku: string
  parent_id: string
  current_variation_count: number
  current_max_ddp_cost: number
  current_unified_price: number
  new_max_ddp_cost: number
  new_unified_price: number
  price_change: number
  price_change_percent: number
  compatibility_score: number
  compatibility_issues: string[]
  category_id: string | null
  variation_attributes: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selectedItems } = body as {
      selectedItems: Array<{
        id: string
        sku: string
        ddp_cost_usd: number
        weight_g?: number
        category_id?: string
      }>
    }

    if (!selectedItems || selectedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: '商品が選択されていません' },
        { status: 400 }
      )
    }

    console.log('🔍 既存親SKU候補を検索中...', {
      selectedItemCount: selectedItems.length
    })

    // 選択商品の特性を計算
    const selectedDdpCosts = selectedItems.map(item => item.ddp_cost_usd)
    const selectedWeights = selectedItems
      .map(item => item.weight_g || 0)
      .filter(w => w > 0)
    const selectedCategories = [
      ...new Set(selectedItems.map(item => item.category_id).filter(Boolean))
    ]

    const selectedMinDdp = Math.min(...selectedDdpCosts)
    const selectedMaxDdp = Math.max(...selectedDdpCosts)
    const selectedMinWeight = selectedWeights.length > 0 ? Math.min(...selectedWeights) : 0
    const selectedMaxWeight = selectedWeights.length > 0 ? Math.max(...selectedWeights) : 0

    // 既存の親SKUを検索（variation_type = 'Parent'）
    const { data: parentSkus, error: parentError } = await supabase
      .from('products_master')
      .select('*')
      .eq('variation_type', 'Parent')
      .order('created_at', { ascending: false })

    if (parentError) {
      console.error('❌ 親SKU取得エラー:', parentError)
      return NextResponse.json(
        { success: false, error: `親SKU取得に失敗: ${parentError.message}` },
        { status: 500 }
      )
    }

    if (!parentSkus || parentSkus.length === 0) {
      return NextResponse.json({
        success: true,
        message: '既存の親SKUが見つかりませんでした',
        candidates: []
      })
    }

    console.log(`📦 ${parentSkus.length}件の親SKUを検出`)

    // 各親SKUの子SKUを取得し、互換性を評価
    const candidates: ParentCandidate[] = []

    for (const parent of parentSkus) {
      // 子SKUを取得
      const { data: children, error: childError } = await supabase
        .from('products_master')
        .select('*')
        .eq('parent_sku_id', parent.sku)
        .eq('variation_type', 'Child')

      if (childError || !children || children.length === 0) {
        continue
      }

      // 既存の子SKUの特性を計算
      const existingDdpCosts = children.map(child => child.ddp_cost_usd || 0)
      const existingWeights = children
        .map(child => child.listing_data?.weight_g || 0)
        .filter(w => w > 0)
      const existingCategories = [
        ...new Set(children.map(child => child.category_id).filter(Boolean))
      ]

      const existingMinDdp = Math.min(...existingDdpCosts)
      const existingMaxDdp = Math.max(...existingDdpCosts)
      const existingMinWeight = existingWeights.length > 0 ? Math.min(...existingWeights) : 0
      const existingMaxWeight = existingWeights.length > 0 ? Math.max(...existingWeights) : 0

      // 統合後の特性を計算
      const combinedMinDdp = Math.min(existingMinDdp, selectedMinDdp)
      const combinedMaxDdp = Math.max(existingMaxDdp, selectedMaxDdp)
      const combinedMinWeight = Math.min(
        existingMinWeight || Infinity,
        selectedMinWeight || Infinity
      )
      const combinedMaxWeight = Math.max(existingMaxWeight, selectedMaxWeight)

      // 互換性チェック
      const issues: string[] = []
      let compatibilityScore = 100

      // 1. カテゴリーID一致チェック
      if (selectedCategories.length > 0 && existingCategories.length > 0) {
        const hasMatchingCategory = selectedCategories.some(cat =>
          existingCategories.includes(cat)
        )
        if (!hasMatchingCategory) {
          issues.push('カテゴリーIDが一致しません')
          compatibilityScore -= 50
        }
      }

      // 2. DDPコスト近接チェック
      const ddpDiff = combinedMaxDdp - combinedMinDdp
      const ddpDiffPercent = combinedMinDdp > 0 ? (ddpDiff / combinedMinDdp) : 0

      if (ddpDiff > MAX_DDP_COST_DIFFERENCE_USD && ddpDiffPercent > MAX_DDP_COST_DIFFERENCE_PERCENT) {
        issues.push(`DDPコスト差が大きすぎます（$${ddpDiff.toFixed(2)}, ${(ddpDiffPercent * 100).toFixed(1)}%）`)
        compatibilityScore -= 30
      } else if (ddpDiff > MAX_DDP_COST_DIFFERENCE_USD || ddpDiffPercent > MAX_DDP_COST_DIFFERENCE_PERCENT) {
        issues.push('DDPコスト差がやや大きいです')
        compatibilityScore -= 15
      }

      // 3. 重量比チェック
      if (combinedMinWeight > 0 && combinedMaxWeight > 0) {
        const weightRatio = combinedMaxWeight / combinedMinWeight
        if (weightRatio > MAX_WEIGHT_RATIO) {
          issues.push(`重量差が大きすぎます（${(weightRatio * 100).toFixed(0)}%）`)
          compatibilityScore -= 20
        }
      }

      // 4. 価格変更の影響を計算
      const currentMaxDdp = parent.listing_data?.max_ddp_cost_usd || existingMaxDdp
      const newMaxDdp = combinedMaxDdp
      const priceChange = newMaxDdp - currentMaxDdp
      const priceChangePercent = currentMaxDdp > 0 ? (priceChange / currentMaxDdp) : 0

      // 大幅な価格上昇がある場合は警告
      if (priceChange > 10) {
        issues.push(`統一価格が$${priceChange.toFixed(2)}上昇します`)
        compatibilityScore -= 10
      }

      // 互換性スコアが正の場合のみ候補に追加
      if (compatibilityScore > 0) {
        candidates.push({
          parent_sku: parent.sku,
          parent_id: parent.id,
          current_variation_count: children.length,
          current_max_ddp_cost: currentMaxDdp,
          current_unified_price: currentMaxDdp,
          new_max_ddp_cost: newMaxDdp,
          new_unified_price: newMaxDdp,
          price_change: priceChange,
          price_change_percent: priceChangePercent,
          compatibility_score: compatibilityScore,
          compatibility_issues: issues,
          category_id: parent.category_id || null,
          variation_attributes: parent.listing_data?.variation_attributes || []
        })
      }
    }

    // スコア順にソート
    candidates.sort((a, b) => b.compatibility_score - a.compatibility_score)

    console.log(`✅ ${candidates.length}件の候補を発見`)

    return NextResponse.json({
      success: true,
      message: `${candidates.length}件の既存親SKU候補が見つかりました`,
      candidates: candidates.slice(0, 10), // 上位10件のみ返す
      search_criteria: {
        selected_items: selectedItems.length,
        ddp_range: `$${selectedMinDdp.toFixed(2)} - $${selectedMaxDdp.toFixed(2)}`,
        weight_range: selectedWeights.length > 0
          ? `${selectedMinWeight}g - ${selectedMaxWeight}g`
          : '不明'
      }
    })

  } catch (error: any) {
    console.error('❌ 既存親SKU候補検索エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '既存親SKU候補の検索中にエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}
