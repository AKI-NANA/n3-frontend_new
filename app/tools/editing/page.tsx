// app/tools/editing/page.tsx  
'use client'

import { useState, useEffect } from 'react'
import { EditingTable } from './components/EditingTable'
import { ToolPanel } from './components/ToolPanel'
import { MarketplaceSelector } from './components/MarketplaceSelector'
import { StatusBar } from './components/StatusBar'
import { Pagination } from './components/Pagination'
import { ProductModal } from './components/ProductModal'
import { PasteModal } from './components/PasteModal'
import { CSVUploadModal } from './components/CSVUploadModal'
import { AIDataEnrichmentModal } from './components/AIDataEnrichmentModal'
import { AIMarketResearchModal } from './components/AIMarketResearchModal'
import { GeminiBatchModal } from './components/GeminiBatchModal'
import { HTMLPublishPanel } from './components/HTMLPublishPanel'
import { PricingStrategyPanel } from './components/PricingStrategyPanel'
import { useProductData } from './hooks/useProductData'
import { useBatchProcess } from './hooks/useBatchProcess'
import { useMirrorSelectionStore } from '@/store/mirrorSelectionStore'
import { HTSClassificationModal } from '@/components/HTSClassificationModal'
import type { Product, MarketplaceSelection } from './types/product'

export default function EditingPage() {
  const {
    products,
    loading,
    error,
    modifiedIds,
    total,
    pageSize,
    currentPage,
    setPageSize,
    setCurrentPage,
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
    runBatchHTMLGenerate,
    runBatchSellerMirror,
    runBatchScores,
    runAllProcesses
  } = useBatchProcess(loadProducts)  // ✅ loadProductsを渡す

  // Mirror選択状態を取得
  const { getAllSelected, clearAll } = useMirrorSelectionStore()
  const selectedMirrorCount = getAllSelected().length

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
  const [showHTMLPanel, setShowHTMLPanel] = useState(false)
  const [showAIEnrichModal, setShowAIEnrichModal] = useState(false)
  const [enrichTargetProduct, setEnrichTargetProduct] = useState<Product | null>(null)
  const [showPricingPanel, setShowPricingPanel] = useState(false)
  const [showMarketResearchModal, setShowMarketResearchModal] = useState(false)
  const [showGeminiBatchModal, setShowGeminiBatchModal] = useState(false)
  const [showHTSClassificationModal, setShowHTSClassificationModal] = useState(false)
  const [htsTargetProduct, setHTSTargetProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // 🔥 productsが更新されたら、selectedProductも自動更新
  useEffect(() => {
    if (selectedProduct && products.length > 0) {
      const updatedProduct = products.find(p => p.id === selectedProduct.id)
      if (updatedProduct) {
        // 🔥 内容が変わっている場合のみ更新
        const hasChanged = 
          updatedProduct.title !== selectedProduct.title ||
          (updatedProduct as any)?.english_title !== (selectedProduct as any)?.english_title ||
          updatedProduct.description !== selectedProduct.description ||
          (updatedProduct as any)?.english_description !== (selectedProduct as any)?.english_description
        
        if (hasChanged) {
          console.log('🔄 selectedProductを更新:', {
            id: updatedProduct.id,
            title: updatedProduct.title?.substring(0, 30),
            english_title: (updatedProduct as any)?.english_title?.substring(0, 30),
            前回: {
              title: selectedProduct.title?.substring(0, 30),
              english_title: (selectedProduct as any)?.english_title?.substring(0, 30)
            }
          });
          setSelectedProduct(updatedProduct)
        }
      }
    }
  }, [products]) // 🔥 productsが変わるたびに実行

  // 🔥 モーダルからの保存イベントを受け取る
  useEffect(() => {
    const handleProductUpdated = async (event: CustomEvent) => {
      console.log('🔔 product-updatedイベントを受信:', event.detail);
      // DBから最新データを取得
      await loadProducts();
    };

    window.addEventListener('product-updated', handleProductUpdated as EventListener);
    return () => {
      window.removeEventListener('product-updated', handleProductUpdated as EventListener);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleRunAll = async () => {
    // 選択された商品がない場合はエラー
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    // 選択された商品IDを配列に変換
    const selectedProductIds = Array.from(selectedIds)

    showToast(`${selectedProductIds.length}件の商品に対して全処理を開始します...`, 'success')

    try {
      // ステップ1: カテゴリ分析
      showToast('1/6: カテゴリ分析中...', 'success')
      const categoryResult = await runBatchCategory(selectedProductIds)
      if (!categoryResult.success) {
        throw new Error(`カテゴリ分析失敗: ${categoryResult.error}`)
      }

      // ステップ2: 送料計算
      showToast('2/6: 送料計算中...', 'success')
      const shippingResult = await runBatchShipping(selectedProductIds)
      if (!shippingResult.success) {
        throw new Error(`送料計算失敗: ${shippingResult.error}`)
      }

      // ステップ3: 利益計算
      showToast('3/6: 利益計算中...', 'success')
      const profitResult = await runBatchProfit(selectedProductIds)
      if (!profitResult.success) {
        throw new Error(`利益計算失敗: ${profitResult.error}`)
      }

      // ステップ4: SellerMirror分析
      showToast('4/6: SellerMirror分析中...', 'success')
      const smResult = await runBatchSellerMirror(selectedProductIds)
      if (!smResult.success) {
        throw new Error(`SellerMirror分析失敗: ${smResult.error}`)
      }

      // ステップ5: HTML生成
      showToast('5/6: HTML生成中...', 'success')
      const htmlResult = await runBatchHTMLGenerate(selectedProductIds)
      if (!htmlResult.success) {
        throw new Error(`HTML生成失敗: ${htmlResult.error}`)
      }

      // ステップ6: スコア計算
      showToast('6/6: スコア計算中...', 'success')
      const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
      const scoresResult = await runBatchScores(selectedProducts)
      if (!scoresResult.success) {
        throw new Error(`スコア計算失敗: ${scoresResult.error}`)
      }

      // 完了
      showToast(`✅ 全処理完了！${selectedProductIds.length}件の商品を処理しました`, 'success')
      await loadProducts()

    } catch (error: any) {
      showToast(error.message || '処理中にエラーが発生しました', 'error')
    }
  }

  const handleHTML = async () => {
    if (products.length === 0) {
      showToast('商品がありません', 'error')
      return
    }

    const productIds = products.map(p => p.id)
    const result = await runBatchHTMLGenerate(productIds)

    if (result.success) {
      showToast(`HTML生成完了: ${result.updated}件`)
      await loadProducts()
    } else {
      showToast(result.error || 'HTML生成に失敗しました', 'error')
    }
  }

  const handleAIEnrich = () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    // 最初の選択商品を対象にする
    const firstId = Array.from(selectedIds)[0]
    const product = products.find(p => String(p.id) === firstId)

    if (product) {
      setEnrichTargetProduct(product)
      setShowAIEnrichModal(true)
    }
  }

  const handleSaveEnrichedData = async (success: boolean) => {
    if (success) {
      showToast('AI強化データを保存しました')
      await loadProducts()
    }
  }

  const handleBulkResearch = async () => {
    // 選択された商品がない場合はエラー
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const productIds = Array.from(selectedIds)

    showToast(`${productIds.length}件の商品を競合分析します...`, 'success')

    try {
      // APIエンドポイントを呼び出し
      const response = await fetch('/api/bulk-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds: productIds,
          includeFields: {
            category: true,
            shipping: true,
            research: true,
            sellerMirror: true
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        const successCount = data.results.filter((r: any) => r.success).length
        const failCount = data.results.length - successCount
        
        if (failCount > 0) {
          showToast(`✅ 完了: 成功${successCount}件、失敗${failCount}件`, 'success')
        } else {
          showToast(`✅ 競合分析完了！${successCount}件の商品を処理しました`, 'success')
        }
        
        // データ再読み込み（useEffectで自動的にselectedProductも更新される）
        await loadProducts()
      } else {
        throw new Error(data.error || '競合分析に失敗しました')
      }

    } catch (error: any) {
      console.error('Bulk research error:', error)
      showToast(error.message || '競合分析中にエラーが発生しました', 'error')
    }
  }

  const handleBatchFetchDetails = async () => {
    const selectedItems = getAllSelected()
    
    if (selectedItems.length === 0) {
      showToast('モーダルでMirror商品を選択してください。', 'error')
      return
    }

    showToast(`${selectedItems.length}件の詳細情報を取得します...`, 'success')

    try {
      // 商品ごとにグループ化
      const groupedByProduct: Record<string, string[]> = {}
      selectedItems.forEach(item => {
        if (!groupedByProduct[item.productId]) {
          groupedByProduct[item.productId] = []
        }
        groupedByProduct[item.productId].push(item.itemId)
      })

      // 各商品の詳細を並行取得
      const fetchPromises = Object.entries(groupedByProduct).map(async ([productId, itemIds]) => {
        const response = await fetch('/api/sellermirror/batch-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds, productId })
        })

        if (!response.ok) {
          throw new Error(`商品ID${productId}の詳細取得失敗`)
        }

        return response.json()
      })

      const results = await Promise.all(fetchPromises)
      
      const totalSuccess = results.reduce((sum, r) => sum + (r.summary?.success || 0), 0)
      const totalFailed = results.reduce((sum, r) => sum + (r.summary?.failed || 0), 0)

      if (totalFailed > 0) {
        showToast(`✅ 完了: 成功${totalSuccess}件、失敗${totalFailed}件`, 'success')
      } else {
        showToast(`✅ 詳細取得完了！${totalSuccess}件の商品詳細を取得しました`, 'success')
      }

      // ✅ 選択をクリアしない（ユーザーが手動でクリアするまで維持）
      // clearAll()  // ← 削除
      
      // データ再読み込み
      await loadProducts()

      // 🎯 自動スコア計算
      console.log('🎯 詳細取得完了 → スコア自動計算開始')
      try {
        const affectedProductIds = Object.keys(groupedByProduct)
        // 🔥 loadProducts()で更新された商品を取得
        const productsToScore = products.filter(p => affectedProductIds.includes(String(p.id)))
        
        console.log(`  対象商品: ${productsToScore.length}件`)
        
        if (productsToScore.length > 0) {
          const scoresResult = await runBatchScores(productsToScore)
          
          if (scoresResult.success) {
            showToast(`✅ スコア計算完了！`, 'success')
            await loadProducts() // 再読み込みでスコアを反映
          } else {
            console.error('❌ スコア計算失敗:', scoresResult.error)
          }
        }
      } catch (error: any) {
        console.error('❌ スコア自動計算エラー:', error)
      }

    } catch (error: any) {
      console.error('Batch fetch error:', error)
      showToast(error.message || '詳細取得中にエラーが発生しました', 'error')
    }
  }

  // ⭐ フィルターチェック機能
  const handleFilterCheck = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    // 🔥 修正: parseInt() を削除し、UUID文字列のままAPIに送信
    const productIds = Array.from(selectedIds)
    console.log('🔍 フィルターチェック対象ID (UUID):', productIds)
    
    showToast(`${productIds.length}件の商品をフィルターチェック中...`, 'success')

    try {
      const response = await fetch('/api/filter-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }) // UUID文字列配列を送信
      })

      console.log('📡 APIレスポンスステータス:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ APIエラー:', errorData)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ APIレスポンス:', data)

      if (data.success) {
        const summary = data.summary || {}
        showToast(
          `✅ フィルターチェック完了！\n通過: ${summary.passed || 0}件 / 不合格: ${summary.failed || 0}件`,
          'success'
        )
        await loadProducts()
      } else {
        throw new Error(data.error || 'フィルターチェックに失敗しました')
      }
    } catch (error: any) {
      console.error('Filter check error:', error)
      showToast(error.message || 'フィルターチェック中にエラーが発生しました', 'error')
    }
  }

  // 🎓 HTS分類モーダル処理
  const handleHTSClassification = () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    // 最初の選択商品を対象にする
    const firstId = Array.from(selectedIds)[0]
    const product = products.find(p => String(p.id) === firstId)

    if (product) {
      setHTSTargetProduct(product)
      setShowHTSClassificationModal(true)
    }
  }

  const handleHTSClassificationSave = async (updates: any) => {
    if (!htsTargetProduct) return
    
    try {
      // ローカル状態を更新
      updateLocalProduct(htsTargetProduct.id, updates)
      
      // データベースに保存
      const response = await fetch('/api/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: htsTargetProduct.id,
          updates
        })
      })
      
      if (!response.ok) {
        throw new Error('保存に失敗しました')
      }
      
      // データ再読み込み
      await loadProducts()
      
    } catch (error: any) {
      console.error('HTS分類保存エラー:', error)
      throw error
    }
  }
  const handleMarketResearch = () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
    
    // 50件以上の警告
    if (selectedProducts.length > 50) {
      const confirmMsg = `${selectedProducts.length}件の商品を処理します。\n\n⚠️ 注意:\n- 処理に15-30分かかる場合があります\n- Claude Desktopが自動でSupabaseに保存します\n\n続行しますか？`
      if (!confirm(confirmMsg)) {
        return
      }
    }

    setShowMarketResearchModal(true)
  }

  const handleMarketResearchComplete = async () => {
    showToast('✅ 市場調査データをSupabaseに保存しました。データを再読み込みしています...', 'success')
    await loadProducts()
  }

  // 📝 Geminiプロンプト生成ハンドラー（モーダル版）
  const handleGenerateGeminiPrompt = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    // Geminiバッチモーダルを開く
    setShowGeminiBatchModal(true)
  }

  // 🚀 最終処理チェーンハンドラー
  const handleFinalProcessChain = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedArray = Array.from(selectedIds)
    
    if (!confirm(`${selectedArray.length}件の商品に対して最終処理（送料/利益/HTML/スコア/フィルター）を実行しますか？`)) {
      return
    }

    showToast(`${selectedArray.length}件の最終処理を開始します...`, 'success')

    try {
      const response = await fetch('/api/final-process-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedArray,
          baseUrl: window.location.origin
        })
      })

      if (!response.ok) {
        throw new Error('最終処理に失敗しました')
      }

      const data = await response.json()

      if (data.success) {
        const summary = data.summary
        showToast(
          `✅ 最終処理完了！\n通過: ${summary.passed_filter}件 / 不合格: ${summary.failed_filter}件\n\n承認ツールに移動してください。`,
          'success'
        )
        await loadProducts()

        // 承認ツールへの自動遷移確認
        if (summary.passed_filter > 0) {
          if (confirm('承認ツールに移動しますか？')) {
            window.location.href = '/tools/approval'
          }
        }
      }
    } catch (error: any) {
      showToast(error.message || '最終処理中にエラーが発生しました', 'error')
    }
  }

  // ✅ HTS取得ハンドラー - AIでHTSコードを推定
  const handleHTSFetch = async () => {
    console.log('🔍 HTS取得開始')
    console.log('選択された商品数:', selectedIds.size)
    
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
    console.log('選択された商品:', selectedProducts.map(p => ({
      id: p.id,
      title: p.title?.substring(0, 40),
      category: p.category_name
    })))
    
    showToast(`${selectedProducts.length}件のHTSコードを推定中...`, 'success')

    try {
      let updatedCount = 0
      let uncertainCount = 0

      for (const product of selectedProducts) {
        console.log(`\n📦 処理中: ${product.title?.substring(0, 40)}`)
        
        // 商品情報からHTSコードを推定
        console.log('API呼び出し: /api/hts/estimate')
        const response = await fetch('/api/hts/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            title: product.title || product.english_title,
            categoryName: product.category_name || product.ebay_api_data?.category_name,
            categoryId: product.category_id || product.ebay_api_data?.category_id,
            material: product.material,
            description: product.description
          })
        })

        if (!response.ok) {
          console.error(`❌ HTS推定失敗: ${product.id}`, await response.text())
          continue
        }

        const data = await response.json()
        console.log('API応答:', data)

        if (data.success && data.htsCode) {
          console.log(`✅ HTS推定成功: ${data.htsCode} (信頼度: ${data.confidence})`)
          console.log(`   説明: ${data.htsDescription}`)
          
          // 🔥 ローカル状態を更新
          updateLocalProduct(product.id, {
            hts_code: data.htsCode,
            hts_description: data.htsDescription || '',
            hts_duty_rate: data.dutyRate || null,
            hts_confidence: data.confidence || 'uncertain'
          })
          
          // 🔥 データベースに即座に保存
          try {
            const response = await fetch('/api/products/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: product.id,
                updates: {
                  hts_code: data.htsCode,
                  hts_description: data.htsDescription || '',
                  hts_duty_rate: data.dutyRate || null,
                  hts_confidence: data.confidence || 'uncertain'
                }
              })
            })
            
            if (!response.ok) {
              console.error('❌ データベース保存失敗:', await response.text())
            } else {
              console.log('💾 データベースに保存完了')
            }
          } catch (saveError) {
            console.error('❌ データベース保存エラー:', saveError)
          }
          
          if (data.confidence === 'uncertain' || data.confidence === 'low') {
            uncertainCount++
          }
          updatedCount++
        } else {
          console.log('⚠️ HTS推定できず - 要確認として記録')
          
          // 🔥 ローカル状態を更新
          updateLocalProduct(product.id, {
            hts_code: '要確認',
            hts_confidence: 'uncertain'
          })
          
          // 🔥 データベースに即座に保存
          try {
            const response = await fetch('/api/products/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: product.id,
                updates: {
                  hts_code: '要確認',
                  hts_confidence: 'uncertain'
                }
              })
            })
            
            if (!response.ok) {
              console.error('❌ データベース保存失敗:', await response.text())
            }
          } catch (saveError) {
            console.error('❌ データベース保存エラー:', saveError)
          }
          
          uncertainCount++
        }
      }

      console.log(`\n📊 HTS取得完了: 更新${updatedCount}件 / 要確認${uncertainCount}件`)
      
      if (updatedCount > 0) {
        const message = uncertainCount > 0 
          ? `${updatedCount}件更新（うち${uncertainCount}件は要確認）`
          : `${updatedCount}件のHTSコードを更新しました`
        showToast(message, 'success')
        await loadProducts()
      } else {
        showToast('HTSコードを推定できませんでした', 'error')
      }
    } catch (error: any) {
      console.error('HTS fetch error:', error)
      showToast(error.message || 'HTS取得中にエラーが発生しました', 'error')
    }
  }

  // 🔥 関税率自動取得ハンドラー
  const handleDutyRatesLookup = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedArray = Array.from(selectedIds)
    showToast(`${selectedArray.length}件の関税率を検索中...`, 'success')

    try {
      const response = await fetch('/api/hts/lookup-duty-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedArray })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ APIエラー:', errorData)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        showToast(`✅ ${data.updated}件の関税率を更新しました`, 'success')
        await loadProducts()
      } else {
        throw new Error(data.error || '関税率検索に失敗しました')
      }
    } catch (error: any) {
      console.error('Duty rates lookup error:', error)
      showToast(error.message || '関税率検索中にエラーが発生しました', 'error')
    }
  }

  // ✅ 原産国取得ハンドラー（関税率も同時取得）
  const handleOriginCountryFetch = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    showToast('原産国情報を取得中...', 'success')

    try {
      const selectedArray = Array.from(selectedIds)
      let updatedCount = 0

      for (const productId of selectedArray) {
        const product = products.find(p => String(p.id) === productId)
        if (!product) continue

        let originCountry = product.origin_country

        // 🔥 原産国がない場合はeBayデータから取得
        if (!originCountry) {
          const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
          
          if (referenceItems.length === 0) {
            console.log(`  ⏭️ ${productId}: 参照商品なし`)
            continue
          }

          // 最頻出の原産国を取得
          const countries = referenceItems
            .map((item: any) => item.itemLocation?.country)
            .filter((c: string) => c)

          if (countries.length === 0) {
            console.log(`  ⏭️ ${productId}: 原産国情報なし`)
            continue
          }

          const countryCount: Record<string, number> = {}
          countries.forEach((c: string) => {
            countryCount[c] = (countryCount[c] || 0) + 1
          })

          originCountry = Object.entries(countryCount)
            .sort((a, b) => b[1] - a[1])[0]?.[0]
          
          console.log(`  ✅ ${productId}: ${originCountry} (${countries.length}件中${countryCount[originCountry]}件)`)
        } else {
          console.log(`  🔄 ${productId}: 原産国既存 (${originCountry}) - 関税率を更新`)
        }

        if (originCountry) {
          // 🔥 原産国の関税率を取得
          let dutyRate = 0
          try {
            const dutyResponse = await fetch('/api/hts/lookup-duty-rates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                productIds: [productId],
                onlyOriginCountry: true
              })
            })
            
            if (dutyResponse.ok) {
              const dutyData = await dutyResponse.json()
              if (dutyData.success && dutyData.results?.[0]?.updates?.origin_country_duty_rate != null) {
                dutyRate = dutyData.results[0].updates.origin_country_duty_rate
                console.log(`    📊 追加関税率: ${dutyRate}%`)
              }
            }
          } catch (dutyError) {
            console.warn('関税率取得スキップ:', dutyError)
          }
          
          // 🔥 ローカル状態を更新（原産国 + 関税率）
          updateLocalProduct(productId, {
            origin_country: originCountry,
            origin_country_duty_rate: dutyRate
          })
          
          // 🔥 データベースに即座に保存
          try {
            const response = await fetch('/api/products/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: productId,
                updates: { 
                  origin_country: originCountry,
                  origin_country_duty_rate: dutyRate
                }
              })
            })
            
            if (response.ok) {
              updatedCount++
            }
          } catch (saveError) {
            console.error('❌ 保存エラー:', saveError)
          }
        }
      }

      if (updatedCount > 0) {
        showToast(`${updatedCount}件の原産国・関税率を更新しました`, 'success')
        await loadProducts()
      } else {
        showToast('更新する原産国データがありませんでした', 'error')
      }
    } catch (error: any) {
      showToast(error.message || '原産国取得に失敗しました', 'error')
    }
  }

  // 🌍 翻訳ハンドラー（改善版：並列処理 + 進捗表示）
  const handleTranslate = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedArray = Array.from(selectedIds)
    const targetProducts = products.filter(p => selectedIds.has(String(p.id)))

    // 🔍 翻訳が必要な商品のみフィルタリング
    const productsNeedingTranslation = targetProducts.filter(p => 
      !p.english_title || !p.english_description
    )

    if (productsNeedingTranslation.length === 0) {
      showToast(`${targetProducts.length}件は既に翻訳済みです`, 'error')
      return
    }

    console.log(`🌍 翻訳開始: ${productsNeedingTranslation.length}件（${selectedArray.length}件中）`)
    showToast(`${productsNeedingTranslation.length}件の商品を翻訳中...`, 'success')

    try {
      let translatedCount = 0
      let failedCount = 0
      const batchSize = 5 // 5件ずつ並列処理

      // 5件ずつバッチ処理
      for (let i = 0; i < productsNeedingTranslation.length; i += batchSize) {
        const batch = productsNeedingTranslation.slice(i, i + batchSize)
        
        // 進捗表示
        const progress = Math.min(i + batchSize, productsNeedingTranslation.length)
        showToast(`翻訳中... ${progress}/${productsNeedingTranslation.length}件`, 'success')
        
        // 並列実行
        const batchPromises = batch.map(async (product) => {
          try {
            // 翻訳API呼び出し
            const response = await fetch('/api/tools/translate-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: product.id,
                title: product.title,
                description: product.description,
                condition: product.condition_name
              })
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }

            const result = await response.json()

            if (result.success) {
              console.log(`  ✅ ${product.id}: 翻訳完了`)
              
              // 🔥 ローカル状態を即座に更新（テーブルに反映）
              updateLocalProduct(String(product.id), {
                english_title: result.translations.title,
                english_description: result.translations.description,
                english_condition: result.translations.condition
              })
              
              return { success: true, productId: product.id }
            } else {
              throw new Error(result.error || '翻訳失敗')
            }
          } catch (error: any) {
            console.error(`  ❌ ${product.id}: ${error.message}`)
            return { success: false, productId: product.id, error: error.message }
          }
        })

        // バッチの結果を集計
        const batchResults = await Promise.all(batchPromises)
        const successCount = batchResults.filter(r => r.success).length
        const failCount = batchResults.filter(r => !r.success).length
        
        translatedCount += successCount
        failedCount += failCount
        
        console.log(`📊 バッチ${Math.floor(i / batchSize) + 1}完了: 成功${successCount}件、失敗${failCount}件`)
      }

      // 🔥 データベースから最新データを再読み込み
      await loadProducts()

      // 最終結果表示
      if (translatedCount > 0) {
        const message = failedCount > 0
          ? `✅ ${translatedCount}件の翻訳が完了しました（失敗: ${failedCount}件）`
          : `✅ ${translatedCount}件の翻訳が完了しました`
        showToast(message, 'success')
      } else {
        showToast('翻訳に失敗しました', 'error')
      }

      console.log(`🎉 翻訳完了: 成功${translatedCount}件、失敗${failedCount}件`)
      
    } catch (error: any) {
      console.error('Translation error:', error)
      showToast(error.message || '翻訳中にエラーが発生しました', 'error')
    }
  }

  // ✅ 素材取得ハンドラー（関税率も同時取得）
  const handleMaterialFetch = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    showToast('素材情報を取得中...', 'success')

    try {
      const selectedArray = Array.from(selectedIds)
      let updatedCount = 0

      for (const productId of selectedArray) {
        const product = products.find(p => String(p.id) === productId)
        if (!product) continue

        // 🔥 既にmaterialがあればスキップ
        if (product.material) {
          console.log(`  ⏭️ ${productId}: 素材既存 (${product.material})`)
          continue
        }

        // 🔥 ebay_api_data.listing_reference.referenceItemsから取得
        const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
        
        if (referenceItems.length === 0) {
          console.log(`  ⏭️ ${productId}: 参照商品なし`)
          continue
        }

        // 最頻出の素材を取得
        const materials = referenceItems
          .map((item: any) => item.itemSpecifics?.Material)
          .filter((m: string) => m)

        if (materials.length === 0) {
          console.log(`  ⏭️ ${productId}: 素材情報なし`)
          continue
        }

        const materialCount: Record<string, number> = {}
        materials.forEach((m: string) => {
          materialCount[m] = (materialCount[m] || 0) + 1
        })

        const mostCommonMaterial = Object.entries(materialCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0]

        if (mostCommonMaterial) {
          console.log(`  ✅ ${productId}: ${mostCommonMaterial} (${materials.length}件中${materialCount[mostCommonMaterial]}件)`)
          
          // 🔥 素材の関税率を判定（特殊素材のみ）
          let materialDutyRate = 0
          const materialLower = mostCommonMaterial.toLowerCase()
          
          // 特殊素材の追加関税（例）
          if (materialLower.includes('aluminum') || materialLower.includes('アルミ')) {
            materialDutyRate = 10
            console.log(`    📊 アルミニウム追加関税: ${materialDutyRate}%`)
          } else if (materialLower.includes('steel') || materialLower.includes('stainless') || materialLower.includes('鉄') || materialLower.includes('ステンレス')) {
            materialDutyRate = 25
            console.log(`    📊 鋼鉄追加関税: ${materialDutyRate}%`)
          } else {
            console.log(`    📊 通常素材：追加関税なし`)
          }
          
          // 🔥 ローカル状態を更新（素材 + 関税率）
          updateLocalProduct(productId, {
            material: mostCommonMaterial,
            material_duty_rate: materialDutyRate
          })
          
          // 🔥 データベースに即座に保存
          try {
            const response = await fetch('/api/products/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: productId,
                updates: { 
                  material: mostCommonMaterial,
                  material_duty_rate: materialDutyRate
                }
              })
            })
            
            if (response.ok) {
              updatedCount++
            }
          } catch (saveError) {
            console.error('❌ 保存エラー:', saveError)
          }
        }
      }

      if (updatedCount > 0) {
        showToast(`${updatedCount}件の素材・関税率を更新しました`, 'success')
        await loadProducts()
      } else {
        showToast('更新する素材データがありませんでした', 'error')
      }
    } catch (error: any) {
      showToast(error.message || '素材取得に失敗しました', 'error')
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

    // 確認メッセージ
    if (!confirm(`本当に${selectedIds.size}件削除しますか？この操作は取り消せません。`)) {
      return
    }

    try {
      // 削除処理
      const result = await deleteSelected(Array.from(selectedIds))
      
      if (result.success) {
        showToast(`✅ ${selectedIds.size}件削除しました`)
        setSelectedIds(new Set()) // 選択をクリア
        await loadProducts() // データ再読み込み
      } else {
        showToast('削除に失敗しました', 'error')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      showToast(error.message || '削除中にエラーが発生しました', 'error')
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
  const euResponsibleCount = products.filter(p =>
    p.eu_responsible_company_name && p.eu_responsible_company_name.trim() !== ''
  ).length

  const handleExportCSV = () => {
    if (products.length === 0) {
      showToast('エクスポートする商品がありません', 'error')
      return
    }

    // CSV生成
    const headers = Object.keys(products[0]).join(',')
    const rows = products.map(product =>
      Object.values(product).map(value =>
        typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value
      ).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `products_all_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    showToast(`${products.length}件をエクスポートしました`)
  }

  // モール別CSV出力（eBay用）
  const handleExportEbayCSV = () => {
    if (products.length === 0) {
      showToast('エクスポートする商品がありません', 'error')
      return
    }

    const ebayFields = ['sku', 'title', 'price', 'condition', 'description', 'category_name', 'shipping_info', 'brand', 'upc', 'mpn', 'images']
    const headers = ebayFields.join(',')
    const rows = products.map(product =>
      ebayFields.map(field => {
        const value = (product as any)[field] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `products_ebay_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    showToast(`eBay用 ${products.length}件をエクスポートしました`)
  }

  // モール別CSV出力（Yahoo用）
  const handleExportYahooCSV = () => {
    if (products.length === 0) {
      showToast('エクスポートする商品がありません', 'error')
      return
    }

    const yahooFields = ['sku', 'title', 'price', 'condition', 'description', 'category_name', 'images']
    const headers = yahooFields.join(',')
    const rows = products.map(product =>
      yahooFields.map(field => {
        const value = (product as any)[field] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `products_yahoo_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    showToast(`Yahoo用 ${products.length}件をエクスポートしました`)
  }

  // モール別CSV出力（Mercari用）
  const handleExportMercariCSV = () => {
    if (products.length === 0) {
      showToast('エクスポートする商品がありません', 'error')
      return
    }

    const mercariFields = ['sku', 'title', 'price', 'condition', 'description', 'images', 'shipping_info']
    const headers = mercariFields.join(',')
    const rows = products.map(product =>
      mercariFields.map(field => {
        const value = (product as any)[field] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `products_mercari_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    showToast(`Mercari用 ${products.length}件をエクスポートしました`)
  }

  // AI解析用CSVエクスポート（100件以上対応）
  const handleAIExport = () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
    
    // 100件以上の警告
    if (selectedProducts.length > 100) {
      const confirmMsg = `${selectedProducts.length}件の商品を処理します。\n処理に数分かかる場合があります。\n\n続行しますか？`
      if (!confirm(confirmMsg)) {
        return
      }
    }
    
    // CSV生成
    const headers = [
      'SKU',
      '商品名',
      '英語タイトル',
      '価格(円)',
      'カテゴリ名',
      'カテゴリID',
      '長さ(cm)',
      '幅(cm)',
      '高さ(cm)',
      '重さ(g)',
      '状態',
      '画像URL',
      'ブランド'
    ]
    
    const csvRows = [headers.join(',')]
    
    selectedProducts.forEach(p => {
      const row = [
        p.sku || '',
        `"${(p.title || '').replace(/"/g, '""')}"`,,
        `"${(p.title_en || '').replace(/"/g, '""')}"`,
        p.price_jpy || '',
        `"${(p.category_name || '').replace(/"/g, '""')}"`,
        p.category_id || '',
        p.length_cm || '',
        p.width_cm || '',
        p.height_cm || '',
        p.weight_g || '',
        `"${(p.condition || '').replace(/"/g, '""')}"`,
        `"${(p.image_url || '').replace(/"/g, '""')}"`
      ]
      csvRows.push(row.join(','))
    })
    
    const csvContent = csvRows.join('\n')
    
    // プロンプト生成
    const prompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  重要：HTSコード判定 - 間違えると赤字
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下の${selectedProducts.length}件の商品を【慎重に】処理してください：

${csvContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
処理手順（精度最優先）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

各商品について以下を実行：

【ステップ1】カテゴリ情報を活用
カテゴリ名とIDから商品の大分類を判定

【ステップ2】画像を確認（可能な場合）
画像URLが提供されている場合は必ず確認

【ステップ3】HTSコード検索
hs_codesテーブルで複数の方法で検索し、
最も適切なコードを選択

【ステップ4】原産国判定
商品名・ブランドから判定（JP/CN/US等）

【ステップ5】関税率取得
customs_dutiesテーブルから取得

【ステップ6】データベース更新
productsテーブルのlisting_dataを更新

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

それでは慎重に処理を開始してください！`
    
    // クリップボードにコピー
    navigator.clipboard.writeText(prompt).then(() => {
      showToast(`✅ ${selectedProducts.length}件の商品データをコピーしました！\n\nClaude Desktopに貼り付けてください。`, 'success')
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ コピー完了！

対象商品: ${selectedProducts.length}件

次のステップ:
1. Claude Desktopを開く
2. Cmd + V で貼り付け
3. Enter押す
4. 処理完了を待つ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }).catch(err => {
      console.error('コピー失敗:', err)
      showToast('コピーに失敗しました', 'error')
    })
  }

  // 選択された商品をオブジェクト配列に変換
  const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))

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
    <div className="min-h-screen bg-background" style={{ position: 'relative' }}>
      {/* メインコンテンツ - サイドバーの影響を受けない */}
      <main className="p-3" style={{ position: 'relative', zIndex: 1 }}>
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
          onHTML={() => {
            // HTMLパネルを表示
            setShowHTMLPanel(true)
          }}
          onHTSFetch={handleHTSFetch}
          onHTSClassification={handleHTSClassification}
          onOriginCountryFetch={handleOriginCountryFetch}
          onMaterialFetch={handleMaterialFetch}
          onDutyRatesLookup={handleDutyRatesLookup}
          onSellerMirror={async () => {
            console.log('=== SM分析開始 ===')
            
            if (selectedIds.size === 0) {
              showToast('商品を選択してください', 'error')
              return
            }
            
            const selectedArray = Array.from(selectedIds)
            console.log('1. selectedIds:', selectedArray)
            console.log('2. selectedIds JSON:', JSON.stringify(selectedArray))
            
            // 選択された商品の詳細を確認
            const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
            console.log('3. 選択された商品:', selectedProducts.map(p => ({
              id: p.id,
              idType: typeof p.id,
              title: p.title?.substring(0, 30)
            })))
            
            // 文字列IDをそのまま渡す（useBatchProcessで処理）
            const result = await runBatchSellerMirror(selectedArray)
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
          onExport={handleExportCSV}
          onExportEbay={handleExportEbayCSV}
          onExportYahoo={handleExportYahooCSV}
          onExportMercari={handleExportMercariCSV}
          onAIExport={handleAIExport}
          onList={handleListToMarketplace}
          onLoadData={loadProducts}
          onCSVUpload={() => setShowCSVModal(true)}
          onBulkResearch={handleBulkResearch}
          onBatchFetchDetails={handleBatchFetchDetails}
          selectedMirrorCount={selectedMirrorCount}
          onAIEnrich={handleAIEnrich}
          onFilterCheck={handleFilterCheck}
          onPricingStrategy={() => setShowPricingPanel(true)}
          onMarketResearch={handleMarketResearch}
          onTranslate={handleTranslate}
          onGenerateGeminiPrompt={handleGenerateGeminiPrompt}
          onFinalProcessChain={handleFinalProcessChain}
        />

        <MarketplaceSelector
          marketplaces={marketplaces}
          onChange={setMarketplaces}
        />

        {/* HTML生成・出品パネル - HTMLボタンが押されたときのみ表示 */}
        {showHTMLPanel && (
          <HTMLPublishPanel
            selectedProducts={selectedProducts}
            onClose={() => setShowHTMLPanel(false)}
          />
        )}

        <StatusBar
          total={total}
          unsaved={modifiedIds.size}
          ready={readyCount}
          incomplete={incompleteCount}
          selected={selectedIds.size}
          euResponsibleCount={euResponsibleCount}
        />

        <EditingTable
          products={products}
          selectedIds={selectedIds}
          modifiedIds={modifiedIds}
          onSelectChange={setSelectedIds}
          onCellChange={updateLocalProduct}
          onProductClick={setSelectedProduct}
        />

        {/* ページネーション */}
        <Pagination
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageSizeChange={setPageSize}
          onPageChange={setCurrentPage}
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

      {showAIEnrichModal && enrichTargetProduct && (
        <AIDataEnrichmentModal
          product={enrichTargetProduct}
          onClose={() => {
            setShowAIEnrichModal(false)
            setEnrichTargetProduct(null)
          }}
          onSave={handleSaveEnrichedData}
        />
      )}

      {showPricingPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <PricingStrategyPanel
              selectedProducts={selectedProducts}
              onClose={() => setShowPricingPanel(false)}
            />
          </div>
        </div>
      )}

      {showMarketResearchModal && (
        <AIMarketResearchModal
          products={selectedProducts}
          onClose={() => setShowMarketResearchModal(false)}
          onComplete={handleMarketResearchComplete}
        />
      )}

      {showHTSClassificationModal && htsTargetProduct && (
        <HTSClassificationModal
          product={htsTargetProduct}
          onClose={() => {
            setShowHTSClassificationModal(false)
            setHTSTargetProduct(null)
          }}
          onSave={handleHTSClassificationSave}
        />
      )}

      {showGeminiBatchModal && (
        <GeminiBatchModal
          selectedIds={selectedIds}
          onClose={() => setShowGeminiBatchModal(false)}
          onComplete={async () => {
            showToast('✅ データを保存しました', 'success')
            await loadProducts()
            setShowGeminiBatchModal(false)
          }}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 9998 }}>
          <div className="bg-card rounded-lg p-6 max-w-md border border-border" style={{ zIndex: 9999 }}>
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
