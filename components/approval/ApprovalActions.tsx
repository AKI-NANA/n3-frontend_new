// components/approval/ApprovalActions.tsx
'use client'

import { Button } from '@/components/ui/button'
import { 
  Check, 
  X, 
  RefreshCw, 
  Download, 
  Square, 
  CheckSquare 
} from 'lucide-react'

interface ApprovalActionsProps {
  selectedCount: number
  onApprove: () => void
  onReject: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onExport: () => void
  onRefresh: () => void
  processing?: boolean
}

export function ApprovalActions({
  selectedCount,
  onApprove,
  onReject,
  onSelectAll,
  onDeselectAll,
  onExport,
  onRefresh,
  processing = false
}: ApprovalActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
      {/* 選択状況 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">
          {selectedCount > 0 ? `${selectedCount}件選択中` : '商品を選択してください'}
        </span>
      </div>

      {/* 選択操作 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={processing}
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          全選択
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselectAll}
          disabled={processing || selectedCount === 0}
        >
          <Square className="w-4 h-4 mr-2" />
          選択解除
        </Button>
      </div>

      {/* 承認/否認操作 */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onApprove}
          disabled={processing || selectedCount === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="w-4 h-4 mr-2" />
          承認 ({selectedCount})
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onReject}
          disabled={processing || selectedCount === 0}
        >
          <X className="w-4 h-4 mr-2" />
          否認
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={processing || selectedCount === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          CSV出力
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={processing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>
    </div>
  )
}
