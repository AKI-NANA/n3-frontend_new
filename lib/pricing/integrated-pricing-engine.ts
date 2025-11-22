/**
 * 統合価格計算エンジン
 *
 * 会計システムと連携し、実際の経費率を使用して価格を計算する
 * 既存の pricing-engine.ts のラッパー
 */

import { financialMetricsService } from '@/services/accounting/FinancialMetricsService';
import {
  calculatePrice,
  calculateBulkPrices,
  PriceCalculationInput,
  PriceCalculationResult,
} from './pricing-engine';
import { ResolvedStrategy } from './strategy-resolver';

/**
 * 財務データ統合版: 単一商品の価格を計算
 *
 * 会計システムから最新の経費率を自動取得して価格を計算します
 *
 * @param input - 価格計算インプット（expense_ratio は自動設定）
 * @param strategy - 価格戦略
 * @param useRealExpenseRatio - 実際の経費率を使用するか（デフォルト: true）
 * @returns 価格計算結果
 */
export async function calculatePriceWithFinancialData(
  input: Omit<PriceCalculationInput, 'expense_ratio'>,
  strategy: ResolvedStrategy,
  useRealExpenseRatio = true
): Promise<PriceCalculationResult> {
  let expenseRatio: number | undefined;

  if (useRealExpenseRatio) {
    try {
      // 会計システムから最新の経費率を取得
      expenseRatio = await financialMetricsService.getExpenseRatio();
      console.log(
        `[IntegratedPricing] 商品 ${input.product_id}: 実際の経費率 ${expenseRatio}% を使用`
      );
    } catch (error) {
      console.error(
        `[IntegratedPricing] 経費率の取得に失敗しました。デフォルト値を使用します:`,
        error
      );
      // エラー時は undefined のまま（デフォルト13%が使用される）
    }
  }

  // 経費率を含めて価格計算を実行
  return calculatePrice(
    {
      ...input,
      expense_ratio: expenseRatio,
    },
    strategy
  );
}

/**
 * 財務データ統合版: 複数商品の価格を一括計算
 *
 * 会計システムから最新の経費率を自動取得して一括計算します
 *
 * @param inputs - 価格計算インプット配列
 * @param strategies - 商品ID → 戦略のマップ
 * @param useRealExpenseRatio - 実際の経費率を使用するか（デフォルト: true）
 * @returns 価格計算結果配列
 */
export async function calculateBulkPricesWithFinancialData(
  inputs: Omit<PriceCalculationInput, 'expense_ratio'>[],
  strategies: Map<number, ResolvedStrategy>,
  useRealExpenseRatio = true
): Promise<PriceCalculationResult[]> {
  let expenseRatio: number | undefined;

  if (useRealExpenseRatio) {
    try {
      // 会計システムから最新の経費率を取得（一度だけ）
      expenseRatio = await financialMetricsService.getExpenseRatio();
      console.log(
        `[IntegratedPricing] ${inputs.length}件の商品に実際の経費率 ${expenseRatio}% を適用`
      );
    } catch (error) {
      console.error(
        `[IntegratedPricing] 経費率の取得に失敗しました。デフォルト値を使用します:`,
        error
      );
    }
  }

  // すべての商品に経費率を追加
  const enhancedInputs: PriceCalculationInput[] = inputs.map((input) => ({
    ...input,
    expense_ratio: expenseRatio,
  }));

  return calculateBulkPrices(enhancedInputs, strategies);
}

/**
 * 損益分岐点を計算（財務データ統合版）
 *
 * 実際の経費率を使用して損益分岐点を計算します
 *
 * @param costJpy - 仕入れ原価（円）
 * @param shippingCostJpy - 送料（円）
 * @param exchangeRate - 為替レート（デフォルト: 150）
 * @param useRealExpenseRatio - 実際の経費率を使用するか（デフォルト: true）
 * @returns 損益分岐点（USD）
 */
export async function calculateBreakEvenPrice(
  costJpy: number,
  shippingCostJpy: number,
  exchangeRate = 150,
  useRealExpenseRatio = true
): Promise<{
  breakEvenPriceUsd: number;
  baseCostUsd: number;
  feesUsd: number;
  expenseRatio: number;
  dataSource: 'REAL_DATA' | 'DEFAULT';
}> {
  let expenseRatio = 13.0; // デフォルト
  let dataSource: 'REAL_DATA' | 'DEFAULT' = 'DEFAULT';

  if (useRealExpenseRatio) {
    try {
      const metrics = await financialMetricsService.getFinancialMetrics();
      expenseRatio = metrics.expenseRatio;
      dataSource = metrics.dataSource;
    } catch (error) {
      console.error(
        '[IntegratedPricing] 経費率の取得に失敗しました。デフォルト値を使用します:',
        error
      );
    }
  }

  // 基本コスト計算
  const baseCostUsd = (costJpy + shippingCostJpy) / exchangeRate;

  // 手数料計算
  const feesUsd = baseCostUsd * (expenseRatio / 100);

  // 損益分岐点
  const breakEvenPriceUsd = baseCostUsd + feesUsd;

  return {
    breakEvenPriceUsd: Math.round(breakEvenPriceUsd * 100) / 100,
    baseCostUsd: Math.round(baseCostUsd * 100) / 100,
    feesUsd: Math.round(feesUsd * 100) / 100,
    expenseRatio,
    dataSource,
  };
}

/**
 * 財務指標のキャッシュをクリア
 *
 * 新しい会計データが同期された後に呼び出すことで、
 * 次回の価格計算時に最新の経費率を取得できます
 */
export function clearFinancialMetricsCache(): void {
  financialMetricsService.clearCache();
  console.log('[IntegratedPricing] 財務指標のキャッシュをクリアしました');
}
