// ファイル: /app/api/arbitrage/approve-listing/[id]/route.ts
// 検品承認後、即座に多販路出品をトリガーするエンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Supabaseクライアントを仮定

// Next.js App Routerの動的ルートセグメントの型定義
type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const productId = parseInt(params.id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ message: 'Invalid Product ID' }, { status: 400 });
  }

  try {
    // 1. DBステータスを更新: awaiting_inspection -> ready_to_list
    const { error: updateError } = await supabase
      .from('products_master')
      .update({ arbitrage_status: 'ready_to_list' })
      .eq('id', productId);

    if (updateError) throw updateError;
    
    // 2. 多販路出品パイプラインを起動
    // このAPIは、DBの ready_to_list をトリガーとするマイクロサービスや、
    // 既存の /api/listing/execute/route.ts へ即座にリクエストを送る
    console.log(`Product ${productId} の承認完了。多販路出品パイプラインを起動します...`);

    // 実際には、/api/listing/execute/route.ts へPOSTリクエストを送る
    const listingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/listing/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, mode: 'arbitrage_immediate' }),
    });

    if (!listingResponse.ok) {
        // 出品が失敗した場合でもステータスは ready_to_list のまま残るため、スタッフが手動で再試行可能
        console.error('出品パイプラインの起動に失敗しました。');
    }
    
    // 3. ステータスを最終更新
     await supabase
      .from('products_master')
      .update({ arbitrage_status: 'listed' })
      .eq('id', productId);


    return NextResponse.json({ 
      message: '検品承認完了。多販路への即時出品が開始されました。', 
      success: true 
    }, { status: 200 });

  } catch (error) {
    console.error('承認処理エラー:', error);
    return NextResponse.json({ message: '承認処理中にエラーが発生しました。', error: error.message }, { status: 500 });
  }
}