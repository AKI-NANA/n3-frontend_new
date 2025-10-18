// app/api/tools/shipping-calculate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateShipping } from '@/lib/shipping-calculator'
import type { ShippingCalculationInput } from '@/lib/shipping-calculator'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '商品IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`📦 送料計算開始: ${productIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    const updated: string[] = []
    const errors: any[] = []

    // 各商品の送料計算
    for (const product of products || []) {
      try {
        // listing_dataから値を取得
        const listingData = product.listing_data || {}
        const weight_g = listingData.weight_g
        const length_cm = listingData.length_cm
        const width_cm = listingData.width_cm
        const height_cm = listingData.height_cm
        
        // 必須パラメータチェック
        if (!weight_g || !length_cm || !width_cm || !height_cm) {
          console.warn(`⚠️ サイズ・重量情報不足: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: 'サイズ・重量情報が不足しています' 
          })
          continue
        }

        console.log(`🔍 送料計算: ${product.title}`)
        console.log(`   重量: ${weight_g}g, サイズ: ${length_cm}×${width_cm}×${height_cm}cm`)

        // 実費送料を計算
        const shippingInput: ShippingCalculationInput = {
          weight_g,
          length_cm,
          width_cm,
          height_cm,
          country_code: 'US',
          item_value_usd: listingData.ddu_price_usd || listingData.ddp_price_usd || product.price_usd || 0,
          need_signature: false,
          need_insurance: false
        }

        const shippingResults = await calculateShipping(shippingInput)

        if (!shippingResults || shippingResults.length === 0) {
          console.warn(`⚠️ 送料計算結果なし: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: '送料計算結果が取得できませんでした' 
          })
          continue
        }

        // 最も安い配送方法を選択
        const cheapestShipping = shippingResults
          .filter(r => r.available)
          .sort((a, b) => a.total_usd - b.total_usd)[0]

        if (!cheapestShipping) {
          console.warn(`⚠️ 利用可能な配送方法なし: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: '利用可能な配送方法がありません' 
          })
          continue
        }

        const shipping_cost_usd = cheapestShipping.total_usd

        console.log(`💰 送料計算結果:`)
        console.log(`   実費送料: $${shipping_cost_usd.toFixed(2)}`)
        console.log(`   配送業者: ${cheapestShipping.carrier_name} - ${cheapestShipping.service.service_name}`)

        // 送料のみ保存（DDU/DDP価格は利益計算で更新）
        const { error: updateError } = await supabase
          .from('products')
          .update({
            shipping_cost_usd: shipping_cost_usd,
            shipping_service: `${cheapestShipping.carrier_name} - ${cheapestShipping.service.service_name}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) throw updateError

        updated.push(product.id)
        console.log(`✅ 送料計算完了: ${product.title}`)
      } catch (err: any) {
        console.error(`❌ 送料計算エラー: ${product.title}`, err)
        errors.push({ id: product.id, error: err.message })
      }
    }

    console.log(`📊 送料計算完了: ${updated.length}件成功, ${errors.length}件失敗`)

    return NextResponse.json({
      success: true,
      updated: updated.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ 送料計算エラー:', error)
    return NextResponse.json(
      { error: error.message || '送料計算に失敗しました' },
      { status: 500 }
    )
  }
}
