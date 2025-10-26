import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase環境変数が設定されていません'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 試行するテーブル名のリスト（包括的）
    const potentialTables = [
      // eBay関連
      'ebay_ddp_surcharge_matrix',
      'ebay_rate_table_data',
      'ebay_rate_table_entries',
      'ebay_rate_table_entries_v2',
      'ebay_fulfillment_policies',
      'ebay_rate_tables',
      'ebay_policies',
      'ebay_listings',
      'ebay_categories',
      'ebay_shipping_profiles',
      'ebay_items',
      'ebay_products',
      'ebay_inventory',
      'ebay_shipping_policies',
      'ebay_shipping_services',
      'ebay_shipping_zones',
      
      // 配送・料金関連
      'usa_ddp_shipping_costs',
      'usa_ddp_rates',
      'shipping_cost_matrix',
      'ddp_surcharge_matrix',
      'rate_tables',
      'shipping_rates',
      'shipping_rate_tables',
      'weight_bands',
      'zone_rates',
      'shipping_policies',
      'fulfillment_policies',
      'return_policies',
      'payment_policies',
      'cpass_rates',
      'actual_shipping_rates',
      
      // 商品・在庫関連
      'products',
      'product_listings',
      'inventory',
      'inventory_logs',
      'stock_levels',
      'items',
      'shohin',
      'zaiko',
      'product_variants',
      'skus',
      
      // 注文関連
      'orders',
      'order_items',
      'order_history',
      'juchu',
      'shukka',
      'shipments',
      'henpin',
      
      // ユーザー・認証
      'users',
      'user_profiles',
      'auth_users',
      'accounts',
      'profiles',
      
      // ログ・履歴
      'audit_logs',
      'activity_logs',
      'sync_logs',
      'import_logs',
      'export_logs',
      'error_logs',
      
      // カテゴリ・設定
      'categories',
      'settings',
      'configurations',
      'policies',
      'policy_templates',
      
      // マーケットプレイス
      'amazon_listings',
      'mercari_listings',
      'yahoo_listings',
      'rakuten_listings',
      
      // その他
      'templates',
      'filters',
      'tags',
      'notes',
      'metadata',
      'cache',
    ]

    // 各テーブルの存在確認とレコード数取得
    const tableInfoPromises = potentialTables.map(async (tableName) => {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          // テーブルが存在しない場合はnullを返す
          return null
        }

        return {
          name: tableName,
          rows: count || 0,
          isCandidate: count && count >= 1000 && count <= 1400,
          exists: true
        }
      } catch (err) {
        return null
      }
    })

    const results = await Promise.all(tableInfoPromises)
    
    // 存在するテーブルのみフィルタ
    const existingTables = results
      .filter(t => t !== null)
      .sort((a, b) => {
        // USA DDP候補を上に表示
        if (a!.isCandidate && !b!.isCandidate) return -1
        if (!a!.isCandidate && b!.isCandidate) return 1
        // レコード数の多い順
        return b!.rows - a!.rows
      })

    return NextResponse.json({
      success: true,
      tables: existingTables,
      count: existingTables.length,
      message: `${existingTables.length}個のテーブルを検出しました`
    })

  } catch (error: any) {
    console.error('Failed to fetch tables:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'テーブル一覧の取得に失敗しました'
    }, { status: 500 })
  }
}
