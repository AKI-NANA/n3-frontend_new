/**
 * eBay Inventory API - 在庫一覧取得
 * greenとmjtアカウントの両方に対応
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/ebay/token'

const EBAY_API_BASE = 'https://api.ebay.com'

interface EbayInventoryItem {
  sku: string
  availability?: {
    shipToLocationAvailability?: {
      quantity?: number
    }
  }
  product?: {
    title?: string
    description?: string
    imageUrls?: string[]
    aspects?: Record<string, string[]>
  }
  condition?: string
  packageWeightAndSize?: {
    dimensions?: {
      height: number
      length: number
      width: number
      unit: string
    }
    weight?: {
      value: number
      unit: string
    }
  }
}

interface EbayOffer {
  offerId: string
  sku: string
  marketplaceId: string
  format: string
  availableQuantity: number
  categoryId: string
  listingDescription?: string
  pricingSummary?: {
    price?: {
      currency: string
      value: string
    }
  }
  status?: string
  listingId?: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const account = searchParams.get('account') || 'green' // green or mjt

    console.log(`📤 eBay Inventory API 呼び出し中... (account: ${account})`)

    // アクセストークン取得
    const tokenData = await getAccessToken(account as 'green' | 'mjt')

    if (!tokenData || !tokenData.access_token) {
      return NextResponse.json(
        { error: `${account}アカウントのアクセストークン取得に失敗` },
        { status: 400 }
      )
    }

    const accessToken = tokenData.access_token

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
    const inventoryItems: EbayInventoryItem[] = inventoryData.inventoryItems || []

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

    let offers: EbayOffer[] = []
    if (offersResponse.ok) {
      const offersData = await offersResponse.json()
      offers = offersData.offers || []
    }

    // Step 3: データをマージして統一フォーマットに変換
    const products = inventoryItems.map(item => {
      const offer = offers.find(o => o.sku === item.sku)

      return {
        id: item.sku,
        unique_id: `EBAY-${account.toUpperCase()}-${item.sku}`,
        product_name: item.product?.title || item.sku,
        sku: item.sku,
        product_type: 'stock',
        marketplace: 'ebay',
        account: account,
        physical_quantity: item.availability?.shipToLocationAvailability?.quantity || 0,
        listing_quantity: offer?.availableQuantity || 0,
        cost_price: 0, // eBay APIでは取得不可
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
          account: account,
          fetched_at: new Date().toISOString()
        }
      }
    })

    console.log(`✅ ${account}アカウント: ${products.length}件の商品を取得`)

    return NextResponse.json({
      success: true,
      account: account,
      total: products.length,
      products: products,
      message: `${account}アカウントから${products.length}件の商品を取得しました`
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
