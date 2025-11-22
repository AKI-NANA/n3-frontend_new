/**
 * Gemini AI連携サービス
 *
 * 機能:
 * 1. Amazon刈り取りリスク分析
 * 2. SEO最適化（商品説明の改善）
 * 3. 顧客対応（メッセージ自動返信）
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiArbitrageAssessment } from '@/types/product';

// Gemini APIクライアントの初期化
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY が設定されていません');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Amazon刈り取りリスク分析
 *
 * 商品データを元に、AIが以下を判断:
 * - 需要減退リスク
 * - 偽物リスク
 * - 再販リスク
 * - 刈り取りポテンシャル
 * - 推奨戦略（P-1〜P-4）
 *
 * @param productData 商品データ
 * @returns AI分析結果
 */
export async function analyzeArbitrageRisk(productData: {
  title: string;
  asin: string;
  category?: string;
  brand?: string;
  current_price?: number;
  average_price_90d?: number;
  price_drop_ratio?: number;
  sales_rank?: number;
  keepa_ranking_avg_90d?: number;
  final_production_status?: string | null;
  amazon_inventory_status?: string | null;
}): Promise<AiArbitrageAssessment> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
あなたは、Amazon刈り取りビジネスの専門家です。以下の商品データを分析し、刈り取りのポテンシャルとリスクを評価してください。

【商品データ】
- タイトル: ${productData.title}
- ASIN: ${productData.asin}
- カテゴリ: ${productData.category || '不明'}
- ブランド: ${productData.brand || '不明'}
- 現在価格: ¥${productData.current_price || '不明'}
- 90日平均価格: ¥${productData.average_price_90d || '不明'}
- 価格下落率: ${((productData.price_drop_ratio || 0) * 100).toFixed(1)}%
- セールスランク: ${productData.sales_rank || '不明'}
- 90日平均ランク: ${productData.keepa_ranking_avg_90d || '不明'}
- メーカー終売ステータス: ${productData.final_production_status || '不明'}
- Amazon在庫: ${productData.amazon_inventory_status || '不明'}

【評価項目】
1. 刈り取りポテンシャル（high/medium/low）
2. リスクレベル（high/medium/low）
3. ポテンシャルの理由
4. リスクの理由
5. 推奨戦略（P-1: 価格ミス / P-2: 寝かせ / P-3: 値崩れ(避けるべき) / P-4: 市場枯渇予見）
6. 推奨アクション（auto_purchase / manual_review / pass）

【リスク判定の重要ポイント】
- 偽物リスク: 高額ブランド品（Rolex, Louis Vuitton, Gucci, Apple等）は偽物リスクが高い
- 需要減退リスク: セールスランクが悪化している商品は需要減退の可能性あり
- 再販リスク: メーカーが生産継続している商品は再販で価格が下がる可能性あり

【出力フォーマット（JSONのみ）】
{
  "potential": "high" | "medium" | "low",
  "risk": "high" | "medium" | "low",
  "reason": "ポテンシャルの理由",
  "risk_reason": "リスクの理由",
  "strategy": "P-1" | "P-2" | "P-3" | "P-4",
  "recommended_action": "auto_purchase" | "manual_review" | "pass"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSONを抽出（マークダウンコードブロックを削除）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI応答からJSONを抽出できませんでした');
    }

    const assessment: AiArbitrageAssessment = JSON.parse(jsonMatch[0]);

    return assessment;
  } catch (error) {
    console.error('❌ Gemini AI分析エラー:', error);

    // エラー時はデフォルト値を返す
    return {
      potential: 'low',
      risk: 'high',
      reason: 'AI分析に失敗しました',
      risk_reason: 'AI分析に失敗したため、手動レビューを推奨します',
      strategy: 'P-3',
      recommended_action: 'manual_review',
    };
  }
}

/**
 * SEO最適化（商品説明の改善）
 *
 * 商品タイトルと説明を元に、SEOに最適化された説明文を生成
 *
 * @param productData 商品データ
 * @returns 最適化された商品説明
 */
export async function optimizeSEO(productData: {
  title: string;
  description?: string;
  features?: string[];
  category?: string;
  target_marketplace: 'Amazon' | 'eBay' | 'Rakuten' | 'Yahoo';
}): Promise<{
  optimized_title: string;
  optimized_description: string;
  keywords: string[];
}> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
あなたは、${productData.target_marketplace}のSEO専門家です。以下の商品データを元に、検索順位を上げるための最適化を行ってください。

【現在の商品データ】
- タイトル: ${productData.title}
- 説明: ${productData.description || 'なし'}
- 主要機能: ${productData.features?.join(', ') || 'なし'}
- カテゴリ: ${productData.category || '不明'}

【最適化の要件】
1. タイトルは80文字以内
2. 重要なキーワードを前方に配置
3. 説明文は500文字程度
4. 検索されやすいキーワードを含める
5. ${productData.target_marketplace}のガイドラインに準拠

【出力フォーマット（JSONのみ）】
{
  "optimized_title": "最適化されたタイトル",
  "optimized_description": "最適化された商品説明",
  "keywords": ["キーワード1", "キーワード2", "キーワード3"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI応答からJSONを抽出できませんでした');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('❌ Gemini SEO最適化エラー:', error);

    return {
      optimized_title: productData.title,
      optimized_description: productData.description || '',
      keywords: [],
    };
  }
}

/**
 * 顧客対応（メッセージ自動返信）
 *
 * 顧客からの問い合わせに対して、適切な返信を生成
 *
 * @param customerMessage 顧客からのメッセージ
 * @param context コンテキスト情報
 * @returns 推奨返信文
 */
export async function generateCustomerResponse(
  customerMessage: string,
  context: {
    order_id?: string;
    product_title?: string;
    issue_type?: 'shipping' | 'product' | 'return' | 'other';
    language?: 'ja' | 'en';
  }
): Promise<{
  response: string;
  tone: 'professional' | 'friendly' | 'apologetic';
  requires_human_review: boolean;
}> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-pro' });

    const language = context.language || 'ja';
    const languageInstruction = language === 'ja' ? '日本語で' : '英語で';

    const prompt = `
あなたは、ECサイトのカスタマーサポート担当者です。以下の顧客からのメッセージに対して、適切な返信を${languageInstruction}生成してください。

【顧客メッセージ】
${customerMessage}

【コンテキスト】
- 注文ID: ${context.order_id || '不明'}
- 商品名: ${context.product_title || '不明'}
- 問題タイプ: ${context.issue_type || '不明'}

【返信の要件】
1. 丁寧で親切な対応
2. 問題解決に向けた具体的な提案
3. 必要に応じて謝罪の言葉を含める
4. 200文字以内

【重要】
- 返品・返金に関する問題は人間のレビューが必要
- クレーム対応は慎重に

【出力フォーマット（JSONのみ）】
{
  "response": "返信文",
  "tone": "professional" | "friendly" | "apologetic",
  "requires_human_review": true | false
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI応答からJSONを抽出できませんでした');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('❌ Gemini 顧客対応エラー:', error);

    return {
      response: 'お問い合わせありがとうございます。担当者が確認の上、ご連絡いたします。',
      tone: 'professional',
      requires_human_review: true,
    };
  }
}
