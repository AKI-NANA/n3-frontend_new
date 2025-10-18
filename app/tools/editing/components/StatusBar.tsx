// app/tools/editing/components/StatusBar.tsx
'use client'

interface StatusBarProps {
  total: number
  unsaved: number
  ready: number
  incomplete: number
  selected: number
}

export function StatusBar({ total, unsaved, ready, incomplete, selected }: StatusBarProps) {
  return (
    <div className="bg-card border border-border rounded-lg mb-3 p-2.5 shadow-sm">
      <div className="flex items-center justify-between text-xs">
        <div className="text-foreground">
          全<strong className="mx-1">{total}</strong>件
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            未保存: {unsaved}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            出品可: {ready}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            未完了: {incomplete}
          </span>
        </div>

        <div className="text-foreground">
          選択: <strong className="mx-1">{selected}</strong>件
        </div>
      </div>
    </div>
  )
}
