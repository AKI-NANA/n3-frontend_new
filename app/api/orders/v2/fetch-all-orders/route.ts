/**
 * Phase 1: 受注取得APIエンドポイント
 * GET /api/orders/v2/fetch-all-orders
 *
 * 【機能】
 * 1. Supabaseから注文データを取得
 * 2. フィルタリング（仕入れ状況、リスク、最小利益、モール名、AIスコア）
 * 3. ソート機能
 * 4. ページネーション
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface OrdersQuery {
  // フィルタリング
  isSourced?: 'all' | 'pending' | 'completed'; // 仕入れ状況
  marketplace?: string; // モール名（ebay, amazon, shopee, qoo10）
  status?: string; // ステータス（未処理, 処理中, 出荷済, キャンセル）
  hasRisk?: boolean; // 赤字リスクあり
  minProfit?: number; // 最小利益
  minAiScore?: number; // 最小AIスコア

  // ソート
  sortBy?: 'order_date' | 'shipping_deadline' | 'estimated_profit' | 'ai_score';
  sortOrder?: 'asc' | 'desc';

  // ページネーション
  page?: number;
  limit?: number;

  // 検索
  search?: string; // 注文ID、顧客名で検索
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータの取得
    const query: OrdersQuery = {
      isSourced: (searchParams.get('isSourced') as any) || 'all',
      marketplace: searchParams.get('marketplace') || undefined,
      status: searchParams.get('status') || undefined,
      hasRisk: searchParams.get('hasRisk') === 'true',
      minProfit: searchParams.get('minProfit') ? parseFloat(searchParams.get('minProfit')!) : undefined,
      minAiScore: searchParams.get('minAiScore') ? parseFloat(searchParams.get('minAiScore')!) : undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'order_date',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      search: searchParams.get('search') || undefined,
    };

    const supabase = createClient();

    // ベースクエリを構築
    let queryBuilder = supabase
      .from('orders_v2')
      .select('*', { count: 'exact' });

    // === フィルタリング ===

    // 1. 仕入れ状況でフィルタ
    if (query.isSourced === 'pending') {
      queryBuilder = queryBuilder.eq('is_sourced', false);
    } else if (query.isSourced === 'completed') {
      queryBuilder = queryBuilder.eq('is_sourced', true);
    }

    // 2. モール名でフィルタ
    if (query.marketplace) {
      queryBuilder = queryBuilder.eq('marketplace', query.marketplace.toLowerCase());
    }

    // 3. ステータスでフィルタ
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    // 4. 赤字リスクでフィルタ
    if (query.hasRisk) {
      queryBuilder = queryBuilder.eq('is_negative_profit_risk', true);
    }

    // 5. 最小利益でフィルタ
    if (query.minProfit !== undefined) {
      queryBuilder = queryBuilder.gte('estimated_profit', query.minProfit);
    }

    // 6. 最小AIスコアでフィルタ
    if (query.minAiScore !== undefined) {
      queryBuilder = queryBuilder.gte('ai_score', query.minAiScore);
    }

    // 7. 検索（注文ID、顧客名）
    if (query.search) {
      queryBuilder = queryBuilder.or(
        `order_id.ilike.%${query.search}%,customer_name.ilike.%${query.search}%`
      );
    }

    // === ソート ===
    const sortColumn = query.sortBy || 'order_date';
    const sortOrder = query.sortOrder === 'asc' ? true : false; // true = ascending, false = descending

    queryBuilder = queryBuilder.order(sortColumn, { ascending: sortOrder });

    // === ページネーション ===
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    // クエリ実行
    const { data: orders, error, count } = await queryBuilder;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    // レスポンス
    return NextResponse.json({
      success: true,
      data: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      query: query,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 注文の作成・更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, order } = body;

    const supabase = createClient();

    if (action === 'create') {
      // 新規注文の作成
      const { data, error } = await supabase
        .from('orders_v2')
        .insert(order)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data,
        message: '注文を作成しました',
      });
    } else if (action === 'update') {
      // 既存注文の更新
      const { id, updates } = order;

      const { data, error } = await supabase
        .from('orders_v2')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data,
        message: '注文を更新しました',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
