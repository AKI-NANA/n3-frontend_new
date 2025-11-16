/**
 * eBay 出品 API エンドポイント
 * products_masterテーブルからeBayへの出品を処理
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { listProductToEbay } from '@/lib/ebay/inventory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, account = 'account1' } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    // Supabaseクライアント作成
    const supabase = createClient()

    // products_masterから商品データを取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select(`
        id,
        sku,
        title_ja,
        title_en,
        listing_data,
        scraped_data,
        ebay_api_data,
        current_stock
      `)
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: 'Product not found', details: fetchError },
        { status: 404 }
      )
    }

    // listing_dataの必須フィールドチェック
    if (!product.listing_data) {
      return NextResponse.json(
        { error: 'listing_data is missing' },
        { status: 400 }
      )
    }

    const listingData = product.listing_data as any
    
    // 必須フィールドの検証
    const requiredFields = [
      'condition',
      'html_description',
      'ddp_price_usd',
      'ddu_price_usd',
      'shipping_service',
      'shipping_cost_usd',
      'weight_g',
      'width_cm',
      'height_cm',
      'length_cm'
    ]

    const missingFields = requiredFields.filter(field => !listingData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required listing fields',
          missingFields 
        },
        { status: 400 }
      )
    }

    // ebay_api_dataのチェック
    const ebayData = product.ebay_api_data as any
    if (!ebayData?.category_id) {
      return NextResponse.json(
        { error: 'eBay category_id is missing in ebay_api_data' },
        { status: 400 }
      )
    }

    // scraped_dataから画像URLを取得
    const scrapedData = product.scraped_data as any
    const imageUrls = scrapedData?.image_urls || scrapedData?.images || []

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No images available for listing' },
        { status: 400 }
      )
    }

    // eBay出品用データ構造に変換
    const listingProduct = {
      id: product.id,
      sku: product.sku,
      title: product.title_ja,
      english_title: product.title_en,
      price_usd: listingData.ddp_price_usd,
      listing_data: {
        condition: listingData.condition,
        html_description: listingData.html_description,
        ddp_price_usd: listingData.ddp_price_usd,
        ddu_price_usd: listingData.ddu_price_usd,
        shipping_service: listingData.shipping_service,
        shipping_cost_usd: listingData.shipping_cost_usd,
        weight_g: listingData.weight_g,
        width_cm: listingData.width_cm,
        height_cm: listingData.height_cm,
        length_cm: listingData.length_cm
      },
      ebay_api_data: {
        category_id: ebayData.category_id,
        title: ebayData.title || product.title_en
      },
      scraped_data: {
        image_urls: imageUrls
      },
      current_stock: product.current_stock || 1
    }

    // eBayに出品
    const result = await listProductToEbay(listingProduct, account)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to list on eBay',
          details: result.error 
        },
        { status: 500 }
      )
    }

    // 出品成功後、products_masterを更新
    const updateData: any = {
      ebay_listed: true,
      ebay_listing_id: result.listingId,
      ebay_offer_id: result.offerId,
      updated_at: new Date().toISOString()
    }

    // ebay_api_dataを更新
    const updatedEbayData = {
      ...ebayData,
      listing_id: result.listingId,
      offer_id: result.offerId,
      listed_at: new Date().toISOString(),
      account: account
    }

    updateData.ebay_api_data = updatedEbayData

    const { error: updateError } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', productId)

    if (updateError) {
      console.error('Failed to update products_master:', updateError)
      // 出品は成功しているので、エラーは警告として扱う
    }

    return NextResponse.json({
      success: true,
      listingId: result.listingId,
      offerId: result.offerId,
      url: `https://www.ebay.com/itm/${result.listingId}`,
      product: {
        id: product.id,
        sku: product.sku,
        title: product.title_en || product.title_ja
      }
    })

  } catch (error: any) {
    console.error('eBay listing error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
