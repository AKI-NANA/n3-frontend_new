/**
 * リスク分析サービス
 * ✅ I2-3: Gemini AI統合完全実装版
 *
 * 機能:
 * - 注文時の仕入れ元トラブル履歴分析
 * - 市場価格変動の検知
 * - AIリスクスコアの算出とDB保存
 */

import { callGeminiAPIForJSON } from '@/lib/services/ai/gemini/gemini-api';
import { createClient } from '@/lib/supabase/server';

export interface RiskAnalysisResult {
  order_id: string;
  ai_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: string[];
  recommendations: string[];
  analyzed_at: string;
}

/**
 * ✅ 仕入れ元のトラブル履歴を分析
 */
async function analyzeSupplierHistory(supplierId: string, productAsin: string): Promise<{
  historyScore: number;
  issues: string[];
}> {
  try {
    const supabase = await createClient();

    // 過去のトラブル履歴を取得
    const { data: history, error } = await supabase
      .from('supplier_issues')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 過去90日間
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Risk] 履歴取得エラー:', error);
      return { historyScore: 100, issues: [] };
    }

    if (!history || history.length === 0) {
      return { historyScore: 100, issues: [] };
    }

    // トラブルの深刻度を評価
    const severeIssues = history.filter((h) => h.severity === 'HIGH' || h.severity === 'CRITICAL');
    const historyScore = Math.max(100 - severeIssues.length * 20, 0);

    const issues = history.map((h) => `${h.issue_type}: ${h.description}`);

    console.log(`[Risk] 仕入れ元履歴分析: ${supplierId} - Score: ${historyScore}`);
    return { historyScore, issues };
  } catch (error) {
    console.error('[Risk] 仕入れ元履歴分析エラー:', error);
    return { historyScore: 100, issues: [] };
  }
}

/**
 * ✅ 市場価格変動を検知
 */
async function detectPriceFluctuation(productAsin: string, currentPrice: number): Promise<{
  fluctuationScore: number;
  priceChange: number;
  alert: boolean;
}> {
  try {
    const supabase = await createClient();

    // 過去30日間の価格履歴を取得
    const { data: priceHistory, error } = await supabase
      .from('price_history')
      .select('price, checked_at')
      .eq('asin', productAsin)
      .gte('checked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: false })
      .limit(30);

    if (error || !priceHistory || priceHistory.length === 0) {
      return { fluctuationScore: 100, priceChange: 0, alert: false };
    }

    // 平均価格を計算
    const avgPrice = priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length;
    const priceChangePercent = ((currentPrice - avgPrice) / avgPrice) * 100;

    // 急激な価格上昇を検知
    const alert = priceChangePercent > 20; // 20%以上の上昇
    const fluctuationScore = alert ? Math.max(100 - Math.abs(priceChangePercent), 0) : 100;

    console.log(`[Risk] 価格変動分析: ${productAsin} - Change: ${priceChangePercent.toFixed(2)}%`);
    return { fluctuationScore, priceChange: priceChangePercent, alert };
  } catch (error) {
    console.error('[Risk] 価格変動分析エラー:', error);
    return { fluctuationScore: 100, priceChange: 0, alert: false };
  }
}

/**
 * ✅ Gemini AIで総合リスク分析
 */
export async function analyzeOrderRisk(orderId: string, orderData: {
  product_asin: string;
  supplier_id: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
}): Promise<RiskAnalysisResult> {
  try {
    // 並列処理で履歴と価格変動を分析
    const [supplierAnalysis, priceAnalysis] = await Promise.all([
      analyzeSupplierHistory(orderData.supplier_id, orderData.product_asin),
      detectPriceFluctuation(orderData.product_asin, orderData.purchase_price),
    ]);

    // Gemini AIに総合リスク評価を依頼
    const prompt = `
あなたは注文リスク分析の専門AIです。以下の情報を総合的に分析し、リスクスコアを算出してください。

【注文情報】
- 商品ASIN: ${orderData.product_asin}
- 仕入れ先ID: ${orderData.supplier_id}
- 仕入れ価格: $${orderData.purchase_price}
- 販売価格: $${orderData.selling_price}
- 数量: ${orderData.quantity}

【仕入れ元履歴分析】
- 履歴スコア: ${supplierAnalysis.historyScore}/100
- トラブル履歴: ${JSON.stringify(supplierAnalysis.issues)}

【価格変動分析】
- 価格変動スコア: ${priceAnalysis.fluctuationScore}/100
- 価格変動率: ${priceAnalysis.priceChange.toFixed(2)}%
- 急騰アラート: ${priceAnalysis.alert ? 'あり' : 'なし'}

【評価項目】
1. 仕入れ元の信頼性
2. 価格変動リスク
3. 利益率の妥当性
4. 在庫リスク

【判定結果をJSON形式で返してください】
{
  "ai_risk_score": 0-100（0が最もリスク高、100が最も安全）,
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "risk_factors": ["リスク要因1", "リスク要因2", ...],
  "recommendations": ["推奨アクション1", "推奨アクション2", ...]
}
`.trim();

    const aiResult = await callGeminiAPIForJSON<{
      ai_risk_score: number;
      risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      risk_factors: string[];
      recommendations: string[];
    }>(prompt, {
      temperature: 0.3,
      maxTokens: 1024,
    });

    const result: RiskAnalysisResult = {
      order_id: orderId,
      ai_risk_score: aiResult.ai_risk_score,
      risk_level: aiResult.risk_level,
      risk_factors: aiResult.risk_factors || [],
      recommendations: aiResult.recommendations || [],
      analyzed_at: new Date().toISOString(),
    };

    // DBに保存
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('orders_v2')
      .update({
        ai_risk_score: result.ai_risk_score,
        risk_level: result.risk_level,
        risk_analysis_data: {
          risk_factors: result.risk_factors,
          recommendations: result.recommendations,
          analyzed_at: result.analyzed_at,
        },
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[Risk] DB更新エラー:', updateError);
    } else {
      console.log(`[Risk] リスク分析完了: ${orderId} - Score: ${result.ai_risk_score}, Level: ${result.risk_level}`);
    }

    return result;
  } catch (error) {
    console.error('[Risk] 総合リスク分析エラー:', error);

    // フォールバック: 簡易スコア算出
    const fallbackScore = Math.round(
      (supplierAnalysis.historyScore + priceAnalysis.fluctuationScore) / 2
    );

    return {
      order_id: orderId,
      ai_risk_score: fallbackScore,
      risk_level: fallbackScore >= 80 ? 'LOW' : fallbackScore >= 60 ? 'MEDIUM' : fallbackScore >= 40 ? 'HIGH' : 'CRITICAL',
      risk_factors: ['AI分析に失敗しました'],
      recommendations: ['手動でリスクを確認してください'],
      analyzed_at: new Date().toISOString(),
    };
  }
}
