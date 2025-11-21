// /app/api/products/create-variation/route.ts
/**
 * バリエーション作成API（最大DDPコストベース・ハイブリッド価格戦略）
 *
 * 【戦略変更】Ebaymug連携を完全に廃止
 *
 * 新戦略:
 * 1. グループ内で最も高いDDPコスト (max_ddp_cost_usd) を統一Item Price（eBay出品価格）とする
 * 2. これにより全ての子SKUがカバーされ、構造的に赤字がなくなる
 * 3. 最大DDPコストより安い子SKUは追加利益 (excess_profit_usd) を得る
 * 4. 既存の1,200個の配送ポリシーから最適なものを自動選定
 * 5. 外部ツール（Ebaymug）への依存を完全に排除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import type { VariationAttribute, GroupingItem } from '@/types/product'

const supabase = createClient()

// DDPコスト近接許容範囲（最大 - 最小）
const MAX_DDP_COST_DIFFERENCE_USD = 20
const MAX_DDP_COST_DIFFERENCE_PERCENT = 0.10 // 10%

// 重量差許容範囲（最大 / 最小）
const MAX_WEIGHT_RATIO = 1.5 // 150%

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selectedItems, parentSkuName, attributes, categoryId } = body as {
      selectedItems: GroupingItem[]
      parentSkuName: string
      attributes: VariationAttribute[][]
      categoryId?: string
    }

    console.log('📦 バリエーション作成開始（最大DDPコストベース）:', {
      parentSkuName,
      itemCount: selectedItems.length
    })

    // ===== ステップ1: バリデーション =====

    // 1-1. 最低2つのアイテムが必要
    if (selectedItems.length < 2) {
      return NextResponse.json(
        { success: false, error: 'バリエーションには2つ以上のアイテムが必要です' },
        { status: 400 }
      )
    }

    // 1-2. 親SKU名の入力確認
    if (!parentSkuName?.trim()) {
      return NextResponse.json(
        { success: false, error: '親SKU名を入力してください' },
        { status: 400 }
      )
    }

    // 1-3. カテゴリーIDの一致確認（Vero対策）
    const categories = selectedItems
      .map(item => item.category_id)
      .filter(Boolean)

    if (categories.length > 0) {
      const uniqueCategories = [...new Set(categories)]
      if (uniqueCategories.length > 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'カテゴリーIDが一致しません。同じカテゴリーの商品のみ選択してください。',
            details: `検出されたカテゴリー: ${uniqueCategories.join(', ')}`
          },
          { status: 400 }
        )
      }
    }

    // ===== ステップ2: 基準値決定（最大DDPコスト） =====

    const ddpCosts = selectedItems.map(item => item.ddp_cost_usd)
    const weights = selectedItems.map(item => item.weight_g || 0).filter(w => w > 0)

    const minDdpCost = Math.min(...ddpCosts)
    const maxDdpCost = Math.max(...ddpCosts)
    const ddpDifference = maxDdpCost - minDdpCost
    const ddpDifferencePercent = (ddpDifference / minDdpCost) * 100

    const minWeight = weights.length > 0 ? Math.min(...weights) : 0
    const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
    const weightRatio = minWeight > 0 ? maxWeight / minWeight : 0

    console.log('💰 グループ分析:', {
      minDdpCost: `$${minDdpCost.toFixed(2)}`,
      maxDdpCost: `$${maxDdpCost.toFixed(2)}`,
      difference: `$${ddpDifference.toFixed(2)} (${ddpDifferencePercent.toFixed(1)}%)`,
      minWeight: `${minWeight}g`,
      maxWeight: `${maxWeight}g`,
      weightRatio: weightRatio.toFixed(2)
    })

    // 2-1. DDPコスト近接チェック
    if (ddpDifference > MAX_DDP_COST_DIFFERENCE_USD && ddpDifferencePercent > MAX_DDP_COST_DIFFERENCE_PERCENT * 100) {
      return NextResponse.json(
        {
          success: false,
          error: `DDPコストの差が大きすぎます（差額: $${ddpDifference.toFixed(2)}, ${ddpDifferencePercent.toFixed(1)}%）`,
          hint: `許容範囲: $${MAX_DDP_COST_DIFFERENCE_USD}以内、または${MAX_DDP_COST_DIFFERENCE_PERCENT * 100}%以内`
        },
        { status: 400 }
      )
    }

    // 2-2. 重量差チェック
    if (weights.length > 0 && weightRatio > MAX_WEIGHT_RATIO) {
      return NextResponse.json(
        {
          success: false,
          error: `重量の差が大きすぎます（最大重量が最小の${(weightRatio * 100).toFixed(0)}%）`,
          hint: `許容範囲: 最大${MAX_WEIGHT_RATIO * 100}%以内`
        },
        { status: 400 }
      )
    }

    // ===== ステップ3: 最適な配送ポリシーの自動選定 =====

    const maxWeightKg = maxWeight / 1000

    const { data: suitablePolicies, error: policyError } = await supabase
      .from('ebay_shipping_policies_v2')
      .select('*')
      .gte('weight_max_kg', maxWeightKg)
      .order('weight_min_kg', { ascending: true })
      .limit(10)

    if (policyError) {
      console.error('❌ 配送ポリシー取得エラー:', policyError)
    }

    const selectedPolicy = suitablePolicies && suitablePolicies.length > 0
      ? suitablePolicies[0]
      : null

    console.log('📮 選定された配送ポリシー:', selectedPolicy ? {
      id: selectedPolicy.id,
      name: selectedPolicy.policy_name,
      weight_range: `${selectedPolicy.weight_min_kg}kg - ${selectedPolicy.weight_max_kg}kg`
    } : '自動選定失敗（手動設定が必要）')

    // ===== ステップ4: 子SKU情報の生成（最大DDPコストベース） =====

    const variations = selectedItems.map((item, index) => {
      const actualDdpCost = item.ddp_cost_usd
      const excessProfit = maxDdpCost - actualDdpCost // 追加利益

      return {
        variation_sku: item.sku,
        attributes: attributes[index],
        actual_ddp_cost_usd: actualDdpCost,
        excess_profit_usd: excessProfit, // 【重要】統一価格との差額
        stock_quantity: item.stock_quantity || 0,
        image_url: item.image || '',
        weight_g: item.weight_g || 0
      }
    })

    // ===== ステップ5: 親SKUの作成 =====

    const priorityItem = selectedItems.reduce((max, item) =>
      item.ddp_cost_usd > max.ddp_cost_usd ? item : max
    )

    const parentListingData = {
      max_ddp_cost_usd: maxDdpCost, // 【重要】統一Item Price
      variation_attributes: attributes[0].map(attr => attr.name),
      variations: variations,
      shipping_policy_id: selectedPolicy?.id || null,
      shipping_policy_name: selectedPolicy?.policy_name || null,
      pricing_strategy: 'max_ddp_cost', // 戦略の明示
      created_by_api: 'create-variation-v2'
    }

    const { data: parentProduct, error: parentError } = await supabase
      .from('products_master')
      .insert({
        sku: parentSkuName,
        title: `${priorityItem.title} (${selectedItems.length} Variations)`,
        variation_type: 'Parent',
        parent_sku_id: null,
        price_usd: maxDdpCost,  // 【重要】eBay統一Item Price = 最大DDPコスト
        ddp_price_usd: maxDdpCost,
        current_stock: Math.min(...selectedItems.map(i => i.stock_quantity || 0)),
        listing_data: parentListingData,
        category_id: categoryId || priorityItem.category_id,
        status: 'Draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (parentError) {
      console.error('❌ 親SKU作成エラー:', parentError)
      return NextResponse.json(
        { success: false, error: `親SKU作成に失敗しました: ${parentError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ 親SKU作成成功:', parentProduct.sku)

    // ===== ステップ6: 子SKUの更新 =====

    const childUpdates = selectedItems.map(async (item, index) => {
      const variation = variations[index]

      const childListingData = {
        variation_sku: item.sku,
        actual_ddp_cost_usd: variation.actual_ddp_cost_usd,
        excess_profit_usd: variation.excess_profit_usd, // 追加利益を記録
        attributes: variation.attributes,
        parent_sku: parentSkuName,
        pricing_strategy: 'max_ddp_cost'
      }

      const { error: childError } = await supabase
        .from('products_master')
        .update({
          parent_sku_id: parentProduct.sku,
          variation_type: 'Child',
          listing_data: childListingData,
          updated_at: new Date().toISOString()
        })
        .eq('sku', item.sku)

      if (childError) {
        console.error(`❌ 子SKU更新エラー (${item.sku}):`, childError)
        return { success: false, sku: item.sku, error: childError.message }
      }

      console.log(`✅ 子SKU更新成功: ${item.sku} (追加利益: $${variation.excess_profit_usd.toFixed(2)})`)
      return { success: true, sku: item.sku }
    })

    const childResults = await Promise.all(childUpdates)
    const failedChildren = childResults.filter(r => !r.success)

    if (failedChildren.length > 0) {
      console.warn('⚠️ 一部の子SKU更新に失敗:', failedChildren)
    }

    // ===== ステップ7: 赤字リスクチェック（最終確認） =====

    const warnings: string[] = []

    // 全ての子SKUが統一価格でカバーされているか確認
    const uncoveredItems = variations.filter(v => v.excess_profit_usd < 0)
    if (uncoveredItems.length > 0) {
      warnings.push(`⚠️ 警告: ${uncoveredItems.length}件の子SKUが統一価格でカバーできていません（ロジックエラーの可能性）`)
    }

    // 配送ポリシーが選定できなかった場合
    if (!selectedPolicy) {
      warnings.push('⚠️ 配送ポリシーの自動選定に失敗しました。手動で設定してください。')
    }

    // ===== ステップ8: 成功レスポンス =====

    return NextResponse.json({
      success: true,
      message: 'バリエーションが正常に作成されました（最大DDPコストベース戦略）',
      parentSku: parentProduct.sku,
      unifiedItemPrice: maxDdpCost, // 統一Item Price
      children: variations,
      shippingPolicy: selectedPolicy ? {
        id: selectedPolicy.id,
        name: selectedPolicy.policy_name,
        weight_range: `${selectedPolicy.weight_min_kg}kg - ${selectedPolicy.weight_max_kg}kg`
      } : null,
      warnings: warnings.length > 0 ? warnings : undefined,
      summary: {
        totalVariations: selectedItems.length,
        unifiedItemPrice: maxDdpCost,
        totalExcessProfit: variations.reduce((sum, v) => sum + v.excess_profit_usd, 0),
        failedChildUpdates: failedChildren.length,
        pricingStrategy: 'max_ddp_cost',
        redFlagRisk: 'ZERO', // 赤字リスクゼロ
        externalToolDependency: 'NONE' // 外部ツール依存なし
      }
    })

  } catch (error: any) {
    console.error('❌ バリエーション作成APIエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'バリエーション作成中にエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}
