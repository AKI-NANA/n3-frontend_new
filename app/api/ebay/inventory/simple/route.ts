/**
 * eBay Inventory API - シンプル版（単一アカウント）
 */

import { NextRequest, NextResponse } from 'next/server'

const EBAY_API_BASE = 'https://api.ebay.com'

// 環境変数から認証情報を取得
const ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'production'

// 環境に応じて認証情報を選択
const CLIENT_ID = ENVIRONMENT === 'sandbox'
  ? process.env.EBAY_SANDBOX_CLIENT_ID
  : process.env.EBAY_APP_ID

const CLIENT_SECRET = ENVIRONMENT === 'sandbox'
  ? process.env.EBAY_SANDBOX_CLIENT_SECRET
  : process.env.EBAY_CERT_ID

const REFRESH_TOKEN = ENVIRONMENT === 'sandbox'
  ? process.env.EBAY_SANDBOX_REFRESH_TOKEN
  : process.env.EBAY_REFRESH_TOKEN

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('eBay API credentials not configured')
  }

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    console.log('📤 eBay Inventory API 呼び出し中...')
    console.log('Environment:', ENVIRONMENT)
    console.log('Client ID:', CLIENT_ID?.substring(0, 20) + '...')

    // アクセストークン取得
    const accessToken = await getAccessToken()
    console.log('✅ Access token obtained')

    // Step 1: Inventory Items取得
    const inventoryResponse = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/inventory_item?limit=200`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    if (!inventoryResponse.ok) {
      const errorText = await inventoryResponse.text()
      console.error('❌ eBay Inventory API エラー:', errorText)
      return NextResponse.json(
        {
          error: 'eBay Inventory API エラー',
          status: inventoryResponse.status,
          details: errorText
        },
        { status: inventoryResponse.status }
      )
    }

    const inventoryData = await inventoryResponse.json()
    const inventoryItems = inventoryData.inventoryItems || []
    console.log(`📦 Inventory Items: ${inventoryItems.length}件`)

    // Step 2: Offers取得（価格情報）
    const offersResponse = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/offer?limit=200`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    let offers: any[] = []
    if (offersResponse.ok) {
      const offersData = await offersResponse.json()
      offers = offersData.offers || []
      console.log(`💰 Offers: ${offers.length}件`)
    }

    // Step 3: データをマージして統一フォーマットに変換
    const products = inventoryItems.map((item: any) => {
      const offer = offers.find((o: any) => o.sku === item.sku)

      return {
        id: item.sku,
        unique_id: `EBAY-${item.sku}`,
        product_name: item.product?.title || item.sku,
        sku: item.sku,
        product_type: 'stock',
        marketplace: 'ebay',
        account: 'default',
        physical_quantity: item.availability?.shipToLocationAvailability?.quantity || 0,
        listing_quantity: offer?.availableQuantity || 0,
        cost_price: 0,
        selling_price: offer?.pricingSummary?.price ? parseFloat(offer.pricingSummary.price.value) : 0,
        currency: offer?.pricingSummary?.price?.currency || 'USD',
        condition_name: item.condition || 'USED',
        category: offer?.categoryId || 'Unknown',
        images: item.product?.imageUrls || [],
        ebay_data: {
          offer_id: offer?.offerId,
          listing_id: offer?.listingId,
          status: offer?.status,
          marketplace_id: offer?.marketplaceId,
          description: item.product?.description,
          aspects: item.product?.aspects,
          weight: item.packageWeightAndSize?.weight,
          dimensions: item.packageWeightAndSize?.dimensions
        },
        source_data: {
          from: 'ebay_api',
          environment: ENVIRONMENT,
          fetched_at: new Date().toISOString()
        }
      }
    })

    console.log(`✅ 合計 ${products.length}件の商品を取得`)

    return NextResponse.json({
      success: true,
      environment: ENVIRONMENT,
      total: products.length,
      products: products,
      message: `${products.length}件の商品を取得しました`
    })

  } catch (error: any) {
    console.error('❌ リクエストエラー:', error.message)
    return NextResponse.json(
      {
        error: error.message || 'リクエストに失敗しました',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
