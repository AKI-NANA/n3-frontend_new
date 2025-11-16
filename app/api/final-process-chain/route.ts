// app/api/final-process-chain/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🚀 最終処理チェーンAPI
 * 
 * 以下を順番に実行:
 * 1. 送料計算
 * 2. 利益計算
 * 3. HTML生成
 * 4. スコア計算
 * 5. フィルターチェック
 * 6. 承認ツールへ自動遷移
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

    console.log('🚀 最終処理チェーン開始:', productIds.length, '件')

    const url = baseUrl || 'http://localhost:3000'
    const results: any = {
      shipping: { success: false },
      profit: { success: false },
      html: { success: false },
      scores: { success: false },
      filter: { success: false }
    }

    // 1. 送料計算
    console.log('📦 1/5: 送料計算中...')
    try {
      const shippingResponse = await fetch(`${url}/api/batch/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.shipping = await shippingResponse.json()
      console.log(`  ✅ 送料計算完了: ${results.shipping.updated || 0}件`)
    } catch (error: any) {
      console.error('  ❌ 送料計算エラー:', error.message)
      results.shipping = { success: false, error: error.message }
    }

    // 2. 利益計算
    console.log('💰 2/5: 利益計算中...')
    try {
      const profitResponse = await fetch(`${url}/api/batch/profit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.profit = await profitResponse.json()
      console.log(`  ✅ 利益計算完了: ${results.profit.updated || 0}件`)
    } catch (error: any) {
      console.error('  ❌ 利益計算エラー:', error.message)
      results.profit = { success: false, error: error.message }
    }

    // 3. HTML生成
    console.log('📝 3/5: HTML生成中...')
    try {
      const htmlResponse = await fetch(`${url}/api/batch/html-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.html = await htmlResponse.json()
      console.log(`  ✅ HTML生成完了: ${results.html.updated || 0}件`)
    } catch (error: any) {
      console.error('  ❌ HTML生成エラー:', error.message)
      results.html = { success: false, error: error.message }
    }

    // 4. スコア計算
    console.log('⭐ 4/5: スコア計算中...')
    try {
      const scoresResponse = await fetch(`${url}/api/batch/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.scores = await scoresResponse.json()
      console.log(`  ✅ スコア計算完了: ${results.scores.updated || 0}件`)
    } catch (error: any) {
      console.error('  ❌ スコア計算エラー:', error.message)
      results.scores = { success: false, error: error.message }
    }

    // 5. フィルターチェック
    console.log('✅ 5/5: フィルターチェック中...')
    try {
      const filterResponse = await fetch(`${url}/api/filter-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      results.filter = await filterResponse.json()
      console.log(`  ✅ フィルターチェック完了`)
      console.log(`    通過: ${results.filter.summary?.passed || 0}件`)
      console.log(`    不合格: ${results.filter.summary?.failed || 0}件`)
    } catch (error: any) {
      console.error('  ❌ フィルターチェックエラー:', error.message)
      results.filter = { success: false, error: error.message }
    }

    console.log('🎉 最終処理チェーン完了！')

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: productIds.length,
        passed_filter: results.filter.summary?.passed || 0,
        failed_filter: results.filter.summary?.failed || 0
      },
      next_step: '/tools/approval',
      message: '全処理が完了しました。承認ツールに移動してください。'
    })

  } catch (error: any) {
    console.error('❌ 最終処理チェーンエラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
