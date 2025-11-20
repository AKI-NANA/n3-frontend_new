/**
 * AI仕入れ先候補探索API
 *
 * POST /api/research/ai-supplier-search
 *
 * リクエスト:
 * {
 *   ebay_item_ids?: string[];
 *   product_ids?: string[];
 *   search_params?: {
 *     product_name: string;
 *     product_model?: string;
 *     image_url?: string;
 *   }
 * }
 *
 * レスポンス:
 * {
 *   success: boolean;
 *   data: SupplierCandidate[];
 *   processed_count: number;
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchSupplierCandidates } from '@/lib/research/supplier-search';
import type { AISupplierSearchRequest, SupplierCandidate } from '@/lib/research/types';

export async function POST(request: NextRequest) {
  try {
    const body: AISupplierSearchRequest = await request.json();
    console.log('🔍 AI仕入れ先候補探索API開始:', body);

    const results: SupplierCandidate[] = [];
    let processedCount = 0;

    // eBay Item IDsからの探索
    if (body.ebay_item_ids && body.ebay_item_ids.length > 0) {
      for (const ebayItemId of body.ebay_item_ids) {
        try {
          // research_resultsからデータ取得
          const { data: researchResult, error } = await supabase
            .from('research_results')
            .select('*')
            .eq('ebay_item_id', ebayItemId)
            .single();

          if (error || !researchResult) {
            console.warn(`⚠️ eBay Item ID ${ebayItemId} が見つかりません`);
            continue;
          }

          // research_statusをAI_QUEUEDに更新
          await supabase
            .from('research_results')
            .update({ research_status: 'AI_QUEUED' })
            .eq('ebay_item_id', ebayItemId);

          // AI探索実行
          const searchResult = await searchSupplierCandidates({
            product_name: researchResult.title,
            image_url: researchResult.image_url,
            ebay_item_id: ebayItemId,
          });

          if (searchResult.candidates.length > 0) {
            // Supabaseに保存
            const savedCandidates = await saveSupplierCandidates(searchResult.candidates);
            results.push(...savedCandidates);

            // research_resultsを更新
            await supabase
              .from('research_results')
              .update({
                research_status: 'AI_COMPLETED',
                ai_cost_status: true,
                ai_supplier_candidate_id: savedCandidates[0]?.id,
                ai_analyzed_at: new Date().toISOString(),
              })
              .eq('ebay_item_id', ebayItemId);

            processedCount++;
          } else {
            // 候補が見つからなかった場合
            await supabase
              .from('research_results')
              .update({
                research_status: 'AI_COMPLETED',
                ai_cost_status: false,
              })
              .eq('ebay_item_id', ebayItemId);
          }
        } catch (error) {
          console.error(`❌ eBay Item ID ${ebayItemId} の処理エラー:`, error);
        }
      }
    }

    // Product IDsからの探索
    if (body.product_ids && body.product_ids.length > 0) {
      for (const productId of body.product_ids) {
        try {
          // products_masterからデータ取得
          const { data: product, error } = await supabase
            .from('products_master')
            .select('*')
            .eq('id', productId)
            .single();

          if (error || !product) {
            console.warn(`⚠️ Product ID ${productId} が見つかりません`);
            continue;
          }

          // AI探索実行
          const searchResult = await searchSupplierCandidates({
            product_name: product.title,
            product_model: product.scraped_data?.model_number,
            image_url: product.primary_image_url || product.image_urls?.[0],
            sku: product.sku,
          });

          if (searchResult.candidates.length > 0) {
            // Supabaseに保存
            const savedCandidates = await saveSupplierCandidates(
              searchResult.candidates.map((c) => ({ ...c, product_id: productId }))
            );
            results.push(...savedCandidates);
            processedCount++;
          }
        } catch (error) {
          console.error(`❌ Product ID ${productId} の処理エラー:`, error);
        }
      }
    }

    // 直接検索パラメータからの探索
    if (body.search_params) {
      try {
        const searchResult = await searchSupplierCandidates(body.search_params);

        if (searchResult.candidates.length > 0) {
          const savedCandidates = await saveSupplierCandidates(searchResult.candidates);
          results.push(...savedCandidates);
          processedCount++;
        }
      } catch (error) {
        console.error('❌ 直接検索エラー:', error);
      }
    }

    console.log(`✅ AI仕入れ先候補探索完了: ${processedCount}件処理、${results.length}件の候補を特定`);

    return NextResponse.json({
      success: true,
      data: results,
      processed_count: processedCount,
    });
  } catch (error) {
    console.error('❌ AI仕入れ先候補探索APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 仕入れ先候補をSupabaseに保存
 */
async function saveSupplierCandidates(
  candidates: SupplierCandidate[]
): Promise<SupplierCandidate[]> {
  try {
    const { data, error } = await supabase
      .from('supplier_candidates')
      .insert(candidates)
      .select();

    if (error) {
      console.error('❌ supplier_candidates保存エラー:', error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0}件の候補をDBに保存`);
    return data || [];
  } catch (error) {
    console.error('❌ saveSupplierCandidatesエラー:', error);
    throw error;
  }
}

/**
 * GET: 仕入れ先候補の取得
 *
 * クエリパラメータ:
 * - ebay_item_id: eBay Item ID
 * - product_id: Product ID
 * - sku: SKU
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ebayItemId = searchParams.get('ebay_item_id');
    const productId = searchParams.get('product_id');
    const sku = searchParams.get('sku');

    let query = supabase.from('supplier_candidates').select('*');

    if (ebayItemId) {
      query = query.eq('ebay_item_id', ebayItemId);
    } else if (productId) {
      query = query.eq('product_id', productId);
    } else if (sku) {
      query = query.eq('sku', sku);
    } else {
      return NextResponse.json(
        { success: false, error: 'ebay_item_id, product_id, or sku is required' },
        { status: 400 }
      );
    }

    const { data, error } = await query.order('confidence_score', { ascending: false });

    if (error) {
      console.error('❌ 仕入れ先候補取得エラー:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('❌ GETエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
