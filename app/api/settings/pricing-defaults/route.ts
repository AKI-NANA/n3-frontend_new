import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import type { PricingDefaults, PricingDefaultsFormData } from '@/types/pricing'

/**
 * GET /api/settings/pricing-defaults
 * グローバルデフォルト価格戦略を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('pricing_defaults')
      .select('*')
      .eq('setting_name', 'global_default')
      .single()

    if (error) {
      // レコードが存在しない場合は初期値を返す
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: null,
          message: 'デフォルト設定が見つかりません。初期設定を作成してください。'
        })
      }

      console.error('❌ デフォルト設定取得エラー:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'デフォルト設定の取得に失敗しました',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data as PricingDefaults
    })
  } catch (error) {
    console.error('❌ デフォルト設定取得エラー:', error)
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
 * PUT /api/settings/pricing-defaults
 * グローバルデフォルト価格戦略を更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // バリデーション
    if (!body.strategy_type) {
      return NextResponse.json(
        { success: false, error: '価格戦略タイプは必須です' },
        { status: 400 }
      )
    }

    if (!body.out_of_stock_action) {
      return NextResponse.json(
        { success: false, error: '在庫切れ時のアクションは必須です' },
        { status: 400 }
      )
    }

    // strategy_paramsの構築
    const strategy_params: any = {}
    
    if (body.min_profit_usd !== undefined && body.min_profit_usd !== '') {
      const value = parseFloat(body.min_profit_usd)
      if (isNaN(value) || value < 0) {
        return NextResponse.json(
          { success: false, error: '最低利益額は0以上の数値である必要があります' },
          { status: 400 }
        )
      }
      strategy_params.min_profit_usd = value
    }

    if (body.price_adjust_percent !== undefined && body.price_adjust_percent !== '') {
      const value = parseFloat(body.price_adjust_percent)
      if (isNaN(value)) {
        return NextResponse.json(
          { success: false, error: '価格調整率は数値である必要があります' },
          { status: 400 }
        )
      }
      strategy_params.price_adjust_percent = value
    }

    if (body.follow_competitor !== undefined) {
      strategy_params.follow_competitor = Boolean(body.follow_competitor)
    }

    if (body.max_adjust_percent !== undefined && body.max_adjust_percent !== '') {
      const value = parseFloat(body.max_adjust_percent)
      if (isNaN(value) || value < 0) {
        return NextResponse.json(
          { success: false, error: '最大調整幅は0以上の数値である必要があります' },
          { status: 400 }
        )
      }
      strategy_params.max_adjust_percent = value
    }

    if (body.price_difference_usd !== undefined && body.price_difference_usd !== '') {
      const value = parseFloat(body.price_difference_usd)
      if (isNaN(value)) {
        return NextResponse.json(
          { success: false, error: '価格差分は数値である必要があります' },
          { status: 400 }
        )
      }
      strategy_params.price_difference_usd = value
    }

    if (body.apply_above_lowest !== undefined) {
      strategy_params.apply_above_lowest = Boolean(body.apply_above_lowest)
    }

    // 更新データの準備
    const updateData: any = {
      strategy_type: body.strategy_type,
      strategy_params,
      out_of_stock_action: body.out_of_stock_action,
      default_check_frequency: body.default_check_frequency || '1day',
      enable_price_monitoring: Boolean(body.enable_price_monitoring ?? true),
      enable_inventory_monitoring: Boolean(body.enable_inventory_monitoring ?? true),
      notify_on_price_change: Boolean(body.notify_on_price_change ?? false),
      notify_on_out_of_stock: Boolean(body.notify_on_out_of_stock ?? false),
      updated_at: new Date().toISOString()
    }

    if (body.notification_email) {
      updateData.notification_email = body.notification_email
    }

    if (body.description) {
      updateData.description = body.description
    }

    // global_default レコードが存在するか確認
    const { data: existing } = await supabase
      .from('pricing_defaults')
      .select('id')
      .eq('setting_name', 'global_default')
      .single()

    let result

    if (existing) {
      // 既存レコードを更新
      const { data, error } = await supabase
        .from('pricing_defaults')
        .update(updateData)
        .eq('setting_name', 'global_default')
        .select()
        .single()

      if (error) {
        console.error('❌ デフォルト設定更新エラー:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: 'デフォルト設定の更新に失敗しました',
            details: error.message 
          },
          { status: 500 }
        )
      }

      result = data
    } else {
      // 新規レコードを作成
      const { data, error } = await supabase
        .from('pricing_defaults')
        .insert({
          setting_name: 'global_default',
          enabled: true,
          priority: 0,
          ...updateData
        })
        .select()
        .single()

      if (error) {
        console.error('❌ デフォルト設定作成エラー:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: 'デフォルト設定の作成に失敗しました',
            details: error.message 
          },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      data: result as PricingDefaults,
      message: 'デフォルト設定を保存しました'
    })
  } catch (error) {
    console.error('❌ デフォルト設定更新エラー:', error)
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
 * POST /api/settings/pricing-defaults
 * グローバルデフォルト設定をリセット（初期値に戻す）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // デフォルトの初期値
    const defaultSettings = {
      setting_name: 'global_default',
      enabled: true,
      priority: 0,
      strategy_type: 'minimum_profit',
      strategy_params: {
        min_profit_usd: 10,
        follow_competitor: false
      },
      out_of_stock_action: 'set_zero',
      default_check_frequency: '1day',
      enable_price_monitoring: true,
      enable_inventory_monitoring: true,
      notify_on_price_change: false,
      notify_on_out_of_stock: false,
      description: 'システムデフォルト設定',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('pricing_defaults')
      .upsert(defaultSettings, {
        onConflict: 'setting_name',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('❌ デフォルト設定リセットエラー:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'デフォルト設定のリセットに失敗しました',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data as PricingDefaults,
      message: 'デフォルト設定を初期値にリセットしました'
    })
  } catch (error) {
    console.error('❌ デフォルト設定リセットエラー:', error)
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
