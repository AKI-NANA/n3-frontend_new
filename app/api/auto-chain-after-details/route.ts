// app/api/auto-chain-after-details/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔗 詳細取得後の自動連鎖処理
 * 
 * SM詳細取得 → HTS → 原産国 → 素材 → 関税率 → 競合最安値
 */
export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '商品IDが必要です'
      }, { status: 400 })
    }
    
    console.log('🔗 自動連鎖処理開始:', productIds.length, '件')
    const results: any = {
      hts: null,
      origin: null,
      material: null,
      dutyRates: null,
      competitor: null
    }
    
    // 1. HTS取得
    console.log('📦 1/5: HTS取得中...')
    try {
      const htsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hts/estimate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.hts = await htsResponse.json()
      console.log('✅ HTS取得完了')
    } catch (error) {
      console.error('❌ HTS取得エラー:', error)
    }
    
    // 2. 原産国取得
    console.log('🌍 2/5: 原産国取得中...')
    try {
      const originResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/batch/origin-country`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.origin = await originResponse.json()
      console.log('✅ 原産国取得完了')
    } catch (error) {
      console.error('❌ 原産国取得エラー:', error)
    }
    
    // 3. 素材取得
    console.log('🧵 3/5: 素材取得中...')
    try {
      const materialResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/batch/material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.material = await materialResponse.json()
      console.log('✅ 素材取得完了')
    } catch (error) {
      console.error('❌ 素材取得エラー:', error)
    }
    
    // 4. 関税率確定
    console.log('📊 4/5: 関税率確定中...')
    try {
      const dutyResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hts/lookup-duty-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.dutyRates = await dutyResponse.json()
      console.log('✅ 関税率確定完了')
    } catch (error) {
      console.error('❌ 関税率確定エラー:', error)
    }
    
    // 5. 競合最安値取得
    console.log('💰 5/5: 競合最安値取得中...')
    try {
      const competitorResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/batch/competitor-min-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.competitor = await competitorResponse.json()
      console.log('✅ 競合最安値取得完了')
    } catch (error) {
      console.error('❌ 競合最安値取得エラー:', error)
    }
    
    console.log('🎉 自動連鎖処理完了！')
    
    return NextResponse.json({
      success: true,
      results,
      message: `${productIds.length}件の自動連鎖処理が完了しました`
    })
    
  } catch (error: any) {
    console.error('❌ 自動連鎖処理エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
