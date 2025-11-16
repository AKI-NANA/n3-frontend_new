// app/api/tools/shipping-calculate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
import { calculateUsaPriceV3 } from '@/lib/ebay-pricing/usa-price-calculator-v3'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '商品IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`📦 USA DDP送料計算開始: ${productIds.length}件`)

    // 商品データを取得
    const { data: products, error: fetchError } = await supabase
      .from('products_master') // 🔥 products → products_master
      .select('*')
      .in('id', productIds)

    if (fetchError) throw fetchError

    const updated: string[] = []
    const errors: any[] = []

    // 各商品の送料計算
    for (const product of products || []) {
      try {
        const listingData = product.listing_data || {}
        const weight_g = listingData.weight_g
        const price_jpy = product.price_jpy
        
        // 必須パラメータチェック
        if (!weight_g || !price_jpy) {
          console.warn(`⚠️ 重量または価格情報不足: ${product.title}`)
          errors.push({ 
            id: product.id, 
            error: '重量または価格情報が不足しています' 
          })
          continue
        }

        console.log(`🔍 USA DDP計算: ${product.title}`)
        console.log(`   仕入: ${price_jpy}円, 重量: ${weight_g}g (${(weight_g/1000).toFixed(2)}kg)`)

        // 🇺🇸 USA DDP価格計算（精密版V3）
        // 🇺🇸 USA DDP価格計算（精密版V3）
        const usaPriceResult = await calculateUsaPriceV3({
          costJPY: price_jpy,
          weight_kg: weight_g / 1000,  // gをkgに変換
          hsCode: listingData.hs_code || '9620.00.20.00',
          originCountry: 'JP',
          targetMargin: 15,  // デフォルト15%
          storeType: 'none',  // ストアなし
          fvfRate: 0.1515,    // FVF 15.15%
          exchangeRate: 150  // デフォルト150円/USD
        })

        if (!usaPriceResult.success || !usaPriceResult.breakdown) {
          throw new Error(usaPriceResult.error || 'USA DDP計算失敗')
        }

        const breakdown = usaPriceResult.breakdown

        console.log(`💰 USA DDP計算結果:`)
        console.log(`   ポリシー名: ${breakdown.selectedPolicyName}`)
        console.log(`   商品価格: ${breakdown.finalProductPrice.toFixed(2)}`)
        console.log(`   DDP送料: ${breakdown.finalShipping.toFixed(2)}`)
        console.log(`   総売上: ${breakdown.finalTotal.toFixed(2)}`)
        console.log(`   利益率（還付前）: ${breakdown.profitMargin.toFixed(2)}%`)
        console.log(`   利益率（還付後）: ${breakdown.profitMarginWithRefund.toFixed(2)}%`)

        // listing_dataを更新（既存データを保持）
        const updatedListingData = {
          ...listingData,
          // ポリシー情報
          usa_shipping_policy_name: breakdown.selectedPolicyName,
          shipping_service: `${breakdown.carrierName} - ${breakdown.serviceName}`, // ✅ 配送会社 - サービス名
          // 価格情報
          ddp_price_usd: breakdown.finalTotal,              // DDP価格（総売上）
          ddu_price_usd: breakdown.finalProductPrice,        // DDU価格（商品価格のみ）
          product_price_usd: breakdown.finalProductPrice,    // 商品価格のみ
          // 送料情報
          base_shipping_usd: breakdown.selectedBaseShipping,  // ✅ 実送料（配送会社に支払う実際の送料）
          shipping_cost_usd: breakdown.finalShipping,       // DDP送料（顾客が支払う送料）
          // 利益情報
          profit_margin: breakdown.profitMargin,             // 利益率（還付前）
          profit_amount_usd: breakdown.profit,               // 利益額（還付前）
          profit_margin_refund: breakdown.profitMarginWithRefund,  // 利益率（還付後）
          profit_amount_refund: breakdown.profitWithRefund         // 利益額（還付後）
        }

        const { error: updateError } = await supabase
          .from('products_master') // 🔥 products → products_master
          .update({
            listing_data: updatedListingData,
            // トップレベルにも保存（検索・ソート用）
            ddu_price_usd: breakdown.finalProductPrice,
            ddp_price_usd: breakdown.finalTotal,
            shipping_cost_usd: breakdown.finalShipping,
            shipping_policy: breakdown.selectedPolicyName,
            profit_margin: breakdown.profitMargin,  // ✅ 修正: sm_profit_margin → profit_margin
            profit_amount_usd: breakdown.profit,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) throw updateError

        updated.push(product.id)
        console.log(`✅ USA DDP計算完了: ${product.title}`)

      } catch (err: any) {
        console.error(`❌ USA DDP計算エラー: ${product.title}`, err)
        errors.push({ id: product.id, error: err.message })
      }
    }

    console.log(`📊 USA DDP計算完了: ${updated.length}件成功, ${errors.length}件失敗`)

    return NextResponse.json({
      success: true,
      updated: updated.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ USA DDP計算エラー:', error)
    return NextResponse.json(
      { error: error.message || 'USA DDP計算に失敗しました' },
      { status: 500 }
    )
  }
}
