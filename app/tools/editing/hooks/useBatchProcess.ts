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

export function useBatchProcess() {
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
      
      if (!profitResponse.ok) {
        throw new Error(profitResult.error || '利益計算に失敗しました')
      }
      
      console.log('✅ 送料・利益計算完了')
      
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
      
      return { success: true, updated: result.updated }
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

  async function runBatchSellerMirror(productIds: string[]) {
    console.log('🔍 runBatchSellerMirror開始')
    console.log('productIds:', productIds)
    console.log('productIds JSON:', JSON.stringify(productIds))
    console.log('productIdsの型:', productIds.map(id => typeof id))

    // 空文字、null、undefinedをフィルタリング
    const validIds = productIds.filter(id =>
      id !== null &&
      id !== undefined &&
      typeof id === 'string' &&
      id.trim().length > 0
    )

    if (validIds.length === 0) {
      console.error('❌ 有効なIDがありません')
      return {
        success: false,
        error: '有効な商品IDがありません'
      }
    }

    if (validIds.length !== productIds.length) {
      console.warn(`⚠️ 無効なIDをスキップ: ${productIds.length - validIds.length}件`)
    }

    console.log('validIds:', validIds)
    
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
      const results = await calculateScores(products)
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
