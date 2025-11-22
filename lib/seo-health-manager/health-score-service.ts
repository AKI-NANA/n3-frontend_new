/**
 * SEO健全性スコアサービス
 * ✅ I2-2: Gemini Vision API統合完全実装版
 *
 * 機能:
 * - 画像/タイトル/説明文のポリシー適合性をAIで判定
 * - SEO健全性スコアを計算
 * - 改善提案を生成してDBに保存
 */

import { callGeminiVisionAPI, callGeminiAPIForJSON } from '@/lib/services/ai/gemini/gemini-api';
import { createClient } from '@/lib/supabase/server';

export interface HealthScoreResult {
  sku: string;
  overall_score: number;
  image_score: number;
  title_score: number;
  description_score: number;
  policy_violations: string[];
  improvement_suggestions: string[];
  last_checked_at: string;
}

/**
 * ✅ 画像のポリシー適合性をGemini Vision APIで判定
 */
async function analyzeImageCompliance(imageUrl: string, sku: string): Promise<{
  score: number;
  violations: string[];
  suggestions: string[];
}> {
  try {
    const prompt = `
あなたはEコマースプラットフォームのポリシー審査AIです。以下の商品画像を分析してください。

【評価項目】
1. 画像の品質（解像度、明るさ、ピント）
2. 背景の適切性（シンプルで商品が目立つか）
3. ウォーターマークや不適切なテキストの有無
4. 商品の見やすさ
5. プラットフォームポリシー違反の有無

【判定結果をJSON形式で返してください】
{
  "score": 0-100の数値（100が最高）,
  "violations": ["違反項目1", "違反項目2", ...],
  "suggestions": ["改善提案1", "改善提案2", ...]
}
`.trim();

    const result = await callGeminiVisionAPI(prompt, imageUrl, {
      temperature: 0.3,
      maxTokens: 1024,
    });

    // JSON部分を抽出
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : result;
    const parsed = JSON.parse(jsonText);

    console.log(`[Health Score] 画像分析完了: ${sku} - Score: ${parsed.score}`);

    return {
      score: parsed.score || 70,
      violations: parsed.violations || [],
      suggestions: parsed.suggestions || [],
    };
  } catch (error) {
    console.error('[Health Score] 画像分析エラー:', error);
    return {
      score: 70,
      violations: [],
      suggestions: ['画像分析に失敗しました。手動で確認してください。'],
    };
  }
}

/**
 * ✅ タイトルと説明文のSEO/ポリシー適合性を分析
 */
async function analyzeTextCompliance(title: string, description: string, sku: string): Promise<{
  titleScore: number;
  descriptionScore: number;
  violations: string[];
  suggestions: string[];
}> {
  try {
    const prompt = `
あなたはEコマースSEOとポリシー審査の専門AIです。以下の商品情報を分析してください。

【商品タイトル】
${title}

【商品説明】
${description}

【評価項目】
1. SEO効果（キーワードの適切性、長さ）
2. ポリシー違反（禁止ワード、誇大広告、虚偽情報）
3. 可読性と明確性
4. ターゲット顧客への訴求力

【判定結果をJSON形式で返してください】
{
  "titleScore": 0-100,
  "descriptionScore": 0-100,
  "violations": ["違反項目1", ...],
  "suggestions": ["改善提案1", ...]
}
`.trim();

    const result = await callGeminiAPIForJSON<{
      titleScore: number;
      descriptionScore: number;
      violations: string[];
      suggestions: string[];
    }>(prompt, {
      temperature: 0.3,
      maxTokens: 1024,
    });

    console.log(`[Health Score] テキスト分析完了: ${sku}`);

    return result;
  } catch (error) {
    console.error('[Health Score] テキスト分析エラー:', error);
    return {
      titleScore: 70,
      descriptionScore: 70,
      violations: [],
      suggestions: ['テキスト分析に失敗しました。'],
    };
  }
}

/**
 * ✅ 商品のSEO健全性スコアを計算してDBに保存
 */
export async function updateHealthScore(productId: string, sku: string): Promise<HealthScoreResult> {
  try {
    const supabase = await createClient();

    // 商品データを取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('title, description, listing_data, images')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`商品データ取得エラー: ${productError?.message}`);
    }

    const imageUrl = product.listing_data?.primary_image_url || product.images?.[0]?.url;

    // 並列処理で画像とテキストを分析
    const [imageAnalysis, textAnalysis] = await Promise.all([
      imageUrl ? analyzeImageCompliance(imageUrl, sku) : Promise.resolve({ score: 0, violations: ['画像なし'], suggestions: [] }),
      analyzeTextCompliance(product.title || '', product.description || '', sku),
    ]);

    // 総合スコアを計算
    const overallScore = Math.round(
      (imageAnalysis.score * 0.4 + textAnalysis.titleScore * 0.3 + textAnalysis.descriptionScore * 0.3)
    );

    const allViolations = [...imageAnalysis.violations, ...textAnalysis.violations];
    const allSuggestions = [...imageAnalysis.suggestions, ...textAnalysis.suggestions];

    const result: HealthScoreResult = {
      sku,
      overall_score: overallScore,
      image_score: imageAnalysis.score,
      title_score: textAnalysis.titleScore,
      description_score: textAnalysis.descriptionScore,
      policy_violations: allViolations,
      improvement_suggestions: allSuggestions,
      last_checked_at: new Date().toISOString(),
    };

    // DBに保存
    const { error: upsertError } = await supabase
      .from('seo_health_scores')
      .upsert({
        product_id: productId,
        sku,
        ...result,
      }, {
        onConflict: 'sku',
      });

    if (upsertError) {
      console.error('[Health Score] DB保存エラー:', upsertError);
    } else {
      console.log(`[Health Score] 保存成功: ${sku} - Overall Score: ${overallScore}`);
    }

    return result;
  } catch (error) {
    console.error('[Health Score] 全体エラー:', error);
    throw error;
  }
}

/**
 * ✅ 全リスティングの健全性スコアを更新（Cronジョブ用）
 */
export async function updateAllListings(): Promise<void> {
  try {
    const supabase = await createClient();

    // アクティブな商品を取得
    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku')
      .eq('status', 'active')
      .limit(100); // バッチサイズ

    if (error || !products) {
      throw new Error(`商品取得エラー: ${error?.message}`);
    }

    console.log(`[Health Score] ${products.length}件の商品を分析開始`);

    // 並列処理（同時実行数を制限）
    const BATCH_SIZE = 5;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((p) => updateHealthScore(p.id, p.sku).catch((err) => {
          console.error(`[Health Score] ${p.sku} エラー:`, err);
        }))
      );

      // レート制限対策（APIコール間の待機）
      if (i + BATCH_SIZE < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('[Health Score] 全リスティング分析完了');
  } catch (error) {
    console.error('[Health Score] バッチ処理エラー:', error);
    throw error;
  }
}
