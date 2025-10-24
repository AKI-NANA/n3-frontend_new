// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 商品情報を更新（モーダルからの保存）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const updates = await request.json()

    console.log(`[Product Update] ID: ${productId}`)
    console.log('[Product Update] Updates:', updates)

    // 現在の商品データを取得
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchError || !currentProduct) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 更新データを準備
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // 基本フィールドの更新
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.english_title !== undefined) updateData.english_title = updates.english_title
    if (updates.price_jpy !== undefined) updateData.price_jpy = updates.price_jpy
    if (updates.price_usd !== undefined) updateData.price_usd = updates.price_usd
    if (updates.current_stock !== undefined) updateData.current_stock = updates.current_stock
    if (updates.sku !== undefined) updateData.sku = updates.sku
    if (updates.master_key !== undefined) updateData.master_key = updates.master_key
    if (updates.status !== undefined) updateData.status = updates.status

    // listing_dataの更新（JSONBフィールド）
    if (updates.listing_data) {
      updateData.listing_data = {
        ...(currentProduct.listing_data || {}),
        ...updates.listing_data
      }
    }

    // scraped_dataの更新（JSONBフィールド）
    if (updates.scraped_data) {
      updateData.scraped_data = {
        ...(currentProduct.scraped_data || {}),
        ...updates.scraped_data
      }
    }

    // ebay_api_dataの更新（JSONBフィールド）
    if (updates.ebay_api_data) {
      updateData.ebay_api_data = {
        ...(currentProduct.ebay_api_data || {}),
        ...updates.ebay_api_data
      }
    }

    // 画像データの更新
    if (updates.images) {
      // scraped_data.image_urlsを更新
      updateData.scraped_data = {
        ...(updateData.scraped_data || currentProduct.scraped_data || {}),
        image_urls: updates.images
      }
    }

    // データベース更新
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (updateError) {
      console.error('[Product Update] Error:', updateError)
      throw updateError
    }

    console.log('[Product Update] Success:', updatedProduct.id)

    return NextResponse.json({
      success: true,
      product: updatedProduct
    })

  } catch (error: any) {
    console.error('[Product Update] Error:', error)
    return NextResponse.json(
      { error: error.message || '商品の更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 商品情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })

  } catch (error: any) {
    console.error('[Product Get] Error:', error)
    return NextResponse.json(
      { error: error.message || '商品の取得に失敗しました' },
      { status: 500 }
    )
  }
}
