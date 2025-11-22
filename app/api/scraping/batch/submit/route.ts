// app/api/scraping/batch/submit/route.ts
/**
 * バッチスクレイピング投入API
 *
 * 複数のURLをバッチとして登録し、キューに追加します
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_name, urls, platform = 'yahoo' } = body;

    if (!batch_name || !urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'batch_name と urls (配列) は必須です',
        },
        { status: 400 }
      );
    }

    console.log(`[BatchSubmit] バッチ登録開始: ${batch_name} (${urls.length}件)`);

    // 1. バッチレコードを作成
    const { data: batch, error: batchError } = await supabase
      .from('scraping_batches')
      .insert({
        batch_name,
        total_count: urls.length,
        status: 'pending',
      })
      .select()
      .single();

    if (batchError) {
      console.error('[BatchSubmit] バッチ作成エラー:', batchError);
      throw new Error(`バッチ作成エラー: ${batchError.message}`);
    }

    console.log(`[BatchSubmit] バッチID: ${batch.id}`);

    // 2. URLをキューに追加
    const queueItems = urls.map((url: string) => ({
      batch_id: batch.id,
      url: url.trim(),
      platform,
      status: 'pending',
      retry_count: 0,
    }));

    const { error: queueError } = await supabase
      .from('scraping_queue')
      .insert(queueItems);

    if (queueError) {
      console.error('[BatchSubmit] キュー追加エラー:', queueError);
      // バッチを削除してロールバック
      await supabase.from('scraping_batches').delete().eq('id', batch.id);
      throw new Error(`キュー追加エラー: ${queueError.message}`);
    }

    console.log(`[BatchSubmit] ✅ ${queueItems.length}件のタスクをキューに追加しました`);

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batch.id,
        batch_name,
        total_count: urls.length,
        message: `${urls.length}件のスクレイピングタスクを投入しました`,
      },
    });
  } catch (error) {
    console.error('[BatchSubmit] エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
