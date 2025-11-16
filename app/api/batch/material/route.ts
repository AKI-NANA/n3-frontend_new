// app/api/batch/material/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 素材一括取得API（関税率も同時取得）
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

    console.log('🧵 素材一括取得開始:', productIds.length, '件')

    let updatedCount = 0

    for (const productId of productIds) {
      try {
        const { data: product, error: fetchError } = await supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) continue

        // 既に素材がある場合はスキップ
        if (product.material) {
          console.log(`  ⏭️ ${productId}: 素材既存 (${product.material})`)
          continue
        }

        const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
        
        if (referenceItems.length === 0) continue

        const materials = referenceItems
          .map((item: any) => item.itemSpecifics?.Material)
          .filter((m: string) => m)

        if (materials.length === 0) continue

        const materialCount: Record<string, number> = {}
        materials.forEach((m: string) => {
          materialCount[m] = (materialCount[m] || 0) + 1
        })

        const mostCommonMaterial = Object.entries(materialCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0]

        if (mostCommonMaterial) {
          // 素材の関税率を判定
          let materialDutyRate = 0
          const materialLower = mostCommonMaterial.toLowerCase()
          
          if (materialLower.includes('aluminum') || materialLower.includes('アルミ')) {
            materialDutyRate = 10
          } else if (materialLower.includes('steel') || materialLower.includes('stainless') || 
                     materialLower.includes('鉄') || materialLower.includes('ステンレス')) {
            materialDutyRate = 25
          }
          
          // データベース更新
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              material: mostCommonMaterial,
              material_duty_rate: materialDutyRate,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId)

          if (!updateError) {
            console.log(`  ✅ ${productId}: ${mostCommonMaterial} (${materialDutyRate}%)`)
            updatedCount++
          }
        }

      } catch (error: any) {
        console.error(`  ❌ ${productId}:`, error.message)
      }
    }

    console.log(`📊 素材一括取得完了: ${updatedCount}件更新`)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: productIds.length
    })

  } catch (error: any) {
    console.error('❌ 素材一括取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
