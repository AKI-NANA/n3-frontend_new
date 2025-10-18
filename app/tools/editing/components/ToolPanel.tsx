// app/tools/editing/components/ToolPanel.tsx
'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw, Upload } from 'lucide-react'

interface ToolPanelProps {
  modifiedCount: number
  readyCount: number
  processing: boolean
  currentStep: string
  onRunAll: () => void
  onPaste: () => void
  onCategory: () => void
  onShipping: () => void
  onProfit: () => void
  onHTML: () => void
  onSellerMirror: () => void
  onScores: () => void
  onSave: () => void
  onDelete: () => void
  onExport: () => void
  onList: () => void
  onLoadData: () => void
  onCSVUpload: () => void // 追加
}

export function ToolPanel({
  modifiedCount,
  readyCount,
  processing,
  currentStep,
  onRunAll,
  onPaste,
  onCategory,
  onShipping,
  onProfit,
  onHTML,
  onSellerMirror,
  onScores,
  onSave,
  onDelete,
  onExport,
  onList,
  onLoadData,
  onCSVUpload // 追加
}: ToolPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg mb-3 shadow-sm">
      <div className="border-b border-border bg-muted/50 px-3 py-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">ツール</h3>
        <Button
          onClick={onLoadData}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          データ読み込み
        </Button>
      </div>
      <div className="p-3 grid grid-cols-6 gap-2">
        <Button
          onClick={onRunAll}
          disabled={processing}
          variant="default"
          size="sm"
          className="h-8 text-xs"
        >
          一括実行
        </Button>
        
        <Button
          onClick={onPaste}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          貼付
        </Button>
        
        <Button
          onClick={onCategory}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          カテゴリ
        </Button>
        
        <Button
          onClick={onShipping}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          送料
        </Button>
        
        <Button
          onClick={onProfit}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          利益計算
        </Button>
        
        <Button
          onClick={onHTML}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          HTML
        </Button>
        
        <Button
          onClick={onSellerMirror}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950"
        >
          SM分析
        </Button>
        
        <Button
          onClick={onScores}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          スコア計算
        </Button>
        
        <Button
          onClick={onSave}
          disabled={modifiedCount === 0 || processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950"
        >
          保存({modifiedCount})
        </Button>
        
        <Button
          onClick={onDelete}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-red-500 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
        >
          削除
        </Button>
        
        <Button
          onClick={onExport}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          CSV
        </Button>
        
        <Button
          onClick={onCSVUpload}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          <Upload className="w-3 h-3 mr-1" />
          アップロード
        </Button>
        
        <Button
          onClick={onList}
          disabled={readyCount === 0 || processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950"
        >
          出品({readyCount})
        </Button>
      </div>
      
      {processing && currentStep && (
        <div className="px-3 pb-2">
          <div className="text-xs text-primary font-medium">
            {currentStep}
          </div>
        </div>
      )}
    </div>
  )
}
