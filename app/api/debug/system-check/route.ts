// app/api/debug/system-check/route.ts
// システム全体の健全性チェックAPI

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('id') || '322'
  
  const supabase = await createClient()
  
  const checks: any = {
    timestamp: new Date().toISOString(),
    productId,
    checks: {}
  }

  try {
    // ✅ Check 1: データベース接続
    checks.checks.database_connection = {
      name: 'データベース接続',
      status: 'checking'
    }
    
    const { data: connectionTest, error: connError } = await supabase
      .from('products_master')
      .select('count')
      .limit(1)
    
    checks.checks.database_connection.status = connError ? 'failed' : 'passed'
    checks.checks.database_connection.error = connError?.message

    // ✅ Check 2: 商品データの存在確認
    checks.checks.product_exists = {
      name: '商品データ存在確認',
      status: 'checking'
    }
    
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()
    
    checks.checks.product_exists.status = product ? 'passed' : 'failed'
    checks.checks.product_exists.error = productError?.message
    checks.checks.product_exists.data = product ? {
      id: product.id,
      title: product.title?.substring(0, 50)
    } : null

    if (!product) {
      return NextResponse.json(checks, { status: 200 })
    }

    // ✅ Check 3: price_jpy フィールド
    checks.checks.price_jpy = {
      name: 'price_jpy フィールド',
      status: product.price_jpy ? 'passed' : 'failed',
      value: product.price_jpy,
      type: typeof product.price_jpy,
      message: product.price_jpy 
        ? `✅ 価格: ¥${product.price_jpy}` 
        : '❌ price_jpy が null または undefined'
    }

    // ✅ Check 4: listing_data フィールド
    checks.checks.listing_data = {
      name: 'listing_data フィールド',
      status: 'checking'
    }
    
    const listingData = product.listing_data
    const hasListingData = listingData && typeof listingData === 'object' && Object.keys(listingData).length > 0
    
    checks.checks.listing_data.status = hasListingData ? 'passed' : 'failed'
    checks.checks.listing_data.value = listingData
    checks.checks.listing_data.type = typeof listingData
    checks.checks.listing_data.keys = listingData ? Object.keys(listingData) : []
    checks.checks.listing_data.isEmpty = !hasListingData

    // ✅ Check 5: weight_g フィールド
    checks.checks.weight_g = {
      name: 'weight_g フィールド',
      status: 'checking'
    }
    
    const weight_g = listingData?.weight_g
    checks.checks.weight_g.status = weight_g && weight_g > 0 ? 'passed' : 'failed'
    checks.checks.weight_g.value = weight_g
    checks.checks.weight_g.type = typeof weight_g
    checks.checks.weight_g.message = weight_g 
      ? `✅ 重量: ${weight_g}g` 
      : '❌ weight_g が null、undefined、または 0'

    // ✅ Check 6: サイズフィールド
    checks.checks.dimensions = {
      name: 'サイズフィールド',
      status: 'checking',
      values: {
        length_cm: listingData?.length_cm,
        width_cm: listingData?.width_cm,
        height_cm: listingData?.height_cm
      }
    }
    
    const hasDimensions = listingData?.length_cm || listingData?.width_cm || listingData?.height_cm
    checks.checks.dimensions.status = hasDimensions ? 'passed' : 'warning'
    checks.checks.dimensions.message = hasDimensions 
      ? '✅ サイズ情報あり' 
      : '⚠️ サイズ情報なし（オプション）'

    // ✅ Check 7: 送料計算の準備状況
    checks.checks.shipping_ready = {
      name: '送料計算準備状況',
      status: 'checking'
    }
    
    const isReady = product.price_jpy && weight_g && weight_g > 0
    checks.checks.shipping_ready.status = isReady ? 'passed' : 'failed'
    checks.checks.shipping_ready.requirements = {
      price_jpy: {
        required: true,
        present: !!product.price_jpy,
        value: product.price_jpy
      },
      weight_g: {
        required: true,
        present: !!weight_g && weight_g > 0,
        value: weight_g
      }
    }
    checks.checks.shipping_ready.message = isReady 
      ? '✅ 送料計算可能' 
      : '❌ 送料計算に必要なデータが不足'

    // ✅ Check 8: 代替データソース
    checks.checks.alternative_sources = {
      name: '代替データソース',
      status: 'info',
      sources: {
        purchase_price_jpy: product.purchase_price_jpy,
        current_price: product.current_price,
        scraped_current_price: product.scraped_data?.current_price,
        scraped_weight: product.scraped_data?.weight,
        ebay_weight: product.ebay_api_data?.itemSummaries?.[0]?.shippingOptions?.[0]?.weight?.value
      },
      message: '代替データソースの確認'
    }

    // ✅ Check 9: 推奨修正アクション
    checks.recommended_actions = []
    
    if (!product.price_jpy) {
      if (product.purchase_price_jpy) {
        checks.recommended_actions.push({
          action: 'UPDATE price_jpy',
          sql: `UPDATE products_master SET price_jpy = ${product.purchase_price_jpy} WHERE id = ${productId};`,
          reason: 'purchase_price_jpy から price_jpy を設定'
        })
      } else if (product.current_price) {
        checks.recommended_actions.push({
          action: 'UPDATE price_jpy',
          sql: `UPDATE products_master SET price_jpy = ${product.current_price} WHERE id = ${productId};`,
          reason: 'current_price から price_jpy を設定'
        })
      } else {
        checks.recommended_actions.push({
          action: 'MANUAL INPUT',
          message: 'price_jpy を手動で設定してください',
          reason: '代替データソースが見つかりません'
        })
      }
    }
    
    if (!weight_g || weight_g <= 0) {
      checks.recommended_actions.push({
        action: 'UPDATE weight_g',
        sql: `UPDATE products_master SET listing_data = jsonb_set(COALESCE(listing_data, '{}'::jsonb), '{weight_g}', '500'::jsonb) WHERE id = ${productId};`,
        reason: 'デフォルト値（500g）を設定（実際の重量に変更してください）'
        })
    }

    // ✅ 総合判定
    const allPassed = Object.values(checks.checks).every((check: any) => 
      check.status === 'passed' || check.status === 'warning' || check.status === 'info'
    )
    
    checks.overall_status = allPassed ? 'HEALTHY' : 'NEEDS_FIX'
    checks.summary = {
      total_checks: Object.keys(checks.checks).length,
      passed: Object.values(checks.checks).filter((c: any) => c.status === 'passed').length,
      failed: Object.values(checks.checks).filter((c: any) => c.status === 'failed').length,
      warnings: Object.values(checks.checks).filter((c: any) => c.status === 'warning').length
    }

    return NextResponse.json(checks, { status: 200 })

  } catch (error) {
    console.error('System check error:', error)
    return NextResponse.json({
      error: 'System check failed',
      message: error instanceof Error ? error.message : String(error),
      checks
    }, { status: 500 })
  }
}
