// ========================================
// 個別請求証明書アップロードAPI
// 作成日: 2025-11-22
// エンドポイント: POST /api/shipping/upload-invoice
// 目的: 日本郵便などの個別請求証明書をアップロードし、
//       新しいInvoice_Groupを作成して受注に即時紐づける
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UploadIndividualInvoiceRequest } from '@/types/billing';

/**
 * POST /api/shipping/upload-invoice
 *
 * リクエストボディ:
 * {
 *   Order_ID: string,
 *   Carrier: 'JAPAN_POST' | 'OTHER',
 *   Final_Shipping_Cost_JPY: number,
 *   Tracking_Number: string,
 *   Invoice_File: string (base64) | File,
 *   Uploaded_By: string
 * }
 *
 * レスポンス:
 * {
 *   success: boolean,
 *   groupId?: string,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: UploadIndividualInvoiceRequest = await request.json();

    const {
      Order_ID,
      Carrier,
      Final_Shipping_Cost_JPY,
      Tracking_Number,
      Invoice_File,
      Uploaded_By,
    } = body;

    // バリデーション
    if (!Order_ID || !Final_Shipping_Cost_JPY || !Tracking_Number || !Invoice_File) {
      return NextResponse.json(
        {
          success: false,
          message: '必須フィールドが不足しています。',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. ファイルをアップロード（Supabase Storageまたは外部ストレージ）
    // 注: この例ではファイルパスをモック。実際には Supabase Storage を使用
    const invoiceFilePath = await uploadInvoiceFile(Invoice_File, Order_ID);

    if (!invoiceFilePath) {
      return NextResponse.json(
        {
          success: false,
          message: 'ファイルのアップロードに失敗しました。',
        },
        { status: 500 }
      );
    }

    // 2. Shipping_Invoice_Group レコードを新規作成
    const groupId = `INV-${Date.now()}-${Order_ID}`;
    const groupType = Carrier === 'JAPAN_POST' ? 'JAPAN_POST_INDIVIDUAL' : 'OTHER_BULK';

    const { data: newGroup, error: groupError } = await supabase
      .from('Shipping_Invoice_Group')
      .insert({
        Group_ID: groupId,
        Group_Type: groupType,
        Invoice_File_Path: invoiceFilePath,
        Invoice_Total_Cost_JPY: Final_Shipping_Cost_JPY,
        Uploaded_By: Uploaded_By || 'system',
        Uploaded_Date: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      console.error('[UploadInvoiceAPI] グループ作成エラー:', groupError);
      return NextResponse.json(
        {
          success: false,
          message: '請求書グループの作成に失敗しました。',
        },
        { status: 500 }
      );
    }

    // 3. Sales_Orders の該当受注に Invoice_Group_ID と確定送料を紐づける
    const { error: orderUpdateError } = await supabase
      .from('Sales_Orders')
      .update({
        Invoice_Group_ID: groupId,
        Actual_Shipping_Cost_JPY: Final_Shipping_Cost_JPY,
        shippingStatus: 'COMPLETED',
        trackingNumber: Tracking_Number,
        finalShippingCost: Final_Shipping_Cost_JPY,
      })
      .eq('id', Order_ID);

    if (orderUpdateError) {
      console.error('[UploadInvoiceAPI] 受注更新エラー:', orderUpdateError);

      // ロールバック: 作成したグループを削除
      await supabase
        .from('Shipping_Invoice_Group')
        .delete()
        .eq('Group_ID', groupId);

      return NextResponse.json(
        {
          success: false,
          message: '受注データの更新に失敗しました。',
        },
        { status: 500 }
      );
    }

    // 4. 成功レスポンス
    return NextResponse.json({
      success: true,
      groupId,
      message: `受注 ${Order_ID} の送料証明書がアップロードされ、経費証明が完了しました。`,
    });
  } catch (error) {
    console.error('[UploadInvoiceAPI] 予期しないエラー:', error);
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
 * ファイルアップロード処理
 *
 * @param file - base64文字列または File オブジェクト
 * @param orderId - 受注ID（ファイル名生成用）
 * @returns アップロード後のファイルパス
 */
async function uploadInvoiceFile(
  file: string | File,
  orderId: string
): Promise<string | null> {
  try {
    // 実際の実装では、Supabase Storage や AWS S3 にアップロード
    // この例ではモックパスを返す
    const timestamp = Date.now();
    const mockFilePath = `/invoices/individual/${orderId}_${timestamp}.pdf`;

    // TODO: 実際のファイルアップロード処理を実装
    // const supabase = await createClient();
    // const { data, error } = await supabase.storage
    //   .from('invoice-files')
    //   .upload(mockFilePath, file);
    //
    // if (error) {
    //   console.error('[FileUpload] アップロードエラー:', error);
    //   return null;
    // }

    console.log('[FileUpload] ファイルをアップロードしました:', mockFilePath);
    return mockFilePath;
  } catch (error) {
    console.error('[FileUpload] 予期しないエラー:', error);
    return null;
  }
}
