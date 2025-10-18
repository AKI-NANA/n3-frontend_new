// app/api/tools/profit-calculate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateUsaPriceV2 } from '@/lib/ebay-pricing/usa-price-calculator-v2'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '商品IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`💰 利益計算開始: ${productIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    const updated: string[] = []
    const errors: any[] = []

    // 各商品の利益計算
    for (const product of products || []) {
      try {
        // listing_dataから値を取得
        const listingData = product.listing_data || {}
        const weightKg = (listingData.weight_g || 0) / 1000
        const costJPY = product.price_jpy || 0
        
        if (!weightKg || !costJPY) {
          console.warn(`⚠️ 重量または仕入れ価格が不足: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: '重量または仕入れ価格が不足しています' 
          })
          continue
        }

        // eBay価格計算システムを使用
        const pricingResult = await calculateUsaPriceV2({
          costJPY: costJPY,
          weight_kg: weightKg,
          targetProductPriceRatio: 0.8,  // 商品価格比率 80%
          targetMargin: 0.15,             // 目標利益率 15%
          hsCode: '9620.00.20.00',        // デフォルトHTS
          originCountry: 'JP',
          storeType: 'none',
          fvfRate: 0.1315
        })

        if (!pricingResult || !pricingResult.success) {
          console.warn(`⚠️ 価格計算失敗: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: pricingResult?.error || '価格計算に失敗しました' 
          })
          continue
        }

        // 計算結果を取得
        const productPrice = pricingResult.productPrice
        const shippingCost = pricingResult.shipping
        const ddpPrice = pricingResult.totalRevenue
        const profitMargin = pricingResult.profitMargin_NoRefund
        const profitAmount = pricingResult.profitUSD_NoRefund  // 利益額を追加
        const policyName = pricingResult.policy?.policy_name || null

        console.log(`✅ 利益計算完了: ${product.title}`)
        console.log(`   商品価格: ${productPrice.toFixed(2)}`)
        console.log(`   送料: ${shippingCost.toFixed(2)}`)
        console.log(`   DDP価格: ${ddpPrice.toFixed(2)}`)
        console.log(`   利益率: ${profitMargin.toFixed(1)}%`)
        console.log(`   利益額: ${profitAmount.toFixed(2)}`)
        console.log(`   ポリシー: ${policyName || '未選択'}`)

        const { error: updateError } = await supabase
          .from('products')
          .update({
            ddu_price_usd: productPrice,                    // 商品価格（送料別）
            ddp_price_usd: ddpPrice,                        // DDP価格（送料込）
            shipping_cost_usd: pricingResult.shippingCost,  // 実費送料
            shipping_cost_total_usd: shippingCost,          // 合計送料
            shipping_policy: policyName,                    // 配送ポリシー名
            sm_profit_margin: profitMargin,                 // 利益率
            profit_amount_usd: profitAmount,                // 利益額
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) throw updateError

        updated.push(product.id)
      } catch (err: any) {
        console.error(`❌ 利益計算エラー: ${product.title}`, err)
        errors.push({ id: product.id, error: err.message })
      }
    }

    console.log(`📊 利益計算完了: ${updated.length}件成功, ${errors.length}件失敗`)

    return NextResponse.json({
      success: true,
      updated: updated.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ 利益計算エラー:', error)
    return NextResponse.json(
      { error: error.message || '利益計算に失敗しました' },
      { status: 500 }
    )
  }
}
