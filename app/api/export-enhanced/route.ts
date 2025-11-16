// app/api/export-enhanced/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * 拡張CSVエクスポートAPI
 * 競合情報・DDP計算結果を含む完全版
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productIds = searchParams.get('ids')?.split(',').map(Number) || []

    console.log('📊 拡張CSVエクスポート開始')
    console.log('  対象商品数:', productIds.length || 'ALL')

    // 商品データ取得
    let query = supabase
      .from('products_master')
      .select('*')
      .order('id', { ascending: false })

    if (productIds.length > 0) {
      query = query.in('id', productIds)
    }

    const { data: products, error } = await query

    if (error) {
      throw new Error('商品データ取得エラー: ' + error.message)
    }

    console.log(`✅ ${products?.length || 0}件の商品データを取得`)

    // CSV行を生成
    const csvRows = products?.map(product => {
      // セルミラーデータ
      const sellerMirror = product.ebay_api_data?.listing_reference
      const referenceItems = sellerMirror?.referenceItems || []

      // 競合情報計算
      const competitorCount = referenceItems.length
      const prices = referenceItems
        .map((item: any) => item.price)
        .filter((p: number) => p > 0)
      
      const pricesWithShipping = referenceItems
        .map((item: any) => (item.price || 0) + (item.shippingCost || 0))
        .filter((p: number) => p > 0)

      const competitorMinPrice = prices.length > 0 ? Math.min(...prices) : null
      const competitorMinPriceWithShipping = pricesWithShipping.length > 0 
        ? Math.min(...pricesWithShipping) 
        : null
      const competitorAvgPrice = prices.length > 0
        ? prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length
        : null

      // セラー情報
      const sellers = referenceItems
        .map((item: any) => item.seller)
        .filter((s: string) => s)
      const sellerCounts = sellers.reduce((acc: any, seller: string) => {
        acc[seller] = (acc[seller] || 0) + 1
        return acc
      }, {})
      const topSeller = Object.entries(sellerCounts)
        .sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] || ''

      // listing_data
      const listingData = product.listing_data || {}

      // DDP計算結果
      const htsCode = listingData.hts_code || ''
      const dutyRate = listingData.duty_rate || 0
      const originCountry = listingData.origin_country || ''

      // 推奨価格（15%利益）
      const costJPY = listingData.cost_jpy || product.price_jpy || 0
      const exchangeRate = 150 // 仮のレート
      const costUSD = costJPY / exchangeRate
      const recommendedPrice = costUSD * 1.15 // 15%利益

      // 最安値時の利益計算
      const minPriceProfit = competitorMinPrice 
        ? competitorMinPrice - costUSD 
        : null
      const minPriceProfitRate = competitorMinPrice
        ? ((competitorMinPrice - costUSD) / competitorMinPrice) * 100
        : null

      // 損益分岐点
      const breakevenPrice = costUSD * 1.05 // 5%マージン

      return {
        // 基本情報
        id: product.id,
        title: product.title,
        english_title: product.english_title || '',
        price_jpy: product.price_jpy,
        cost_jpy: costJPY,
        
        // 寸法・重量
        weight_g: listingData.weight_g || '',
        length_cm: listingData.length_cm || '',
        width_cm: listingData.width_cm || '',
        height_cm: listingData.height_cm || '',

        // 競合情報
        competitor_count: competitorCount,
        competitor_min_price_usd: competitorMinPrice?.toFixed(2) || '',
        competitor_min_price_with_shipping_usd: competitorMinPriceWithShipping?.toFixed(2) || '',
        competitor_avg_price_usd: competitorAvgPrice?.toFixed(2) || '',
        top_seller: topSeller,

        // DDP計算
        recommended_price_usd: recommendedPrice.toFixed(2),
        min_price_profit_usd: minPriceProfit?.toFixed(2) || '',
        min_price_profit_rate: minPriceProfitRate?.toFixed(2) || '',
        breakeven_price_usd: breakevenPrice.toFixed(2),

        // 関税情報
        hts_code: htsCode,
        duty_rate_percent: (dutyRate * 100).toFixed(2),
        origin_country: originCountry,

        // eBay情報
        ebay_category_id: product.ebay_category_id || '',
        ebay_category_name: product.ebay_api_data?.category_name || '',

        // 日時
        created_at: product.created_at,
        updated_at: product.updated_at
      }
    }) || []

    // CSV生成
    const headers = [
      'ID',
      '商品名',
      '英語タイトル',
      '価格(円)',
      'コスト(円)',
      '重量(g)',
      '長さ(cm)',
      '幅(cm)',
      '高さ(cm)',
      '競合数',
      '競合最安値(USD)',
      '競合最安値+送料(USD)',
      '競合平均価格(USD)',
      '最多出品者',
      '推奨価格15%(USD)',
      '最安値時利益額(USD)',
      '最安値時利益率(%)',
      '損益分岐点(USD)',
      'HTSコード',
      '関税率(%)',
      '原産国',
      'eBayカテゴリID',
      'eBayカテゴリ名',
      '作成日',
      '更新日'
    ]

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => [
        row.id,
        `"${row.title.replace(/"/g, '""')}"`,
        `"${row.english_title.replace(/"/g, '""')}"`,
        row.price_jpy,
        row.cost_jpy,
        row.weight_g,
        row.length_cm,
        row.width_cm,
        row.height_cm,
        row.competitor_count,
        row.competitor_min_price_usd,
        row.competitor_min_price_with_shipping_usd,
        row.competitor_avg_price_usd,
        `"${row.top_seller}"`,
        row.recommended_price_usd,
        row.min_price_profit_usd,
        row.min_price_profit_rate,
        row.breakeven_price_usd,
        row.hts_code,
        row.duty_rate_percent,
        row.origin_country,
        row.ebay_category_id,
        `"${row.ebay_category_name}"`,
        row.created_at,
        row.updated_at
      ].join(','))
    ].join('\n')

    // BOM付きUTF-8でエンコード
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    console.log('✅ CSV生成完了')

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products_enhanced_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error: any) {
    console.error('❌ CSVエクスポートエラー:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
