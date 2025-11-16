// ファイル: /lib/research/scorer.ts

import { Product, AiAssessment } from "../../types/product";

// 刈り取りロジックの核となるスコアリング関数
export function calculateArbitrageScore(product: Product): number {
  let score = 50; // 基本点

  // Keepaデータが不足している場合は判定不可
  if (!product.keepa_data || product.keepa_data.priceHistory.length === 0) {
    return 0;
  }

  const { currentPrice, averagePrice90d, priceDropRatio, isDiscontinuedCategory } = extractKeepaMetrics(product.keepa_data);
  const aiAssessment = product.ai_arbitrage_assessment;

  // --- 1. P-1: シャープな一時的下落（価格ミス）の検出 ---
  // 現在価格が過去平均の70%を下回り、かつ価格変動が急激な場合
  if (currentPrice < averagePrice90d * 0.7 && priceDropRatio > 0.2) {
    score += 40; // 最優先チャンスとして高得点
  }

  // --- 2. P-2: 廃盤による希少価値上昇の検出 ---
  if (product.is_discontinued_category && product.keepa_data.offersCount < 3) {
    score += 20; // 中期的な高利益チャンスとして加点
  }

  // --- 3. P-3: 緩やかな値崩れの検出 (減点ロジック) ---
  // 価格トレンドが継続的な下落を示している場合（具体的な実装はKeepaのトレンドデータに依存）
  if (isPriceTrendDownward(product.keepa_data)) {
    score -= 30; // 単純な値崩れは減点
  }
  
  // --- 4. AIによる最終リスク/ポテンシャルの補正 ---
  if (aiAssessment) {
    // 損失リスク回避: 需要がない/偽物リスクを検出した場合
    if (aiAssessment.risk === 'high') {
      console.warn(`ASIN ${product.sku} has high risk: ${aiAssessment.risk_reason}. Score set to 0.`);
      return 0; // スコアを強制的に0点に設定し、自動決済対象から除外
    }

    // AIが高ポテンシャルと判定した場合
    if (aiAssessment.potential === 'high') {
      score += 10; // ボーナス点
    }
  }

  return Math.max(0, score);
}

// Keepaデータから必要なメトリクスを抽出する（モック）
function extractKeepaMetrics(keepaData: Record<string, any>) {
  // 実際にはkeepaDataのJSON構造から値を計算・抽出する
  return {
    currentPrice: 10000,
    averagePrice90d: 12000,
    priceDropRatio: 0.15, // 過去2日の価格変動幅
    isPriceTrendDownward: false,
    offersCount: 5,
  };
}

// 継続的な下落トレンドを判断する（モック）
function isPriceTrendDownward(keepaData: Record<string, any>): boolean {
    // 実際には価格履歴の線形回帰分析などを行う
    return false; 
}

// --- 最終スコアが出たら、このスコアを元に自動決済が実行されます ---