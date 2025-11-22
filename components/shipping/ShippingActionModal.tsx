'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, Send, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ShippingActionModalProps {
  isOpen: boolean
  onClose: () => void
  queueItem: {
    id: number
    order_id: string
    queue_status: string
    tracking_number?: string
  }
  onSuccess: () => void
}

export function ShippingActionModal({
  isOpen,
  onClose,
  queueItem,
  onSuccess
}: ShippingActionModalProps) {
  const [trackingNumber, setTrackingNumber] = useState(queueItem.tracking_number || '')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSaveTracking = async (notifyCustomer: boolean = false) => {
    if (!trackingNumber.trim()) {
      toast({
        title: 'エラー',
        description: 'トラッキング番号を入力してください',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/shipping/update-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: queueItem.id,
          tracking_number: trackingNumber,
          notify_customer: notifyCustomer
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update tracking number')
      }

      const data = await res.json()

      toast({
        title: '成功',
        description: notifyCustomer
          ? 'トラッキング番号を保存し、顧客に通知しました'
          : 'トラッキング番号を保存しました',
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to save tracking:', error)
      toast({
        title: 'エラー',
        description: 'トラッキング番号の保存に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrintLabel = async () => {
    try {
      setLoading(true)

      const res = await fetch(`/api/shipping/update-tracking?id=${queueItem.id}`)

      if (!res.ok) {
        throw new Error('Failed to get label data')
      }

      const labelData = await res.json()

      // TODO: 実際の印刷プレビューを実装
      console.log('📄 [MOCK] Opening print preview:', labelData)

      toast({
        title: 'プレビュー',
        description: '伝票プレビューを開きました（モック）',
      })

      // モック: 新しいウィンドウで印刷プレビューを開く
      // const printWindow = window.open('', '_blank')
      // printWindow?.document.write(`<pre>${JSON.stringify(labelData, null, 2)}</pre>`)
    } catch (error) {
      console.error('Failed to print label:', error)
      toast({
        title: 'エラー',
        description: '伝票プレビューの取得に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            出荷アクション - 注文 #{queueItem.order_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tracking">トラッキング番号</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="例: 1234-5678-9012"
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              配送業者から提供されたトラッキング番号を入力してください
            </p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <h4 className="font-semibold text-sm">アクション</h4>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handlePrintLabel}
              disabled={loading}
            >
              <Printer className="mr-2 h-4 w-4" />
              伝票印刷プレビュー
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSaveTracking(false)}
              disabled={loading || !trackingNumber.trim()}
            >
              <Package className="mr-2 h-4 w-4" />
              トラッキング番号を保存
            </Button>

            <Button
              className="w-full justify-start bg-green-600 hover:bg-green-700"
              onClick={() => handleSaveTracking(true)}
              disabled={loading || !trackingNumber.trim()}
            >
              <Send className="mr-2 h-4 w-4" />
              保存 & 顧客へ出荷通知
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
