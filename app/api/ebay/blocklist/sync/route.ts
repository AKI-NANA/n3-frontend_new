/**
 * POST /api/ebay/blocklist/sync
 * ブロックリストをeBayに同期
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncBlocklistToEbay } from '@/lib/ebay-account-api'
import {
  EbayTokenService,
  BlockedBuyerService,
  SyncHistoryService
} from '@/lib/services/ebay-blocklist-service'

export async function POST(request: NextRequest) {
  try {
    // ユーザー認証を確認（実装は環境に応じて調整）
    // const session = await getServerSession()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    // const userId = session.user.id

    // デモ用: リクエストボディからuserIdを取得
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 1. ユーザーのアクティブなトークンを取得
    const token = await EbayTokenService.getActiveToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'eBay token not found. Please connect your eBay account first.' },
        { status: 404 }
      )
    }

    // トークンの有効期限をチェック
    if (EbayTokenService.isTokenExpired(token)) {
      return NextResponse.json(
        { error: 'eBay token expired. Please reconnect your eBay account.' },
        { status: 401 }
      )
    }

    // 2. 承認済みの共有ブロックリストを取得
    const sharedBlocklist = await BlockedBuyerService.getApprovedBuyerUsernames()

    if (sharedBlocklist.length === 0) {
      return NextResponse.json(
        { message: 'No approved buyers to sync', buyersAdded: 0, totalBuyers: 0 },
        { status: 200 }
      )
    }

    // 3. eBayに同期
    const syncResult = await syncBlocklistToEbay(token.access_token, sharedBlocklist)

    // 4. 同期履歴を記録
    await SyncHistoryService.recordSync(
      userId,
      token.ebay_user_id,
      'manual',
      syncResult
    )

    // 5. 最終同期日時を更新
    if (syncResult.success) {
      await EbayTokenService.updateLastSync(token.id)
    }

    return NextResponse.json({
      success: syncResult.success,
      buyersAdded: syncResult.buyersAdded,
      buyersRemoved: syncResult.buyersRemoved,
      totalBuyers: syncResult.totalBuyers,
      errors: syncResult.errors,
    })
  } catch (error) {
    console.error('Blocklist sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync blocklist',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
