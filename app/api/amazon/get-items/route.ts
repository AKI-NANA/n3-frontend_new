import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AmazonAPIClient } from '@/lib/amazon/amazon-api-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { asins } = body

    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json({ error: 'ASINs array required' }, { status: 400 })
    }

    // 最大10件まで一度に取得
    const asinBatch = asins.slice(0, 10)

    const amazonClient = new AmazonAPIClient()
    const results = await amazonClient.getItems(asinBatch)

    // Amazon APIレスポンスを正規化してSupabaseに保存
    const items = results.ItemsResult?.Items || []

    for (const item of items) {
      const productData = {
        asin: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue,
        brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
        manufacturer: item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue,
        product_group: item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue,
        binding: item.ItemInfo?.Classifications?.Binding?.DisplayValue,
        current_price: item.Offers?.Listings?.[0]?.Price?.Amount,
        currency: item.Offers?.Listings?.[0]?.Price?.Currency,
        price_min: item.Offers?.Summaries?.[0]?.LowestPrice?.Amount,
        price_max: item.Offers?.Summaries?.[0]?.HighestPrice?.Amount,
        savings_amount: item.Offers?.Listings?.[0]?.Price?.Savings?.Amount,
        savings_percentage: item.Offers?.Listings?.[0]?.Price?.Savings?.Percentage,
        availability_status: item.Offers?.Listings?.[0]?.Availability?.Type,
        availability_message: item.Offers?.Listings?.[0]?.Availability?.Message,
        max_order_quantity: item.Offers?.Listings?.[0]?.Availability?.MaxOrderQuantity,
        is_prime_eligible: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible,
        is_amazon_fulfilled: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsAmazonFulfilled,
        is_free_shipping_eligible: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsFreeShippingEligible,
        images_primary: item.Images?.Primary,
        images_variants: item.Images?.Variants,
        features: item.ItemInfo?.Features?.DisplayValues,
        product_dimensions: item.ItemInfo?.ProductInfo?.UnitCount,
        item_specifics: item.ItemInfo?.TechnicalInfo,
        browse_nodes: item.BrowseNodeInfo?.BrowseNodes,
        parent_asin: item.ParentASIN,
        last_api_update_at: new Date().toISOString(),
        user_id: user.id
      }

      // UPSERT
      await supabase
        .from('amazon_products')
        .upsert(productData, { onConflict: 'asin' })
    }

    return NextResponse.json({ success: true, count: items.length })
  } catch (error: any) {
    console.error('Amazon get items error:', error)
    return NextResponse.json(
      { error: error.message || 'Get items failed' },
      { status: 500 }
    )
  }
}
