/**
 * Phase 2連携: 出荷キューへ注文を追加
 * POST /api/shipping/add-to-queue
 *
 * 【機能】
 * 1. 選択された注文を出荷キューに追加
 * 2. ステータスを「処理中」に更新
 * 3. Phase 2の出荷管理システムで使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '注文IDが指定されていません',
        },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 注文のステータスを「処理中」に更新
    const { data, error } = await supabase
      .from('orders_v2')
      .update({
        status: '処理中',
        updated_at: new Date().toISOString(),
      })
      .in('id', orderIds)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${orderIds.length}件の注文を出荷キューに追加しました`,
      data: data,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
