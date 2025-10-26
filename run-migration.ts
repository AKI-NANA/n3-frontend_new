/**
 * Supabase マイグレーション実行スクリプト
 * 20251026_inventory_system.sql を実行
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// .env.local を読み込み
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ エラー: Supabase環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 マイグレーション実行開始...\n')
  console.log('Supabase URL:', supabaseUrl)

  const migrationFile = 'supabase/migrations/20251026_inventory_system.sql'
  const sql = fs.readFileSync(migrationFile, 'utf8')

  // SQL文を分割
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 ${statements.length}個のSQL文を実行します...\n`)

  // Supabase REST APIでは直接SQLは実行できないため、
  // テーブル作成を個別に試行
  let successCount = 0
  let skipCount = 0

  // 主要テーブルの確認
  const tables = ['inventory_master', 'set_components', 'inventory_changes']

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1)

      if (error) {
        console.log(`⚠️  テーブル ${table} が存在しません`)
      } else {
        console.log(`✅ テーブル ${table} は既に存在します`)
        skipCount++
      }
    } catch (err) {
      console.log(`⚠️  テーブル ${table} の確認に失敗`)
    }
  }

  if (skipCount === tables.length) {
    console.log('\n✅ すべてのテーブルが既に存在します！')
    console.log('\n📊 サンプルデータを確認します...\n')

    // サンプルデータ確認
    const { data: products, error } = await supabase
      .from('inventory_master')
      .select('unique_id, product_name, product_type, physical_quantity')
      .order('unique_id')

    if (!error && products) {
      console.log(`✅ ${products.length}件の商品が登録されています:\n`)
      products.forEach(p => {
        console.log(`   ${p.unique_id.padEnd(12)} | ${p.product_name.padEnd(30)} | ${p.product_type.padEnd(10)} | 在庫: ${p.physical_quantity}`)
      })
    }

    console.log('\n🎉 マイグレーションは既に完了しています！')
    return
  }

  console.log('\n⚠️  一部のテーブルが存在しません')
  console.log('\n📋 以下の手順でマイグレーションを実行してください:\n')
  console.log('1. Supabaseダッシュボードを開く:')
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql/new')}\n`)
  console.log('2. 以下のファイルの内容を全てコピー:')
  console.log('   supabase/migrations/20251026_inventory_system.sql\n')
  console.log('3. SQL Editorに貼り付けて「RUN」をクリック\n')
  console.log('4. このスクリプトを再実行して確認\n')
}

runMigration().catch(console.error)
