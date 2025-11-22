// app/api/order/complete-acquisition/route.ts
// トリプルアクション実行API
// [仕入れ済み]ボタン押下時に、利益確定・RPAキュー投入・古物台帳記録を一括実行

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * リクエストボディの型定義
 */
interface CompleteAcquisitionRequest {
  orderId: string;
  actualPurchaseUrl: string;
  actualPurchaseCostJPY: number;
  finalShippingCostJPY?: number;
}

/**
 * トリプルアクション:
 * 1. 利益確定（Sales_Orders更新）
 * 2. RPAキュー投入（PDF_GET_REQUIRED = TRUE）
 * 3. 古物台帳の仮レコード作成
 */
export async function POST(request: NextRequest) {
  try {
    const body: CompleteAcquisitionRequest = await request.json();
    const { orderId, actualPurchaseUrl, actualPurchaseCostJPY, finalShippingCostJPY } = body;

    // バリデーション
    if (!orderId || !actualPurchaseUrl || !actualPurchaseCostJPY) {
      return NextResponse.json(
        {
          success: false,
          error: '必須パラメータが不足しています（orderId, actualPurchaseUrl, actualPurchaseCostJPY）',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // ========================================
    // アクション1: 受注データの取得と確認
    // ========================================
    const { data: order, error: fetchError } = await supabase
      .from('sales_orders')
      .select('*, sales_order_items(*)')
      .eq('order_id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: `受注が見つかりません: ${orderId}`,
          details: fetchError?.message,
        },
        { status: 404 }
      );
    }

    // 既に仕入れ済みの場合はエラー
    if (order.purchase_status === '仕入れ済み') {
      return NextResponse.json(
        {
          success: false,
          error: 'この受注はすでに仕入れ済みです',
        },
        { status: 400 }
      );
    }

    // ========================================
    // アクション2: 利益確定（Sales_Orders更新）
    // ========================================
    const estimatedShippingCost = order.estimated_shipping_cost_jpy || 0;
    const finalShipping = finalShippingCostJPY || estimatedShippingCost;

    // 簡易利益計算（実際にはモール手数料、為替レート等を考慮）
    const saleTotal = order.sales_order_items.reduce(
      (sum: number, item: any) => sum + item.sale_price * item.quantity,
      0
    );
    const commission = saleTotal * 0.2; // 仮のモール手数料20%
    const finalProfit = Math.round(saleTotal - actualPurchaseCostJPY - finalShipping - commission);

    const { error: updateError } = await supabase
      .from('sales_orders')
      .update({
        purchase_status: '仕入れ済み',
        actual_purchase_url: actualPurchaseUrl,
        actual_purchase_cost_jpy: actualPurchaseCostJPY,
        final_shipping_cost_jpy: finalShipping,
        final_profit: finalProfit,
        is_profit_confirmed: true,
        purchased_at: new Date().toISOString(),
        pdf_get_required: true, // RPAキュー投入
        pdf_get_status: 'pending',
      })
      .eq('order_id', orderId);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: '受注データの更新に失敗しました',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // ========================================
    // アクション3: 古物台帳の仮レコード作成
    // ========================================
    // 品目名は受注明細の最初のアイテムから取得（複数の場合は後で拡張）
    const firstItem = order.sales_order_items[0];
    const itemName = firstItem?.item_name || '商品名未設定';
    const quantity = order.sales_order_items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    const { data: ledgerRecord, error: ledgerError } = await supabase
      .from('kobutsu_ledger')
      .insert({
        order_id: orderId,
        acquisition_date: new Date().toISOString(),
        item_name: itemName,
        quantity: quantity,
        acquisition_cost: actualPurchaseCostJPY,
        supplier_url: actualPurchaseUrl,
        supplier_name: 'AI抽出待ち', // AI処理で後で更新
        supplier_type: 'OTHER',
        ai_extraction_status: 'pending',
        rpa_pdf_status: 'pending',
      })
      .select()
      .single();

    if (ledgerError) {
      // 古物台帳の作成に失敗した場合、受注ステータスをロールバック
      await supabase
        .from('sales_orders')
        .update({
          purchase_status: '未仕入れ',
          pdf_get_required: false,
        })
        .eq('order_id', orderId);

      return NextResponse.json(
        {
          success: false,
          error: '古物台帳レコードの作成に失敗しました',
          details: ledgerError.message,
        },
        { status: 500 }
      );
    }

    // ========================================
    // アクション4: AI情報抽出キューへの投入（非同期）
    // ========================================
    // ここでは簡易的にフラグを立てるのみ。実際のAI抽出は別のバッチ処理で実行
    // 将来的には、ここでQueue（SQS、Redis Queue等）に投入する

    return NextResponse.json({
      success: true,
      message: '仕入れ実行が完了しました',
      data: {
        orderId,
        ledgerId: ledgerRecord.ledger_id,
        finalProfit,
        status: {
          orderUpdated: true,
          ledgerCreated: true,
          aiQueueAdded: true,
          rpaQueueAdded: true,
        },
      },
    });
  } catch (error: any) {
    console.error('Complete acquisition error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '仕入れ実行処理に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * 古物台帳の状態確認API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'orderIdパラメータが必要です',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: ledger, error } = await supabase
      .from('kobutsu_ledger')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: '古物台帳レコードが存在しません',
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      data: ledger,
    });
  } catch (error: any) {
    console.error('Get ledger status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '古物台帳の取得に失敗しました',
      },
      { status: 500 }
      );
  }
}
