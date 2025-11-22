// app/api/kobutsu/batch/rpa-pdf/route.ts
// RPA PDF取得バッチ処理API
// 古物台帳のrpa_pdf_status='pending'のレコードをRPA処理

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRPABatch } from '@/services/kobutsu/RPA_PDF_Batch';
import path from 'path';

/**
 * RPA PDF取得バッチ処理
 * 夜間バッチで、pending状態の古物台帳レコードからPDFを自動取得
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // pending状態の古物台帳レコードを取得
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('kobutsu_ledger')
      .select('*')
      .eq('rpa_pdf_status', 'pending')
      .limit(5); // PDFとは重い処理なので少なめに

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

    // PDFストレージパスを設定（本番環境ではクラウドストレージを使用）
    const pdfStoragePath = path.join(process.cwd(), 'storage', 'kobutsu-pdfs');
    const rpaBatch = getRPABatch(pdfStoragePath);

    const results = [];

    // ブラウザ初期化
    await rpaBatch.initBrowser();

    for (const record of pendingRecords) {
      try {
        // ステータスを処理中に更新
        await supabase
          .from('kobutsu_ledger')
          .update({ rpa_pdf_status: 'processing' })
          .eq('ledger_id', record.ledger_id);

        // RPA PDF取得実行
        // 本番環境ではログイン認証情報を環境変数から取得
        const credentials =
          process.env.SUPPLIER_CREDENTIALS
            ? JSON.parse(process.env.SUPPLIER_CREDENTIALS)
            : undefined;

        const pdfResult = await rpaBatch.fetchTransactionPDF(
          record.order_id,
          record.supplier_url,
          credentials
        );

        if (pdfResult.success && pdfResult.pdfPath) {
          // PDF取得成功 - パスを更新
          await supabase
            .from('kobutsu_ledger')
            .update({
              proof_pdf_path: pdfResult.pdfPath,
              rpa_pdf_status: 'completed',
              rpa_pdf_error: null,
            })
            .eq('ledger_id', record.ledger_id);

          results.push({
            ledger_id: record.ledger_id,
            order_id: record.order_id,
            status: 'success',
            pdfPath: pdfResult.pdfPath,
          });
        } else {
          // PDF取得失敗
          await supabase
            .from('kobutsu_ledger')
            .update({
              rpa_pdf_status: 'failed',
              rpa_pdf_error: pdfResult.error,
            })
            .eq('ledger_id', record.ledger_id);

          results.push({
            ledger_id: record.ledger_id,
            order_id: record.order_id,
            status: 'failed',
            error: pdfResult.error,
          });
        }
      } catch (error: any) {
        // 例外発生時
        await supabase
          .from('kobutsu_ledger')
          .update({
            rpa_pdf_status: 'failed',
            rpa_pdf_error: error.message,
          })
          .eq('ledger_id', record.ledger_id);

        results.push({
          ledger_id: record.ledger_id,
          order_id: record.order_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    // ブラウザをクローズ
    await rpaBatch.closeBrowser();

    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status !== 'success').length;

    return NextResponse.json({
      success: true,
      message: `RPA PDF取得バッチ完了: ${successCount}件成功, ${failedCount}件失敗`,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('RPA PDF batch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'RPA PDF取得バッチ処理に失敗しました',
      },
      { status: 500 }
    );
  }
}
