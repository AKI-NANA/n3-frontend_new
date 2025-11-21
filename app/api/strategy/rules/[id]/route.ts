/**
 * StrategyRules Individual CRUD API
 * PUT /api/strategy/rules/[id] - ルール更新
 * DELETE /api/strategy/rules/[id] - ルール削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * ルール更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ruleId = parseInt(params.id);
    if (isNaN(ruleId)) {
      return NextResponse.json(
        { success: false, error: '無効なルールIDです' },
        { status: 400 }
      );
    }

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

    const supabase = await createClient();

    const { data: updatedRule, error } = await supabase
      .from('strategy_rules')
      .update({
        rule_name,
        rule_type,
        platform_key: platform_key || null,
        account_id: account_id || null,
        target_category: target_category || null,
        min_price_jpy: min_price_jpy || null,
        max_price_jpy: max_price_jpy || null,
        M_factor: M_factor || 1.0,
        updated_at: new Date().toISOString(),
      })
      .eq('rule_id', ruleId)
      .select()
      .single();

    if (error) {
      throw new Error(`ルール更新エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      rule: updatedRule,
      message: 'ルールを更新しました',
    });
  } catch (error) {
    console.error('❌ Strategy Rules PUT Error:', error);
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
 * ルール削除（論理削除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ruleId = parseInt(params.id);
    if (isNaN(ruleId)) {
      return NextResponse.json(
        { success: false, error: '無効なルールIDです' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 論理削除（is_active = false）
    const { error } = await supabase
      .from('strategy_rules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('rule_id', ruleId);

    if (error) {
      throw new Error(`ルール削除エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'ルールを削除しました',
    });
  } catch (error) {
    console.error('❌ Strategy Rules DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
