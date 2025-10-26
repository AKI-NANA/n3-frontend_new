/**
 * Supabase テーブル詳細確認
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Supabaseテーブル確認...\n')

  const tables = ['inventory_master', 'set_components', 'inventory_changes']

  for (const table of tables) {
    console.log(`📊 ${table} テーブル:`)

    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false })
      .limit(3)

    if (error) {
      console.log(`   ❌ エラー: ${error.message}\n`)
    } else {
      console.log(`   ✅ 存在します`)
      console.log(`   📈 データ件数: ${count || 0}件`)
      if (data && data.length > 0) {
        console.log(`   📝 サンプルデータ:`)
        data.forEach((row: any, i: number) => {
          const preview = JSON.stringify(row).substring(0, 100)
          console.log(`      ${i + 1}. ${preview}...`)
        })
      }
      console.log('')
    }
  }

  // inventory_master の詳細データ
  const { data: products, error: prodError } = await supabase
    .from('inventory_master')
    .select('unique_id, product_name, product_type, physical_quantity')
    .order('unique_id')

  if (!prodError && products && products.length > 0) {
    console.log('🎉 在庫マスターデータ:')
    products.forEach(p => {
      console.log(`   ${p.unique_id.padEnd(12)} | ${p.product_name.padEnd(30)} | ${p.product_type.padEnd(10)} | 在庫: ${p.physical_quantity}`)
    })
    console.log('\n✅ マイグレーション完了！')
    console.log('\n次のステップ:')
    console.log('   npm run dev')
    console.log('   http://localhost:3000/zaiko/tanaoroshi にアクセス\n')
  } else if (prodError) {
    console.log('⚠️  inventory_master テーブルは存在するが、データがありません')
    console.log('\nデータを投入するには、以下のINSERT文を実行してください:\n')
    console.log('='.repeat(70))
    console.log(`
-- サンプルデータ投入
INSERT INTO inventory_master (unique_id, product_name, sku, product_type, physical_quantity, listing_quantity, cost_price, selling_price, category, is_manual_entry, images) VALUES
('ITEM-001', 'iPhone 14 Pro Max 256GB', 'APL-IP14PM-256', 'stock', 5, 3, 800.00, 1200.00, 'Electronics', false, '["https://placehold.co/400x400/3b82f6/ffffff?text=iPhone+14"]'::jsonb),
('ITEM-002', 'MacBook Air M2', 'APL-MBA-M2', 'stock', 2, 1, 1000.00, 1500.00, 'Electronics', false, '["https://placehold.co/400x400/10b981/ffffff?text=MacBook"]'::jsonb),
('ITEM-003', 'AirPods Pro 2nd Gen', 'APL-APP-2ND', 'stock', 10, 8, 180.00, 280.00, 'Electronics', false, '["https://placehold.co/400x400/f59e0b/ffffff?text=AirPods"]'::jsonb),
('ITEM-004', 'Apple Watch Series 9', 'APL-AWS-S9', 'stock', 3, 2, 300.00, 450.00, 'Electronics', false, '["https://placehold.co/400x400/ef4444/ffffff?text=Watch"]'::jsonb),
('ITEM-005', 'iPad Air 5th Gen', 'APL-IPAD-AIR5', 'stock', 7, 5, 500.00, 750.00, 'Electronics', false, '["https://placehold.co/400x400/8b5cf6/ffffff?text=iPad"]'::jsonb),
('ITEM-006', 'Sony WH-1000XM5', 'SONY-WH1000XM5', 'dropship', 0, 0, 250.00, 380.00, 'Electronics', false, '["https://placehold.co/400x400/06b6d4/ffffff?text=Sony"]'::jsonb),
('SET-001', 'Apple Bundle Set', 'SET-APPLE-01', 'set', 0, 0, 0.00, 1800.00, 'Electronics', true, '["https://placehold.co/400x400/ec4899/ffffff?text=Bundle"]'::jsonb);

-- セット品構成データ
INSERT INTO set_components (set_product_id, component_product_id, quantity_required) VALUES
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 1),
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-003'), 1),
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-004'), 1);

-- 在庫変更履歴サンプル
INSERT INTO inventory_changes (product_id, change_type, quantity_before, quantity_after, source, notes) VALUES
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'import', 0, 10, 'manual', '初回仕入れ'),
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'sale', 10, 9, 'ebay_order_12345', 'eBay受注'),
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'sale', 9, 8, 'ebay_order_12346', 'eBay受注'),
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'adjustment', 8, 5, 'manual', '棚卸し調整');
`)
    console.log('='.repeat(70))
  }
}

checkTables().catch(console.error)
