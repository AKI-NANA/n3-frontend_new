// app/tools/editing/components/ToolPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Upload, ChevronDown, Sparkles, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  onExportEbay?: () => void
  onExportYahoo?: () => void
  onExportMercari?: () => void
  onAIExport: () => void
  onList: () => void
  onLoadData: () => void
  onCSVUpload: () => void
  onBulkResearch: () => void
  onBatchFetchDetails: () => void
  selectedMirrorCount: number
  onAIEnrich: () => void
  onFilterCheck: () => void
  onPricingStrategy?: () => void
  onMarketResearch: () => void
  onHTSFetch?: () => void  // ✅ HTS取得
  onHTSClassification?: () => void  // 🎓 HTS分類（Gemini統合）
  onOriginCountryFetch?: () => void  // ✅ 原産国取得
  onMaterialFetch?: () => void  // ✅ 素材取得
  onDutyRatesLookup?: () => void  // 🔥 関税率検索
  onTranslate?: () => void  // 🔥 翻訳
  onGenerateGeminiPrompt?: () => void  // 📝 Geminiプロンプト生成
  onFinalProcessChain?: () => void  // 🚀 最終処理チェーン
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
  onExportEbay,
  onExportYahoo,
  onExportMercari,
  onAIExport,
  onList,
  onLoadData,
  onCSVUpload,
  onBulkResearch,
  onBatchFetchDetails,
  selectedMirrorCount,
  onAIEnrich,
  onFilterCheck,
  onPricingStrategy,
  onMarketResearch,
  onHTSFetch,
  onHTSClassification,
  onOriginCountryFetch,
  onMaterialFetch,
  onDutyRatesLookup,
  onTranslate,
  onGenerateGeminiPrompt,
  onFinalProcessChain
}: ToolPanelProps) {
  const [showCSVMenu, setShowCSVMenu] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)  // 🆕 折りたたみ状態
  const router = useRouter()
  
  const handleOpenFilter = () => {
    window.open('/management/filter', '_blank')
  }
  
  // 🔥 CSVメニューを閉じる処理（クリック外・Escキー対応）
  useEffect(() => {
    if (!showCSVMenu) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // CSVボタンまたはメニュー内のクリックは無視
      if (target.closest('[data-csv-menu]') || target.closest('[data-csv-button]')) {
        return
      }
      setShowCSVMenu(false)
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCSVMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showCSVMenu])
  
  return (
    <div className="bg-card border border-border rounded-lg mb-3 shadow-sm">
      <div className="border-b border-border bg-muted/50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/70" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-foreground">ツール</h3>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
        </div>
        <Button
          onClick={(e) => { e.stopPropagation(); onLoadData(); }}
          disabled={processing}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          データ読み込み
        </Button>
      </div>
      {!isCollapsed && (
      <div className="p-3 space-y-3">
        {/* 📌 自動化フローボタン（順番付き） */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">✨ 自動化フロー</div>
          <div className="grid grid-cols-8 gap-2">
            {/* Step 1: 翻訳 */}
            {onTranslate && (
              <Button
                onClick={onTranslate}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-9 text-xs bg-white dark:bg-gray-900 border-2 border-indigo-500 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-950 font-semibold"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] mr-1 font-bold">1</span>
                🌍 翻訳
              </Button>
            )}
            
            {/* Step 2: SM分析 */}
            <Button
              onClick={onSellerMirror}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-9 text-xs bg-white dark:bg-gray-900 border-2 border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950 font-semibold"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] mr-1 font-bold">2</span>
              🔍 SM分析
            </Button>
            
            {/* Step 3: 詳細取得 */}
            <Button
              onClick={onBatchFetchDetails}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-9 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0 hover:from-blue-600 hover:to-cyan-700 font-semibold shadow-md"
              title={selectedMirrorCount > 0 ? `${selectedMirrorCount}件の詳細を取得` : 'モーダルで商品を選択してください'}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] mr-1 font-bold">3</span>
              📥 詳細取得
              {selectedMirrorCount > 0 && ` (${selectedMirrorCount})`}
            </Button>
            
            {/* Step 4: Geminiプロンプト */}
            {onGenerateGeminiPrompt && (
              <Button
                onClick={onGenerateGeminiPrompt}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-9 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 border-0 font-semibold shadow-md"
                title="Gemini市場調査用プロンプトを生成"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-emerald-600 text-[10px] mr-1 font-bold">4</span>
                📝 Gemini
              </Button>
            )}
            
            {/* Step 5: 最終処理 */}
            {onFinalProcessChain && (
              <Button
                onClick={onFinalProcessChain}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-9 text-xs bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700 border-0 font-semibold shadow-md"
                title="送料/利益/HTML/スコア/フィルターを一括実行"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-pink-600 text-[10px] mr-1 font-bold">5</span>
                🚀 最終処理
              </Button>
            )}
            
            {/* Step 6: 出品 */}
            <Button
              onClick={onList}
              disabled={readyCount === 0 || processing}
              variant="outline"
              size="sm"
              className="h-9 text-xs bg-white dark:bg-gray-900 border-2 border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950 font-semibold"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] mr-1 font-bold">6</span>
              ✅ 出品({readyCount})
            </Button>
          </div>
        </div>

        {/* 🛠️ その他のツール */}
        <div className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded-md border border-gray-200 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">🛠️ その他のツール</div>
          <div className="grid grid-cols-10 gap-2">
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
            
            {onPricingStrategy && (
              <Button
                onClick={onPricingStrategy}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-purple-500 text-purple-700 hover:bg-purple-50"
              >
                価格戦略
              </Button>
            )}
            
            <Button
              onClick={onFilterCheck}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-8 text-xs border-orange-500 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <Filter className="w-3 h-3 mr-1" />
              フィルター
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
            
            {onHTSFetch && (
              <Button
                onClick={onHTSFetch}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                HTS取得
              </Button>
            )}
            
            {onHTSClassification && (
              <Button
                onClick={onHTSClassification}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border-0 font-semibold shadow-md"
                title="Gemini出力からHTS分類を実行"
              >
                🎓 HTS分類
              </Button>
            )}
            
            {onOriginCountryFetch && (
              <Button
                onClick={onOriginCountryFetch}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950"
              >
                原産国取得
              </Button>
            )}
            
            {onMaterialFetch && (
              <Button
                onClick={onMaterialFetch}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-purple-500 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950"
              >
                素材取得
              </Button>
            )}
            
            {onDutyRatesLookup && (
              <Button
                onClick={onDutyRatesLookup}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-red-500 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950 font-semibold"
                title="HTS・原産国・素材から関税率を自動取得"
              >
                📊 %取得
              </Button>
            )}
            
            <Button
              onClick={onBulkResearch}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 hover:from-purple-600 hover:to-indigo-700 font-semibold"
            >
              🔍 競合分析
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
            
            <div className="relative inline-block">
              <Button
                onClick={() => setShowCSVMenu(!showCSVMenu)}
                disabled={processing}
                variant="outline"
                size="sm"
                className="h-8 text-xs flex items-center gap-1"
                data-csv-button
              >
                CSV <ChevronDown className="w-3 h-3" />
              </Button>
              {showCSVMenu && (
                <div 
                  data-csv-menu
                  className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
                >
                  <button
                    onClick={() => { onExport(); setShowCSVMenu(false) }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md"
                  >
                    全項目
                  </button>
                  {onExportEbay && (
                    <button
                      onClick={() => { onExportEbay(); setShowCSVMenu(false) }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      eBay用
                    </button>
                  )}
                  {onExportYahoo && (
                    <button
                      onClick={() => { onExportYahoo(); setShowCSVMenu(false) }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Yahoo用
                    </button>
                  )}
                  {onExportMercari && (
                    <button
                      onClick={() => { onExportMercari(); setShowCSVMenu(false) }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Mercari用
                    </button>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={() => { onAIExport(); setShowCSVMenu(false) }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-purple-50 dark:hover:bg-purple-950 last:rounded-b-md bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 font-semibold text-purple-700 dark:text-purple-300"
                  >
                    🤖 AI解析用
                  </button>
                </div>
              )}
            </div>
            
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
              onClick={onAIEnrich}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 border-0"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              AI強化
            </Button>
            
            <Button
              onClick={onMarketResearch}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 border-0 font-semibold"
              title="複数商品の市場調査データを一括取得（Claude Desktopで自動実行）"
            >
              🔍 市場調査
            </Button>
            
            <Button
              onClick={handleOpenFilter}
              disabled={processing}
              variant="outline"
              size="sm"
              className="h-8 text-xs border-orange-500 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <Filter className="w-3 h-3 mr-1" />
              フィルター管理
            </Button>
          </div>
        </div>
      </div>
      )}
      
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
