/**
 * Phase 1: 利益計算エンジン (ProfitCalculator)
 *
 * 【機能】
 * 1. 予想利益の計算
 * 2. 確定利益の計算
 * 3. 赤字リスクの判定
 * 4. プラットフォーム手数料の計算
 * 5. 利益率の計算
 */

// モール別の手数料率
export const MARKETPLACE_FEE_RATES: Record<string, number> = {
  ebay: 0.1295, // eBay: 12.95%
  amazon: 0.15, // Amazon: 15%
  shopee: 0.10, // Shopee: 10%
  qoo10: 0.10, // Qoo10: 10%
};

// 為替レート（簡易版。Phase 4で動的取得に変更）
export const EXCHANGE_RATES: Record<string, number> = {
  USD_JPY: 150, // 1 USD = 150 JPY
  EUR_JPY: 165, // 1 EUR = 165 JPY
  SGD_JPY: 112, // 1 SGD = 112 JPY
};

// 注文データの型定義
export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  sale_price: number; // JPY
}

export interface OrderCalculationInput {
  // 基本情報
  marketplace: string; // ebay, amazon, shopee, qoo10
  sale_price: number; // 販売価格合計（JPY）
  items: OrderItem[];

  // 仕入れ情報
  cost_price?: number; // 実際の仕入れ価格（JPY）
  estimated_cost_price?: number; // 予想仕入れ価格（JPY）

  // 送料
  shipping_cost?: number; // 実際の送料（JPY）
  estimated_shipping_cost?: number; // 予想送料（JPY）

  // 手数料
  platform_fee_rate?: number; // プラットフォーム手数料率（カスタム）
}

export interface OrderCalculationResult {
  // 計算結果
  platform_fee: number; // プラットフォーム手数料
  platform_fee_rate: number; // 使用した手数料率
  estimated_profit: number; // 予想利益
  final_profit: number | null; // 確定利益（仕入れ済みの場合のみ）
  profit_margin: number; // 利益率

  // リスク判定
  is_negative_profit_risk: boolean; // 赤字リスクフラグ
  risk_reason: string | null; // リスク理由

  // 詳細
  total_cost: number; // 総コスト（仕入れ + 手数料 + 送料）
  net_revenue: number; // 純売上（販売価格 - 手数料）
}

/**
 * 利益計算のメインロジック
 */
export class ProfitCalculator {
  /**
   * プラットフォーム手数料を計算
   */
  static calculatePlatformFee(
    marketplace: string,
    salePrice: number,
    customFeeRate?: number
  ): { fee: number; rate: number } {
    const rate = customFeeRate || MARKETPLACE_FEE_RATES[marketplace.toLowerCase()] || 0.13;
    const fee = Math.round(salePrice * rate);
    return { fee, rate };
  }

  /**
   * 予想利益を計算
   */
  static calculateEstimatedProfit(input: OrderCalculationInput): number {
    const { fee } = this.calculatePlatformFee(
      input.marketplace,
      input.sale_price,
      input.platform_fee_rate
    );

    const costPrice = input.estimated_cost_price || 0;
    const shippingCost = input.estimated_shipping_cost || 0;

    // 予想利益 = 販売価格 - 手数料 - 予想仕入れ価格 - 予想送料
    const estimatedProfit = input.sale_price - fee - costPrice - shippingCost;

    return Math.round(estimatedProfit);
  }

  /**
   * 確定利益を計算（仕入れ済みの場合）
   */
  static calculateFinalProfit(input: OrderCalculationInput): number | null {
    // 仕入れ価格と送料が確定していない場合はnull
    if (input.cost_price === undefined || input.shipping_cost === undefined) {
      return null;
    }

    const { fee } = this.calculatePlatformFee(
      input.marketplace,
      input.sale_price,
      input.platform_fee_rate
    );

    // 確定利益 = 販売価格 - 手数料 - 実際の仕入れ価格 - 実際の送料
    const finalProfit = input.sale_price - fee - input.cost_price - input.shipping_cost;

    return Math.round(finalProfit);
  }

  /**
   * 利益率を計算
   */
  static calculateProfitMargin(profit: number, salePrice: number): number {
    if (salePrice === 0) return 0;
    return profit / salePrice;
  }

  /**
   * 赤字リスクを判定
   *
   * 【判定基準】
   * 1. 利益がマイナス（赤字）
   * 2. 利益率が5%未満（低利益）
   * 3. 仕入れ価格が販売価格の90%以上
   */
  static detectNegativeProfitRisk(
    profit: number,
    salePrice: number,
    costPrice: number
  ): { isRisk: boolean; reason: string | null } {
    // リスク1: 赤字
    if (profit < 0) {
      return {
        isRisk: true,
        reason: `赤字取引: 利益が¥${profit.toLocaleString()}（マイナス）`,
      };
    }

    const profitMargin = this.calculateProfitMargin(profit, salePrice);

    // リスク2: 利益率が5%未満
    if (profitMargin < 0.05) {
      return {
        isRisk: true,
        reason: `低利益率: ${(profitMargin * 100).toFixed(1)}% (目標: 5%以上)`,
      };
    }

    // リスク3: 仕入れ価格が販売価格の90%以上
    const costRatio = costPrice / salePrice;
    if (costRatio >= 0.9) {
      return {
        isRisk: true,
        reason: `仕入れ価格が高額: 販売価格の${(costRatio * 100).toFixed(1)}% (推奨: 90%未満)`,
      };
    }

    return { isRisk: false, reason: null };
  }

  /**
   * 完全な利益計算を実行
   */
  static calculate(input: OrderCalculationInput): OrderCalculationResult {
    // 1. プラットフォーム手数料を計算
    const { fee: platformFee, rate: platformFeeRate } = this.calculatePlatformFee(
      input.marketplace,
      input.sale_price,
      input.platform_fee_rate
    );

    // 2. 予想利益を計算
    const estimatedProfit = this.calculateEstimatedProfit(input);

    // 3. 確定利益を計算（仕入れ済みの場合のみ）
    const finalProfit = this.calculateFinalProfit(input);

    // 4. 利益率を計算（確定利益があればそれを使用、なければ予想利益）
    const profitForMargin = finalProfit !== null ? finalProfit : estimatedProfit;
    const profitMargin = this.calculateProfitMargin(profitForMargin, input.sale_price);

    // 5. 赤字リスクを判定
    const costPrice = input.cost_price || input.estimated_cost_price || 0;
    const { isRisk, reason } = this.detectNegativeProfitRisk(
      profitForMargin,
      input.sale_price,
      costPrice
    );

    // 6. 総コストと純売上を計算
    const shippingCost = input.shipping_cost || input.estimated_shipping_cost || 0;
    const totalCost = costPrice + platformFee + shippingCost;
    const netRevenue = input.sale_price - platformFee;

    return {
      platform_fee: platformFee,
      platform_fee_rate: platformFeeRate,
      estimated_profit: estimatedProfit,
      final_profit: finalProfit,
      profit_margin: profitMargin,
      is_negative_profit_risk: isRisk,
      risk_reason: reason,
      total_cost: totalCost,
      net_revenue: netRevenue,
    };
  }

  /**
   * 複数の注文をバッチ計算
   */
  static batchCalculate(inputs: OrderCalculationInput[]): OrderCalculationResult[] {
    return inputs.map((input) => this.calculate(input));
  }

  /**
   * 赤字リスクのある注文をフィルタリング
   */
  static filterRiskyOrders(
    inputs: OrderCalculationInput[]
  ): { input: OrderCalculationInput; result: OrderCalculationResult }[] {
    const results = inputs.map((input) => ({
      input,
      result: this.calculate(input),
    }));

    return results.filter((r) => r.result.is_negative_profit_risk);
  }

  /**
   * 利益率でソート
   */
  static sortByProfitMargin(
    inputs: OrderCalculationInput[],
    order: 'asc' | 'desc' = 'desc'
  ): { input: OrderCalculationInput; result: OrderCalculationResult }[] {
    const results = inputs.map((input) => ({
      input,
      result: this.calculate(input),
    }));

    return results.sort((a, b) => {
      const diff = a.result.profit_margin - b.result.profit_margin;
      return order === 'asc' ? diff : -diff;
    });
  }
}

/**
 * ユーティリティ関数
 */

/**
 * 通貨を円表示にフォーマット
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * パーセント表示にフォーマット
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 利益率に基づいて色を返す（Tailwind CSS用）
 */
export function getProfitMarginColor(margin: number): string {
  if (margin < 0) return 'text-red-600'; // 赤字
  if (margin < 0.05) return 'text-orange-500'; // 低利益
  if (margin < 0.15) return 'text-yellow-600'; // 中利益
  return 'text-green-600'; // 高利益
}

/**
 * 赤字リスクバッジの色を返す
 */
export function getRiskBadgeColor(isRisk: boolean): string {
  return isRisk ? 'bg-red-100 text-red-700 border-red-500' : 'bg-green-100 text-green-700 border-green-500';
}
