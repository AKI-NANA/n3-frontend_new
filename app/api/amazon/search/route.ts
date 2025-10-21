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
    const { keywords, minPrice, maxPrice, category, primeOnly } = body

    if (!keywords) {
      return NextResponse.json({ error: 'Keywords required' }, { status: 400 })
    }

    const amazonClient = new AmazonAPIClient()
    const results = await amazonClient.searchItems(keywords, {
      minPrice,
      maxPrice,
      category,
      primeOnly
    })

    // Amazon APIレスポンスを正規化してSupabaseに保存
    const products = results.SearchResult?.Items || []

    for (const item of products) {
      const productData = {
        asin: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue,
        brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
        current_price: item.Offers?.Listings?.[0]?.Price?.Amount,
        currency: item.Offers?.Listings?.[0]?.Price?.Currency,
        availability_status: item.Offers?.Listings?.[0]?.Availability?.Type,
        availability_message: item.Offers?.Listings?.[0]?.Availability?.Message,
        is_prime_eligible: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible,
        is_amazon_fulfilled: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsAmazonFulfilled,
        images_primary: item.Images?.Primary,
        images_variants: item.Images?.Variants,
        features: item.ItemInfo?.Features?.DisplayValues,
        last_api_update_at: new Date().toISOString(),
        user_id: user.id
      }

      // UPSERT（存在すれば更新、なければ挿入）
      await supabase
        .from('amazon_products')
        .upsert(productData, { onConflict: 'asin' })
    }

    return NextResponse.json({ success: true, count: products.length })
  } catch (error: any) {
    console.error('Amazon search error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
