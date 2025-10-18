// app/api/ebay/save-categories/route.ts (全件保存版)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: Request) {
  console.log('========================================')
  console.log('Save Categories API Called')
  console.log('========================================')
  
  try {
    const { categories } = await request.json()

    console.log('Received categories:', categories?.length)

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Invalid categories data' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    let success = 0
    let failed = 0
    const errors: string[] = []

    // バッチ処理（100件ずつ）
    const batchSize = 100
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize)
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(categories.length / batchSize)}...`)

      const upsertData = batch.map(cat => ({
        category_key: cat.categoryId,
        category_name: cat.categoryName,
        category_path: cat.categoryPath || cat.categoryName,
        category_parent_id: cat.categoryParentId || null,
        category_level: cat.categoryLevel || 1,
        fvf: cat.fvfRate,
        insertion_fee: cat.insertionFee || 0.35,
        active: true,
      }))

      const { data, error } = await supabase
        .from('ebay_pricing_category_fees')
        .upsert(upsertData, {
          onConflict: 'category_key',
        })
        .select()

      if (error) {
        console.error(`Batch ${i}-${i + batchSize} error:`, error)
        errors.push(`Batch ${i}: ${error.message}`)
        failed += batch.length
      } else {
        console.log(`Batch ${i}-${i + batchSize} success: ${data?.length || batch.length} rows`)
        success += batch.length
      }
    }

    console.log('All batches complete:', { success, failed, total: categories.length })

    return NextResponse.json({
      success,
      failed,
      total: categories.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // 最初の10個のエラーのみ
    })
  } catch (error: any) {
    console.error('========================================')
    console.error('FATAL ERROR in save-categories API:')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    console.error('========================================')
    
    return NextResponse.json(
      { 
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
