// app/api/inventory-monitoring/changes/apply/route.ts
// 変動をeBayに適用

import { NextRequest, NextResponse } from 'next/server'
import { batchApplyToEbay } from '@/lib/inventory-monitoring/ebay-auto-update'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { changeIds, account = 'account1', dryRun = false } = body

    if (!changeIds || !Array.isArray(changeIds) || changeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '変動IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`🚀 eBay自動更新開始: ${changeIds.length}件`)

    const result = await batchApplyToEbay(changeIds, { account, dryRun })

    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors,
      message: dryRun
        ? 'テスト実行完了（実際には更新されていません）'
        : `${result.updated}件をeBayに反映しました`,
    })
  } catch (error: any) {
    console.error('❌ eBay更新エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'eBay更新に失敗しました',
      },
      { status: 500 }
    )
  }
}
