// app/tools/editing/page.tsx  
'use client'

import { useState } from 'react'
import { EditingTable } from './components/EditingTable'
import { ToolPanel } from './components/ToolPanel'
import { MarketplaceSelector } from './components/MarketplaceSelector'
import { StatusBar } from './components/StatusBar'
import { ProductModal } from './components/ProductModal'
import { PasteModal } from './components/PasteModal'
import { CSVUploadModal } from './components/CSVUploadModal'
import { useProductData } from './hooks/useProductData'
import { useBatchProcess } from './hooks/useBatchProcess'
import type { Product, MarketplaceSelection } from './types/product'

export default function EditingPage() {
  const {
    products,
    loading,
    error,
    modifiedIds,
    total,
    loadProducts,
    updateLocalProduct,
    saveAllModified,
    deleteSelected
  } = useProductData()

  const {
    processing,
    currentStep,
    runBatchCategory,
    runBatchShipping,
    runBatchProfit,
    runBatchHTML,
    runBatchSellerMirror,
    runBatchScores,
    runAllProcesses
  } = useBatchProcess()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marketplaces, setMarketplaces] = useState<MarketplaceSelection>({
    all: false,
    ebay: true,
    shopee: false,
    shopify: false
  })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleRunAll = async () => {
    if (products.length === 0) {
      showToast('商品がありません', 'error')
      return
    }
    
    const productIds = products.map(p => p.id)
    const result = await runBatchHTML(productIds)
    
    if (result.success) {
      showToast('全処理完了')
      await loadProducts()
    } else {
      showToast(result.error || '処理に失敗しました', 'error')
    }
  }

  const handleHTML = async () => {
    if (products.length === 0) {
      showToast('商品がありません', 'error')
      return
    }
    
    const productIds = products.map(p => p.id)
    const result = await runBatchHTML(productIds)
    
    if (result.success) {
      showToast(`HTML生成完了: ${result.updated}件`)
      await loadProducts()
    } else {
      showToast(result.error || 'HTML生成に失敗しました', 'error')
    }
  }

  const handleSaveAll = async () => {
    const result = await saveAllModified()
    if (result.success > 0) {
      showToast(`${result.success}件保存しました`)
    }
    if (result.failed > 0) {
      showToast(`${result.failed}件失敗しました`, 'error')
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) {
      showToast('削除する商品を選択してください', 'error')
      return
    }

    if (confirm(`${selectedIds.size}件削除しますか？`)) {
      const result = await deleteSelected(Array.from(selectedIds))
      if (result.success) {
        showToast(`${selectedIds.size}件削除しました`)
        setSelectedIds(new Set())
      } else {
        showToast('削除に失敗しました', 'error')
      }
    }
  }

  const handleCSVUpload = async (data: any[], options: any) => {
    try {
      showToast('アップロード中...', 'success')

      const response = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, options })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'アップロードに失敗しました')
      }

      showToast(`${result.inserted}件アップロード完了`)
      await loadProducts()

      // 自動処理実行
      if (options.runAllProcesses && result.inserted > 0) {
        showToast('自動処理を開始します...', 'success')
        const processResult = await runAllProcesses(products)
        if (processResult.success) {
          showToast('全処理完了')
          await loadProducts()
        } else {
          showToast(`処理中にエラー: ${processResult.failedAt}`, 'error')
        }
      }
    } catch (error: any) {
      showToast(error.message || 'アップロードに失敗しました', 'error')
      throw error
    }
  }

  const handleListToMarketplace = () => {
    const selected = Object.entries(marketplaces)
      .filter(([key, value]) => key !== 'all' && value)
      .map(([key]) => key)

    if (selected.length === 0) {
      showToast('出品先を選択してください', 'error')
      return
    }

    const readyProducts = products.filter(p => p.ready_to_list && selectedIds.has(p.id))
    
    if (readyProducts.length === 0) {
      showToast('出品可能な商品がありません', 'error')
      return
    }

    showToast(`${selected.join(', ')}に${readyProducts.length}件出品します`)
  }

  const readyCount = products.filter(p => p.ready_to_list).length
  const incompleteCount = products.length - readyCount

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-foreground">読み込み中...</div>
          <div className="text-sm text-muted-foreground">商品データを取得しています</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-destructive">エラー</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <button 
            onClick={() => loadProducts()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* メインコンテンツ - サイドバーの影響を受けない */}
      <main className="p-3">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1 text-foreground">商品データ編集</h1>
          <p className="text-xs text-muted-foreground">
            商品情報の一括編集、価格計算、出品準備
          </p>
        </div>

        <ToolPanel
          modifiedCount={modifiedIds.size}
          readyCount={readyCount}
          processing={processing}
          currentStep={currentStep}
          onRunAll={handleRunAll}
          onPaste={() => setShowPasteModal(true)}
          onCategory={async () => {
            if (selectedIds.size === 0) {
              showToast('商品を選択してください', 'error')
              return
            }
            const productIds = Array.from(selectedIds)
            const result = await runBatchCategory(productIds)
            if (result.success) {
              showToast(`カテゴリ分析完了: ${result.updated}件`)
              await loadProducts()
            } else {
              showToast(result.error || 'カテゴリ分析に失敗しました', 'error')
            }
          }}
          onShipping={async () => {
            console.log('🔘 送料ボタンクリック')
            console.log('選択された商品数:', selectedIds.size)
            
            if (selectedIds.size === 0) {
              showToast('商品を選択してください', 'error')
              return
            }
            
            const productIds = Array.from(selectedIds)
            console.log('送料計算対象ID:', productIds)
            
            const result = await runBatchShipping(productIds)
            console.log('送料計算結果:', result)
            
            if (result.success) {
              showToast(result.message || `送料計算完了: ${result.updated}件`)
              await loadProducts()
            } else {
              showToast(result.error || '送料計算に失敗しました', 'error')
            }
          }}
          onProfit={async () => {
            if (selectedIds.size === 0) {
              showToast('商品を選択してください', 'error')
              return
            }
            const productIds = Array.from(selectedIds)
            const result = await runBatchProfit(productIds)
            if (result.success) {
              showToast(`利益計算完了: ${result.updated}件`)
              await loadProducts()
            } else {
              showToast(result.error || '利益計算に失敗しました', 'error')
            }
          }}
          onHTML={async () => {
            if (selectedIds.size === 0) {
              showToast('商品を選択してください', 'error')
              return
            }
            const productIds = Array.from(selectedIds)
            const result = await runBatchHTML(productIds)
            if (result.success) {
              showToast(`HTML生成完了: ${result.updated}件`)
              await loadProducts()
            } else {
              showToast(result.error || 'HTML生成に失敗しました', 'error')
            }
          }}
          onSellerMirror={async () => {
            console.log('=== SM分析開始 ===')
            
            if (selectedIds.size === 0) {
              showToast('商品を選択してください', 'error')
              return
            }
            
            const selectedArray = Array.from(selectedIds)
            console.log('1. selectedIds:', selectedArray)
            console.log('2. selectedIds JSON:', JSON.stringify(selectedArray))
            
            // 文字列IDを整数に変換（空、null、undefinedを除外）
            const productIds = selectedArray
              .filter(id => {
                const isValid = id && id !== 'null' && id !== 'undefined' && id !== ''
                if (!isValid) console.log('  無効なIDを除外:', id)
                return isValid
              })
              .map(id => {
                const num = parseInt(id, 10)
                console.log(`  変換: "${id}" -> ${num}`)
                return num
              })
              .filter(id => {
                const isValid = !isNaN(id) && id > 0
                if (!isValid) console.log('  無効な数値を除外:', id)
                return isValid
              })
            
            console.log('3. productIds (整数):', productIds)
            console.log('4. productIds JSON:', JSON.stringify(productIds))
            
            if (productIds.length === 0) {
              showToast('有効な商品IDがありません', 'error')
              console.error('selectedIds:', selectedArray)
              return
            }
            
            const result = await runBatchSellerMirror(productIds)
            if (result.success) {
              showToast(result.message || `SellerMirror分析完了: ${result.updated}件`)
              await loadProducts()
            } else {
              showToast(result.error || 'SellerMirror分析に失敗しました', 'error')
            }
          }}
          onScores={() => runBatchScores(products)}
          onSave={handleSaveAll}
          onDelete={handleDelete}
          onExport={() => showToast('CSV出力')}
          onList={handleListToMarketplace}
          onLoadData={loadProducts}
          onCSVUpload={() => setShowCSVModal(true)}
        />

        <MarketplaceSelector
          marketplaces={marketplaces}
          onChange={setMarketplaces}
        />

        <StatusBar
          total={total}
          unsaved={modifiedIds.size}
          ready={readyCount}
          incomplete={incompleteCount}
          selected={selectedIds.size}
        />

        <EditingTable
          products={products}
          selectedIds={selectedIds}
          modifiedIds={modifiedIds}
          onSelectChange={setSelectedIds}
          onCellChange={updateLocalProduct}
          onProductClick={setSelectedProduct}
        />
      </main>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSave={(updates) => {
            // バックグラウンドで保存（モーダルは閉じない）
            updateLocalProduct(selectedProduct.id, updates)
            // モーダルは閉じずにトースト表示のみ
            showToast('カテゴリ情報を保存しました')
          }}
        />
      )}

      {showPasteModal && (
        <PasteModal
          products={products}
          onClose={() => setShowPasteModal(false)}
          onApply={(updates) => {
            updates.forEach(({ id, data }) => updateLocalProduct(id, data))
            setShowPasteModal(false)
            showToast(`${updates.length}セル貼り付け完了`)
          }}
        />
      )}

      {showCSVModal && (
        <CSVUploadModal
          onClose={() => setShowCSVModal(false)}
          onUpload={handleCSVUpload}
        />
      )}

      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-in slide-in-from-right ${
          toast.type === 'error' ? 'bg-destructive' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}

      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md border border-border">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <div className="text-lg font-semibold mb-2 text-foreground">処理中...</div>
              <div className="text-sm text-muted-foreground">{currentStep}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
