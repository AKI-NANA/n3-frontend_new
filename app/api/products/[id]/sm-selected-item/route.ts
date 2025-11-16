// app/api/products/[id]/sm-selected-item/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * SM分析で選択した商品を保存
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const body = await request.json()
    const { itemId, title, price, image, seller, condition } = body

    console.log('💾 SM選択商品を保存:', { productId, itemId, title, price })

    // 現在のebay_api_dataを取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('ebay_api_data')
      .eq('id', productId)
      .single()

    if (fetchError) {
      console.error('❌ 商品取得エラー:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const existingApiData = product?.ebay_api_data || {}

    // sm_selected_itemを保存
    const updatedApiData = {
      ...existingApiData,
      sm_selected_item: {
        itemId,
        title,
        price,
        image,
        seller,
        condition,
        selectedAt: new Date().toISOString()
      }
    }

    // DBに保存
    const { error: updateError } = await supabase
      .from('products_master')
      .update({
        ebay_api_data: updatedApiData,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (updateError) {
      console.error('❌ 更新エラー:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ SM選択商品を保存しました')

    return NextResponse.json({
      success: true,
      message: 'SM選択商品を保存しました',
      data: updatedApiData.sm_selected_item
    })

  } catch (error: any) {
    console.error('❌ SM選択商品保存エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * SM選択商品を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    const { data: product, error } = await supabase
      .from('products_master')
      .select('ebay_api_data')
      .eq('id', productId)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const smSelectedItem = product?.ebay_api_data?.sm_selected_item || null

    return NextResponse.json({
      success: true,
      data: smSelectedItem
    })

  } catch (error: any) {
    console.error('❌ SM選択商品取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
