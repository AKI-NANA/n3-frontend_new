/**
 * AuctionCycleManager - オークション終了品の自動再出品/定額切替マネージャー
 */

import { supabase } from '@/lib/supabase'

interface ExpiredAuction {
  id: string
  sku: string
  title: string
  auction_end_time: string
  current_bid: number
  reserve_price: number
  marketplace: string
  listing_id: string
}

/**
 * 終了したオークションを検知
 */
async function detectExpiredAuctions(): Promise<ExpiredAuction[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('auction_listings')
    .select('*')
    .eq('status', 'active')
    .lte('auction_end_time', now)
    .order('auction_end_time', { ascending: true })

  if (error) {
    console.error('[AuctionCycleManager] オークション取得エラー:', error)
    throw error
  }

  return (data || []) as ExpiredAuction[]
}

/**
 * オークション終了品を再出品
 */
async function relistAuction(auction: ExpiredAuction): Promise<boolean> {
  try {
    console.log(`[AuctionCycleManager] 再出品: ${auction.sku}`)

    // 落札されなかった場合
    if (auction.current_bid < auction.reserve_price) {
      // 定額出品に切り替え
      const response = await fetch('/api/listings/create-fixed-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auction.id,
          sku: auction.sku,
          price: auction.reserve_price,
          marketplace: auction.marketplace,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log(`[AuctionCycleManager] 定額出品成功: ${auction.sku}`)

        // ステータスを更新
        await supabase
          .from('auction_listings')
          .update({ status: 'converted_to_fixed_price' })
          .eq('id', auction.id)

        return true
      }
    } else {
      // 落札された場合
      console.log(`[AuctionCycleManager] 落札済み: ${auction.sku}`)

      await supabase
        .from('auction_listings')
        .update({ status: 'sold' })
        .eq('id', auction.id)

      return true
    }

    return false
  } catch (error: any) {
    console.error(`[AuctionCycleManager] 再出品エラー: ${auction.sku}`, error)
    return false
  }
}

/**
 * 終了オークションの処理（I4-4）
 */
export async function processExpiredAuctions(): Promise<{
  total_expired: number
  relisted: number
  sold: number
  failed: number
}> {
  console.log('[AuctionCycleManager] 終了オークション処理開始')

  try {
    const expiredAuctions = await detectExpiredAuctions()

    if (expiredAuctions.length === 0) {
      console.log('[AuctionCycleManager] 終了オークションなし')
      return { total_expired: 0, relisted: 0, sold: 0, failed: 0 }
    }

    console.log(`[AuctionCycleManager] 終了オークション: ${expiredAuctions.length}件`)

    let relisted = 0
    let sold = 0
    let failed = 0

    for (const auction of expiredAuctions) {
      const success = await relistAuction(auction)

      if (success) {
        if (auction.current_bid >= auction.reserve_price) {
          sold++
        } else {
          relisted++
        }
      } else {
        failed++
      }

      // レート制限対策
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log('[AuctionCycleManager] 終了オークション処理完了')
    console.log(`  終了件数: ${expiredAuctions.length}件`)
    console.log(`  再出品: ${relisted}件`)
    console.log(`  落札済み: ${sold}件`)
    console.log(`  失敗: ${failed}件`)

    return {
      total_expired: expiredAuctions.length,
      relisted,
      sold,
      failed,
    }
  } catch (error) {
    console.error('[AuctionCycleManager] 終了オークション処理エラー:', error)
    throw error
  }
}
