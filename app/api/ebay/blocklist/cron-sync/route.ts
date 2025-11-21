/**
 * GET /api/ebay/blocklist/cron-sync
 * 定期実行用の自動同期エンドポイント
 *
 * 使用方法:
 * 1. Vercel Cron: vercel.json に設定
 * 2. GitHub Actions: .github/workflows/sync-blocklist.yml
 * 3. その他のcronサービス: このエンドポイントを定期的にGETリクエスト
 *
 * セキュリティ:
 * CRON_SECRET 環境変数を設定し、リクエストヘッダーで検証します
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { syncBlocklistToEbay } from '@/lib/ebay-account-api'
import {
  EbayTokenService,
  BlockedBuyerService,
  SyncHistoryService
} from '@/lib/services/ebay-blocklist-service'

export async function GET(request: NextRequest) {
  // セキュリティ: CRON_SECRETで認証
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting scheduled blocklist sync...')

    // 1. アクティブなトークンを持つ全ユーザーを取得
    const { data: tokens, error } = await supabase
      .from('ebay_user_tokens')
      .select('*')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to get active tokens: ${error.message}`)
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        message: 'No active tokens found',
        synced: 0,
      })
    }

    // 2. 承認済みの共有ブロックリストを取得
    const sharedBlocklist = await BlockedBuyerService.getApprovedBuyerUsernames()

    if (sharedBlocklist.length === 0) {
      return NextResponse.json({
        message: 'No approved buyers to sync',
        synced: 0,
      })
    }

    console.log(`Found ${tokens.length} active users and ${sharedBlocklist.length} approved buyers`)

    // 3. 各ユーザーのブロックリストを同期
    const results = []
    for (const token of tokens) {
      // トークンの有効期限をチェック
      if (EbayTokenService.isTokenExpired(token)) {
        console.log(`Skipping expired token for user ${token.user_id}`)
        continue
      }

      try {
        console.log(`Syncing blocklist for user ${token.user_id}...`)

        const syncResult = await syncBlocklistToEbay(
          token.access_token,
          sharedBlocklist
        )

        // 同期履歴を記録
        await SyncHistoryService.recordSync(
          token.user_id,
          token.ebay_user_id,
          'scheduled',
          syncResult
        )

        // 成功した場合は最終同期日時を更新
        if (syncResult.success) {
          await EbayTokenService.updateLastSync(token.id)
        }

        results.push({
          user_id: token.user_id,
          success: syncResult.success,
          buyersAdded: syncResult.buyersAdded,
          totalBuyers: syncResult.totalBuyers,
        })

        console.log(`Sync completed for user ${token.user_id}:`, syncResult)
      } catch (error) {
        console.error(`Failed to sync for user ${token.user_id}:`, error)
        results.push({
          user_id: token.user_id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // レート制限を考慮して少し待つ
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      message: `Sync completed for ${successCount}/${results.length} users`,
      synced: successCount,
      total: results.length,
      results,
    })
  } catch (error) {
    console.error('Scheduled sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run scheduled sync',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
