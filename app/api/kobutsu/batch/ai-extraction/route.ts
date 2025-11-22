// app/api/kobutsu/batch/ai-extraction/route.ts
// AI情報抽出バッチ処理API
// 古物台帳のai_extraction_status='pending'のレコードをAI処理

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIScraper } from '@/services/kobutsu/AIScraper';

/**
 * AI抽出バッチ処理
 * 夜間バッチまたは手動実行で、pending状態の古物台帳レコードを処理
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // pending状態の古物台帳レコードを取得
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('kobutsu_ledger')
      .select('*')
      .eq('ai_extraction_status', 'pending')
      .limit(10); // 一度に処理する件数を制限

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!pendingRecords || pendingRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: '処理対象のレコードがありません',
        processed: 0,
      });
    }

    const aiScraper = getAIScraper();
    const results = [];

    for (const record of pendingRecords) {
      try {
        // ステータスを処理中に更新
        await supabase
          .from('kobutsu_ledger')
          .update({ ai_extraction_status: 'processing' })
          .eq('ledger_id', record.ledger_id);

        // AI抽出実行
        const extractionResult = await aiScraper.extractSupplierInfo(record.supplier_url);

        if (extractionResult.success) {
          // 抽出成功 - データを更新
          await supabase
            .from('kobutsu_ledger')
            .update({
              supplier_name: extractionResult.supplierName || record.supplier_name,
              supplier_type: extractionResult.supplierType || record.supplier_type,
              item_features: extractionResult.itemFeatures || record.item_features,
              source_image_path: extractionResult.imageUrl || record.source_image_path,
              ai_extraction_status: 'completed',
              ai_extraction_error: null,
            })
            .eq('ledger_id', record.ledger_id);

          results.push({
            ledger_id: record.ledger_id,
            status: 'success',
          });
        } else {
          // 抽出失敗 - エラー情報を記録
          await supabase
            .from('kobutsu_ledger')
            .update({
              ai_extraction_status: 'failed',
              ai_extraction_error: extractionResult.error,
            })
            .eq('ledger_id', record.ledger_id);

          results.push({
            ledger_id: record.ledger_id,
            status: 'failed',
            error: extractionResult.error,
          });
        }
      } catch (error: any) {
        // 例外発生時もエラー情報を記録
        await supabase
          .from('kobutsu_ledger')
          .update({
            ai_extraction_status: 'failed',
            ai_extraction_error: error.message,
          })
          .eq('ledger_id', record.ledger_id);

        results.push({
          ledger_id: record.ledger_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status !== 'success').length;

    return NextResponse.json({
      success: true,
      message: `AI抽出バッチ完了: ${successCount}件成功, ${failedCount}件失敗`,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('AI extraction batch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'AI抽出バッチ処理に失敗しました',
      },
      { status: 500 }
    );
  }
}
