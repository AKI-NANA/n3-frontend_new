/**
 * I3-2: FBA納品プラン作成API
 *
 * Amazon Selling Partner API (SP-API) を利用し、仕入れた商品の
 * FBA納品プランを自動作成
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productSkus, warehouseId, quantity } = body

    if (!productSkus || !Array.isArray(productSkus)) {
      return NextResponse.json(
        { error: 'productSkus配列が必要です' },
        { status: 400 }
      )
    }

    console.log(`[CreateFBAPlan] FBA納品プラン作成開始: ${productSkus.length}件`)

    // Amazon SP-APIクライアントの初期化（モック）
    const spApiClient = initializeSpApiClient()

    if (!spApiClient.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amazon SP-APIが設定されていません。環境変数を確認してください。',
          mock: true,
        },
        { status: 503 }
      )
    }

    const supabase = createClient()

    // 商品情報を取得
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .in('sku', productSkus)

    if (productError || !products || products.length === 0) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // FBA納品プランを作成
    const planResult = await createFbaInboundPlan(spApiClient, products, quantity || 1)

    if (!planResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: planResult.error,
        },
        { status: 500 }
      )
    }

    // 納品ラベルを生成
    const labelResult = await generateShippingLabels(spApiClient, planResult.planId, products)

    // データベースに記録
    await supabase.from('fba_shipments').insert({
      plan_id: planResult.planId,
      product_skus: productSkus,
      warehouse_id: warehouseId,
      status: 'created',
      label_url: labelResult.labelUrl,
      created_at: new Date().toISOString(),
    })

    console.log(`[CreateFBAPlan] FBA納品プラン作成成功: Plan=${planResult.planId}`)

    return NextResponse.json({
      success: true,
      planId: planResult.planId,
      labelUrl: labelResult.labelUrl,
      estimatedArrival: planResult.estimatedArrival,
      message: 'FBA納品プランを作成しました',
    })
  } catch (error) {
    console.error('[CreateFBAPlan] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}

// Amazon SP-APIクライアントの初期化
function initializeSpApiClient() {
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN

  return {
    isConfigured: !!(clientId && clientSecret && refreshToken),
    clientId,
    clientSecret,
    refreshToken,
  }
}

// FBA納品プラン作成（モック）
async function createFbaInboundPlan(spApiClient: any, products: any[], quantity: number) {
  // 実際はAmazon SP-APIを呼び出す
  // https://developer-docs.amazon.com/sp-api/docs/fulfillment-inbound-api-v0-reference

  console.log('[CreateFBAPlan] FBA納品プラン作成中（モック）...')

  await new Promise(resolve => setTimeout(resolve, 1000))

  return {
    success: true,
    planId: `FBA_PLAN_${Date.now()}`,
    estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

// 納品ラベル生成（モック）
async function generateShippingLabels(spApiClient: any, planId: string, products: any[]) {
  // 実際はAmazon SP-APIでラベルPDF/ZPLを生成
  console.log('[CreateFBAPlan] 納品ラベル生成中（モック）...')

  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    success: true,
    labelUrl: `https://example.com/labels/${planId}.pdf`,
    format: 'PDF',
  }
}
