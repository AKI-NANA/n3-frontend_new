// ====================================================================
// 価格ルール適用エンジン
// ====================================================================

import { PricingRule, RuleApplicationResult, ProductMasterData } from './types';
import { calculateMinimumPrice } from './calculator';

/**
 * データベースから有効な価格ルールを取得
 * @param product_data 商品データ
 * @returns 適用可能なルール（優先度順）
 */
export async function getApplicableRules(
  product_data?: ProductMasterData
): Promise<PricingRule[]> {
  // TODO: 実際のデータベースクエリに置き換える
  // 現在は空配列を返す（実装時にSupabaseクエリを追加）
  return [];
}

/**
 * ルールの条件をチェック
 * @param rule ルール
 * @param product_data 商品データ
 * @param current_price 現在の価格
 * @returns 条件を満たすか
 */
export function checkRuleConditions(
  rule: PricingRule,
  product_data?: ProductMasterData,
  current_price?: number
): boolean {
  const conditions = rule.conditions;

  // カテゴリチェック
  if (conditions.category && product_data?.ebay_category_id) {
    if (!conditions.category.includes(product_data.ebay_category_id)) {
      return false;
    }
  }

  // 最大価格チェック
  if (conditions.max_price_jpy && product_data?.acquired_price_jpy) {
    if (product_data.acquired_price_jpy > conditions.max_price_jpy) {
      return false;
    }
  }

  return true;
}

/**
 * ルールを適用して価格を調整
 * @param base_price 基準価格（USD）
 * @param rule 適用するルール
 * @param source_price_jpy 仕入れ価格（円）
 * @param product_data 商品データ
 * @param exchange_rate 為替レート
 * @returns ルール適用結果
 */
export async function applyPricingRule(
  base_price: number,
  rule: PricingRule,
  source_price_jpy: number,
  product_data?: ProductMasterData,
  exchange_rate?: number
): Promise<RuleApplicationResult> {
  const actions = rule.actions;
  let adjusted_price = base_price;
  let adjustment_reason = `ルール適用: ${rule.name}`;
  let stopped_by_minimum = false;

  // 1. 価格調整
  if (actions.adjust_type === 'percentage' && actions.adjust_value !== undefined) {
    // パーセンテージ調整
    const adjustment = base_price * (actions.adjust_value / 100);
    adjusted_price = base_price + adjustment;
    adjustment_reason += ` (${actions.adjust_value > 0 ? '+' : ''}${actions.adjust_value}%)`;
  } else if (actions.adjust_type === 'fixed_amount' && actions.adjust_value !== undefined) {
    // 固定額調整
    adjusted_price = base_price + actions.adjust_value;
    adjustment_reason += ` (${actions.adjust_value > 0 ? '+' : ''}$${actions.adjust_value})`;
  } else if (actions.adjust_type === 'match_lowest') {
    // 最安値に合わせる（実装時に競合価格データを使用）
    adjustment_reason += ' (最安値追従)';
  }

  // 2. 最低利益チェック
  if (actions.min_profit_usd && actions.enforce_minimum) {
    const min_price = await calculateMinimumPrice(
      source_price_jpy,
      actions.min_profit_usd,
      product_data,
      exchange_rate
    );

    if (adjusted_price < min_price) {
      if (actions.stop_if_below) {
        // 最低価格を下回る場合は調整を停止
        adjusted_price = min_price;
        adjustment_reason += ` → 最低利益確保のため$${min_price.toFixed(2)}に修正`;
        stopped_by_minimum = true;
      } else {
        // 警告のみ
        adjustment_reason += ` (警告: 最低利益$${actions.min_profit_usd}を下回る可能性)`;
      }
    }
  }

  // 3. 最大調整幅チェック
  if (actions.max_adjust_percent) {
    const max_change = base_price * (actions.max_adjust_percent / 100);
    const actual_change = Math.abs(adjusted_price - base_price);
    
    if (actual_change > max_change) {
      // 最大調整幅を超える場合は制限
      const sign = adjusted_price > base_price ? 1 : -1;
      adjusted_price = base_price + (max_change * sign);
      adjustment_reason += ` → 最大調整幅${actions.max_adjust_percent}%により制限`;
    }
  }

  return {
    applied_rule: rule,
    adjusted_price_usd: Math.round(adjusted_price * 100) / 100,
    adjustment_reason,
    stopped_by_minimum,
  };
}

/**
 * 商品に適用可能なルールを取得して適用
 * @param base_price 基準価格（USD）
 * @param source_price_jpy 仕入れ価格（円）
 * @param product_data 商品データ
 * @param exchange_rate 為替レート
 * @returns ルール適用結果（適用されない場合はundefined）
 */
export async function applyBestRule(
  base_price: number,
  source_price_jpy: number,
  product_data?: ProductMasterData,
  exchange_rate?: number
): Promise<RuleApplicationResult | undefined> {
  // 1. 適用可能なルールを取得（優先度順）
  const rules = await getApplicableRules(product_data);

  if (rules.length === 0) {
    return undefined;
  }

  // 2. 最も優先度の高いルールを適用
  for (const rule of rules) {
    if (!rule.enabled) continue;

    // 条件チェック
    if (!checkRuleConditions(rule, product_data, base_price)) {
      continue;
    }

    // ルール適用
    const result = await applyPricingRule(
      base_price,
      rule,
      source_price_jpy,
      product_data,
      exchange_rate
    );

    // 最低利益で停止した場合、またはルール適用成功の場合は返す
    if (result.stopped_by_minimum || result.adjusted_price_usd !== base_price) {
      return result;
    }
  }

  return undefined;
}
