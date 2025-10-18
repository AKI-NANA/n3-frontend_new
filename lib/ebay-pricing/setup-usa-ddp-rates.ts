/**
 * USA DDP送料テーブルのセットアップスクリプト
 * 
 * usa_ddp_ratesテーブルが存在しない場合、作成してダミーデータを挿入
 */

import { createClient } from '@/lib/supabase/client'

export async function setupUsaDdpRatesTable() {
  const supabase = createClient()

  console.log('🔧 usa_ddp_ratesテーブルのセットアップ開始...')

  // テーブルが存在するか確認
  const { data: existing, error: checkError } = await supabase
    .from('usa_ddp_rates')
    .select('id')
    .limit(1)

  if (checkError) {
    console.log('⚠️ テーブルが存在しないか、アクセスできません')
    console.log('エラー:', checkError)
    console.log('\n📝 Supabase SQL Editorで以下のSQLを実行してください:')
    console.log(`
-- usa_ddp_ratesテーブルを作成
CREATE TABLE IF NOT EXISTS usa_ddp_rates (
  id SERIAL PRIMARY KEY,
  weight_kg DECIMAL(10,2) NOT NULL UNIQUE,
  price_50 DECIMAL(10,2),
  price_100 DECIMAL(10,2),
  price_150 DECIMAL(10,2),
  price_200 DECIMAL(10,2),
  price_250 DECIMAL(10,2),
  price_300 DECIMAL(10,2),
  price_350 DECIMAL(10,2),
  price_400 DECIMAL(10,2),
  price_450 DECIMAL(10,2),
  price_500 DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- サンプルデータを挿入（最初の5つの重量帯）
INSERT INTO usa_ddp_rates (weight_kg, price_50, price_100, price_150, price_200, price_250, price_300, price_350, price_400, price_450, price_500)
VALUES
  (0.3, 28.50, 30.00, 31.50, 33.00, 34.50, 36.00, 37.50, 39.00, 40.50, 42.00),
  (0.5, 32.00, 34.00, 36.00, 38.00, 40.00, 42.00, 44.00, 46.00, 48.00, 50.00),
  (1.0, 38.00, 42.00, 46.00, 50.00, 54.00, 58.00, 62.00, 66.00, 70.00, 74.00),
  (2.0, 48.00, 54.00, 60.00, 66.00, 72.00, 78.00, 84.00, 90.00, 96.00, 102.00),
  (3.0, 58.00, 66.00, 74.00, 82.00, 90.00, 98.00, 106.00, 114.00, 122.00, 130.00);
`)
    return false
  }

  if (existing && existing.length > 0) {
    console.log('✅ テーブルは既に存在します')
    return true
  }

  console.log('📊 ダミーデータを挿入中...')

  // ダミーデータを作成（簡易版）
  const weights = [0.3, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0]
  
  for (const weight of weights) {
    const row: any = {
      weight_kg: weight
    }

    // 各価格帯の送料を計算（簡易的な式）
    for (let price = 50; price <= 500; price += 50) {
      const baseShipping = 20 + (weight * 10)
      const ddpFee = price * 0.15
      const totalShipping = baseShipping + ddpFee
      row[`price_${price}`] = Math.round(totalShipping * 100) / 100
    }

    const { error: insertError } = await supabase
      .from('usa_ddp_rates')
      .insert([row])

    if (insertError) {
      console.error(`❌ ${weight}kgのデータ挿入失敗:`, insertError)
    } else {
      console.log(`✅ ${weight}kgのデータ挿入成功`)
    }
  }

  console.log('🎉 セットアップ完了！')
  return true
}

// ブラウザのコンソールから実行できるようにする
if (typeof window !== 'undefined') {
  (window as any).setupUsaDdpRatesTable = setupUsaDdpRatesTable
}
