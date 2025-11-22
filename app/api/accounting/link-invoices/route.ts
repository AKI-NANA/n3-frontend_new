// ========================================
// まとめ請求の一括紐付けAPI
// 作成日: 2025-11-22
// エンドポイント: POST /api/accounting/link-invoices
// 目的: FedEx C-PASSなどのまとめ請求PDFを複数の受注に一括紐づける
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LinkOrdersToGroupRequest } from '@/types/billing';

/**
 * POST /api/accounting/link-invoices
 *
 * リクエストボディ:
 * {
 *   Group_ID: string,
 *   Order_IDs: string[],
 *   Shipping_Costs?: { [orderId: string]: number }
 * }
 *
 * レスポンス:
 * {
 *   success: boolean,
 *   updatedCount: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: LinkOrdersToGroupRequest = await request.json();
    const { Group_ID, Order_IDs, Shipping_Costs } = body;

    // バリデーション
    if (!Group_ID || !Order_IDs || Order_IDs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '請求書グループIDと受注IDリストが必要です。',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. 請求書グループが存在するか確認
    const { data: group, error: groupError } = await supabase
      .from('Shipping_Invoice_Group')
      .select('*')
      .eq('Group_ID', Group_ID)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        {
          success: false,
          message: '指定された請求書グループが見つかりません。',
        },
        { status: 404 }
      );
    }

    // 2. 送料の按分計算（手動入力がない場合）
    const totalCost = group.Invoice_Total_Cost_JPY;
    const orderCount = Order_IDs.length;
    const averageCost = Math.round((totalCost / orderCount) * 100) / 100;

    // 3. 各受注に Invoice_Group_ID と確定送料を一括更新
    const updates = Order_IDs.map(orderId => ({
      id: orderId,
      Invoice_Group_ID: Group_ID,
      Actual_Shipping_Cost_JPY: Shipping_Costs?.[orderId] || averageCost,
    }));

    let updatedCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      const { error } = await supabase
        .from('Sales_Orders')
        .update({
          Invoice_Group_ID: update.Invoice_Group_ID,
          Actual_Shipping_Cost_JPY: update.Actual_Shipping_Cost_JPY,
        })
        .eq('id', update.id);

      if (error) {
        console.error(`[LinkInvoicesAPI] 受注 ${update.id} の更新エラー:`, error);
        errors.push(update.id);
      } else {
        updatedCount++;
      }
    }

    // 4. レスポンス
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          updatedCount,
          message: `${updatedCount}件の受注を更新しましたが、${errors.length}件でエラーが発生しました。`,
          errors,
        },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount}件の受注を請求書グループ ${Group_ID} に紐付けました。`,
    });
  } catch (error) {
    console.error('[LinkInvoicesAPI] 予期しないエラー:', error);
    return NextResponse.json(
      {
        success: false,
        message: '予期しないエラーが発生しました。',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/accounting/link-invoices
 *
 * 未紐付けの出荷済み受注リストを取得
 *
 * クエリパラメータ:
 * - carrier?: string (配送業者でフィルタリング)
 *
 * レスポンス:
 * {
 *   orders: Array<{
 *     id: string,
 *     itemName: string,
 *     customerName: string,
 *     shippingDate: string,
 *     trackingNumber: string,
 *     estimatedShippingCost: number
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carrier = searchParams.get('carrier');

    const supabase = await createClient();

    let query = supabase
      .from('Sales_Orders')
      .select('*')
      .eq('shippingStatus', 'COMPLETED')
      .is('Invoice_Group_ID', null)
      .order('orderDate', { ascending: false });

    // 配送業者でフィルタリング（オプション）
    if (carrier) {
      query = query.eq('carrier', carrier);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[LinkInvoicesAPI] データ取得エラー:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'データの取得に失敗しました。',
        },
        { status: 500 }
      );
    }

    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      itemName: order.itemName || '商品名不明',
      customerName: order.customerName || '顧客名不明',
      shippingDate: order.shippingDate || order.orderDate,
      trackingNumber: order.trackingNumber || 'N/A',
      estimatedShippingCost: order.estimatedShippingCostJPY || 0,
      carrier: order.carrier || 'UNKNOWN',
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('[LinkInvoicesAPI] GET エラー:', error);
    return NextResponse.json(
      {
        success: false,
        message: '予期しないエラーが発生しました。',
      },
      { status: 500 }
    );
  }
}
