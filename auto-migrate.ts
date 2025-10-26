/**
 * Supabase 自動マイグレーション実行
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function autoMigrate() {
  console.log('🚀 自動マイグレーション開始...\n')
  console.log('Supabase URL:', supabaseUrl, '\n')

  // まずテーブルの存在確認
  const { data: existingData, error: checkError } = await supabase
    .from('inventory_master')
    .select('count')
    .limit(1)

  if (!checkError) {
    console.log('✅ テーブルは既に存在します！')
    console.log('📊 データを確認します...\n')

    const { data: products, error } = await supabase
      .from('inventory_master')
      .select('unique_id, product_name, product_type, physical_quantity')
      .order('unique_id')

    if (!error && products) {
      console.log(`✅ ${products.length}件の商品が登録されています:\n`)
      products.forEach(p => {
        console.log(`   ${p.unique_id.padEnd(12)} | ${p.product_name.padEnd(30)} | ${p.product_type.padEnd(10)} | 在庫: ${p.physical_quantity}`)
      })
      console.log('\n🎉 マイグレーションは既に完了しています！')
      console.log('\n次のステップ:')
      console.log('npm run dev')
      console.log('http://localhost:3000/zaiko/tanaoroshi にアクセス\n')
    }
    return
  }

  console.log('⚠️  テーブルが存在しません。作成が必要です。\n')
  console.log('📋 Supabase JavaScript SDKではテーブル作成ができないため、')
  console.log('以下のSQLをSupabase Dashboardで実行してください:\n')
  console.log('=' .repeat(70))

  const sql = fs.readFileSync('supabase/migrations/20251026_inventory_system.sql', 'utf8')
  console.log(sql)

  console.log('=' .repeat(70))
  console.log('\n📝 実行手順:')
  console.log('1. 上記のSQL全体をコピー（Ctrl+A → Ctrl+C）')
  console.log('2. Supabaseダッシュボードを開く:')
  console.log(`   ${supabaseUrl}/project/_/sql/new`)
  console.log('3. SQL Editorに貼り付けて「RUN」をクリック')
  console.log('4. 完了後、このスクリプトを再実行:\n')
  console.log('   npx tsx auto-migrate.ts\n')
}

autoMigrate().catch(console.error)
