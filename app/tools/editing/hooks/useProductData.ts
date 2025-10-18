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
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id
    setProducts(prev =>
      prev.map(p => (p.id === idNum ? { ...p, ...updates } : p))
    )
    markAsModified(id)
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
    const updates = Array.from(modifiedIds).map(id => {
      const idNum = parseInt(id, 10)
      const product = products.find(p => p.id === idNum)
      return { id, data: product as ProductUpdate }
    })

    const result = await updateProducts(updates)
    
    if (result.success > 0) {
      setModifiedIds(new Set())
      await loadProducts() // リフレッシュ
    }

    return result
  }

  async function deleteSelected(ids: string[]) {
    try {
      await deleteProducts(ids)
      const idsNum = ids.map(id => parseInt(id, 10))
      setProducts(prev => prev.filter(p => !idsNum.includes(p.id)))
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
