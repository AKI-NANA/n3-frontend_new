// app/api/products/update/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { id, updates } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    console.log('📝 商品更新API呼び出し:', { id, updates })
    console.log('🔍 英語データ検証:', {
      english_title: updates.english_title,
      title_en: updates.title_en,
      english_description: updates.english_description?.substring(0, 50),
      description_en: updates.description_en?.substring(0, 50)
    })
    
    const supabase = await createClient()
    
    // 🔥 products_masterテーブルを更新
    const { data, error } = await supabase
      .from('products_master')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Supabase更新エラー:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    console.log('✅ 商品更新成功:', data)
    
    return NextResponse.json({
      success: true,
      product: data
    })
    
  } catch (error: any) {
    console.error('❌ 商品更新処理エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
