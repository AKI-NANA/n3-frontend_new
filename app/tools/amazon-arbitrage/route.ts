// ファイル: /app/api/arbitrage/webhook/keepa/route.ts
// Keepaからの通知を受け取り、自動決済を起動するエンドポイント

import { NextRequest, NextResponse } from 'next/server';

// Keepa Webhookからの通知形式はJSONと仮定
export async function POST(request: NextRequest) {
  try {
    const keepaNotification = await request.json();
    console.log('Received Keepa Webhook:', keepaNotification);

    // 1. ASINと現在の価格を取得
    const asin = keepaNotification.asin; 
    const currentPrice = keepaNotification.currentPrice;

    // 2. DBを検索し、高スコア（例: 80点以上）の商品か確認
    // const product = await findProductByAsin(asin);
    // if (!product || product.arbitrage_score < 80) {
    //   return NextResponse.json({ message: 'Low score or not tracked', success: true }, { status: 200 });
    // }

    // 3. 自動決済を起動（最もリスクの高い処理）
    console.log(`ASIN ${asin} の価格下落を検知。自動決済APIを起動します。`);

    const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/arbitrage/execute-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin, currentPrice }),
    });

    if (!paymentResponse.ok) {
        throw new Error('自動決済APIの実行に失敗しました。');
    }

    return NextResponse.json({ message: 'Keepa通知を受け付け、自動決済を起動しました。', success: true }, { status: 200 });
  } catch (error) {
    console.error('Keepa Webhook処理エラー:', error);
    return NextResponse.json({ message: 'Internal Server Error', success: false }, { status: 500 });
  }
}