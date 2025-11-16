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
  
  // ✅ ページネーション状態
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadProducts()
  }, [pageSize, currentPage]) // ページサイズ・ページ番号の変更を監視

  async function loadProducts() {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * pageSize
      console.log('📂 商品データ読み込み中...', { pageSize, currentPage, offset })
      
      const { products: data, total: count } = await fetchProducts(pageSize, offset)
      
      console.log('✅ 商品データ取得完了:', {
        合計: count,
        取得件数: data.length,
        ページ: currentPage,
        ページサイズ: pageSize,
        最初の3件: data.slice(0, 3).map(p => ({
          id: p.id,
          idType: typeof p.id,
          title: p.title?.substring(0, 30)
        }))
      })
      setProducts(data)
      setTotal(count)
    } catch (err) {
      console.error('❌ 商品データ取得エラー:', err)
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
    
    console.log('📦 updateLocalProduct呼び出し:', {
      id: normalizedId,
      updates,
      updatesのキー: Object.keys(updates)
    })
    
    setProducts(prev =>
      prev.map(p => {
        if (String(p.id) !== normalizedId) return p
        
        // 🔥 JSONBフィールド（listing_data, scraped_data）の深いマージ
        const updatedProduct = { ...p }
        
        for (const [key, value] of Object.entries(updates)) {
          if (key === 'listing_data' || key === 'scraped_data' || key === 'ebay_api_data') {
            // JSONBフィールドは既存データとマージ
            updatedProduct[key as keyof Product] = {
              ...(p[key as keyof Product] as any || {}),
              ...(value as any)
            } as any
          } else {
            // 通常フィールドはそのまま更新
            updatedProduct[key as keyof Product] = value as any
          }
        }
        
        console.log('✅ 商品更新後:', {
          id: updatedProduct.id,
          price_jpy: updatedProduct.price_jpy,
          listing_data_weight: (updatedProduct.listing_data as any)?.weight_g
        })
        
        return updatedProduct
      })
    )
    markAsModified(normalizedId)
  }

  async function saveProduct(id: string | number, updates: ProductUpdate) {
    try {
      // listing_historyを除外（DBに存在しない仮想フィールド）
      const { listing_history, ...cleanUpdates } = updates as any
      
      const idNum = typeof id === 'string' ? parseInt(id, 10) : id
      const updated = await updateProduct(String(idNum), cleanUpdates)
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
      console.error('❌ saveProductエラー:', err)
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
    pageSize,
    currentPage,
    setPageSize,
    setCurrentPage,
    loadProducts,
    updateLocalProduct,
    saveProduct,
    saveAllModified,
    deleteSelected,
    markAsModified
  }
}
