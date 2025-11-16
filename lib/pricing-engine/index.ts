// ====================================================================
// 価格再計算エンジン - メインエントリーポイント
// ====================================================================

import {
  PriceChangeInput,
  PriceChangeData,
  ProductMasterData,
  RecalculationOptions,
  PriceCalculationResult,
} from './types';
import { calculatePrice, recalculateProfit, getExchangeRate } from './calculator';
import { applyBestRule } from './rule-engine';

/**
 * 価格変動を検知して再計算
 * @param input 価格変動入力データ
 * @param options 再計算オプション
 * @returns 価格変動データ
 */
export async function processPriceChange(
  input: PriceChangeInput,
  options: RecalculationOptions = {}
): Promise<PriceChangeData> {
  try {
    // デフォルトオプション
    const opts = {
      apply_rules: true,
      enforce_minimum_profit: true,
      auto_apply: false,
      reevaluate_shipping: true,
      ...options,
    };

    // 1. 為替レート取得
    const exchange_rate = opts.exchange_rate || (await getExchangeRate());

    // 2. 旧価格で利益を再計算（比較用）
    let old_calculation: PriceCalculationResult;
    
    if (input.current_ebay_price_usd) {
      old_calculation = await recalculateProfit(
        input.current_ebay_price_usd,
        input.old_source_price_jpy,
        input.product_data,
        exchange_rate
      );
    } else {
      old_calculation = await calculatePrice(
        input.old_source_price_jpy,
        input.product_data,
        exchange_rate
      );
    }

    // 3. 新価格で再計算
    let new_calculation = await calculatePrice(
      input.new_source_price_jpy,
      input.product_data,
      exchange_rate
    );

    // 4. 価格ルールを適用（有効な場合）
    let applied_rule_id: string | undefined;
    let applied_rule_name: string | undefined;

    if (opts.apply_rules && input.product_data?.pricing_rules_enabled) {
      const rule_result = await applyBestRule(
        new_calculation.ebay_price_usd,
        input.new_source_price_jpy,
        input.product_data,
        exchange_rate
      );

      if (rule_result) {
        // ルールが適用された場合、価格を更新
        new_calculation.ebay_price_usd = rule_result.adjusted_price_usd;
        applied_rule_id = rule_result.applied_rule?.id;
        applied_rule_name = rule_result.applied_rule?.name;

        // 利益を再計算
        new_calculation = await recalculateProfit(
          new_calculation.ebay_price_usd,
          input.new_source_price_jpy,
          input.product_data,
          exchange_rate
        );
      }
    }

    // 5. 最低利益チェック（強制）
    if (opts.enforce_minimum_profit) {
      const min_profit = input.product_data?.min_profit_usd || 10;
      
      if (new_calculation.profit_usd < min_profit) {
        // 最低利益を確保する価格に調整
        const adjusted_price = new_calculation.ebay_price_usd + (min_profit - new_calculation.profit_usd);
        
        new_calculation = await recalculateProfit(
          adjusted_price,
          input.new_source_price_jpy,
          input.product_data,
          exchange_rate
        );

        applied_rule_name = applied_rule_name 
          ? `${applied_rule_name} + 最低利益確保`
          : '最低利益確保';
      }
    }

    // 6. 配送ポリシーの変更判定
    const shipping_policy_changed = opts.reevaluate_shipping 
      ? new_calculation.shipping_policy_changed
      : false;

    // 7. 価格変動データを作成
    const price_change_data: PriceChangeData = {
      product_id: input.product_id,
      ebay_listing_id: input.ebay_listing_id,
      
      // 変動情報
      change_type: input.change_type,
      trigger_type: input.trigger_type,
      
      // 価格データ（仕入れ価格）
      old_source_price_jpy: input.old_source_price_jpy,
      new_source_price_jpy: input.new_source_price_jpy,
      source_price_diff: input.new_source_price_jpy - input.old_source_price_jpy,
      
      // 価格データ（eBay販売価格）
      old_ebay_price_usd: old_calculation.ebay_price_usd,
      new_ebay_price_usd: new_calculation.ebay_price_usd,
      ebay_price_diff: new_calculation.ebay_price_usd - old_calculation.ebay_price_usd,
      
      // 利益計算
      old_profit_usd: old_calculation.profit_usd,
      new_profit_usd: new_calculation.profit_usd,
      profit_diff: new_calculation.profit_usd - old_calculation.profit_usd,
      
      old_profit_margin: old_calculation.profit_margin,
      new_profit_margin: new_calculation.profit_margin,
      
      // 適用ルール
      applied_rule_id,
      applied_rule_name,
      
      // 配送ポリシー変更
      shipping_policy_changed,
      old_shipping_policy_id: input.product_data?.shipping_policy_id,
      new_shipping_policy_id: new_calculation.recommended_shipping_policy_id,
      
      // ステータス
      status: opts.auto_apply ? 'approved' : 'pending',
      auto_applied: opts.auto_apply,
    };

    return price_change_data;
  } catch (error) {
    // エラーが発生した場合
    const error_message = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      product_id: input.product_id,
      ebay_listing_id: input.ebay_listing_id,
      change_type: input.change_type,
      trigger_type: input.trigger_type,
      old_source_price_jpy: input.old_source_price_jpy,
      new_source_price_jpy: input.new_source_price_jpy,
      source_price_diff: input.new_source_price_jpy - input.old_source_price_jpy,
      old_ebay_price_usd: 0,
      new_ebay_price_usd: 0,
      ebay_price_diff: 0,
      old_profit_usd: 0,
      new_profit_usd: 0,
      profit_diff: 0,
      old_profit_margin: 0,
      new_profit_margin: 0,
      shipping_policy_changed: false,
      status: 'pending',
      auto_applied: false,
      error_message,
    };
  }
}

/**
 * 複数の価格変動を一括処理
 * @param inputs 価格変動入力データの配列
 * @param options 再計算オプション
 * @returns 価格変動データの配列
 */
export async function processPriceChanges(
  inputs: PriceChangeInput[],
  options: RecalculationOptions = {}
): Promise<PriceChangeData[]> {
  const results: PriceChangeData[] = [];

  for (const input of inputs) {
    const result = await processPriceChange(input, options);
    results.push(result);
  }

  return results;
}

/**
 * 価格変動データをデータベースに保存
 * @param price_change_data 価格変動データ
 * @returns 保存されたデータのID
 */
export async function savePriceChange(
  price_change_data: PriceChangeData
): Promise<string> {
  // TODO: Supabaseに保存する実装
  // 現在は仮のIDを返す
  return 'temp_id_' + Date.now();
}

/**
 * 簡易インターフェース: 仕入れ価格変動から自動計算
 * @param product_id 商品ID
 * @param old_price_jpy 旧仕入れ価格（円）
 * @param new_price_jpy 新仕入れ価格（円）
 * @param product_data 商品データ（オプション）
 * @returns 価格変動データ
 */
export async function recalculateFromPriceChange(
  product_id: number,
  old_price_jpy: number,
  new_price_jpy: number,
  product_data?: ProductMasterData
): Promise<PriceChangeData> {
  const input: PriceChangeInput = {
    product_id,
    change_type: 'source_price',
    trigger_type: 'inventory_monitoring',
    old_source_price_jpy: old_price_jpy,
    new_source_price_jpy: new_price_jpy,
    current_ebay_price_usd: product_data?.calculated_ebay_price_usd,
    product_data,
  };

  return processPriceChange(input, {
    apply_rules: true,
    enforce_minimum_profit: true,
    auto_apply: false,
    reevaluate_shipping: true,
  });
}

// エクスポート
export * from './types';
export * from './calculator';
export * from './rule-engine';
