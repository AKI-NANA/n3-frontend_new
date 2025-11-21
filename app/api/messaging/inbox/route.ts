// app/api/messaging/inbox/route.ts
// メッセージ一覧取得APIエンドポイント

import { NextResponse } from 'next/server';
import type { UnifiedMessage, MessageFilter } from '@/types/messaging';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // フィルターパラメータを取得
    const filters: MessageFilter = {
      source_malls: searchParams.get('source_malls')?.split(',') as any[],
      urgency: searchParams.get('urgency')?.split(',') as any[],
      reply_status: searchParams.get('reply_status')?.split(',') as any[],
      is_customer_message:
        searchParams.get('is_customer_message') === 'true'
          ? true
          : searchParams.get('is_customer_message') === 'false'
          ? false
          : undefined,
      search_query: searchParams.get('search') || undefined,
    };

    console.log('[Messaging API] メッセージ一覧取得:', filters);

    // 💡 実際のSupabase クエリ
    // const supabase = createClient();
    // let query = supabase.from('unified_messages').select('*');
    //
    // if (filters.source_malls?.length) {
    //   query = query.in('source_mall', filters.source_malls);
    // }
    // if (filters.urgency?.length) {
    //   query = query.in('ai_urgency', filters.urgency);
    // }
    // if (filters.reply_status?.length) {
    //   query = query.in('reply_status', filters.reply_status);
    // }
    // if (filters.is_customer_message !== undefined) {
    //   query = query.eq('is_customer_message', filters.is_customer_message);
    // }
    // if (filters.search_query) {
    //   query = query.or(
    //     `subject.ilike.%${filters.search_query}%,body.ilike.%${filters.search_query}%`
    //   );
    // }
    //
    // const { data: messages, error } = await query.order('received_at', { ascending: false });
    //
    // if (error) throw error;

    // モックデータ
    const messages: UnifiedMessage[] = [
      {
        message_id: 'MSG-001',
        thread_id: 'THR-001',
        source_mall: 'eBay_US',
        is_customer_message: true,
        sender_id: 'buyer123',
        sender_name: 'John Smith',
        subject: 'Where is my order?',
        body: 'I ordered 2 weeks ago but haven\'t received my package yet. Tracking shows no updates.',
        received_at: new Date('2025-11-20T10:30:00Z'),
        ai_intent: 'DeliveryStatus',
        ai_urgency: '標準通知 (黄)',
        ai_confidence: 0.92,
        reply_status: 'Unanswered',
        completed_by: null,
        order_id: 'ORD-12345',
        customer_id: 'CUST-001',
      },
      {
        message_id: 'MSG-002',
        thread_id: 'THR-002',
        source_mall: 'Amazon_JP',
        is_customer_message: true,
        sender_id: 'buyer456',
        sender_name: '田中太郎',
        subject: '返金リクエスト',
        body: '商品が破損していたため、返金をお願いします。',
        received_at: new Date('2025-11-20T09:15:00Z'),
        ai_intent: 'RefundRequest',
        ai_urgency: '緊急対応 (赤)',
        ai_confidence: 0.95,
        reply_status: 'Pending',
        completed_by: null,
        order_id: 'ORD-12346',
        customer_id: 'CUST-002',
      },
      {
        message_id: 'MSG-003',
        thread_id: 'THR-003',
        source_mall: 'eBay_US',
        is_customer_message: false,
        sender_id: 'ebay-system',
        sender_name: 'eBay Notifications',
        subject: 'Account Performance Warning',
        body: 'Your late shipment rate has exceeded the threshold. Please take immediate action.',
        received_at: new Date('2025-11-20T08:00:00Z'),
        ai_intent: 'PerformanceWarning',
        ai_urgency: '緊急対応 (赤)',
        ai_confidence: 0.98,
        reply_status: 'Unanswered',
        completed_by: null,
      },
      {
        message_id: 'MSG-004',
        thread_id: 'THR-004',
        source_mall: 'Shopee_TW',
        is_customer_message: false,
        sender_id: 'shopee-marketing',
        sender_name: 'Shopee Marketing',
        subject: '新しいプロモーションキャンペーン',
        body: '今月の特別プロモーションに参加しませんか？',
        received_at: new Date('2025-11-19T14:00:00Z'),
        ai_intent: 'Marketing',
        ai_urgency: '無視/アーカイブ (灰)',
        ai_confidence: 0.99,
        reply_status: 'Completed',
        completed_by: 'auto-archive',
      },
    ];

    // フィルタリング（モックデータ用）
    let filteredMessages = messages;

    if (filters.is_customer_message !== undefined) {
      filteredMessages = filteredMessages.filter(
        (m) => m.is_customer_message === filters.is_customer_message
      );
    }

    if (filters.urgency?.length) {
      filteredMessages = filteredMessages.filter((m) =>
        filters.urgency!.includes(m.ai_urgency)
      );
    }

    if (filters.reply_status?.length) {
      filteredMessages = filteredMessages.filter((m) =>
        filters.reply_status!.includes(m.reply_status)
      );
    }

    if (filters.search_query) {
      const query = filters.search_query.toLowerCase();
      filteredMessages = filteredMessages.filter(
        (m) =>
          m.subject.toLowerCase().includes(query) ||
          m.body.toLowerCase().includes(query)
      );
    }

    console.log(`[Messaging API] ${filteredMessages.length}件のメッセージを取得`);

    return NextResponse.json({
      success: true,
      messages: filteredMessages,
      total: filteredMessages.length,
    });
  } catch (error) {
    console.error('[Messaging API] エラー:', error);
    return NextResponse.json(
      {
        error: 'メッセージの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
