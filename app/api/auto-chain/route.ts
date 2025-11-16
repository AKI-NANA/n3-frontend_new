// app/api/auto-chain/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔗 自動連鎖処理API
 * 
 * SM詳細取得後に以下を順番に実行:
 * 1. HTS取得
 * 2. 原産国取得
 * 3. 素材取得
 * 4. 関税率取得
 * 5. 競合データ取得
 */
export async function POST(request: NextRequest) {
  try {
    const { productIds, baseUrl } = await request.json()

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log('🔗 自動連鎖処理開始:', productIds.length, '件')

    const results = {
      hts: { success: 0, failed: 0 },
      origin: { success: 0, failed: 0 },
      material: { success: 0, failed: 0 },
      duty: { success: 0, failed: 0 },
      competitor: { success: 0, failed: 0 }
    }

    const url = baseUrl || 'http://localhost:3000'

    // 1. HTS取得
    console.log('📋 1/5: HTS取得中...')
    try {
      const htsResponse = await fetch(`${url}/api/hts/estimate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      const htsData = await htsResponse.json()
      results.hts = { 
        success: htsData.success ? productIds.length : 0, 
        failed: htsData.success ? 0 : productIds.length 
      }
    } catch (error) {
      console.error('❌ HTS取得エラー:', error)
      results.hts.failed = productIds.length
    }

    // 2. 原産国取得
    console.log('🌍 2/5: 原産国取得中...')
    try {
      const originResponse = await fetch(`${url}/api/batch/origin-country`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      const originData = await originResponse.json()
      results.origin = {
        success: originData.updated || 0,
        failed: productIds.length - (originData.updated || 0)
      }
    } catch (error) {
      console.error('❌ 原産国取得エラー:', error)
      results.origin.failed = productIds.length
    }

    // 3. 素材取得
    console.log('🧵 3/5: 素材取得中...')
    try {
      const materialResponse = await fetch(`${url}/api/batch/material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      const materialData = await materialResponse.json()
      results.material = {
        success: materialData.updated || 0,
        failed: productIds.length - (materialData.updated || 0)
      }
    } catch (error) {
      console.error('❌ 素材取得エラー:', error)
      results.material.failed = productIds.length
    }

    // 4. 関税率取得
    console.log('📊 4/5: 関税率取得中...')
    try {
      const dutyResponse = await fetch(`${url}/api/hts/lookup-duty-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      const dutyData = await dutyResponse.json()
      results.duty = {
        success: dutyData.updated || 0,
        failed: productIds.length - (dutyData.updated || 0)
      }
    } catch (error) {
      console.error('❌ 関税率取得エラー:', error)
      results.duty.failed = productIds.length
    }

    // 5. 競合データ自動取得（SM参照商品から最安値を抽出）
    console.log('🎯 5/5: 競合データ取得中...')
    try {
      const competitorResponse = await fetch(`${url}/api/auto-competitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      const competitorData = await competitorResponse.json()
      results.competitor = {
        success: competitorData.updated || 0,
        failed: productIds.length - (competitorData.updated || 0)
      }
    } catch (error) {
      console.error('❌ 競合データ取得エラー:', error)
      results.competitor.failed = productIds.length
    }

    console.log('✅ 自動連鎖処理完了')
    console.log('結果:', results)

    return NextResponse.json({
      success: true,
      results,
      message: '自動連鎖処理が完了しました'
    })

  } catch (error: any) {
    console.error('❌ 自動連鎖処理エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
