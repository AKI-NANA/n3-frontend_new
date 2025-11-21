/**
 * Keepa Webhook API
 *
 * Keepaからの価格下落通知を受け取り、自動決済プロセスを起動する。
 *
 * エンドポイント: POST /api/arbitrage/webhook/keepa
 *
 * 処理フロー:
 * 1. Keepaからの通知を受け取る
 * 2. 商品の arbitrage_score をチェック（85点以上なら自動決済対象）
 * 3. 自動決済APIを呼び出す
 * 4. ステータスを 'tracked' → 'purchased' に更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { calculateArbitrageScore } from '@/lib/research/scorer';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Keepaからのペイロードを取得
    const payload = await request.json();
    console.log('📬 Keepa Webhook受信:', payload);

    // ペイロード検証
    const { asin, current_price, trigger_price, notification_type } = payload;

    if (!asin) {
      return NextResponse.json(
        { success: false, error: 'ASIN is required' },
        { status: 400 }
      );
    }

    // 1. 商品データを取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('asin', asin)
      .eq('arbitrage_status', 'tracked')
      .single();

    if (fetchError || !product) {
      console.error('❌ 商品が見つかりません:', asin, fetchError);
      return NextResponse.json(
        { success: false, error: 'Product not found or not tracked' },
        { status: 404 }
      );
    }

    // 2. Keepaデータを更新
    const updatedKeepaData = {
      ...product.keepa_data,
      current_price,
      price_drop_detected: true,
      last_updated: new Date().toISOString(),
    };

    // 3. スコアを再計算
    const updatedProduct = {
      ...product,
      keepa_data: updatedKeepaData,
    };
    const newScore = calculateArbitrageScore(updatedProduct);

    console.log(`📊 商品スコア: ${newScore}点 (ASIN: ${asin})`);

    // 4. スコアが85点以上なら自動決済を起動
    if (newScore >= 85) {
      console.log('🚀 自動決済を起動します...');

      // 自動決済APIを呼び出す
      const executionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/arbitrage/execute-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asin,
            quantity: 1, // デフォルト1個
            trigger_source: 'keepa_webhook',
          }),
        }
      );

      const executionResult = await executionResponse.json();

      if (!executionResult.success) {
        console.error('❌ 自動決済失敗:', executionResult.error);
        return NextResponse.json(
          {
            success: false,
            error: 'Auto-purchase execution failed',
            details: executionResult.error,
          },
          { status: 500 }
        );
      }

      console.log('✅ 自動決済完了:', executionResult);

      // 5. DBを更新（ステータスとスコア）
      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          arbitrage_score: newScore,
          keepa_data: updatedKeepaData,
          arbitrage_status: 'purchased',
          amazon_order_id: executionResult.order_id,
          purchase_account_id: executionResult.account_id,
          initial_purchased_quantity: executionResult.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('asin', asin);

      if (updateError) {
        console.error('❌ DB更新エラー:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'Auto-purchase executed successfully',
        asin,
        score: newScore,
        order_id: executionResult.order_id,
      });
    } else {
      // スコアが85点未満の場合、Keepaデータのみ更新
      console.log(`⏸️ スコアが不足（${newScore}点）。自動決済をスキップします。`);

      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          arbitrage_score: newScore,
          keepa_data: updatedKeepaData,
          updated_at: new Date().toISOString(),
        })
        .eq('asin', asin);

      if (updateError) {
        console.error('❌ DB更新エラー:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'Score insufficient for auto-purchase',
        asin,
        score: newScore,
        threshold: 85,
      });
    }
  } catch (error) {
    console.error('❌ Keepa Webhook処理エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Webhook設定の確認（テスト用）
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Keepa Webhook API is active',
    endpoint: '/api/arbitrage/webhook/keepa',
    method: 'POST',
    expected_payload: {
      asin: 'string',
      current_price: 'number',
      trigger_price: 'number',
      notification_type: 'string',
    },
  });
}
