import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // DDP候補テーブル名
    const candidateTables = [
      'ebay_ddp_surcharge_matrix',
      'ebay_rate_table_data',
      'ebay_rate_table_entries',
      'ebay_rate_table_entries_v2',
      'usa_ddp_shipping_costs',
      'usa_ddp_rates',
      'shipping_cost_matrix',
      'ddp_surcharge_matrix',
      'rate_tables',
      'shipping_rate_tables',
      'weight_bands',
      'zone_rates',
    ];
    
    const results = [];
    
    for (const tableName of candidateTables) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(10);
        
      if (!error && data && count) {
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        
        // 重量帯と価格帯のカラムを検出
        const weightColumns = columns.filter(col => 
          col.toLowerCase().includes('weight') || 
          col.toLowerCase().includes('kg') ||
          col.toLowerCase().includes('band')
        );
        
        const priceColumns = columns.filter(col => 
          col.toLowerCase().includes('price') || 
          col.toLowerCase().includes('cost') ||
          col.toLowerCase().includes('amount') ||
          col.toLowerCase().includes('rate') ||
          col.toLowerCase().includes('value')
        );
        
        results.push({
          table: tableName,
          count: count,
          columns: columns,
          weightColumns: weightColumns,
          priceColumns: priceColumns,
          sample: data.slice(0, 3),
          isDDPCandidate: count >= 1000 && count <= 1400,
          hasWeightColumn: weightColumns.length > 0,
          hasPriceColumn: priceColumns.length > 0
        });
      }
    }
    
    // DDPマトリックス候補をフィルタ（1000-1400レコード、重量と価格のカラムあり）
    const likelyDDPTables = results.filter(r => 
      r.isDDPCandidate && 
      r.hasWeightColumn && 
      r.hasPriceColumn
    );
    
    // レコード数で降順ソート
    results.sort((a, b) => b.count - a.count);
    likelyDDPTables.sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      success: true,
      allTables: results,
      likelyDDPTables: likelyDDPTables,
      message: `${results.length}個のテーブルを検出。DDPマトリックス候補: ${likelyDDPTables.length}個`,
      analysis: {
        totalTablesFound: results.length,
        ddpCandidates: likelyDDPTables.length,
        expectedRecords: '1200 (60重量帯 × 20価格帯)',
        recommendations: likelyDDPTables.length > 0 
          ? `最有力候補: ${likelyDDPTables[0].table} (${likelyDDPTables[0].count}レコード)`
          : '候補が見つかりません。テーブル名を確認してください。'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
