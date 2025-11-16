// app/tools/editing/components/ToolPanel.tsx - CSVメニュー部分の修正
// 既存のCSVメニュー部分を以下のコードで置き換えてください

// ... (他のimportは省略)
import { useRef, useEffect } from 'react' // 追加

export function ToolPanel({ /* ... props ... */ }: ToolPanelProps) {
  const [showCSVMenu, setShowCSVMenu] = useState(false)
  const csvMenuRef = useRef<HTMLDivElement>(null) // 追加
  const router = useRouter()
  
  // メニュー外クリックで閉じる処理
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (csvMenuRef.current && !csvMenuRef.current.contains(event.target as Node)) {
        setShowCSVMenu(false)
      }
    }
    
    if (showCSVMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showCSVMenu])
  
  const handleOpenFilter = () => {
    window.open('/management/filter', '_blank')
  }
  
  return (
    <div className="bg-card border border-border rounded-lg mb-3 shadow-sm">
      {/* ... (他のボタンは省略) ... */}
      
      {/* ✅ 修正: CSVメニュー - クリック後も開いたまま */}
      <div className="relative inline-block" ref={csvMenuRef}>
        <Button
          onClick={() => setShowCSVMenu(!showCSVMenu)}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-8 text-xs flex items-center gap-1"
        >
          CSV <ChevronDown className="w-3 h-3" />
        </Button>
        
        {showCSVMenu && (
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
            <button
              onClick={(e) => {
                e.stopPropagation() // イベント伝播を停止
                onExport()
                // メニューを閉じない（ユーザーが手動で閉じるまで開いたまま）
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md"
            >
              全項目
            </button>
            
            {onExportEbay && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onExportEbay()
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                eBay用
              </button>
            )}
            
            {onExportYahoo && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onExportYahoo()
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Yahoo用
              </button>
            )}
            
            {onExportMercari && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onExportMercari()
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Mercari用
              </button>
            )}
            
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            
            {/* ✅ AI解析用ボタン - 特別なスタイル */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAIExport()
                // メニューは開いたまま（連続実行可能）
              }}
              className="w-full px-3 py-2 text-left text-xs last:rounded-b-md bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 hover:from-purple-200 hover:to-indigo-200 dark:hover:from-purple-800 dark:hover:to-indigo-800 font-semibold text-purple-700 dark:text-purple-300 transition-all"
              title="HTSコード・原産国・市場調査データを含む完全分析"
            >
              🤖 AI解析用
              <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                市場調査+HTSコード
              </div>
            </button>
            
            {/* ✅ メニューを閉じるボタン（オプション） */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-1"></div>
            <button
              onClick={() => setShowCSVMenu(false)}
              className="w-full px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-md"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
      
      {/* ... (他のボタンは省略) ... */}
    </div>
  )
}
