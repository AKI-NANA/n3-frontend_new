'use client'

/**
 * ブロックリスト同期ボタン
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SyncButtonProps {
  userId: string
  onSyncComplete?: () => void
}

export function SyncButton({ userId, onSyncComplete }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)

    try {
      const response = await fetch('/api/ebay/blocklist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync blocklist')
      }

      toast.success(
        `同期完了: ${data.buyersAdded}件追加、${data.buyersRemoved}件削除、合計${data.totalBuyers}件`
      )

      onSyncComplete?.()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync blocklist'
      )
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button onClick={handleSync} disabled={syncing}>
      {syncing ? '同期中...' : 'eBayに同期'}
    </Button>
  )
}
