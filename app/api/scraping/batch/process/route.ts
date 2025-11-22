// app/api/scraping/batch/process/route.ts
/**
 * バッチスクレイピング実行エンジン（タスク4A）
 *
 * 指示書の要件:
 * - scraping_queue から status='pending' のタスクを一定数（10件）取得
 * - レート制限対策: 3〜7秒のランダム遅延
 * - リトライロジック: 最大3回、失敗時は 'permanently_failed' に
 * - アトミック更新: scraping_batches のカウント更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL;

// ========================================
// ヘルパー関数
// ========================================

/**
 * ランダム遅延（レート制限対策）
 *
 * @param min - 最小ミリ秒
 * @param max - 最大ミリ秒
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[Delay] ${delay}ms 待機中...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Google Apps Script翻訳API呼び出し
 */
async function translateText(text: string): Promise<string> {
  if (!text || !GAS_TRANSLATE_URL) return text;

  try {
    const response = await fetch(GAS_TRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        text,
        sourceLang: 'ja',
        targetLang: 'en',
      }),
    });

    const result = await response.json();

    if (result.success && result.translated) {
      return result.translated;
    }

    return text;
  } catch (error) {
    console.error('[Translation] エラー:', error);
    return text;
  }
}

/**
 * Yahoo!オークションのスクレイピング
 * 既存の scrapeYahooAuction 関数を再利用
 */
async function scrapeYahooAuction(url: string): Promise<any> {
  let browser;

  try {
    console.log(`[Scraping] 開始: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await page.evaluate(() => {
      const result: any = {};

      // タイトル取得
      const h1 = document.querySelector('h1');
      result.title = h1?.textContent?.trim() || 'タイトル取得失敗';

      // 価格取得（即決 or 現在価格）
      let price = 0;
      const allDtElements = Array.from(document.querySelectorAll('dt'));
      const sokketsuDt = allDtElements.find(
        (dt) => dt.textContent?.trim() === '即決'
      );

      if (sokketsuDt) {
        const dd = sokketsuDt.nextElementSibling;
        const priceSpan = dd?.querySelector('span');
        if (priceSpan) {
          const priceText = priceSpan.innerHTML
            .replace(/<!--.*?-->/g, '')
            .replace(/<[^>]*>/g, '')
            .trim();
          const numbers = priceText.match(/[\d,]+/);
          if (numbers) {
            price = parseInt(numbers[0].replace(/,/g, ''));
          }
        }
      }

      if (price === 0) {
        const priceSpans = Array.from(document.querySelectorAll('span'));
        const priceSpan = priceSpans.find((span) => {
          const text = span.innerHTML || '';
          return text.includes('円') && text.match(/[\d,]+/);
        });

        if (priceSpan) {
          const priceText = priceSpan.innerHTML
            .replace(/<!--.*?-->/g, '')
            .replace(/<[^>]*>/g, '')
            .trim();
          const numbers = priceText.match(/[\d,]+/);
          if (numbers) {
            price = parseInt(numbers[0].replace(/,/g, ''));
          }
        }
      }

      result.price = price;

      // 状態取得
      const conditionDt = allDtElements.find(
        (dt) => dt.textContent?.trim() === '商品の状態'
      );
      if (conditionDt) {
        const dd = conditionDt.nextElementSibling;
        result.condition = dd?.textContent?.trim() || 'Unknown';
      }

      // 画像取得
      const images: string[] = [];
      const imgElements = Array.from(document.querySelectorAll('img'));
      imgElements.forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (
          src.includes('auctions.c.yimg.jp') &&
          !images.includes(src) &&
          images.length < 12
        ) {
          images.push(src);
        }
      });
      result.images = images;

      return result;
    });

    await browser.close();

    return {
      success: true,
      data: {
        title: data.title,
        price,
        condition: data.condition || 'Unknown',
        images: data.images || [],
        url,
      },
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    console.error('[Scraping] エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * バッチカウントをアトミックに更新
 */
async function incrementBatchCounts(
  batchId: string,
  processed: number = 0,
  success: number = 0,
  failed: number = 0
) {
  try {
    // increment_batch_counts 関数を使用（アトミック更新）
    const { error } = await supabase.rpc('increment_batch_counts', {
      p_batch_id: batchId,
      p_processed: processed,
      p_success: success,
      p_failed: failed,
    });

    if (error && error.code === '42883') {
      // RPCが未定義の場合は、直接UPDATE（アトミック更新）
      await supabase.rpc('exec_sql', {
        sql: `
          UPDATE scraping_batches
          SET
            processed_count = processed_count + $1,
            success_count = success_count + $2,
            failed_count = failed_count + $3,
            updated_at = NOW()
          WHERE id = $4
        `,
        params: [processed, success, failed, batchId],
      });
    } else if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[BatchUpdate] カウント更新エラー:', error);
    // フォールバック: 通常のUPDATE
    const { data: batch } = await supabase
      .from('scraping_batches')
      .select('processed_count, success_count, failed_count')
      .eq('id', batchId)
      .single();

    if (batch) {
      await supabase
        .from('scraping_batches')
        .update({
          processed_count: batch.processed_count + processed,
          success_count: batch.success_count + success,
          failed_count: batch.failed_count + failed,
        })
        .eq('id', batchId);
    }
  }
}

// ========================================
// メイン処理
// ========================================

export async function POST(request: NextRequest) {
  try {
    const { batch_size = 10 } = await request.json().catch(() => ({}));

    console.log(`[BatchProcess] バッチ処理開始（最大${batch_size}件）`);

    // 1. pendingタスクを取得して processing に更新
    const { data: tasks, error: fetchError } = await supabase
      .from('scraping_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`タスク取得エラー: ${fetchError.message}`);
    }

    if (!tasks || tasks.length === 0) {
      console.log('[BatchProcess] 処理対象のタスクがありません');
      return NextResponse.json({
        success: true,
        message: '処理対象のタスクがありません',
        processed_count: 0,
      });
    }

    console.log(`[BatchProcess] ${tasks.length}件のタスクを処理します`);

    // タスクを processing に更新
    const taskIds = tasks.map((t) => t.id);
    await supabase
      .from('scraping_queue')
      .update({ status: 'processing' })
      .in('id', taskIds);

    // 2. 各タスクをループ処理
    let successCount = 0;
    let failedCount = 0;

    for (const task of tasks) {
      try {
        console.log(`[Task ${task.id}] 処理開始: ${task.url}`);

        // スクレイピング実行
        const result = await scrapeYahooAuction(task.url);

        if (result.success) {
          // 成功: completed に更新
          await supabase
            .from('scraping_queue')
            .update({
              status: 'completed',
              result: result.data,
              processed_at: new Date().toISOString(),
            })
            .eq('id', task.id);

          // バッチカウント更新（アトミック）
          await incrementBatchCounts(task.batch_id, 1, 1, 0);

          successCount++;
          console.log(`[Task ${task.id}] ✅ 成功`);
        } else {
          // 失敗: リトライロジック
          const newRetryCount = task.retry_count + 1;
          const maxRetries = task.max_retries || 3;

          if (newRetryCount >= maxRetries) {
            // 最大リトライ回数に達した: permanently_failed
            await supabase
              .from('scraping_queue')
              .update({
                status: 'permanently_failed',
                retry_count: newRetryCount,
                error_message: result.error || '最大リトライ回数に達しました',
                processed_at: new Date().toISOString(),
              })
              .eq('id', task.id);

            // バッチカウント更新（アトミック）
            await incrementBatchCounts(task.batch_id, 1, 0, 1);

            failedCount++;
            console.log(`[Task ${task.id}] ❌ 永久失敗（リトライ ${newRetryCount}/${maxRetries}）`);
          } else {
            // リトライ可能: pending に戻す
            await supabase
              .from('scraping_queue')
              .update({
                status: 'pending',
                retry_count: newRetryCount,
                error_message: result.error,
              })
              .eq('id', task.id);

            console.log(`[Task ${task.id}] ⚠️ 失敗（リトライ ${newRetryCount}/${maxRetries}）`);
          }
        }

        // レート制限対策: 3〜7秒のランダム遅延
        await randomDelay(3000, 7000);
      } catch (error) {
        console.error(`[Task ${task.id}] 予期しないエラー:`, error);

        // エラー時も pending に戻す（リトライ）
        const newRetryCount = task.retry_count + 1;
        const maxRetries = task.max_retries || 3;

        if (newRetryCount >= maxRetries) {
          await supabase
            .from('scraping_queue')
            .update({
              status: 'permanently_failed',
              retry_count: newRetryCount,
              error_message: error instanceof Error ? error.message : '不明なエラー',
              processed_at: new Date().toISOString(),
            })
            .eq('id', task.id);

          await incrementBatchCounts(task.batch_id, 1, 0, 1);
          failedCount++;
        } else {
          await supabase
            .from('scraping_queue')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              error_message: error instanceof Error ? error.message : '不明なエラー',
            })
            .eq('id', task.id);
        }
      }
    }

    console.log(`[BatchProcess] 完了: 成功 ${successCount}件, 失敗 ${failedCount}件`);

    return NextResponse.json({
      success: true,
      processed_count: tasks.length,
      success_count: successCount,
      failed_count: failedCount,
      message: `${tasks.length}件のタスクを処理しました`,
    });
  } catch (error) {
    console.error('[BatchProcess] エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
