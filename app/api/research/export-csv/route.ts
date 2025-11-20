/**
 * リサーチ結果CSV出力API
 *
 * POST /api/research/export-csv
 *
 * リクエスト:
 * {
 *   ebay_item_ids?: string[];
 *   include_supplier_info?: boolean;
 * }
 *
 * レスポンス: CSV file
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ebay_item_ids, include_supplier_info = true } = body;

    console.log('📄 CSV出力開始:', { ebay_item_ids, include_supplier_info });

    // リサーチ結果を取得
    let query = supabase.from('research_results').select('*');

    if (ebay_item_ids && ebay_item_ids.length > 0) {
      query = query.in('ebay_item_id', ebay_item_ids);
    }

    const { data: researchResults, error } = await query.order('provisional_score', {
      ascending: false,
    });

    if (error) {
      console.error('❌ リサーチ結果取得エラー:', error);
      throw error;
    }

    if (!researchResults || researchResults.length === 0) {
      return NextResponse.json(
        { success: false, error: '該当するデータがありません' },
        { status: 404 }
      );
    }

    // 仕入れ先候補情報を取得（オプション）
    const supplierCandidatesMap = new Map();
    if (include_supplier_info) {
      const candidateIds = researchResults
        .map((r: any) => r.ai_supplier_candidate_id)
        .filter(Boolean);

      if (candidateIds.length > 0) {
        const { data: suppliers } = await supabase
          .from('supplier_candidates')
          .select('*')
          .in('id', candidateIds);

        if (suppliers) {
          suppliers.forEach((s: any) => {
            supplierCandidatesMap.set(s.id, s);
          });
        }
      }
    }

    // CSV生成
    const csv = generateCSV(researchResults, supplierCandidatesMap);

    // CSVファイルとして返す
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="research_results_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('❌ CSV出力APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * CSV文字列を生成
 */
function generateCSV(
  researchResults: any[],
  supplierCandidatesMap: Map<string, any>
): string {
  // ヘッダー行
  const headers = [
    'eBay Item ID',
    '商品名',
    'eBay価格（USD）',
    '売上数',
    '競合数',
    'カテゴリ',
    'コンディション',
    '研究ステータス',
    '暫定スコア',
    '最終スコア',
    'AI解析済み',
    'AI特定仕入れ先名',
    'AI特定仕入れ先URL',
    'AI特定価格（JPY）',
    '推定国内送料（JPY）',
    '総仕入れコスト（JPY）',
    '信頼度スコア',
    '在庫状況',
    '最安値（USD）',
    '平均価格（USD）',
    '推定重量（g）',
    '利益率（最安値時）',
    '利益額（最安値時・USD）',
    '利益額（最安値時・JPY）',
    '推奨仕入れ原価（JPY）',
    '商品URL',
    '画像URL',
    '最終更新日時',
  ];

  // データ行
  const rows = researchResults.map((result) => {
    const supplier = result.ai_supplier_candidate_id
      ? supplierCandidatesMap.get(result.ai_supplier_candidate_id)
      : null;

    return [
      escapeCsvField(result.ebay_item_id),
      escapeCsvField(result.title),
      result.price_usd || '',
      result.sold_count || 0,
      result.competitor_count || 0,
      escapeCsvField(result.category_name || ''),
      escapeCsvField(result.condition || ''),
      result.research_status || 'NEW',
      result.provisional_score || '',
      result.final_score || '',
      result.ai_cost_status ? 'Yes' : 'No',
      supplier ? escapeCsvField(supplier.supplier_name || '') : '',
      supplier ? escapeCsvField(supplier.supplier_url || '') : '',
      supplier?.candidate_price_jpy || '',
      supplier?.estimated_domestic_shipping_jpy || '',
      supplier?.total_cost_jpy || '',
      supplier?.confidence_score ? (supplier.confidence_score * 100).toFixed(1) + '%' : '',
      supplier ? escapeCsvField(supplier.stock_status || '') : '',
      result.lowest_price_usd || '',
      result.average_price_usd || '',
      result.estimated_weight_g || '',
      result.profit_margin_at_lowest || '',
      result.profit_amount_at_lowest_usd || '',
      result.profit_amount_at_lowest_jpy || '',
      result.recommended_cost_jpy || '',
      escapeCsvField(result.view_item_url || ''),
      escapeCsvField(result.image_url || ''),
      result.last_research_date || result.created_at || '',
    ];
  });

  // CSV文字列を生成
  const csvLines = [headers, ...rows];
  const csvContent = csvLines.map((row) => row.join(',')).join('\n');

  // BOM付きUTF-8（Excelで文字化けしないように）
  return '\uFEFF' + csvContent;
}

/**
 * CSVフィールドのエスケープ処理
 */
function escapeCsvField(field: string): string {
  if (!field) return '';

  // カンマ、改行、ダブルクォートが含まれる場合は、ダブルクォートで囲む
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    // ダブルクォートをエスケープ
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return field;
}

/**
 * GET: サンプルCSVをダウンロード（テスト用）
 */
export async function GET(request: NextRequest) {
  const sampleData = [
    ['eBay Item ID', '商品名', 'eBay価格（USD）', '売上数'],
    ['123456789', 'サンプル商品', '100.00', '10'],
  ];

  const csv = '\uFEFF' + sampleData.map((row) => row.join(',')).join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sample.csv"',
    },
  });
}
