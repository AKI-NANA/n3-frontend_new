import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AmazonResearchStrategy } from '@/types/amazon-strategy'

// 戦略設定の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの戦略設定を取得
    const { data: strategy, error } = await supabase
      .from('amazon_research_strategies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // 設定が存在しない場合はデフォルト値を返す
    if (!strategy) {
      const defaultStrategy: Partial<AmazonResearchStrategy> = {
        user_id: user.id,
        enable_inventory_protection: true,
        min_profit_score_threshold: 5000,
        enable_new_products: true,
        new_products_days: 30,
        monitor_categories: [],
        monitor_keywords: [],
        enable_competitor_tracking: false,
        competitor_seller_ids: [],
        enable_ebay_sold_tracking: false,
        execution_frequency: 'daily',
        max_asins_per_execution: 100,
        is_active: true
      }
      return NextResponse.json({ strategy: defaultStrategy, isDefault: true })
    }

    return NextResponse.json({ strategy, isDefault: false })
  } catch (error: any) {
    console.error('Get strategy config error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get strategy config' },
      { status: 500 }
    )
  }
}

// 戦略設定の保存
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const strategyData: Partial<AmazonResearchStrategy> = {
      user_id: user.id,
      enable_inventory_protection: body.enable_inventory_protection ?? true,
      min_profit_score_threshold: body.min_profit_score_threshold ?? 5000,
      enable_new_products: body.enable_new_products ?? true,
      new_products_days: body.new_products_days ?? 30,
      monitor_categories: body.monitor_categories ?? [],
      monitor_keywords: body.monitor_keywords ?? [],
      price_range_min: body.price_range_min,
      price_range_max: body.price_range_max,
      enable_competitor_tracking: body.enable_competitor_tracking ?? false,
      competitor_seller_ids: body.competitor_seller_ids ?? [],
      enable_ebay_sold_tracking: body.enable_ebay_sold_tracking ?? false,
      execution_frequency: body.execution_frequency ?? 'daily',
      max_asins_per_execution: body.max_asins_per_execution ?? 100,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString()
    }

    // UPSERT（存在すれば更新、なければ挿入）
    const { data: strategy, error } = await supabase
      .from('amazon_research_strategies')
      .upsert(strategyData, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, strategy })
  } catch (error: any) {
    console.error('Save strategy config error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save strategy config' },
      { status: 500 }
    )
  }
}
