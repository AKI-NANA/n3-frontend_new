// /app/api/products/create-variation/route.ts
/**
 * バリエーション作成API（最低価格ベース・ダイナミック送料加算戦略）
 *
 * 戦略:
 * 1. 全バリエーションの中で最も安いDDPコスト (min_ddp_cost_usd) を統一Item Price（eBay出品価格）とする
 * 2. Item Priceとの差額をSKU別送料サーチャージ (shipping_surcharge_usd) として算出
 * 3. 外部ツール（Ebaymug等）を通じてUSA向けのみ送料に動的に加算
 * 4. EU（DDU販売）ではItem Priceが安価になり、競争力を確保
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import type { VariationAttribute, GroupingItem } from '@/types/product'

const supabase = createClient()

// 最小利益率の閾値（これを下回るとリスクフラグ）
const MIN_PROFIT_MARGIN = 0.05 // 5%

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selectedItems, parentSkuName, attributes } = body as {
      selectedItems: GroupingItem[]
      parentSkuName: string
      attributes: VariationAttribute[][]  // 各子SKUの属性値
    }

    console.log('📦 バリエーション作成開始:', { parentSkuName, itemCount: selectedItems.length })

    // ===== ステップ1: バリデーション =====
    if (selectedItems.length < 2) {
      return NextResponse.json(
        { success: false, error: 'バリエーションには2つ以上のアイテムが必要です' },
        { status: 400 }
      )
    }

    if (!parentSkuName?.trim()) {
      return NextResponse.json(
        { success: false, error: '親SKU名を入力してください' },
        { status: 400 }
      )
    }

    // ===== ステップ2: 基準値決定（最低DDPコスト） =====
    const ddpCosts = selectedItems.map(item => item.ddp_cost_usd)
    const minDdpCost = Math.min(...ddpCosts)
    const maxDdpCost = Math.max(...ddpCosts)

    console.log('💰 価格分析:', {
      min: minDdpCost,
      max: maxDdpCost,
      diff: maxDdpCost - minDdpCost,
      percentDiff: ((maxDdpCost - minDdpCost) / minDdpCost * 100).toFixed(1) + '%'
    })

    // ===== ステップ3: 子SKU情報の生成 =====
    const variations = selectedItems.map((item, index) => {
      const actualDdpCost = item.ddp_cost_usd
      const shippingSurcharge = actualDdpCost - minDdpCost

      return {
        variation_sku: item.sku,
        attributes: attributes[index],
        actual_ddp_cost_usd: actualDdpCost,
        shipping_surcharge_usd: shippingSurcharge,
        stock_quantity: item.stock_quantity || 0,
        image_url: item.image || ''
      }
    })

    // ===== ステップ4: 親SKUの作成 =====

    // 優先度の高いアイテム（最も高価なアイテム）からデータを継承
    const priorityItem = selectedItems.reduce((max, item) =>
      item.ddp_cost_usd > max.ddp_cost_usd ? item : max
    )

    // 親SKUのlisting_dataを構築
    const parentListingData = {
      min_ddp_cost_usd: minDdpCost,
      variation_attributes: attributes[0].map(attr => attr.name),
      variations: variations
    }

    // 親SKUをDBに挿入
    const { data: parentProduct, error: parentError } = await supabase
      .from('products_master')
      .insert({
        sku: parentSkuName,
        title: `${priorityItem.title} (${selectedItems.length} Variations)`,
        variation_type: 'Parent',
        parent_sku_id: null,
        price_usd: minDdpCost,  // eBay統一Item Price
        ddp_price_usd: minDdpCost,
        current_stock: Math.min(...selectedItems.map(i => i.stock_quantity || 0)),
        listing_data: parentListingData,
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

    // ===== ステップ5: 子SKUの更新 =====
    const childUpdates = selectedItems.map(async (item, index) => {
      const variation = variations[index]

      // 子SKUのlisting_dataを更新
      const childListingData = {
        variation_sku: item.sku,
        actual_ddp_cost_usd: variation.actual_ddp_cost_usd,
        shipping_surcharge_usd: variation.shipping_surcharge_usd,
        attributes: variation.attributes
      }

      // 子SKUを更新
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

      console.log(`✅ 子SKU更新成功: ${item.sku} (Surcharge: $${variation.shipping_surcharge_usd.toFixed(2)})`)
      return { success: true, sku: item.sku }
    })

    const childResults = await Promise.all(childUpdates)
    const failedChildren = childResults.filter(r => !r.success)

    if (failedChildren.length > 0) {
      console.warn('⚠️ 一部の子SKU更新に失敗:', failedChildren)
    }

    // ===== ステップ6: リスクチェック（最終防衛線） =====
    const warnings: string[] = []

    // 過大な送料加算額チェック
    const maxSurcharge = Math.max(...variations.map(v => v.shipping_surcharge_usd))
    if (maxSurcharge > 50) {
      warnings.push(`⚠️ 送料加算額が大きすぎます（最大: $${maxSurcharge.toFixed(2)}）`)
    }

    // 外部ツール連携チェック（TODO: 実装）
    // 現時点ではモック - 実際の外部ツール連携APIを呼び出す
    const externalToolSyncStatus = 'pending'  // 'success', 'failed', 'pending'

    if (externalToolSyncStatus === 'failed') {
      warnings.push('⚠️ 外部ツール連携に失敗しました。手動で確認してください。')

      // ステータスを更新
      await supabase
        .from('products_master')
        .update({
          status: 'NeedsApproval: ShippingRisk',
          external_tool_sync_status: 'failed'
        })
        .eq('sku', parentSkuName)
    }

    // ===== ステップ7: 成功レスポンス =====
    return NextResponse.json({
      success: true,
      message: 'バリエーションが正常に作成されました',
      parentSku: parentProduct.sku,
      minPrice: minDdpCost,
      children: variations,
      warnings: warnings.length > 0 ? warnings : undefined,
      summary: {
        totalVariations: selectedItems.length,
        unifiedItemPrice: minDdpCost,
        maxShippingSurcharge: maxSurcharge,
        failedChildUpdates: failedChildren.length
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