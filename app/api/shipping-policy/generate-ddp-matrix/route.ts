import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 60重量帯の定義（0.5 lbs刻み）
function generateWeightBands() {
  const bands = []
  for (let i = 0; i < 60; i++) {
    const min = i * 0.5
    const max = (i + 1) * 0.5
    bands.push({
      band_number: i + 1,
      weight_min: min,
      weight_max: max,
      weight_label: `${min.toFixed(2)}-${max.toFixed(2)} lbs`
    })
  }
  return bands
}

// 商品価格帯の定義（$50-$3500を20分割）
function generatePriceBands() {
  const bands = []
  const step = 175 // ($3500 - $50) / 20 ≈ 172.5 → 175
  
  for (let i = 0; i < 20; i++) {
    const min = 50 + (i * step)
    const max = 50 + ((i + 1) * step)
    bands.push({
      band_number: i + 1,
      price_min: min,
      price_max: max,
      price_label: `$${min}-$${max}`
    })
  }
  return bands
}

// 送料計算（重量ベース + 価格マークアップ）
function calculateShippingCost(weightKg: number, priceUsd: number): number {
  // 基本送料（重量ベース）
  let baseCost = 0
  
  if (weightKg <= 0.5) baseCost = 15
  else if (weightKg <= 1.0) baseCost = 18
  else if (weightKg <= 2.0) baseCost = 22
  else if (weightKg <= 5.0) baseCost = 28
  else if (weightKg <= 10.0) baseCost = 35
  else if (weightKg <= 15.0) baseCost = 45
  else if (weightKg <= 20.0) baseCost = 55
  else if (weightKg <= 25.0) baseCost = 65
  else baseCost = 75
  
  // 価格マークアップ（商品価格の2-5%）
  const markupPercentage = priceUsd < 100 ? 0.05 : priceUsd < 500 ? 0.04 : priceUsd < 1000 ? 0.03 : 0.02
  const markup = priceUsd * markupPercentage
  
  // DDP追加料金（保険 + 関税見込み）
  const ddpSurcharge = priceUsd * 0.08 // 8%
  
  const totalCost = baseCost + markup + ddpSurcharge
  
  return Math.round(totalCost * 100) / 100 // 小数点2桁
}

export async function POST() {
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

    // 1. テーブルが存在するか確認（存在しない場合は作成）
    const { error: tableCheckError } = await supabase
      .from('ebay_ddp_surcharge_matrix')
      .select('id')
      .limit(1)

    // テーブルが存在しない場合はSQL実行が必要
    if (tableCheckError) {
      return NextResponse.json({
        success: false,
        error: 'テーブル ebay_ddp_surcharge_matrix が存在しません。Supabase Dashboardで以下のSQLを実行してください:',
        sql: `
CREATE TABLE IF NOT EXISTS ebay_ddp_surcharge_matrix (
  id SERIAL PRIMARY KEY,
  weight_band_number INT NOT NULL,
  weight_min DECIMAL(10,2) NOT NULL,
  weight_max DECIMAL(10,2) NOT NULL,
  weight_label VARCHAR(50),
  price_band_number INT NOT NULL,
  price_min DECIMAL(10,2) NOT NULL,
  price_max DECIMAL(10,2) NOT NULL,
  price_label VARCHAR(50),
  shipping_cost DECIMAL(10,2) NOT NULL,
  policy_name VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(weight_band_number, price_band_number)
);

CREATE INDEX idx_weight_price ON ebay_ddp_surcharge_matrix(weight_band_number, price_band_number);
        `
      }, { status: 400 })
    }

    // 2. データ生成
    const weightBands = generateWeightBands()
    const priceBands = generatePriceBands()
    
    const matrixData = []
    
    for (const weight of weightBands) {
      for (const price of priceBands) {
        const shippingCost = calculateShippingCost(
          weight.weight_max,
          (price.price_min + price.price_max) / 2
        )
        
        matrixData.push({
          weight_band_number: weight.band_number,
          weight_min: weight.weight_min,
          weight_max: weight.weight_max,
          weight_label: weight.weight_label,
          price_band_number: price.band_number,
          price_min: price.price_min,
          price_max: price.price_max,
          price_label: price.price_label,
          shipping_cost: shippingCost,
          policy_name: `W${weight.band_number}_P${price.band_number}_${weight.weight_label.replace(' ', '')}_${price.price_label.replace('$', '').replace('-', 'to')}`
        })
      }
    }

    // 3. 既存データを削除
    const { error: deleteError } = await supabase
      .from('ebay_ddp_surcharge_matrix')
      .delete()
      .neq('id', 0) // 全削除

    if (deleteError && !deleteError.message.includes('0 rows')) {
      console.warn('Delete warning:', deleteError)
    }

    // 4. データをバッチINSERT（Supabaseは1000件まで）
    const batchSize = 500
    let insertedCount = 0

    for (let i = 0; i < matrixData.length; i += batchSize) {
      const batch = matrixData.slice(i, i + batchSize)
      
      const { error: insertError, count } = await supabase
        .from('ebay_ddp_surcharge_matrix')
        .insert(batch)
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({
          success: false,
          error: `データ挿入に失敗しました: ${insertError.message}`,
          insertedSoFar: insertedCount
        }, { status: 500 })
      }

      insertedCount += batch.length
    }

    return NextResponse.json({
      success: true,
      message: `${insertedCount}件のDDPマトリックスデータを生成しました`,
      details: {
        weightBands: 60,
        priceBands: 20,
        totalRecords: matrixData.length,
        insertedRecords: insertedCount
      }
    })

  } catch (error: any) {
    console.error('Failed to generate DDP matrix:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'DDPマトリックス生成に失敗しました'
    }, { status: 500 })
  }
}
