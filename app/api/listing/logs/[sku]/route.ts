/**
 * ログ取得API
 *
 * 履歴データ表示のため、価格変動、在庫変動、HTML解析エラーなど、
 * 時系列データを結合して取得する
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { ListingLogsResponse } from '@/types/listing';

/**
 * GET /api/listing/logs/[sku]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sku: string } }
) {
  try {
    const supabase = createClient();
    const { sku } = params;

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU は必須です' },
        { status: 400 }
      );
    }

    console.log('[LogsAPI] ログ取得開始:', sku);

    // 1. 価格変動履歴を取得
    const { data: priceHistory, error: priceError } = await supabase
      .from('price_logs')
      .select('id, sku, platform, price_jpy, reason, changed_at')
      .eq('sku', sku)
      .order('changed_at', { ascending: false })
      .limit(100);

    if (priceError) {
      console.error('[LogsAPI] 価格履歴取得エラー:', priceError);
    }

    // 2. 在庫変動履歴を取得
    const { data: stockHistory, error: stockError } = await supabase
      .from('stock_logs')
      .select(
        'id, sku, supplier_id, quantity_change, new_quantity, reason, changed_at'
      )
      .eq('sku', sku)
      .order('changed_at', { ascending: false })
      .limit(100);

    if (stockError) {
      console.error('[LogsAPI] 在庫履歴取得エラー:', stockError);
    }

    // 3. HTML解析エラー履歴を取得
    const { data: htmlErrors, error: htmlError } = await supabase
      .from('html_parse_errors')
      .select(
        'id, sku, platform, error_type, error_message, detected_at, resolved_at'
      )
      .eq('sku', sku)
      .order('detected_at', { ascending: false })
      .limit(50);

    if (htmlError) {
      console.error('[LogsAPI] HTMLエラー履歴取得エラー:', htmlError);
    }

    // 4. レスポンス構築
    const response: ListingLogsResponse = {
      sku,
      priceHistory:
        priceHistory?.map((p) => ({
          id: p.id,
          sku: p.sku,
          platform: p.platform,
          priceJpy: p.price_jpy,
          reason: p.reason || '',
          changedAt: new Date(p.changed_at),
        })) || [],
      stockHistory:
        stockHistory?.map((s) => ({
          id: s.id,
          sku: s.sku,
          supplierId: s.supplier_id,
          quantityChange: s.quantity_change,
          newQuantity: s.new_quantity,
          reason: s.reason || '',
          changedAt: new Date(s.changed_at),
        })) || [],
      htmlParseErrors:
        htmlErrors?.map((h) => ({
          id: h.id,
          sku: h.sku,
          platform: h.platform,
          errorType: h.error_type,
          errorMessage: h.error_message || '',
          detectedAt: new Date(h.detected_at),
          resolvedAt: h.resolved_at ? new Date(h.resolved_at) : undefined,
        })) || [],
    };

    console.log('[LogsAPI] ログ取得成功:', {
      sku,
      priceCount: response.priceHistory.length,
      stockCount: response.stockHistory.length,
      errorCount: response.htmlParseErrors.length,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[LogsAPI] 予期しないエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
