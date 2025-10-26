import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// DDPマトリックスコンポーネントと同じ定義を使用
function generateWeightBands() {
  const rates = [];
  
  // Zone 1: 0-10kg (500g刻み) - 20個
  for (let i = 0; i < 20; i++) {
    const weightFrom = i * 0.5;
    const weightTo = (i + 1) * 0.5;
    rates.push({
      min: weightFrom,
      max: weightTo,
      name: `${weightFrom.toFixed(1)}-${weightTo.toFixed(1)}kg`,
      baseShipping: 20 + (i * 2) // $20から$2ずつ増加
    });
  }

  // Zone 2: 10-20kg (1kg刻み) - 10個
  for (let i = 0; i < 10; i++) {
    const weightFrom = 10 + i;
    const weightTo = 11 + i;
    rates.push({
      min: weightFrom,
      max: weightTo,
      name: `${weightFrom.toFixed(1)}-${weightTo.toFixed(1)}kg`,
      baseShipping: 60 + (i * 5) // $60から$5ずつ増加
    });
  }

  // Zone 3: 20-30kg (1kg刻み) - 10個
  for (let i = 0; i < 10; i++) {
    const weightFrom = 20 + i;
    const weightTo = 21 + i;
    rates.push({
      min: weightFrom,
      max: weightTo,
      name: `${weightFrom.toFixed(1)}-${weightTo.toFixed(1)}kg`,
      baseShipping: 110 + (i * 6) // $110から$6ずつ増加
    });
  }

  // Zone 4: 30-50kg (2kg刻み) - 10個
  for (let i = 0; i < 10; i++) {
    const weightFrom = 30 + (i * 2);
    const weightTo = 32 + (i * 2);
    rates.push({
      min: weightFrom,
      max: weightTo,
      name: `${weightFrom.toFixed(1)}-${weightTo.toFixed(1)}kg`,
      baseShipping: 170 + (i * 10) // $170から$10ずつ増加
    });
  }

  // Zone 5: 50-70kg (2kg刻み) - 10個
  for (let i = 0; i < 10; i++) {
    const weightFrom = 50 + (i * 2);
    const weightTo = 52 + (i * 2);
    rates.push({
      min: weightFrom,
      max: weightTo,
      name: `${weightFrom.toFixed(1)}-${weightTo.toFixed(1)}kg`,
      baseShipping: 270 + (i * 15) // $270から$15ずつ増加
    });
  }

  return rates;
}

// DDPマトリックスと同じ価格帯定義
const PRICE_POINTS = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, // $50-$500: $50刻み
  600, 700, 800, 900, 1000, // $500-$1000: $100刻み
  1500, 2000, 2500, 3000, 3500 // $1000-$3500: $500刻み
];

// DDP手数料率: 商品価格 × 14.5% (関税6.5% + 消費税8%)
const DDP_RATE = 0.145;

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🚀 USA DDP配送コストマトリックス セットアップ開始');
    
    const WEIGHT_BANDS = generateWeightBands();
    
    console.log(`   ${WEIGHT_BANDS.length}重量帯 × ${PRICE_POINTS.length}価格帯 = ${WEIGHT_BANDS.length * PRICE_POINTS.length}レコード\n`);
    
    // Step 1: 既存データを削除
    console.log('🗑️  既存データをクリア中...');
    const { error: deleteError } = await supabase
      .from('usa_ddp_rates')
      .delete()
      .neq('id', 0);
    
    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('削除エラー:', deleteError);
    }
    
    // Step 2: データ生成（DDPマトリックスと完全に同じ計算式）
    console.log('📊 データ生成中...');
    const records = [];
    let recordCount = 0;
    
    for (const weightBand of WEIGHT_BANDS) {
      for (const pricePoint of PRICE_POINTS) {
        // DDPマトリックスと同じ計算式
        const ddpFee = pricePoint * 0.065 + pricePoint * 0.08; // 関税6.5% + 消費税8%
        const totalShipping = weightBand.baseShipping + ddpFee;
        
        records.push({
          weight_min_kg: parseFloat(weightBand.min.toFixed(3)),
          weight_max_kg: parseFloat(weightBand.max.toFixed(3)),
          weight_band_name: weightBand.name,
          product_price_usd: pricePoint,
          base_shipping_usd: parseFloat(weightBand.baseShipping.toFixed(2)),
          ddp_fee_usd: parseFloat(ddpFee.toFixed(2)),
          total_shipping_usd: parseFloat(totalShipping.toFixed(2)),
          notes: 'DDPマトリックス表示データと同一',
        });
        
        recordCount++;
      }
    }
    
    console.log(`   生成完了: ${recordCount}レコード\n`);
    
    // Step 3: バッチ挿入
    console.log('💾 Supabaseに挿入中...');
    const batchSize = 500;
    let insertedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('usa_ddp_rates')
        .insert(batch);
      
      if (insertError) {
        console.error(`バッチ ${Math.floor(i / batchSize) + 1} 挿入エラー:`, insertError);
        return NextResponse.json({
          success: false,
          error: insertError.message,
          details: insertError,
          inserted: insertedCount,
        }, { status: 500 });
      }
      
      insertedCount += batch.length;
      console.log(`   ${insertedCount}/${records.length} レコード挿入完了`);
    }
    
    // Step 4: 確認
    console.log('\n✅ データ確認中...');
    const { count, error: countError } = await supabase
      .from('usa_ddp_rates')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('確認エラー:', countError);
    }
    
    console.log(`\n🎉 セットアップ完了!`);
    console.log(`   総レコード数: ${count}`);
    console.log(`   重量帯数: ${WEIGHT_BANDS.length}`);
    console.log(`   価格帯数: ${PRICE_POINTS.length}`);
    
    return NextResponse.json({
      success: true,
      message: 'USA DDP配送コストマトリックス セットアップ完了（DDPマトリックス表示データと同一）',
      stats: {
        totalRecords: count,
        weightBands: WEIGHT_BANDS.length,
        pricePoints: PRICE_POINTS.length,
        expectedRecords: WEIGHT_BANDS.length * PRICE_POINTS.length,
      }
    });
    
  } catch (error: any) {
    console.error('❌ エラー:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET: 現在の状態を確認
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const WEIGHT_BANDS = generateWeightBands();
    
    const { count, error } = await supabase
      .from('usa_ddp_rates')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    const { data: samples } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .order('weight_min_kg', { ascending: true })
      .order('product_price_usd', { ascending: true })
      .limit(5);
    
    return NextResponse.json({
      success: true,
      currentRecords: count,
      expectedRecords: WEIGHT_BANDS.length * PRICE_POINTS.length,
      isComplete: count === WEIGHT_BANDS.length * PRICE_POINTS.length,
      samples: samples,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
