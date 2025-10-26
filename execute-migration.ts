/**
 * Supabase マイグレーション直接実行
 * テーブル作成はできないが、データ投入を試みる
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

async function executeMigration() {
  console.log('🚀 Supabaseマイグレーション実行...\n')
  console.log('Supabase URL:', supabaseUrl, '\n')

  // テーブルが存在するか確認
  console.log('1️⃣ テーブル存在確認...')
  const { data: existingData, error: checkError } = await supabase
    .from('inventory_master')
    .select('count')
    .limit(1)

  if (!checkError) {
    console.log('✅ inventory_masterテーブルは既に存在します\n')

    // データ件数確認
    const { data: products, error } = await supabase
      .from('inventory_master')
      .select('unique_id, product_name')

    if (!error && products) {
      console.log(`📊 既に${products.length}件のデータが存在します`)
      if (products.length > 0) {
        console.log('\n既存データ:')
        products.slice(0, 3).forEach(p => {
          console.log(`   - ${p.unique_id}: ${p.product_name}`)
        })
        if (products.length > 3) {
          console.log(`   ... 他${products.length - 3}件`)
        }
      }
      console.log('\n✅ マイグレーションは既に完了しています！')
      return
    }
  }

  console.log('⚠️  テーブルが存在しません')
  console.log('\n📋 以下のSQLをSupabase SQL Editorで実行してください:\n')
  console.log('=' .repeat(80))

  const sql = fs.readFileSync('MIGRATION.sql', 'utf8')
  console.log(sql)

  console.log('=' .repeat(80))
  console.log('\n📝 実行方法:')
  console.log('\n【方法1】ブラウザでコピー＆ペースト')
  console.log('1. 上記のSQL全体を選択してコピー')
  console.log('2. Supabase Dashboardを開く:')
  console.log(`   ${supabaseUrl}/project/_/sql/new`)
  console.log('3. SQL Editorに貼り付けて「RUN」をクリック')

  console.log('\n【方法2】ファイルから直接コピー')
  console.log('1. エディタで MIGRATION.sql を開く')
  console.log('2. 全選択（Ctrl+A）してコピー（Ctrl+C）')
  console.log('3. Supabase SQL Editorに貼り付けて実行')

  console.log('\n📂 ファイルの場所:')
  console.log('   ' + process.cwd() + '/MIGRATION.sql')

  console.log('\n✅ 実行完了後:')
  console.log('   npx tsx execute-migration.ts')
  console.log('   でデータを確認してください\n')
}

executeMigration().catch(console.error)
