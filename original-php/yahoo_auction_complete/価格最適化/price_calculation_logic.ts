// ===============================================
// 価格計算・赤字判定コアロジック
// lib/price-optimization/calculator.ts
// ===============================================

import type {
  MarginCalculation,
  RedRiskCheck,
  PriceProposal,
  AutoPricingSetting,
  CompetitorPrice,
  CurrencyCode,
} from '@/lib/types/price-optimization';

// ========== 定数 ==========

const DEFAULT_EBAY_FEE_PERCENT = 13.25; // eBay標準手数料
const DEFAULT_PAYPAL_FEE_PERCENT = 3.49; // PayPal手数料
const DEFAULT_PAYPAL_FIXED_FEE = 0.49; // PayPal固定手数料
const DEFAULT_SHIPPING_INSURANCE_PERCENT = 2.0; // 配送保険
const SAFETY_MARGIN = 1.05; // 安全マージン 5%

// ========== 利益計算 ==========

/**
 * 総コスト計算（仕入値 + 配送料 + 手数料等）
 */
export function calculateTotalCost(params: {
  purchaseCostJpy: number;
  domesticShippingJpy: number;
  exchangeRate: number;
  internationalShippingUsd: number;
  customsDutyPercent?: number;
  otherFeesUsd?: number;
}): number {
  const {
    purchaseCostJpy,
    domesticShippingJpy,
    exchangeRate,
    internationalShippingUsd,
    customsDutyPercent = 0,
    otherFeesUsd = 0,
  } = params;

  // 日本円コストをUSDに変換
  const purchaseCostUsd = purchaseCostJpy / exchangeRate;
  const domesticShippingUsd = domesticShippingJpy / exchangeRate;

  // 総コスト = 仕入値 + 国内配送 + 国際配送 + 関税 + その他
  let totalCost = purchaseCostUsd + domesticShippingUsd + internationalShippingUsd;

  // 関税計算（商品価格 + 国際配送料に対して）
  if (customsDutyPercent > 0) {
    const dutyBase = purchaseCostUsd + internationalShippingUsd;
    totalCost += (dutyBase * customsDutyPercent) / 100;
  }

  totalCost += otherFeesUsd;

  return totalCost;
}

/**
 * 販売手数料計算（eBay + PayPal）
 */
export function calculateSellingFees(sellingPrice: number): {
  ebayFee: number;
  paypalFee: number;
  totalFees: number;
} {
  const ebayFee = sellingPrice * (DEFAULT_EBAY_FEE_PERCENT / 100);
  const paypalFee =
    sellingPrice * (DEFAULT_PAYPAL_FEE_PERCENT / 100) + DEFAULT_PAYPAL_FIXED_FEE;

  return {
    ebayFee: parseFloat(ebayFee.toFixed(2)),
    paypalFee: parseFloat(paypalFee.toFixed(2)),
    totalFees: parseFloat((ebayFee + paypalFee).toFixed(2)),
  };
}

/**
 * 利益率・利益額計算
 */
export function calculateMargin(params: {
  sellingPrice: number;
  totalCost: number;
  includeShippingInsurance?: boolean;
}): MarginCalculation {
  const { sellingPrice, totalCost, includeShippingInsurance = true } = params;

  // 販売手数料
  const fees = calculateSellingFees(sellingPrice);

  // 配送保険
  let insuranceFee = 0;
  if (includeShippingInsurance) {
    insuranceFee = sellingPrice * (DEFAULT_SHIPPING_INSURANCE_PERCENT / 100);
  }

  // 実質コスト = 総コスト + 手数料 + 保険
  const effectiveCost = totalCost + fees.totalFees + insuranceFee;

  // 粗利益 = 販売価格 - 実質コスト
  const grossProfit = sellingPrice - effectiveCost;

  // 利益率 = (粗利益 / 販売価格) * 100
  const marginPercent = (grossProfit / sellingPrice) * 100;

  return {
    totalCost: parseFloat(effectiveCost.toFixed(2)),
    sellingPrice: parseFloat(sellingPrice.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    marginPercent: parseFloat(marginPercent.toFixed(2)),
    profitAmount: parseFloat(grossProfit.toFixed(2)),
    meetsMinMargin: false, // 後で設定
    meetsMinProfit: false, // 後で設定
  };
}

/**
 * 最低必要価格の計算
 */
export function calculateMinRequiredPrice(params: {
  totalCost: number;
  minMarginPercent: number;
  minProfitAmount?: number;
}): number {
  const { totalCost, minMarginPercent, minProfitAmount } = params;

  // 利益率から最低価格を計算
  // 価格 = コスト / (1 - マージン% / 100 - 手数料%)
  const feePercent = DEFAULT_EBAY_FEE_PERCENT + DEFAULT_PAYPAL_FEE_PERCENT;
  const marginRatio = minMarginPercent / 100;

  let minPriceFromMargin =
    totalCost / (1 - marginRatio - feePercent / 100 - DEFAULT_SHIPPING_INSURANCE_PERCENT / 100);

  // 最低利益額から最低価格を計算
  let minPriceFromProfit = 0;
  if (minProfitAmount && minProfitAmount > 0) {
    // 価格 = (コスト + 最低利益) / (1 - 手数料%)
    minPriceFromProfit =
      (totalCost + minProfitAmount) /
      (1 - feePercent / 100 - DEFAULT_SHIPPING_INSURANCE_PERCENT / 100);
  }

  // 大きい方を採用
  const minPrice = Math.max(minPriceFromMargin, minPriceFromProfit);

  // 安全マージンを適用
  return parseFloat((minPrice * SAFETY_MARGIN).toFixed(2));
}

// ========== 赤字判定 ==========

/**
 * 赤字リスクチェック
 */
export function checkRedRisk(params: {
  proposedPrice: number;
  totalCost: number;
  minMarginPercent: number;
  minProfitAmount?: number;
  allowLoss?: boolean;
  maxLossPercent?: number;
}): RedRiskCheck {
  const {
    proposedPrice,
    totalCost,
    minMarginPercent,
    minProfitAmount,
    allowLoss = false,
    maxLossPercent = 0,
  } = params;

  const reasons: string[] = [];
  let isRedRisk = false;

  // 利益計算
  const margin = calculateMargin({
    sellingPrice: proposedPrice,
    totalCost,
  });

  // 1. 最低利益率チェック
  if (margin.marginPercent < minMarginPercent) {
    reasons.push(
      `利益率 ${margin.marginPercent.toFixed(2)}% < 最低利益率 ${minMarginPercent}%`
    );
    isRedRisk = true;
  }

  // 2. 最低利益額チェック
  if (minProfitAmount && margin.profitAmount < minProfitAmount) {
    reasons.push(
      `利益額 $${margin.profitAmount.toFixed(2)} < 最低利益額 $${minProfitAmount.toFixed(2)}`
    );
    isRedRisk = true;
  }

  // 3. 原価割れチェック
  if (margin.profitAmount < 0) {
    reasons.push(
      `提案価格 $${proposedPrice.toFixed(2)} < 総コスト $${margin.totalCost.toFixed(2)}`
    );
    isRedRisk = true;
  }

  // 4. 損失許可チェック
  if (isRedRisk && allowLoss) {
    const lossPercent = Math.abs(margin.marginPercent);
    if (lossPercent <= maxLossPercent) {
      isRedRisk = false;
      reasons.push(`許容損失内 ${lossPercent.toFixed(2)}% <= ${maxLossPercent}%`);
    }
  }

  // 5. 最低安全価格の計算
  const minSafePrice = calculateMinRequiredPrice({
    totalCost,
    minMarginPercent,
    minProfitAmount,
  });

  return {
    isRedRisk,
    reasons,
    canAdjust: !isRedRisk || proposedPrice >= minSafePrice,
    minSafePrice,
  };
}

// ========== 価格提案ロジック ==========

/**
 * 最適価格の計算
 */
export function calculateOptimalPrice(params: {
  totalCost: number;
  settings: AutoPricingSetting;
  competitorPrices?: CompetitorPrice[];
}): PriceProposal {
  const { totalCost, settings, competitorPrices } = params;

  // 最低必要価格の計算
  const minRequiredPrice = calculateMinRequiredPrice({
    totalCost,
    minMarginPercent: settings.min_margin_percent,
    minProfitAmount: settings.min_profit_amount,
  });

  // 競合価格がない場合は最低価格を返す
  if (!competitorPrices || competitorPrices.length === 0) {
    const margin = calculateMargin({
      sellingPrice: minRequiredPrice,
      totalCost,
    });

    return {
      proposedPrice: minRequiredPrice,
      expectedMargin: margin.marginPercent,
      expectedProfit: margin.profitAmount,
      isRedRisk: false,
      adjustmentReason: '競合価格データなし。最低必要価格を設定',
    };
  }

  // 競合最安価格を取得
  const lowestCompetitor = Math.min(
    ...competitorPrices.map((p) => p.lowest_price)
  );

  // 目標価格 = 競合最安 × 目標比率（デフォルト90%）
  const targetPrice = lowestCompetitor * settings.target_competitor_ratio;

  // 赤字判定
  const redRiskCheck = checkRedRisk({
    proposedPrice: targetPrice,
    totalCost,
    minMarginPercent: settings.min_margin_percent,
    minProfitAmount: settings.min_profit_amount,
    allowLoss: settings.allow_loss,
    maxLossPercent: settings.max_loss_percent,
  });

  // 赤字リスクがある場合
  if (redRiskCheck.isRedRisk && !settings.allow_loss) {
    const margin = calculateMargin({
      sellingPrice: minRequiredPrice,
      totalCost,
    });

    return {
      proposedPrice: minRequiredPrice,
      expectedMargin: margin.marginPercent,
      expectedProfit: margin.profitAmount,
      isRedRisk: true,
      adjustmentReason: `競合より高いが、利益確保のため最低価格を設定。理由: ${redRiskCheck.reasons.join(', ')}`,
      competitorComparison: {
        lowestCompetitorPrice: lowestCompetitor,
        priceDifference: minRequiredPrice - lowestCompetitor,
        isPricingCompetitive: false,
      },
    };
  }

  // 利益確保可能な場合
  const margin = calculateMargin({
    sellingPrice: targetPrice,
    totalCost,
  });

  return {
    proposedPrice: parseFloat(targetPrice.toFixed(2)),
    expectedMargin: margin.marginPercent,
    expectedProfit: margin.profitAmount,
    isRedRisk: false,
    adjustmentReason: `競合より${(settings.target_competitor_ratio * 100).toFixed(0)}%の価格で利益確保可能`,
    competitorComparison: {
      lowestCompetitorPrice: lowestCompetitor,
      priceDifference: targetPrice - lowestCompetitor,
      isPricingCompetitive: true,
    },
  };
}

/**
 * 価格調整の必要性判定
 */
export function checkNeedsAdjustment(params: {
  currentPrice: number;
  totalCost: number;
  settings: AutoPricingSetting;
  costChanged?: boolean;
  competitorPrice?: number;
}): {
  needsAdjustment: boolean;
  reason: 'cost_changed' | 'competitor_lower' | 'margin_low' | 'none';
  currentMargin: number;
  targetMargin: number;
  competitorPrice?: number;
} {
  const { currentPrice, totalCost, settings, costChanged, competitorPrice } = params;

  const currentMargin = calculateMargin({
    sellingPrice: currentPrice,
    totalCost,
  });

  // 1. 仕入値変動チェック
  if (costChanged) {
    return {
      needsAdjustment: true,
      reason: 'cost_changed',
      currentMargin: currentMargin.marginPercent,
      targetMargin: settings.min_margin_percent,
    };
  }

  // 2. 競合価格チェック（10%以上高い場合）
  if (competitorPrice && currentPrice > competitorPrice * 1.1) {
    return {
      needsAdjustment: true,
      reason: 'competitor_lower',
      currentMargin: currentMargin.marginPercent,
      targetMargin: settings.min_margin_percent,
      competitorPrice,
    };
  }

  // 3. 利益率チェック
  if (currentMargin.marginPercent < settings.min_margin_percent) {
    return {
      needsAdjustment: true,
      reason: 'margin_low',
      currentMargin: currentMargin.marginPercent,
      targetMargin: settings.min_margin_percent,
    };
  }

  return {
    needsAdjustment: false,
    reason: 'none',
    currentMargin: currentMargin.marginPercent,
    targetMargin: settings.min_margin_percent,
  };
}

// ========== ユーティリティ関数 ==========

/**
 * 為替レートから安全なレートを計算
 */
export function calculateSafeExchangeRate(
  baseRate: number,
  safetyMarginPercent: number = 5
): number {
  return parseFloat((baseRate * (1 + safetyMarginPercent / 100)).toFixed(4));
}

/**
 * 価格の丸め処理（$0.99刻み）
 */
export function roundToPsychologicalPrice(price: number): number {
  // $XX.99にする
  return Math.floor(price) + 0.99;
}

/**
 * 通貨換算
 */
export function convertCurrency(params: {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  exchangeRates: Record<string, number>;
}): number {
  const { amount, fromCurrency, toCurrency, exchangeRates } = params;

  if (fromCurrency === toCurrency) {
    return amount;
  }

  // USDをベースとした換算
  const key = `${fromCurrency}_${toCurrency}`;
  const rate = exchangeRates[key];

  if (!rate) {
    throw new Error(`為替レートが見つかりません: ${key}`);
  }

  return parseFloat((amount * rate).toFixed(2));
}

/**
 * 価格変動率の計算
 */
export function calculatePriceChangePercent(
  oldPrice: number,
  newPrice: number
): number {
  if (oldPrice === 0) return 0;
  return parseFloat((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2));
}

// ========== バリデーション ==========

/**
 * 価格の妥当性チェック
 */
export function validatePrice(params: {
  price: number;
  minPrice?: number;
  maxPrice?: number;
}): { isValid: boolean; errors: string[] } {
  const { price, minPrice, maxPrice } = params;
  const errors: string[] = [];

  if (price <= 0) {
    errors.push('価格は0より大きい必要があります');
  }

  if (minPrice && price < minPrice) {
    errors.push(`価格は最低価格 $${minPrice} 以上である必要があります`);
  }

  if (maxPrice && price > maxPrice) {
    errors.push(`価格は最高価格 $${maxPrice} 以下である必要があります`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 設定の妥当性チェック
 */
export function validateSettings(
  settings: Partial<AutoPricingSetting>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (settings.min_margin_percent !== undefined) {
    if (settings.min_margin_percent < 0 || settings.min_margin_percent > 100) {
      errors.push('最低利益率は0-100%の範囲である必要があります');
    }
  }

  if (settings.target_competitor_ratio !== undefined) {
    if (settings.target_competitor_ratio <= 0 || settings.target_competitor_ratio > 2) {
      errors.push('競合価格比率は0-200%の範囲である必要があります');
    }
  }

  if (
    settings.min_allowed_price !== undefined &&
    settings.max_allowed_price !== undefined
  ) {
    if (settings.min_allowed_price > settings.max_allowed_price) {
      errors.push('最小価格は最大価格より小さい必要があります');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}