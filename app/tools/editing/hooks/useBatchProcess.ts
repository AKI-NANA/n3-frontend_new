// app/tools/editing/hooks/useBatchProcess.ts
'use client'

import { useState } from 'react'
import {
  fetchCategories,
  calculateShipping,
  calculateProfit,
  generateHTML,
  analyzeWithSellerMirror,
  calculateScores,
  updateProducts
} from '@/lib/supabase/products'
import type { Product } from '../types/product'
import { checkDataCompleteness } from '../utils/dataCompleteness'

export function useBatchProcess(loadProducts: () => Promise<void>) {
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')

  async function runBatchHTMLGenerate(productIds: string[]) {
    setProcessing(true)
    setCurrentStep('HTML生成中...')

    try {
      const response = await fetch('/api/tools/html-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'HTML生成に失敗しました')
      }

      // ✅ データを再読み込み
      await loadProducts()

      return { success: true, updated: result.updated }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runBatchCategory(productIds: string[]) {
    setProcessing(true)
    setCurrentStep('カテゴリ分析中...')
    
    try {
      const response = await fetch('/api/tools/category-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'カテゴリ分析に失敗しました')
      }
      
      // ✅ データを再読み込み
      await loadProducts()
      
      return { success: true, updated: result.updated }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runBatchShipping(productIds: string[]) {
    console.log('📦 runBatchShipping開始')
    console.log('productIds:', productIds)
    
    setProcessing(true)
    setCurrentStep('送料計算中...')
    
    try {
      console.log('🚀 API呼び出し: /api/tools/shipping-calculate')
      
      // 1. 送料計算
      const shippingResponse = await fetch('/api/tools/shipping-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      
      console.log('APIレスポンスステータス:', shippingResponse.status)
      
      const shippingResult = await shippingResponse.json()
      console.log('送料計算API結果:', shippingResult)
      
      // エラー詳細を表示
      if (shippingResult.errors && shippingResult.errors.length > 0) {
        console.error('❌ 送料計算エラー詳細:', shippingResult.errors)
        shippingResult.errors.forEach((err: any, index: number) => {
          console.error(`  エラー${index + 1}: ID=${err.id}, メッセージ=${err.error}`)
        })
      }
      
      if (!shippingResponse.ok) {
        throw new Error(shippingResult.error || '送料計算に失敗しました')
      }
      
      // 2. 送料計算後、自動的に利益計算も実行
      setCurrentStep('利益計算中...')
      
      console.log('🚀 API呼び出し: /api/tools/profit-calculate')
      
      const profitResponse = await fetch('/api/tools/profit-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      
      console.log('APIレスポンスステータス:', profitResponse.status)
      
      const profitResult = await profitResponse.json()
      console.log('利益計算API結果:', profitResult)
      
      // エラー詳細を表示
      if (profitResult.errors && profitResult.errors.length > 0) {
        console.error('❌ 利益計算エラー詳細:', profitResult.errors)
        profitResult.errors.forEach((err: any, index: number) => {
          console.error(`  エラー${index + 1}: ID=${err.id}, メッセージ=${err.error}`)
        })
      }
      
      if (!profitResponse.ok) {
        throw new Error(profitResult.error || '利益計算に失敗しました')
      }
      
      console.log('✅ 送料・利益計算完了')
      
      // ✅ データを再読み込み
      await loadProducts()
      
      return { 
        success: true, 
        updated: shippingResult.updated,
        message: `送料計算: ${shippingResult.updated}件, 利益計算: ${profitResult.updated}件`
      }
    } catch (error: any) {
      console.error('❌ 送料計算エラー:', error)
      return { success: false, error: error.message }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runBatchProfit(productIds: string[]) {
    setProcessing(true)
    setCurrentStep('利益計算中...')
    
    try {
      const response = await fetch('/api/tools/profit-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '利益計算に失敗しました')
      }
      
      console.log('✅ 利益計算完了、フィルターチェック開始...')
      
      // 🔥 利益計算後に自動的にフィルターチェックを実行
      setCurrentStep('フィルターチェック中...')
      const filterResponse = await fetch('/api/filter-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: productIds.map(id => parseInt(id)) })
      })
      
      const filterResult = await filterResponse.json()
      
      if (!filterResponse.ok) {
        console.warn('⚠️ フィルターチェックに失敗:', filterResult.error)
      } else {
        console.log('✅ フィルターチェック完了:', filterResult.summary)
      }
      
      // ✅ データを再読み込み
      await loadProducts()
      
      // 🎯 利益計算完了後、データ完全性チェックとスコア自動計算
      console.log('🎯 利益計算完了 → データ完全性チェック開始')
      
      try {
        // ⚠️ 注意: loadProducts()は非同期なので、ここでは商品データを再取得できない
        // そのため、page.tsxからproducts配列を受け取る必要がある
        // 現時点では、スコア計算は次回のpage読み込み時に自動実行される
        // または、ユーザーが手動で「スコア」ボタンを押すことで実行される
        console.log('  📌 スコア計算は次回のページ読み込み時に自動実行されます')
      } catch (scoreError: any) {
        console.error('❌ スコア自動計算エラー:', scoreError)
      }
      
      return { 
        success: true, 
        updated: result.updated,
        filterChecked: filterResult.success ? filterResult.summary : null
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runBatchHTML(products: Product[]) {
    setProcessing(true)
    setCurrentStep('HTML生成中...')
    
    try {
      const results = await generateHTML(products)
      const updates = results.map(r => ({ id: r.id, data: r }))
      await updateProducts(updates)
      return { success: true }
    } catch (error) {
      return { success: false, error }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runBatchSellerMirror(productIds: (string | number)[]) {
    console.log('🔍 runBatchSellerMirror開始')
    console.log('productIds:', productIds)
    console.log('productIds JSON:', JSON.stringify(productIds))
    console.log('productIdsの型:', productIds.map(id => typeof id))

    // 数値または文字列のIDを文字列に統一
    const validIds = productIds
      .filter(id => {
        if (id === null || id === undefined) return false
        if (typeof id === 'number') return !isNaN(id) && id > 0
        if (typeof id === 'string') return id.trim().length > 0 && id !== 'null' && id !== 'undefined'
        return false
      })
      .map(id => String(id))

    console.log('validIds (文字列化後):', validIds)

    if (validIds.length === 0) {
      console.error('❌ 有効なIDがありません')
      console.error('元のproductIds:', productIds)
      return {
        success: false,
        error: '有効な商品IDがありません'
      }
    }

    if (validIds.length !== productIds.length) {
      console.warn(`⚠️ 無効なIDをスキップ: ${productIds.length - validIds.length}件`)
    }
    
    setProcessing(true)
    setCurrentStep('SellerMirror分析中...')
    
    try {
      console.log('🚀 API呼び出し: /api/tools/sellermirror-analyze')
      
      const response = await fetch('/api/tools/sellermirror-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: validIds })
      })
      
      console.log('APIレスポンスステータス:', response.status)
      
      const result = await response.json()
      console.log('SellerMirror分析API結果:', result)
      
      if (!response.ok) {
        throw new Error(result.error || 'SellerMirror分析に失敗しました')
      }
      
      console.log('✅ SellerMirror分析完了')
      
      // ✅ データを再読み込み
      await loadProducts()
      
      return { 
        success: true, 
        updated: result.updated,
        message: `SellerMirror分析完了: ${result.updated}件`
      }
    } catch (error: any) {
      console.error('❌ SellerMirror分析エラー:', error)
      return { success: false, error: error.message }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runBatchScores(products: Product[]) {
    setProcessing(true)
    setCurrentStep('スコア計算中...')
    
    try {
      console.log('🎯 スコア計算開始:', products.length + '件')
      
      // ✅ 実際のスコア計算APIを呼び出し
      const response = await fetch('/api/score/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: products.map(p => p.id)
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'スコア計算APIエラー')
      }
      
      const result = await response.json()
      console.log('✅ スコア計算完了:', result)
      
      // ✅ データを再読み込み
      await loadProducts()
      
      return { 
        success: true, 
        updated: result.updated,
        message: `スコア計算完了: ${result.updated}件`
      }
    } catch (error: any) {
      console.error('❌ スコア計算エラー:', error)
      return { success: false, error: error.message }
    } finally {
      setProcessing(false)
      setCurrentStep('')
    }
  }

  async function runAllProcesses(products: Product[]) {
    const steps = [
      { fn: () => runBatchCategory(products), name: 'カテゴリ取得' },
      { fn: () => runBatchShipping(products), name: '送料計算' },
      { fn: () => runBatchProfit(products), name: '利益計算' },
      { fn: () => runBatchSellerMirror(products), name: 'SM分析' },
      { fn: () => runBatchHTML(products), name: 'HTML生成' },
      { fn: () => runBatchScores(products), name: 'スコア計算' }
    ]

    for (const step of steps) {
      setCurrentStep(step.name)
      const result = await step.fn()
      if (!result.success) {
        return { success: false, failedAt: step.name }
      }
      await new Promise(r => setTimeout(r, 500)) // 少し待機
    }

    setCurrentStep('')
    return { success: true }
  }

  return {
    processing,
    currentStep,
    runBatchHTML,
    runBatchHTMLGenerate,
    runBatchCategory,
    runBatchShipping,
    runBatchProfit,
    runBatchSellerMirror,
    runBatchScores,
    runAllProcesses
  }
}
