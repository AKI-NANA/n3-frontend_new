// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 商品データ更新API
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const updates = await request.json()

    console.log('📝 商品データ更新開始')
    console.log(`  Product ID: ${productId}`)
    console.log('  Updates:', Object.keys(updates))

    // products_masterを更新
    const { data, error } = await supabase
      .from('products_master')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('  ❌ 更新エラー:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log('  ✅ 更新完了')

    return NextResponse.json({
      success: true,
      data,
      message: '商品データを更新しました'
    })

  } catch (error: any) {
    console.error('❌ 商品更新エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 商品データ取得API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    const { data, error } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
