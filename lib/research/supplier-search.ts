/**
 * AI仕入れ先候補探索モジュール
 *
 * 優先順位:
 * 1. 商品名・型番での検索
 * 2. 画像解析による検索（Google Lens等）
 * 3. 仕入れ先データベースとの照合
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SupplierCandidate, SearchMethod } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface SupplierSearchParams {
  product_name: string;
  product_model?: string;
  image_url?: string;
  price_range_jpy?: {
    min?: number;
    max?: number;
  };
  ebay_item_id?: string;
  sku?: string;
}

export interface SupplierSearchResult {
  candidates: SupplierCandidate[];
  search_method: SearchMethod;
  confidence: number;
  error?: string;
}

/**
 * AI仕入れ先候補探索のメイン関数
 */
export async function searchSupplierCandidates(
  params: SupplierSearchParams
): Promise<SupplierSearchResult> {
  console.log('🔍 AI仕入れ先候補探索開始:', params);

  try {
    // 優先順位1: 商品名・型番での検索
    if (params.product_name) {
      const result = await searchByProductName(params);
      if (result.candidates.length > 0) {
        return result;
      }
    }

    // 優先順位2: 画像解析による検索
    if (params.image_url) {
      const result = await searchByImage(params);
      if (result.candidates.length > 0) {
        return result;
      }
    }

    // 優先順位3: データベースとの照合
    const result = await searchByDatabase(params);
    return result;
  } catch (error) {
    console.error('❌ AI仕入れ先候補探索エラー:', error);
    return {
      candidates: [],
      search_method: 'product_name',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 商品名・型番での検索
 */
async function searchByProductName(
  params: SupplierSearchParams
): Promise<SupplierSearchResult> {
  console.log('🔍 商品名・型番で検索:', params.product_name);

  const prompt = buildSupplierSearchPrompt(params);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const candidates = parseSupplierResponse(responseText, params);

    return {
      candidates,
      search_method: params.product_model ? 'model_number' : 'product_name',
      confidence: candidates.length > 0 ? candidates[0].confidence_score || 0 : 0,
    };
  } catch (error) {
    console.error('❌ Claude API エラー:', error);
    throw error;
  }
}

/**
 * 画像解析による検索
 */
async function searchByImage(
  params: SupplierSearchParams
): Promise<SupplierSearchResult> {
  console.log('🖼️ 画像解析で検索:', params.image_url);

  const prompt = buildImageSearchPrompt(params);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: params.image_url!,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const candidates = parseSupplierResponse(responseText, params);

    return {
      candidates,
      search_method: 'image_search',
      confidence: candidates.length > 0 ? candidates[0].confidence_score || 0 : 0,
    };
  } catch (error) {
    console.error('❌ 画像解析エラー:', error);
    throw error;
  }
}

/**
 * データベースとの照合（フォールバック）
 */
async function searchByDatabase(
  params: SupplierSearchParams
): Promise<SupplierSearchResult> {
  console.log('🗄️ データベースで検索:', params.product_name);

  // TODO: 既存の仕入れ先データベースとの照合ロジックを実装
  // 現時点ではモックデータを返す

  return {
    candidates: [],
    search_method: 'database_match',
    confidence: 0,
  };
}

/**
 * AIプロンプトの構築（商品名・型番検索用）
 */
function buildSupplierSearchPrompt(params: SupplierSearchParams): string {
  const priceRangeText = params.price_range_jpy
    ? `価格範囲: ${params.price_range_jpy.min || 0}円 〜 ${params.price_range_jpy.max || '上限なし'}円`
    : '';

  return `あなたは日本国内のEC仕入れ先探索の専門家です。以下の商品について、最も安価な仕入れ先候補を特定してください。

【商品情報】
商品名: ${params.product_name}
型番: ${params.product_model || '不明'}
${priceRangeText}

【探索対象サイト】
- Amazon Japan
- 楽天市場
- Yahoo!ショッピング
- メルカリ（新品のみ）

【回答形式】
以下のJSON形式で、最大3件の候補を回答してください:

\`\`\`json
{
  "candidates": [
    {
      "supplier_name": "Amazon Japan",
      "supplier_type": "amazon_jp",
      "supplier_url": "https://www.amazon.co.jp/...",
      "candidate_price_jpy": 5000,
      "estimated_domestic_shipping_jpy": 500,
      "confidence_score": 0.95,
      "stock_status": "in_stock",
      "notes": {
        "product_title": "商品のタイトル",
        "seller_name": "出品者名",
        "rating": 4.5
      }
    }
  ]
}
\`\`\`

【注意事項】
1. confidence_scoreは、同一商品である確率を0.0〜1.0で評価してください
2. 実在するURLのみを提供してください
3. 価格は最新の情報に基づいて推定してください
4. 在庫状況が不明な場合は "unknown" としてください
5. 仕入れ先が見つからない場合は、空の配列 [] を返してください

それでは、最も安価な仕入れ先候補を特定してください。`;
}

/**
 * AIプロンプトの構築（画像検索用）
 */
function buildImageSearchPrompt(params: SupplierSearchParams): string {
  return `この画像の商品について、日本国内の最も安価な仕入れ先を特定してください。

商品名（参考）: ${params.product_name}
型番（参考）: ${params.product_model || '不明'}

画像から商品を識別し、Amazon Japan、楽天市場、Yahoo!ショッピング、メルカリで検索してください。

回答は以下のJSON形式でお願いします:

\`\`\`json
{
  "candidates": [
    {
      "supplier_name": "サイト名",
      "supplier_type": "amazon_jp",
      "supplier_url": "商品ページのURL",
      "candidate_price_jpy": 価格,
      "estimated_domestic_shipping_jpy": 送料,
      "confidence_score": 0.0〜1.0の信頼度,
      "stock_status": "in_stock | out_of_stock | unknown",
      "notes": {
        "product_title": "特定した商品名",
        "identified_features": ["特徴1", "特徴2"]
      }
    }
  ]
}
\`\`\``;
}

/**
 * AIレスポンスのパース
 */
function parseSupplierResponse(
  responseText: string,
  params: SupplierSearchParams
): SupplierCandidate[] {
  try {
    // JSONブロックを抽出
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      console.warn('⚠️ JSON形式のレスポンスが見つかりません');
      return [];
    }

    const jsonText = jsonMatch[1];
    const parsed = JSON.parse(jsonText);

    if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
      console.warn('⚠️ candidates配列が見つかりません');
      return [];
    }

    // SupplierCandidate型に変換
    const candidates: SupplierCandidate[] = parsed.candidates.map((candidate: any) => ({
      product_name: params.product_name,
      product_model: params.product_model,
      ebay_item_id: params.ebay_item_id,
      sku: params.sku,
      supplier_name: candidate.supplier_name,
      supplier_type: candidate.supplier_type,
      supplier_url: candidate.supplier_url,
      candidate_price_jpy: parseFloat(candidate.candidate_price_jpy),
      estimated_domestic_shipping_jpy: parseFloat(candidate.estimated_domestic_shipping_jpy || 0),
      confidence_score: parseFloat(candidate.confidence_score || 0),
      stock_status: candidate.stock_status || 'unknown',
      notes: candidate.notes || {},
      ai_model_used: 'claude-3.5-sonnet',
      price_checked_at: new Date().toISOString(),
      is_primary_candidate: false,
    }));

    // 価格順にソート（最安値が先頭）
    candidates.sort((a, b) => {
      const totalA = a.candidate_price_jpy + (a.estimated_domestic_shipping_jpy || 0);
      const totalB = b.candidate_price_jpy + (b.estimated_domestic_shipping_jpy || 0);
      return totalA - totalB;
    });

    // 最安値候補をプライマリに設定
    if (candidates.length > 0) {
      candidates[0].is_primary_candidate = true;
    }

    console.log(`✅ ${candidates.length}件の候補を特定`);
    return candidates;
  } catch (error) {
    console.error('❌ レスポンスのパースエラー:', error);
    return [];
  }
}

/**
 * 推定国内送料の計算
 */
export function estimateDomesticShipping(
  weight_g?: number,
  supplier_type?: string
): number {
  // デフォルトの送料テーブル（簡易版）
  if (!weight_g) return 500; // 不明な場合は500円

  if (weight_g < 500) return 300;
  if (weight_g < 1000) return 500;
  if (weight_g < 2000) return 700;
  if (weight_g < 5000) return 1000;
  return 1500;
}
