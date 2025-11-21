/**
 * 外注UI用API: Gemini AI投入処理
 * POST /api/ai/process-sku
 *
 * 外注作業者が「AI (Gemini) 投入」ボタンをクリックした際に呼び出される
 * SKUマスターのStatusを '優先度決定済' → 'AI処理中' → '外注処理完了' に変更
 *
 * 処理内容:
 * 1. ステータスを 'AI処理中' に即時更新（作業の重複を防ぐ）
 * 2. Gemini APIを呼び出し、商品説明文、Item Specifics、VEROチェックなどを実行
 * 3. 処理完了後、ステータスを '外注処理完了' に更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku } = body;

    if (!sku) {
      return NextResponse.json(
        {
          success: false,
          error: 'sku フィールドが必要です',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Step 1: 商品データを取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', sku)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        {
          success: false,
          error: '商品が見つかりません',
        },
        { status: 404 }
      );
    }

    // Step 2: ステータスを 'AI処理中' に即時更新（重複防止）
    const { error: updateStatusError } = await supabase
      .from('products_master')
      .update({
        status: 'AI処理中',
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku);

    if (updateStatusError) {
      throw new Error(`ステータス更新エラー: ${updateStatusError.message}`);
    }

    // Step 3: Gemini API呼び出し（モック実装）
    const aiResult = await processWithGemini(product);

    // Step 4: AI処理結果をDBに保存し、ステータスを '外注処理完了' に更新
    const { error: updateResultError } = await supabase
      .from('products_master')
      .update({
        status: '外注処理完了',
        title_en: aiResult.title_en,
        description: aiResult.description,
        // AI処理結果をメタデータとして保存
        scraped_data: {
          ...(product.scraped_data || {}),
          ai_enrichment: aiResult,
          processed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku);

    if (updateResultError) {
      throw new Error(`結果更新エラー: ${updateResultError.message}`);
    }

    return NextResponse.json({
      success: true,
      sku,
      status: '外注処理完了',
      ai_result: aiResult,
      message: 'AI処理が完了しました',
    });
  } catch (error) {
    console.error('❌ AI Process SKU Error:', error);

    // エラー発生時、ステータスを元に戻す
    try {
      const body = await request.json();
      const { sku } = body;
      if (sku) {
        const supabase = await createClient();
        await supabase
          .from('products_master')
          .update({
            status: '優先度決定済',
            updated_at: new Date().toISOString(),
          })
          .eq('sku', sku);
      }
    } catch (rollbackError) {
      console.error('❌ Rollback Error:', rollbackError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * Gemini APIを使った商品データ補完処理（モック実装）
 * 実際の実装では、Gemini APIを呼び出して以下の処理を行う:
 * - 英語タイトル生成
 * - 商品説明文生成
 * - Item Specifics抽出
 * - VEROリスクチェック
 * - カテゴリ推定
 */
async function processWithGemini(product: any): Promise<{
  title_en: string;
  description: string;
  item_specifics: Record<string, string>;
  vero_risk: 'low' | 'medium' | 'high';
  category_suggestion: string | null;
}> {
  // TODO: 実際のGemini API呼び出しに置き換える
  // 現在はモック実装

  console.log(`[Mock] Processing with Gemini: SKU ${product.sku}`);

  // モック処理（実際はGemini APIを呼び出す）
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機

  return {
    title_en: `[AI Generated] ${product.title || 'Product Title'}`,
    description: `This is an AI-generated product description for ${product.title || 'this product'}. It includes detailed information about the product features, specifications, and benefits.`,
    item_specifics: {
      Brand: 'Unknown',
      Condition: product.condition || 'New',
      'Country/Region of Manufacture': 'Japan',
    },
    vero_risk: 'low',
    category_suggestion: product.category_name || null,
  };
}

/**
 * AI処理のステータス確認
 * GET /api/ai/process-sku?sku=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sku = searchParams.get('sku');

    if (!sku) {
      return NextResponse.json(
        {
          success: false,
          error: 'sku パラメータが必要です',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products_master')
      .select('sku, status, scraped_data')
      .eq('sku', sku)
      .single();

    if (error || !product) {
      return NextResponse.json(
        {
          success: false,
          error: '商品が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sku: product.sku,
      status: product.status,
      ai_enrichment: (product.scraped_data as any)?.ai_enrichment || null,
    });
  } catch (error) {
    console.error('❌ AI Process Status Check Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
