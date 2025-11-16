/**
 * スコア設定管理
 */

import { createClient } from '@/lib/supabase/server';
import { ScoreSettings, SettingsUpdateRequest } from './types';

/**
 * スコア設定を取得
 * @param id 設定ID（未指定ならアクティブな設定を取得）
 */
export async function getScoreSettings(
  id?: string
): Promise<ScoreSettings | null> {
  const supabase = await createClient();

  let query = supabase.from('score_settings').select('*');

  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.eq('is_active', true).limit(1);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('Error fetching score settings:', error);
    return null;
  }

  return data as ScoreSettings;
}

/**
 * スコア設定を更新
 * @param id 設定ID
 * @param updates 更新内容
 */
export async function updateScoreSettings(
  id: string,
  updates: SettingsUpdateRequest
): Promise<ScoreSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('score_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating score settings:', error);
    throw new Error(`設定更新エラー: ${error.message}`);
  }

  return data as ScoreSettings;
}

/**
 * デフォルト設定を取得（設定が存在しない場合に使用）
 */
export function getDefaultSettings(): ScoreSettings {
  return {
    id: 'default',
    name: 'default',
    description: '🌟 バランス型デフォルト設定 v3 - 将来性スコア対応',
    weight_profit: 40,
    weight_competition: 25,
    weight_future: 15,
    weight_trend: 5,
    weight_scarcity: 5,
    weight_reliability: 10,
    profit_multiplier_base: 1.0,
    profit_multiplier_threshold: 1000,
    profit_multiplier_increment: 0.1,
    penalty_low_profit_threshold: 500,
    penalty_multiplier: 0.5,
    score_profit_per_1000_jpy: 100,
    score_competitor_penalty: -50,
    score_jp_seller_penalty: -70,
    score_discontinued_bonus: 100,
    score_trend_boost: 50,
    score_success_rate_bonus: 10,
    score_future_release_boost: 200,
    score_future_premium_boost: 150,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
