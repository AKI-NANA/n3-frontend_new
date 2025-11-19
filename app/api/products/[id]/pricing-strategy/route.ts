import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import type { ProductPricingStrategy } from '@/types/pricing'

/**
 * GET /api/products/[id]/pricing-strategy
 * 商品の有効な価格戦略を取得（デフォルト or 個別設定）
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const productId = params.id

    const supabase = createClient()

    // product_effective_strategy ビューから取得
    const { data, error } = await supabase
      .from('product_effective_strategy')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (error) {
      console.error('❌ 価格戦略取得エラー:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '価格戦略の取得に失敗しました',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data as ProductPricingStrategy
    })
  } catch (error) {
    console.error('❌ 価格戦略取得エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/products/[id]/pricing-strategy
 * 商品の個別価格戦略を更新
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const productId = params.id
    const body = await request.json()

    const supabase = createClient()

    // 更新データの準備
    const updateData: any = {
      use_default_pricing: body.use_default_pricing ?? true,
      use_default_inventory: body.use_default_inventory ?? true,
      updated_at: new Date().toISOString()
    }

    // 個別価格設定
    if (!body.use_default_pricing) {
      if (!body.custom_pricing_strategy) {
        return NextResponse.json(
          { success: false, error: '価格戦略タイプを選択してください' },
          { status: 400 }
        )
      }

      updateData.custom_pricing_strategy = body.custom_pricing_strategy
      updateData.custom_strategy_params = body.custom_strategy_params || {}
      updateData.pricing_overridden_at = new Date().toISOString()
      updateData.pricing_overridden_by = 'user' // TODO: 実際のユーザー情報を使用
    } else {
      // デフォルトに戻す場合
      updateData.custom_pricing_strategy = null
      updateData.custom_strategy_params = {}
      updateData.pricing_overridden_at = null
      updateData.pricing_overridden_by = null
    }

    // 個別在庫設定
    if (!body.use_default_inventory) {
      if (body.custom_out_of_stock_action) {
        updateData.custom_out_of_stock_action = body.custom_out_of_stock_action
      }
      if (body.custom_check_frequency) {
        updateData.custom_check_frequency = body.custom_check_frequency
      }
    } else {
      updateData.custom_out_of_stock_action = null
      updateData.custom_check_frequency = null
    }

    // メモ
    if (body.pricing_strategy_notes !== undefined) {
      updateData.pricing_strategy_notes = body.pricing_strategy_notes
    }

    // products_master を更新
    const { data, error } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('❌ 価格戦略更新エラー:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '価格戦略の更新に失敗しました',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: '価格戦略を更新しました'
    })
  } catch (error) {
    console.error('❌ 価格戦略更新エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]/pricing-strategy
 * 個別設定を削除してデフォルトに戻す
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const productId = params.id

    const supabase = createClient()

    // デフォルトに戻す
    const { data, error } = await supabase
      .from('products_master')
      .update({
        use_default_pricing: true,
        use_default_inventory: true,
        custom_pricing_strategy: null,
        custom_strategy_params: {},
        custom_out_of_stock_action: null,
        custom_check_frequency: null,
        pricing_strategy_notes: null,
        pricing_overridden_at: null,
        pricing_overridden_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('❌ デフォルトに戻すエラー:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'デフォルトに戻す処理に失敗しました',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'デフォルト設定に戻しました'
    })
  } catch (error) {
    console.error('❌ デフォルトに戻すエラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
