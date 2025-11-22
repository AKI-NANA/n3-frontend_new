/**
 * AI仕入れ先探索キューAPI
 * リサーチ結果管理UIから呼び出され、選択された商品をAI解析キューに送信
 */

import { NextRequest, NextResponse } from 'next/server';
import { supplierDbService } from '@/services/ai_pipeline/SupplierDatabaseService';
import { supplierLocator } from '@/services/ai_pipeline/SupplierLocator';
import { supabase } from '@/lib/supabase/client';

/**
 * POST: 商品をAI解析キューに追加
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_ids, priority = 0, requested_by } = body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids配列が必要です' },
        { status: 400 }
      );
    }

    console.log(`[AI Queue API] ${product_ids.length}件の商品をキューに追加`);

    // キューに追加
    const queueItems = await supplierDbService.enqueueResearch(
      product_ids,
      priority,
      requested_by
    );

    // 非同期でAI解析を開始（バックグラウンド処理）
    // Note: 本番環境では、ワーカープロセスやジョブキューを使用すべき
    processQueueInBackground();

    return NextResponse.json({
      success: true,
      queued_count: queueItems.length,
      queue_items: queueItems,
    });
  } catch (error) {
    console.error('[AI Queue API] エラー:', error);
    return NextResponse.json(
      {
        error: 'キューへの追加に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: キューの状態を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // QUEUED, PROCESSING, COMPLETED, FAILED

    let query = supabase.from('ai_research_queue').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('priority', { ascending: false }).order('queued_at', {
      ascending: true,
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`キュー取得エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      queue_items: data,
      total: data.length,
    });
  } catch (error) {
    console.error('[AI Queue API] エラー:', error);
    return NextResponse.json(
      {
        error: 'キューの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: キューアイテムをキャンセル
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queue_id');
    const productId = searchParams.get('product_id');

    if (!queueId && !productId) {
      return NextResponse.json(
        { error: 'queue_id または product_id が必要です' },
        { status: 400 }
      );
    }

    let query = supabase.from('ai_research_queue').update({
      status: 'CANCELLED',
      completed_at: new Date().toISOString(),
    });

    if (queueId) {
      query = query.eq('id', queueId);
    } else if (productId) {
      query = query.eq('product_id', productId).in('status', ['QUEUED', 'PROCESSING']);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`キャンセルエラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'キューアイテムをキャンセルしました',
    });
  } catch (error) {
    console.error('[AI Queue API] エラー:', error);
    return NextResponse.json(
      {
        error: 'キャンセルに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * バックグラウンドでキューを処理
 * 注意: Next.js APIルートは長時間実行に適していないため、
 * 本番環境では別のワーカープロセス（VPS上のcronジョブなど）で実行すべき
 */
async function processQueueInBackground() {
  // 非同期で実行（awaitしない）
  setImmediate(async () => {
    try {
      console.log('[AI Queue Processor] バックグラウンド処理を開始');

      let processedCount = 0;
      const maxProcessPerRun = 10; // 1回の実行で最大10件処理

      while (processedCount < maxProcessPerRun) {
        // 次のアイテムを取得
        const queueItem = await supplierDbService.dequeueNext();

        if (!queueItem) {
          console.log('[AI Queue Processor] キューが空です');
          break;
        }

        console.log(
          `[AI Queue Processor] 処理中: 商品 ${queueItem.product_id}`
        );

        try {
          // 商品情報を取得
          const { data: product, error } = await supabase
            .from('products_master')
            .select('*')
            .eq('id', queueItem.product_id)
            .single();

          if (error || !product) {
            throw new Error(`商品データ取得エラー: ${error?.message}`);
          }

          // AI仕入れ先探索を実行
          const searchResult = await supplierLocator.searchSuppliers({
            product_id: product.id,
            title: product.title || '',
            english_title: product.english_title,
            image_urls: extractImageUrls(product),
            keywords: extractKeywords(product),
            priority: queueItem.priority,
          });

          // 結果をDBに保存
          await supplierDbService.saveSearchResult(searchResult);

          console.log(
            `[AI Queue Processor] 完了: 商品 ${queueItem.product_id} - ${searchResult.candidates.length}件の候補を発見`
          );

          processedCount++;
        } catch (itemError) {
          console.error(
            `[AI Queue Processor] 商品 ${queueItem.product_id} の処理エラー:`,
            itemError
          );

          // エラーをDBに記録
          await supplierDbService.updateQueueStatus(queueItem.id, 'FAILED', {
            completed_at: new Date().toISOString(),
            error_message:
              itemError instanceof Error ? itemError.message : 'Unknown error',
            retry_count: (queueItem.retry_count || 0) + 1,
          });

          processedCount++;
        }

        // レート制限対策：少し待機
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(
        `[AI Queue Processor] バックグラウンド処理完了: ${processedCount}件処理`
      );
    } catch (error) {
      console.error('[AI Queue Processor] 致命的エラー:', error);
    }
  });
}

/**
 * 商品データから画像URLを抽出
 */
function extractImageUrls(product: any): string[] {
  const urls: string[] = [];

  // listing_data から画像を抽出
  if (product.listing_data?.image_1) urls.push(product.listing_data.image_1);
  if (product.listing_data?.image_2) urls.push(product.listing_data.image_2);
  if (product.listing_data?.image_3) urls.push(product.listing_data.image_3);

  // scraped_data から画像を抽出
  if (product.scraped_data?.images) {
    urls.push(...product.scraped_data.images);
  }

  return urls.filter((url) => url && url.trim() !== '');
}

/**
 * 商品データからキーワードを抽出
 */
function extractKeywords(product: any): string[] {
  const keywords: string[] = [];

  if (product.title) keywords.push(product.title);
  if (product.english_title) keywords.push(product.english_title);

  // listing_data から型番やブランドを抽出
  if (product.listing_data?.brand) keywords.push(product.listing_data.brand);
  if (product.listing_data?.mpn) keywords.push(product.listing_data.mpn);
  if (product.listing_data?.upc) keywords.push(product.listing_data.upc);

  return keywords.filter((kw) => kw && kw.trim() !== '');
}
