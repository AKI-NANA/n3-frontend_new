import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const report: any = {
    timestamp: new Date().toISOString(),
    overall_status: 'checking',
    tools: [],
    database_status: {},
    api_endpoints: [],
    recommendations: []
  }
  
  try {
    // ============================================================
    // 1. データベーステーブルの状態確認
    // ============================================================
    const tables = [
      'products',
      'yahoo_scraped_products',
      'products_master',
      'inventory_products',
      'mystical_japan_treasures_inventory',
      'ebay_inventory',
      'research_products_master'
    ]
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        report.database_status[table] = {
          exists: !error,
          count: count || 0,
          status: !error ? '✅' : '❌',
          error: error?.message
        }
      } catch (err: any) {
        report.database_status[table] = {
          exists: false,
          count: 0,
          status: '❌',
          error: err.message
        }
      }
    }
    
    // ============================================================
    // 2. 14ツールのエンドポイント確認
    // ============================================================
    const tools = [
      { id: 1, name: 'データ収集', path: '/data-collection', expected_db: 'yahoo_scraped_products' },
      { id: 2, name: '承認システム', path: '/approval', expected_db: 'products_master' },
      { id: 3, name: 'データ編集', path: '/tools/editing', expected_db: 'products_master' },
      { id: 4, name: 'eBayリスティング', path: '/tools/ebay-listing', expected_db: 'products_master' },
      { id: 5, name: '在庫管理', path: '/tools/inventory', expected_db: 'inventory_products' },
      { id: 6, name: '価格調整', path: '/tools/pricing', expected_db: 'products_master' },
      { id: 7, name: 'カテゴリ管理', path: '/tools/categories', expected_db: 'products_master' },
      { id: 8, name: '画像管理', path: '/tools/images', expected_db: 'products_master' },
      { id: 9, name: 'HTMLテンプレート', path: '/tools/html-templates', expected_db: 'products_master' },
      { id: 10, name: 'SellerMirror分析', path: '/tools/seller-mirror', expected_db: 'products_master' },
      { id: 11, name: 'VERO チェック', path: '/tools/vero-check', expected_db: 'products_master' },
      { id: 12, name: 'AI推奨', path: '/tools/ai-recommendations', expected_db: 'products_master' },
      { id: 13, name: '一括操作', path: '/tools/bulk-operations', expected_db: 'products_master' },
      { id: 14, name: 'レポート', path: '/tools/reports', expected_db: 'products_master' }
    ]
    
    report.tools = tools.map(tool => ({
      ...tool,
      db_has_data: (report.database_status[tool.expected_db]?.count || 0) > 0,
      status: (report.database_status[tool.expected_db]?.count || 0) > 0 ? '⚠️' : '❌'
    }))
    
    // ============================================================
    // 3. APIエンドポイント確認
    // ============================================================
    const apiEndpoints = [
      '/api/approval',
      '/api/sync-all-tables',
      '/api/fix-images-and-filter',
      '/api/debug/raw-master',
      '/api/debug/data-flow'
    ]
    
    report.api_endpoints = apiEndpoints.map(endpoint => ({
      endpoint,
      status: '存在確認必要',
      note: 'フロントエンドから確認してください'
    }))
    
    // ============================================================
    // 4. products_masterの統合状況
    // ============================================================
    const { data: masterBreakdown } = await supabase
      .from('products_master')
      .select('source_system')
    
    const sourceCount: any = {}
    masterBreakdown?.forEach(row => {
      sourceCount[row.source_system] = (sourceCount[row.source_system] || 0) + 1
    })
    
    report.products_master_integration = {
      total: report.database_status['products_master'].count,
      by_source: sourceCount,
      missing_sources: tables
        .filter(t => t !== 'products_master' && report.database_status[t].count > 0)
        .filter(t => !sourceCount[t] || sourceCount[t] < report.database_status[t].count)
    }
    
    // ============================================================
    // 5. 推奨事項
    // ============================================================
    if (report.products_master_integration.missing_sources.length > 0) {
      report.recommendations.push({
        priority: 'HIGH',
        issue: 'データ未同期',
        detail: `${report.products_master_integration.missing_sources.join(', ')} がproducts_masterに完全同期されていません`,
        action: 'GET /api/sync-all-tables を実行'
      })
    }
    
    const brokenTools = report.tools.filter((t: any) => t.status === '❌')
    if (brokenTools.length > 0) {
      report.recommendations.push({
        priority: 'CRITICAL',
        issue: `${brokenTools.length}個のツールがデータなしで動作不可`,
        detail: brokenTools.map((t: any) => t.name).join(', '),
        action: 'データ同期とツールのproducts_master対応が必要'
      })
    }
    
    if (report.database_status['yahoo_scraped_products'].count < 5) {
      report.recommendations.push({
        priority: 'MEDIUM',
        issue: 'スクレイピングデータが少ない',
        detail: `現在${report.database_status['yahoo_scraped_products'].count}件のみ`,
        action: 'データ収集ページでスクレイピング実行'
      })
    }
    
    report.overall_status = report.recommendations.filter((r: any) => r.priority === 'CRITICAL').length > 0 
      ? '🔴 CRITICAL' 
      : report.recommendations.length > 0 
        ? '🟡 WARNING' 
        : '🟢 HEALTHY'
    
    return NextResponse.json(report, { status: 200 })
    
  } catch (error: any) {
    report.overall_status = '🔴 ERROR'
    report.error = error.message
    return NextResponse.json(report, { status: 500 })
  }
}
