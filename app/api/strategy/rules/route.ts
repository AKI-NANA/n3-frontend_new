/**
 * StrategyRules CRUD API
 * GET /api/strategy/rules - 全ルール取得
 * POST /api/strategy/rules - 新規ルール作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 全ルール取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: rules, error } = await supabase
      .from('strategy_rules')
      .select('*')
      .eq('is_active', true)
      .order('rule_id', { ascending: true });

    if (error) {
      throw new Error(`ルール取得エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      rules: rules || [],
      count: rules?.length || 0,
    });
  } catch (error) {
    console.error('❌ Strategy Rules GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * 新規ルール作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      rule_name,
      rule_type,
      platform_key,
      account_id,
      target_category,
      min_price_jpy,
      max_price_jpy,
      M_factor,
    } = body;

    if (!rule_name || !rule_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'rule_name と rule_type は必須です',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: newRule, error } = await supabase
      .from('strategy_rules')
      .insert({
        rule_name,
        rule_type,
        platform_key: platform_key || null,
        account_id: account_id || null,
        target_category: target_category || null,
        min_price_jpy: min_price_jpy || null,
        max_price_jpy: max_price_jpy || null,
        M_factor: M_factor || 1.0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`ルール作成エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      rule: newRule,
      message: 'ルールを作成しました',
    });
  } catch (error) {
    console.error('❌ Strategy Rules POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
