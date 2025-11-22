'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Printer, Send, Save } from 'lucide-react'

interface Order {
  id: string
  orderId: string
  marketplace: string
  product: string
  isSourced: boolean
  isDelayedRisk: boolean
  expectedDate: string
  trackingNumber?: string
}

interface ShippingActionModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  onUpdate?: () => void
}

export default function ShippingActionModal({ isOpen, onClose, order, onUpdate }: ShippingActionModalProps) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveTracking = async () => {
    if (!trackingNumber.trim()) {
      showToast('追跡番号を入力してください', 'error')
      return
    }

    try {
      setSaving(true)

      // 💡 API呼び出し: /api/shipping/update-tracking のPOSTを実装し、トラッキング番号をDBに保存
      const response = await fetch('/api/shipping/update-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          trackingNumber: trackingNumber.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '保存に失敗しました')
      }

      showToast(`追跡番号 ${trackingNumber} を保存しました`)

      // 親コンポーネントに更新を通知
      if (onUpdate) {
        onUpdate()
      }

      // モーダルを閉じる
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      showToast(error.message || '保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintLabel = () => {
    // 伝票生成/印刷プレビューロジック (モック)
    // 実際の実装では、PDFを生成してプレビュー表示または印刷ダイアログを開く
    showToast(`${order.orderId} の伝票印刷プレビューを準備中...`)

    // モックとして、新しいウィンドウで伝票プレビューを開く
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>出荷伝票 - ${order.orderId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .info { margin: 10px 0; }
              .label { font-weight: bold; }
              .barcode { text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 2px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>出荷伝票</h1>
            </div>
            <div class="info"><span class="label">注文ID:</span> ${order.orderId}</div>
            <div class="info"><span class="label">マーケットプレイス:</span> ${order.marketplace}</div>
            <div class="info"><span class="label">商品:</span> ${order.product}</div>
            <div class="info"><span class="label">追跡番号:</span> ${trackingNumber || '未設定'}</div>
            <div class="barcode">${trackingNumber || 'XXXXXXXXXX'}</div>
            <div class="no-print" style="text-align: center; margin-top: 30px;">
              <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">印刷</button>
              <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">閉じる</button>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleSendNotification = async () => {
    if (!trackingNumber.trim()) {
      showToast('追跡番号を保存してから通知を送信してください', 'error')
      return
    }

    try {
      setSaving(true)

      // 顧客へ出荷通知を送信 (モールAPI呼び出し)
      const response = await fetch('/api/shipping/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          marketplace: order.marketplace,
          trackingNumber: trackingNumber.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '通知の送信に失敗しました')
      }

      showToast(`${order.orderId} の出荷通知を顧客に送信しました`)

      // 親コンポーネントに更新を通知
      if (onUpdate) {
        onUpdate()
      }

      // モーダルを閉じる
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      showToast(error.message || '通知の送信に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>出荷アクション: {order.orderId}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 注文情報 */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">マーケットプレイス:</div>
              <div className="font-semibold">{order.marketplace}</div>
              <div className="text-muted-foreground">商品:</div>
              <div className="font-semibold">{order.product}</div>
              <div className="text-muted-foreground">予測出荷日:</div>
              <div className={`font-semibold ${order.isDelayedRisk ? 'text-red-600' : 'text-green-600'}`}>
                {order.expectedDate}
              </div>
            </div>

            {/* 追跡番号入力 (T51) */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="trackingNumber">追跡番号を入力 (T51)</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="例: EZ123456789HK"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                配送業者から提供された追跡番号を入力してください
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
            {/* T52: 伝票生成/印刷プレビュー */}
            <Button
              variant="outline"
              onClick={handlePrintLabel}
              className="w-full sm:w-auto"
              disabled={saving}
            >
              <Printer className="mr-2 h-4 w-4" />
              伝票印刷プレビュー
            </Button>

            <div className="flex space-x-2 w-full sm:w-auto">
              {/* T51: トラッキング番号保存 */}
              <Button
                onClick={handleSaveTracking}
                className="w-1/2 sm:w-auto bg-indigo-600 hover:bg-indigo-700"
                disabled={saving || !trackingNumber.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>

              {/* T52: 顧客へ出荷通知 */}
              <Button
                onClick={handleSendNotification}
                className="w-1/2 sm:w-auto bg-green-600 hover:bg-green-700"
                disabled={saving || !trackingNumber.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                顧客通知
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* トースト */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white z-[60] animate-in slide-in-from-right ${
            toast.type === 'error' ? 'bg-destructive' : 'bg-green-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
