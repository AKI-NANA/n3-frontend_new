// /app/api/products/add-to-variation/route.ts
/**
 * 既存親SKUへの子SKU追加API
 *
 * 既存のバリエーション親SKUに新しい子SKUを追加し、
 * 最大DDPコスト戦略に基づいて価格を再計算します。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      parentSku,
      newItems,
      attributes
    } = body as {
      parentSku: string
      newItems: Array<{
        id: string
        sku: string
        title: string
        image: string
        ddp_cost_usd: number
        stock_quantity: number
        weight_g?: number
        category_id?: string
      }>
      attributes: Array<Array<{ name: string; value: string }>>
    }

    console.log('🔄 既存親SKUへの追加を開始:', {
      parentSku,
      newItemCount: newItems.length
    })

    // 親SKUを取得
    const { data: parentData, error: parentError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', parentSku)
      .eq('variation_type', 'Parent')
      .single()

    if (parentError || !parentData) {
      return NextResponse.json(
        { success: false, error: `親SKU "${parentSku}" が見つかりません` },
        { status: 404 }
      )
    }

    // 既存の子SKUを取得
    const { data: existingChildren, error: childError } = await supabase
      .from('products_master')
      .select('*')
      .eq('parent_sku_id', parentSku)
      .eq('variation_type', 'Child')

    if (childError) {
      return NextResponse.json(
        { success: false, error: `子SKU取得に失敗: ${childError.message}` },
        { status: 500 }
      )
    }

    const existingChildSkus = existingChildren || []

    // 既存の最大DDPコストを計算
    const existingDdpCosts = existingChildSkus.map(child => child.ddp_cost_usd || 0)
    const currentMaxDdp = existingDdpCosts.length > 0
      ? Math.max(...existingDdpCosts)
      : 0

    // 新しいアイテムを含めた最大DDPコストを計算
    const newDdpCosts = newItems.map(item => item.ddp_cost_usd)
    const allDdpCosts = [...existingDdpCosts, ...newDdpCosts]
    const newMaxDdp = Math.max(...allDdpCosts)

    console.log('💰 価格再計算:', {
      currentMaxDdp: currentMaxDdp.toFixed(2),
      newMaxDdp: newMaxDdp.toFixed(2),
      priceChange: (newMaxDdp - currentMaxDdp).toFixed(2)
    })

    // 新しい子SKUを作成
    const newChildrenData = newItems.map((item, index) => {
      const actualDdpCost = item.ddp_cost_usd
      const excessProfit = newMaxDdp - actualDdpCost

      return {
        sku: item.sku,
        title: item.title,
        ddp_cost_usd: actualDdpCost,
        parent_sku_id: parentSku,
        variation_type: 'Child',
        stock_quantity: item.stock_quantity,
        category_id: item.category_id || parentData.category_id,
        listing_data: {
          actual_ddp_cost_usd: actualDdpCost,
          excess_profit_usd: excessProfit,
          attributes: attributes[index] || [],
          weight_g: item.weight_g || 0,
          image_url: item.image
        }
      }
    })

    // 新しい子SKUを一括挿入
    const { data: insertedChildren, error: insertError } = await supabase
      .from('products_master')
      .insert(newChildrenData)
      .select()

    if (insertError) {
      console.error('❌ 子SKU挿入エラー:', insertError)
      return NextResponse.json(
        { success: false, error: `子SKU作成に失敗: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ ${insertedChildren?.length}件の子SKUを追加`)

    // 最大DDPコストが変更された場合、既存の子SKUのexcess_profitを更新
    let updatedExistingCount = 0
    if (newMaxDdp !== currentMaxDdp) {
      for (const child of existingChildSkus) {
        const actualDdpCost = child.ddp_cost_usd || 0
        const newExcessProfit = newMaxDdp - actualDdpCost

        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            listing_data: {
              ...child.listing_data,
              actual_ddp_cost_usd: actualDdpCost,
              excess_profit_usd: newExcessProfit
            }
          })
          .eq('id', child.id)

        if (!updateError) {
          updatedExistingCount++
        }
      }

      console.log(`🔄 ${updatedExistingCount}件の既存子SKUを更新`)
    }

    // 親SKUの更新
    const updatedVariations = [
      ...existingChildSkus.map(child => ({
        variation_sku: child.sku,
        attributes: child.listing_data?.attributes || [],
        actual_ddp_cost_usd: child.ddp_cost_usd || 0,
        excess_profit_usd: newMaxDdp - (child.ddp_cost_usd || 0),
        stock_quantity: child.stock_quantity || 0,
        image_url: child.listing_data?.image_url || '',
        weight_g: child.listing_data?.weight_g || 0
      })),
      ...newItems.map((item, index) => ({
        variation_sku: item.sku,
        attributes: attributes[index] || [],
        actual_ddp_cost_usd: item.ddp_cost_usd,
        excess_profit_usd: newMaxDdp - item.ddp_cost_usd,
        stock_quantity: item.stock_quantity,
        image_url: item.image,
        weight_g: item.weight_g || 0
      }))
    ]

    const { error: parentUpdateError } = await supabase
      .from('products_master')
      .update({
        listing_data: {
          ...parentData.listing_data,
          max_ddp_cost_usd: newMaxDdp,
          variations: updatedVariations,
          variation_count: updatedVariations.length
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', parentData.id)

    if (parentUpdateError) {
      console.error('❌ 親SKU更新エラー:', parentUpdateError)
      // エラーだが子SKUは作成済みなので警告として扱う
    }

    console.log('✅ 親SKU更新完了')

    // 最終結果を返す
    return NextResponse.json({
      success: true,
      message: `${newItems.length}個の子SKUを親SKU「${parentSku}」に追加しました`,
      parentSku: parentSku,
      summary: {
        newChildrenAdded: newItems.length,
        totalVariations: updatedVariations.length,
        previousMaxDdp: currentMaxDdp,
        newMaxDdp: newMaxDdp,
        priceChange: newMaxDdp - currentMaxDdp,
        priceChangePercent: currentMaxDdp > 0
          ? ((newMaxDdp - currentMaxDdp) / currentMaxDdp) * 100
          : 0,
        existingChildrenUpdated: updatedExistingCount
      },
      variations: updatedVariations
    })

  } catch (error: any) {
    console.error('❌ 既存親への追加エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '既存親SKUへの追加中にエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}
