/**
 * Amazon刈り取り自動化 - スコアリングエンジン
 *
 * P-4戦略（市場枯渇予見）を最優先とし、Keepa波形分析とAI分析により
 * 再販リスクと需要崩壊リスクを排除する。
 *
 * スコア範囲: 0-100
 * - 85点以上: 自動決済対象
 * - 70-84点: 手動レビュー推奨
 * - 70点未満: パス
 */

import { Product, KeepaData, AiArbitrageAssessment } from '@/types/product';

/**
 * P-4戦略: 市場在庫枯渇予見戦略（最高得点）
 *
 * 条件:
 * 1. Amazon本体が在庫切れまたは高価格
 * 2. メーカー終売確認済み（final_production_status = 'discontinued'）
 * 3. Keepaランキング良好（直前90日間）→ 需要確実性の証明
 * 4. 他市場の在庫も枯渇傾向
 */
function scoreP4Strategy(product: Product): number {
  let score = 0;

  // 1. Amazon本体在庫ステータス（必須）
  const amazonOutOfStock =
    product.amazon_inventory_status === 'out_of_stock' ||
    product.amazon_inventory_status === 'high_price';

  if (!amazonOutOfStock) return 0;

  // 2. 【再販リスク排除】メーカー終売ステータス（必須）
  const isDiscontinued = product.final_production_status === 'discontinued';
  if (!isDiscontinued) return 0;

  // 3. 【需要確実性の証明】Keepaランキングが良好
  const hasHighDemand =
    product.keepa_ranking_avg_90d !== null &&
    product.keepa_ranking_avg_90d !== undefined &&
    product.keepa_ranking_avg_90d < 5000; // 5000位以内を良しとする

  if (!hasHighDemand) return 0;

  // 4. 【市場枯渇の証明】他市場の在庫も枯渇しているか
  const isOtherMarketScarcity = analyzeMarketScarcity(product.multi_market_inventory);

  // すべての条件を満たした場合、最高ボーナス点を付与
  if (isDiscontinued && hasHighDemand && isOtherMarketScarcity) {
    score += 50; // 最高ボーナス
  }

  return score;
}

/**
 * P-1戦略: シャープな一時的下落（価格ミス）
 *
 * 条件:
 * 1. 現在価格が90日平均価格の70%未満
 * 2. 価格下落率が20%以上
 * 3. AIリスク判定で「需要崩壊」や「偽物リスク」が検出されない
 */
function scoreP1Strategy(product: Product): number {
  let score = 0;

  const keepaData = product.keepa_data;
  if (!keepaData) return 0;

  const currentPrice = keepaData.current_price;
  const averagePrice90d = keepaData.average_price_90d;
  const priceDropRatio = keepaData.price_drop_ratio;

  if (!currentPrice || !averagePrice90d) return 0;

  // シャープな価格下落を検出
  if (currentPrice < averagePrice90d * 0.7 && priceDropRatio && priceDropRatio > 0.2) {
    score += 40; // 高ボーナス
  }

  return score;
}

/**
 * P-2戦略: 寝かせ戦略（値上がり待機）
 *
 * 条件:
 * 1. メーカー終売確認済み
 * 2. 需要は安定している
 * 3. 価格が今後上昇する可能性が高い
 */
function scoreP2Strategy(product: Product): number {
  let score = 0;

  // 寝かせ推奨フラグが立っている場合
  if (product.hold_recommendation) {
    score += 30; // 中程度のボーナス
  }

  // メーカー終売 + 需要安定
  const isDiscontinued = product.final_production_status === 'discontinued';
  const hasStableDemand =
    product.keepa_ranking_avg_90d !== null &&
    product.keepa_ranking_avg_90d !== undefined &&
    product.keepa_ranking_avg_90d < 10000;

  if (isDiscontinued && hasStableDemand) {
    score += 20;
  }

  return score;
}

/**
 * P-3戦略: 緩やかな値崩れ（減点ロジック）
 *
 * 価格が緩やかに下落している商品は避ける
 */
function detectP3Risk(product: Product): number {
  const keepaData = product.keepa_data;
  if (!keepaData || !keepaData.price_history) return 0;

  // 価格トレンドが下降傾向かチェック
  const priceHistory = keepaData.price_history;
  if (priceHistory.length < 30) return 0;

  // 直近30日間の価格を比較
  const recentPrices = priceHistory.slice(-30);
  const avgRecent = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;

  // 90日前の価格と比較
  const oldPrices = priceHistory.slice(0, 30);
  const avgOld = oldPrices.reduce((sum, p) => sum + p.price, 0) / oldPrices.length;

  // 緩やかな値崩れを検出（10%以上の下落）
  if (avgRecent < avgOld * 0.9) {
    return -50; // 大幅減点
  }

  return 0;
}

/**
 * 他市場の在庫枯渇状況を分析
 */
function analyzeMarketScarcity(multiMarketInventory?: any): boolean {
  if (!multiMarketInventory) return false;

  const markets = ['rakuten', 'yahoo', 'mercari', 'amazon_jp'];
  let outOfStockCount = 0;

  for (const market of markets) {
    const marketData = multiMarketInventory[market];
    if (!marketData || marketData.inventory === 0 || marketData.inventory < 5) {
      outOfStockCount++;
    }
  }

  // 50%以上の市場で在庫枯渇していれば真
  return outOfStockCount >= markets.length / 2;
}

/**
 * FBA手数料の簡易計算（国別）
 */
function calculateFbaFee(asin: string, isUS: boolean): number {
  // 実際はASINから商品サイズ・重量を取得して計算
  // ここでは簡易的に固定値
  return isUS ? 5.0 : 500; // USD or JPY
}

/**
 * 国内送料の計算（FBA倉庫への送料）
 */
function calculateDomesticShipping(weight_kg: number): number {
  // 簡易計算: 1kgあたり500円（日本）、$5（米国）
  return weight_kg * 500;
}

/**
 * 利益率を計算（自国完結型）
 */
function calculateProfitMargin(product: Product): number {
  const isUS = product.target_country === 'US';
  const currentBuyPrice = isUS ? product.price : product.cost || 0;
  const finalSalePrice = currentBuyPrice * 1.5; // 簡易的に1.5倍を販売価格とする

  const fbaFee = calculateFbaFee(product.asin, isUS);
  const domesticShippingCost = calculateDomesticShipping(1.0); // 仮に1kg

  const netProfit = finalSalePrice - currentBuyPrice - fbaFee - domesticShippingCost;
  const profitMargin = (netProfit / currentBuyPrice) * 100;

  return profitMargin;
}

/**
 * 利益率スコアを計算
 *
 * - 30%以上: 100点
 * - 20%: 70点
 * - 10%: 40点
 * - 0%: 0点
 */
function scoreProfitMargin(profitMargin: number): number {
  if (profitMargin >= 30) return 100;
  if (profitMargin >= 20) return 70 + ((profitMargin - 20) / 10) * 30;
  if (profitMargin >= 10) return 40 + ((profitMargin - 10) / 10) * 30;
  return Math.max(0, (profitMargin / 10) * 40);
}

/**
 * AIリスク分析によるスコア調整
 *
 * - high risk: スコアを0に設定（自動除外）
 * - medium risk: -20点
 * - low risk: 影響なし
 */
function applyAiRiskAdjustment(
  score: number,
  aiAssessment?: AiArbitrageAssessment | null
): number {
  if (!aiAssessment) return score;

  // 高リスク商品は強制的に0点（自動決済から除外）
  if (aiAssessment.risk === 'high') {
    return 0;
  }

  // 中リスク商品は減点
  if (aiAssessment.risk === 'medium') {
    return Math.max(0, score - 20);
  }

  return score;
}

/**
 * メインのスコア計算関数
 *
 * @param product 商品データ
 * @returns 最終的な arbitrage_score (0-100)
 */
export function calculateArbitrageScore(product: Product): number {
  let score = 0;

  // 1. P-4戦略（最優先）
  const p4Score = scoreP4Strategy(product);
  score += p4Score;

  // 2. P-1戦略（価格ミス）
  if (p4Score === 0) {
    // P-4に該当しない場合のみP-1を評価
    const p1Score = scoreP1Strategy(product);
    score += p1Score;
  }

  // 3. P-2戦略（寝かせ）
  const p2Score = scoreP2Strategy(product);
  score += p2Score;

  // 4. 利益率スコア
  const profitMargin = calculateProfitMargin(product);
  const profitScore = scoreProfitMargin(profitMargin);
  score += profitScore * 0.3; // 重み付け30%

  // 5. P-3リスク（値崩れ）の検出と減点
  const p3Risk = detectP3Risk(product);
  score += p3Risk;

  // 6. AIリスク分析による最終調整（最優先処理）
  score = applyAiRiskAdjustment(score, product.ai_arbitrage_assessment);

  // 最終スコアを0-100の範囲に収める
  return Math.max(0, Math.min(100, score));
}

/**
 * 複数商品を一括スコアリング
 */
export async function scoreProducts(products: Product[]): Promise<Product[]> {
  return products.map((product) => ({
    ...product,
    arbitrage_score: calculateArbitrageScore(product),
  }));
}

/**
 * スコアによるフィルタリング
 */
export function filterByScore(
  products: Product[],
  minScore: number,
  maxScore: number = 100
): Product[] {
  return products.filter(
    (p) =>
      p.arbitrage_score !== null &&
      p.arbitrage_score !== undefined &&
      p.arbitrage_score >= minScore &&
      p.arbitrage_score <= maxScore
  );
}

/**
 * 自動決済対象商品を抽出（スコア85点以上）
 */
export function getAutoPurchaseCandidates(products: Product[]): Product[] {
  return filterByScore(products, 85, 100);
}
