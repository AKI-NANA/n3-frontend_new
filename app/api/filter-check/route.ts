// app/api/filter-check/route.ts - シンプル版
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  console.log('='.repeat(50))
  console.log('🔍 フィルターチェックAPI開始')
  console.log('='.repeat(50))
  
  try {
    const body = await req.json()
    const { productIds } = body
    
    console.log('1️⃣ 受信データ:', { productIds })

    // 商品データを取得
    const { data: products, error } = await supabase
      .from('products_master')
      .select('id, title, english_title, listing_data')
      .in('id', productIds)

    if (error) {
      console.error('❌ DB エラー:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log('2️⃣ 商品取得成功:', products?.length, '件')

    // NGワード取得
    const { data: keywords, error: kwError } = await supabase
      .from('filter_keywords')
      .select('keyword, type')
      .eq('is_active', true)

    if (kwError) {
      console.error('❌ NGワード取得エラー:', kwError)
      return NextResponse.json({ 
        success: false, 
        error: kwError.message 
      }, { status: 500 })
    }

    console.log('3️⃣ NGワード取得成功:', keywords?.length, '件')

    // フィルターチェック
    const results = products.map(product => {
      const titleLower = (product.title || '').toLowerCase()
      const detected = keywords?.filter(kw => 
        titleLower.includes(kw.keyword.toLowerCase())
      ) || []
      
      const passed = detected.length === 0
      
      console.log(`   商品 ${product.id}: ${passed ? '✅通過' : '❌不合格'}`)
      
      return {
        productId: product.id,
        passed,
        detectedKeywords: detected
      }
    })

    // 結果を保存
    console.log('4️⃣ データベースに保存中...')
    
    for (const result of results) {
      const currentProduct = products.find(p => p.id === result.productId)
      const currentData = currentProduct?.listing_data || {}
      
      console.log(`   商品 ${result.productId}:`)
      console.log(`     現在のlisting_data:`, currentData)
      
      const updatedData = {
        ...currentData,
        filter_passed: result.passed,
        filter_checked_at: new Date().toISOString(),
        filter_detected_keywords: result.detectedKeywords
      }
      
      console.log(`     更新後のlisting_data:`, updatedData)
      
      const { error: updateError } = await supabase
        .from('products_master')
        .update({ listing_data: updatedData })
        .eq('id', result.productId)
      
      if (updateError) {
        console.error(`     ❌ 保存エラー:`, updateError)
      } else {
        console.log(`     ✅ 保存成功`)
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    }

    console.log('4️⃣ 完了:', summary)
    console.log('='.repeat(50))

    return NextResponse.json({
      success: true,
      results,
      summary
    })

  } catch (error: any) {
    console.error('💥 予期しないエラー:', error)
    console.error('スタック:', error.stack)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
