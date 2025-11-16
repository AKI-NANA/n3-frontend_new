/**
 * eBay 在庫同期 API
 * eBay上の出品状態をproducts_masterに同期
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/ebay/oauth'

const EBAY_API_BASE = 'https://api.ebay.com'

interface EbayInventoryItem {
  sku: string
  availability: {
    shipToLocationAvailability: {
      quantity: number
    }
  }
  product: {
    title: string
  }
}

interface EbayOffer {
  offerId: string
  sku: string
  listingId?: string
  status: string
  pricingSummary: {
    price: {
      value: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account = 'account1', syncAll = false } = body

    const supabase = createClient()

    // eBay Access Token取得
    const accessToken = await getAccessToken(account)

    // eBayからInventory Itemsを取得
    const inventoryResponse = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/inventory_item?limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!inventoryResponse.ok) {
      const error = await inventoryResponse.text()
      return NextResponse.json(
        { error: 'Failed to fetch inventory', details: error },
        { status: 500 }
      )
    }

    const inventoryData = await inventoryResponse.json()
    const inventoryItems: EbayInventoryItem[] = inventoryData.inventoryItems || []

    // eBayからOffersを取得
    const offersResponse = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/offer?limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!offersResponse.ok) {
      const error = await offersResponse.text()
      return NextResponse.json(
        { error: 'Failed to fetch offers', details: error },
        { status: 500 }
      )
    }

    const offersData = await offersResponse.json()
    const offers: EbayOffer[] = offersData.offers || []

    // SKUでマージ
    const ebayProducts = inventoryItems.map(item => {
      const offer = offers.find(o => o.sku === item.sku)
      return {
        sku: item.sku,
        title: item.product.title,
        quantity: item.availability.shipToLocationAvailability.quantity,
        offerId: offer?.offerId,
        listingId: offer?.listingId,
        status: offer?.status || 'UNPUBLISHED',
        price: offer?.pricingSummary?.price?.value
      }
    })

    // products_masterと同期
    const syncResults = []
    
    for (const ebayProduct of ebayProducts) {
      const { data: product, error: fetchError } = await supabase
        .from('products_master')
        .select('id, sku, ebay_api_data, current_stock')
        .eq('sku', ebayProduct.sku)
        .single()

      if (fetchError || !product) {
        syncResults.push({
          sku: ebayProduct.sku,
          status: 'not_found',
          message: 'Product not found in products_master'
        })
        continue
      }

      // 在庫数の更新
      const needsUpdate = 
        product.current_stock !== ebayProduct.quantity ||
        !product.ebay_api_data ||
        (product.ebay_api_data as any).listing_id !== ebayProduct.listingId

      if (needsUpdate) {
        const updatedEbayData = {
          ...(product.ebay_api_data || {}),
          listing_id: ebayProduct.listingId,
          offer_id: ebayProduct.offerId,
          status: ebayProduct.status,
          last_synced_at: new Date().toISOString(),
          account: account
        }

        const { error: updateError } = await supabase
          .from('products_master')
          .update({
            current_stock: ebayProduct.quantity,
            ebay_api_data: updatedEbayData,
            ebay_listed: ebayProduct.status === 'PUBLISHED',
            ebay_listing_id: ebayProduct.listingId,
            ebay_offer_id: ebayProduct.offerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)

        if (updateError) {
          syncResults.push({
            sku: ebayProduct.sku,
            status: 'error',
            message: updateError.message
          })
        } else {
          syncResults.push({
            sku: ebayProduct.sku,
            status: 'updated',
            changes: {
              quantity: ebayProduct.quantity,
              listingId: ebayProduct.listingId,
              status: ebayProduct.status
            }
          })
        }
      } else {
        syncResults.push({
          sku: ebayProduct.sku,
          status: 'no_change'
        })
      }
    }

    const summary = {
      total: syncResults.length,
      updated: syncResults.filter(r => r.status === 'updated').length,
      noChange: syncResults.filter(r => r.status === 'no_change').length,
      errors: syncResults.filter(r => r.status === 'error').length,
      notFound: syncResults.filter(r => r.status === 'not_found').length
    }

    return NextResponse.json({
      success: true,
      summary,
      results: syncResults,
      account
    })

  } catch (error: any) {
    console.error('eBay sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync with eBay',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET: 同期状態の確認
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')

    const supabase = createClient()

    let query = supabase
      .from('products_master')
      .select('sku, title_en, ebay_listed, ebay_listing_id, ebay_offer_id, current_stock, ebay_api_data')

    if (sku) {
      query = query.eq('sku', sku)
    } else {
      query = query.eq('ebay_listed', true).limit(100)
    }

    const { data: products, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: products?.length || 0,
      products: products || []
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch sync status', details: error.message },
      { status: 500 }
      )
  }
}
