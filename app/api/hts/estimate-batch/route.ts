// app/api/hts/estimate-batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * HTS一括推定API
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

    console.log('📋 HTS一括推定開始:', productIds.length, '件')

    let successCount = 0
    let failedCount = 0

    for (const productId of productIds) {
      try {
        // 商品情報取得
        const { data: product, error: fetchError } = await supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) {
          console.log(`  ⏭️ ${productId}: 商品が見つかりません`)
          failedCount++
          continue
        }

        // 既にHTSコードがある場合はスキップ
        if (product.hts_code && product.hts_code !== '要確認') {
          console.log(`  ⏭️ ${productId}: HTS既存 (${product.hts_code})`)
          successCount++
          continue
        }

        // HTS推定API呼び出し
        const estimateResponse = await fetch('http://localhost:3000/api/hts/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            title: product.title || product.english_title,
            categoryName: product.category_name,
            categoryId: product.category_id,
            material: product.material,
            description: product.description
          })
        })

        if (!estimateResponse.ok) {
          console.error(`  ❌ ${productId}: HTS推定API失敗`)
          failedCount++
          continue
        }

        const estimateData = await estimateResponse.json()

        if (estimateData.success && estimateData.htsCode) {
          // データベース更新
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              hts_code: estimateData.htsCode,
              hts_description: estimateData.htsDescription || '',
              hts_duty_rate: estimateData.dutyRate || null,
              hts_confidence: estimateData.confidence || 'uncertain',
              updated_at: new Date().toISOString()
            })
            .eq('id', productId)

          if (updateError) {
            console.error(`  ❌ ${productId}: DB更新失敗`, updateError)
            failedCount++
          } else {
            console.log(`  ✅ ${productId}: ${estimateData.htsCode}`)
            successCount++
          }
        } else {
          console.log(`  ⚠️ ${productId}: HTS推定できず`)
          failedCount++
        }

      } catch (error: any) {
        console.error(`  ❌ ${productId}:`, error.message)
        failedCount++
      }
    }

    console.log(`📊 HTS一括推定完了: 成功${successCount}件 / 失敗${failedCount}件`)

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failedCount,
      total: productIds.length
    })

  } catch (error: any) {
    console.error('❌ HTS一括推定エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
