// app/tools/editing/hooks/useProductData.ts
'use client'

import { useState, useEffect } from 'react'
import { fetchProducts, updateProduct, updateProducts, deleteProducts } from '@/lib/supabase/products'
import type { Product, ProductUpdate } from '../types/product'

export function useProductData() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set())
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const { products: data, total: count } = await fetchProducts()
      setProducts(data)
      setTotal(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function markAsModified(id: string | number) {
    setModifiedIds(prev => new Set(prev).add(String(id)))
  }

  function updateLocalProduct(id: string | number, updates: ProductUpdate) {
    // IDを文字列に正規化
    const normalizedId = String(id)
    
    setProducts(prev =>
      prev.map(p => String(p.id) === normalizedId ? { ...p, ...updates } : p)
    )
    markAsModified(normalizedId)
  }

  async function saveProduct(id: string | number, updates: ProductUpdate) {
    try {
      const idNum = typeof id === 'string' ? parseInt(id, 10) : id
      const updated = await updateProduct(String(idNum), updates)
      setProducts(prev =>
        prev.map(p => (p.id === idNum ? updated : p))
      )
      setModifiedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(String(id))
        return newSet
      })
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save'
      }
    }
  }

  async function saveAllModified() {
    console.log('📦 現在のproducts配列:', products.map(p => ({ id: p.id, type: typeof p.id, title: p.title?.substring(0, 30) })))
    console.log('📋 modifiedIds:', Array.from(modifiedIds))
    
    const updates = Array.from(modifiedIds).map(id => {
      const product = products.find(p => String(p.id) === String(id))
      
      console.log('📦 保存する商品:', { id, found: !!product, title: product?.title?.substring(0, 30) })
      
      if (!product) {
        console.error('❌ 商品が見つかりません:', id)
        return null
      }
      
      // listing_historyを除外（DBに存在しない仮想フィールド）
      const { listing_history, ...productData } = product
      
      return { id: String(product.id), data: productData as ProductUpdate }
    }).filter((u): u is { id: string; data: ProductUpdate } => u !== null)

    console.log('💾 保存データ:', updates)
    const result = await updateProducts(updates)
    
    if (result.success > 0) {
      setModifiedIds(new Set())
      
      // 英語タイトルがある商品のHTMLを自動生成
      const productsWithEnglishTitle = updates
        .filter(u => {
          const product = u.data as any
          return product?.english_title && product.english_title.trim() !== ''
        })
        .map(u => u.id)
      
      if (productsWithEnglishTitle.length > 0) {
        console.log(`🎨 HTML自動生成開始: ${productsWithEnglishTitle.length}件`)
        try {
          const response = await fetch('/api/tools/html-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: productsWithEnglishTitle })
          })
          
          if (response.ok) {
            const htmlResult = await response.json()
            console.log(`✅ HTML生成完了: ${htmlResult.updated}件`)
          } else {
            console.error('❌ HTML生成失敗:', await response.text())
          }
        } catch (error) {
          console.error('❌ HTML生成エラー:', error)
        }
      }
      
      await loadProducts() // リフレッシュ
    }

    return result
  }

  async function deleteSelected(ids: string[]) {
    try {
      await deleteProducts(ids)
      // 削除後にデータベースから再読み込み
      await loadProducts()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete'
      }
    }
  }

  return {
    products,
    loading,
    error,
    modifiedIds,
    total,
    loadProducts,
    updateLocalProduct,
    saveProduct,
    saveAllModified,
    deleteSelected,
    markAsModified
  }
}
