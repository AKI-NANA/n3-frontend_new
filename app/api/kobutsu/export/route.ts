// app/api/kobutsu/export/route.ts
// 古物台帳PDF/CSV出力API

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

/**
 * PDF/CSV出力
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, records, dateFrom, dateTo } = body;

    if (format === 'pdf') {
      return await generatePDF(records, dateFrom, dateTo);
    } else if (format === 'csv') {
      return await generateCSV(records);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '無効なフォーマットです',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'エクスポートに失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * PDF生成
 */
async function generatePDF(records: any[], dateFrom?: string, dateTo?: string) {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // ヘッダー
    doc
      .fontSize(20)
      .text('古物台帳', { align: 'center' })
      .moveDown();

    doc
      .fontSize(10)
      .text(
        `期間: ${dateFrom || '指定なし'} 〜 ${dateTo || '指定なし'}`,
        { align: 'center' }
      )
      .text(`出力日時: ${new Date().toLocaleString('ja-JP')}`, { align: 'center' })
      .moveDown(2);

    // テーブルヘッダー
    const tableTop = doc.y;
    const colWidths = [60, 80, 150, 60, 80, 100];
    const headers = ['受注ID', '仕入日時', '品目名', '数量', '仕入価格', '仕入先名'];

    doc.fontSize(9).font('Helvetica-Bold');
    let xPosition = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPosition, tableTop, { width: colWidths[i] });
      xPosition += colWidths[i];
    });

    doc.moveDown();

    // データ行
    doc.font('Helvetica').fontSize(8);
    records.forEach((record) => {
      const yPosition = doc.y;
      xPosition = 50;

      const rowData = [
        record.order_id.substring(0, 12),
        new Date(record.acquisition_date).toLocaleDateString('ja-JP'),
        record.item_name.substring(0, 30),
        record.quantity.toString(),
        `¥${record.acquisition_cost.toLocaleString()}`,
        record.supplier_name.substring(0, 20),
      ];

      rowData.forEach((data, i) => {
        doc.text(data, xPosition, yPosition, { width: colWidths[i] });
        xPosition += colWidths[i];
      });

      doc.moveDown();

      // ページ境界チェック
      if (doc.y > 750) {
        doc.addPage();
      }
    });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=kobutsu_ledger_${Date.now()}.pdf`,
      },
    });
  } catch (error: any) {
    throw new Error(`PDF生成エラー: ${error.message}`);
  }
}

/**
 * CSV生成
 */
async function generateCSV(records: any[]) {
  const headers = [
    '台帳ID',
    '受注ID',
    '仕入日時',
    '品目名',
    '特徴',
    '数量',
    '仕入価格',
    '仕入先名',
    '仕入先種別',
    '販売日',
  ];

  const rows = records.map((r) => [
    r.ledger_id,
    r.order_id,
    new Date(r.acquisition_date).toLocaleString('ja-JP'),
    r.item_name,
    r.item_features || '',
    r.quantity,
    r.acquisition_cost,
    r.supplier_name,
    r.supplier_type,
    r.sales_date ? new Date(r.sales_date).toLocaleString('ja-JP') : '未販売',
  ]);

  const csvContent =
    [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  return new NextResponse('\uFEFF' + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=kobutsu_ledger_${Date.now()}.csv`,
    },
  });
}
