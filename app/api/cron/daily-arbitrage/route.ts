/**
 * 日次刈り取りスケジューラー
 * GET /api/cron/daily-arbitrage
 *
 * 毎日実行: P-4スコアリング、初期ロット仕入れ、リピート発注チェック
 */

import { NextRequest, NextResponse } from 'next/server'
import { createInitialPurchaseManager } from '@/executions/InitialPurchaseManager'
import { createRepeatOrderManager } from '@/services/RepeatOrderManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/daily-arbitrage
 *
 * 日次刈り取りタスクを実行
 *
 * cron設定例（Vercel Cron）:
 * - "0 2 * * *" → 毎日午前2時に実行
 */
export async function GET(request: NextRequest) {
  try {
    // セキュリティ: cron secret keyの検証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ 不正なcronリクエスト')
      return NextResponse.json({
        success: false,
        message: '認証失敗',
      }, { status: 401 })
    }

    console.log('\n🚀 ========================================')
    console.log('   日次刈り取りスケジューラー開始')
    console.log('========================================\n')

    const results = {
      initialPurchase: null as any,
      repeatOrder: null as any,
      errors: [] as string[],
    }

    // ====================================
    // Task 1: 初期ロット仕入れ
    // ====================================
    try {
      console.log('\n📦 Task 1: 初期ロット仕入れを実行...')

      const initialManager = createInitialPurchaseManager({
        dryRun: false,
        arbitrageThreshold: 70,
        initialLotSize: 5,
        maxAutoOrderAmount: 50000,
      })

      results.initialPurchase = await initialManager.executeInitialPurchaseFlow()

      console.log(`✅ Task 1完了: ${results.initialPurchase.message}`)

    } catch (error: any) {
      console.error('❌ Task 1エラー:', error)
      results.errors.push(`初期ロット仕入れエラー: ${error.message}`)
    }

    // ====================================
    // Task 2: リピート発注チェック
    // ====================================
    try {
      console.log('\n🔄 Task 2: リピート発注チェックを実行...')

      const repeatManager = createRepeatOrderManager({
        dryRun: false,
        reorderThreshold: 3,
        reorderLotSize: 5,
        maxAutoReorderAmount: 50000,
      })

      results.repeatOrder = await repeatManager.executeReorderForLowStockProducts()

      console.log(`✅ Task 2完了: ${results.repeatOrder.message}`)

    } catch (error: any) {
      console.error('❌ Task 2エラー:', error)
      results.errors.push(`リピート発注エラー: ${error.message}`)
    }

    console.log('\n🎉 ========================================')
    console.log('   日次刈り取りスケジューラー完了')
    console.log('========================================\n')

    // サマリーレポート
    const summary = {
      date: new Date().toISOString(),
      initialPurchase: {
        selectedCount: results.initialPurchase?.selectedProducts?.length || 0,
        orderedCount: results.initialPurchase?.orderedProducts?.length || 0,
        totalAmount: results.initialPurchase?.totalOrderAmount || 0,
      },
      repeatOrder: {
        reorderedCount: results.repeatOrder?.reorderedProducts?.length || 0,
        totalAmount: results.repeatOrder?.totalReorderAmount || 0,
      },
      errors: results.errors,
    }

    console.log('📊 サマリーレポート:', JSON.stringify(summary, null, 2))

    // TODO: Slack/メール通知
    // await notificationService.sendDailySummary(summary)

    return NextResponse.json({
      success: results.errors.length === 0,
      message: '日次刈り取りスケジューラー完了',
      summary,
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 日次刈り取りスケジューラーエラー:', error)

    return NextResponse.json({
      success: false,
      message: `スケジューラー失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
