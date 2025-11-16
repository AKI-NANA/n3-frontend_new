// app/api/batch/origin-country/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 原産国一括取得API（関税率も同時取得）
 */
export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log('🌍 原産国一括取得開始:', productIds.length, '件')

    let updatedCount = 0

    for (const productId of productIds) {
      try {
        const { data: product, error: fetchError } = await supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) continue

        let originCountry = product.origin_country

        // 原産国がない場合はeBayデータから取得
        if (!originCountry) {
          const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
          
          if (referenceItems.length === 0) continue

          const countries = referenceItems
            .map((item: any) => item.itemLocation?.country)
            .filter((c: string) => c)

          if (countries.length === 0) continue

          const countryCount: Record<string, number> = {}
          countries.forEach((c: string) => {
            countryCount[c] = (countryCount[c] || 0) + 1
          })

          originCountry = Object.entries(countryCount)
            .sort((a, b) => b[1] - a[1])[0]?.[0]
        }

        if (originCountry) {
          // 関税率取得
          let dutyRate = 0
          try {
            const dutyResponse = await fetch('http://localhost:3000/api/hts/lookup-duty-rates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                productIds: [productId],
                onlyOriginCountry: true
              })
            })
            
            if (dutyResponse.ok) {
              const dutyData = await dutyResponse.json()
              if (dutyData.success && dutyData.results?.[0]?.updates?.origin_country_duty_rate != null) {
                dutyRate = dutyData.results[0].updates.origin_country_duty_rate
              }
            }
          } catch (dutyError) {
            console.warn('関税率取得スキップ:', dutyError)
          }
          
          // データベース更新
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              origin_country: originCountry,
              origin_country_duty_rate: dutyRate,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId)

          if (!updateError) {
            console.log(`  ✅ ${productId}: ${originCountry} (${dutyRate}%)`)
            updatedCount++
          }
        }

      } catch (error: any) {
        console.error(`  ❌ ${productId}:`, error.message)
      }
    }

    console.log(`📊 原産国一括取得完了: ${updatedCount}件更新`)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: productIds.length
    })

  } catch (error: any) {
    console.error('❌ 原産国一括取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
