import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateUsaPriceV2 } from '@/lib/ebay-pricing/usa-price-calculator-v2'

/**
 * POST /api/pricing-automation/batch-update
 * 価格を一括更新（精密計算 + 配送ポリシー + eBay API連携）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      min_price_change = 1.0,
      exchange_rate = 150,
      force_update = false,
      only_red_flags = true
    } = body

    const supabase = createClient()

    console.log('[BatchUpdate] 🔄 価格自動更新を開始します（精密計算モード）...')
    console.log('[BatchUpdate] 設定:', { min_price_change, exchange_rate, force_update, only_red_flags })

    // 対象商品を取得（products_masterから）
    const { data: products, error: fetchError } = await supabase
      .from('products_master')
      .select(`
        id,
        sku,
        title,
        ebay_listing_id,
        current_price_usd,
        cost_jpy,
        weight_kg,
        dimensions_cm,
        hs_code,
        origin_country,
        profit_usd,
        profit_margin,
        shipping_policy_id
      `)
      .not('ebay_listing_id', 'is', null)
      .not('current_price_usd', 'is', null)
      .limit(100)

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'データ取得エラー: ' + fetchError.message
      }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        total_products: 0,
        updated_products: 0,
        red_flag_products: 0,
        skipped_products: 0,
        errors: 0,
        updates: []
      })
    }

    console.log(`[BatchUpdate] 📊 対象商品: ${products.length}件`)

    const result = {
      total_products: products.length,
      updated_products: 0,
      red_flag_products: 0,
      skipped_products: 0,
      errors: 0,
      updates: [] as any[]
    }

    // 各商品を精密計算
    for (const product of products) {
      try {
        // 寸法をパース
        let dimensions = { length: 40, width: 30, height: 20 }
        if (product.dimensions_cm) {
          try {
            dimensions = JSON.parse(product.dimensions_cm)
          } catch (e) {
            console.warn(`商品 ${product.id} の寸法パースエラー`)
          }
        }

        // 既存の精密計算ツールを使用
        const calculation = await calculateUsaPriceV2({
          costJPY: product.cost_jpy || 0,
          weight_kg: product.weight_kg || 1.0,
          targetProductPriceRatio: 0.8,
          targetMargin: 0.15,
          hsCode: product.hs_code || '9620.00.20.00',
          originCountry: product.origin_country || 'JP',
          storeType: 'none',
          fvfRate: 0.1315,
          exchangeRate: exchange_rate
        })

        if (!calculation || !calculation.success) {
          console.error(`[BatchUpdate] ❌ 商品 ${product.id} の計算失敗`)
          result.errors++
          continue
        }

        const oldPrice = product.current_price_usd
        const newPrice = calculation.totalRevenue
        const priceDelta = Math.abs(newPrice - oldPrice)

        // 赤字フラグの判定
        const isRedFlag = calculation.profitMargin_NoRefund < 5 || calculation.profitUSD_NoRefund < 10

        if (isRedFlag) {
          result.red_flag_products++
        }

        // 更新が必要かどうかを判定
        let shouldUpdate = false
        let updateReason = ''

        if (only_red_flags) {
          if (isRedFlag) {
            shouldUpdate = true
            updateReason = '赤字リスク回避'
          }
        } else {
          if (isRedFlag) {
            shouldUpdate = true
            updateReason = '赤字リスク回避'
          } else if (force_update) {
            shouldUpdate = true
            updateReason = '強制更新'
          } else if (priceDelta >= min_price_change) {
            shouldUpdate = true
            updateReason = `価格変動 $${priceDelta.toFixed(2)}`
          }
        }

        if (shouldUpdate) {
          // 1. products_masterを更新
          const { error: masterUpdateError } = await supabase
            .from('products_master')
            .update({
              current_price_usd: newPrice,
              product_price_usd: calculation.productPrice,
              shipping_price_usd: calculation.shipping,
              profit_usd: calculation.profitUSD_NoRefund,
              profit_margin: calculation.profitMargin_NoRefund,
              shipping_policy_id: calculation.policy?.id,
              last_price_update: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (masterUpdateError) {
            console.error(`[BatchUpdate] ❌ products_master更新エラー (商品 ${product.id}):`, masterUpdateError)
            result.errors++
            result.updates.push({
              product_id: product.id,
              title: product.title,
              old_price_usd: oldPrice,
              new_price_usd: newPrice,
              profit_delta: calculation.profitUSD_NoRefund - (product.profit_usd || 0),
              reason: updateReason,
              status: 'error'
            })
            continue
          }

          // 2. eBay APIで実際の出品価格を更新
          try {
            const ebayUpdateResponse = await fetch('/api/ebay/update-listing-price', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                listing_id: product.ebay_listing_id,
                product_price_usd: calculation.productPrice,
                shipping_price_usd: calculation.shipping,
                shipping_policy_id: calculation.policy?.id
              })
            })

            const ebayResult = await ebayUpdateResponse.json()

            if (!ebayResult.success) {
              console.error(`[BatchUpdate] ❌ eBay更新エラー (商品 ${product.id}):`, ebayResult.error)
              result.errors++
              result.updates.push({
                product_id: product.id,
                title: product.title,
                old_price_usd: oldPrice,
                new_price_usd: newPrice,
                profit_delta: calculation.profitUSD_NoRefund - (product.profit_usd || 0),
                reason: updateReason + ' (eBay更新失敗)',
                status: 'error'
              })
              continue
            }

            result.updated_products++
            result.updates.push({
              product_id: product.id,
              title: product.title,
              old_price_usd: oldPrice,
              new_price_usd: newPrice,
              profit_delta: calculation.profitUSD_NoRefund - (product.profit_usd || 0),
              reason: updateReason,
              status: 'success',
              shipping_policy_changed: calculation.policy?.id !== product.shipping_policy_id
            })

            console.log(`[BatchUpdate] ✅ 商品 ${product.id} を更新: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${updateReason})`)
            
          } catch (ebayError) {
            console.error(`[BatchUpdate] ❌ eBay API呼び出しエラー (商品 ${product.id}):`, ebayError)
            result.errors++
          }

        } else {
          result.skipped_products++
        }

      } catch (productError) {
        console.error(`[BatchUpdate] ❌ 商品 ${product.id} の処理エラー:`, productError)
        result.errors++
      }
    }

    console.log('[BatchUpdate] 🎉 価格自動更新が完了しました')
    console.log(`[BatchUpdate] 📊 結果: 更新 ${result.updated_products}件 / 赤字警告 ${result.red_flag_products}件 / スキップ ${result.skipped_products}件`)

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('[BatchUpdate API] エラー:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '更新に失敗しました'
    }, { status: 500 })
  }
}
