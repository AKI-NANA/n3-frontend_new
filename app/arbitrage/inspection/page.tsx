/**
 * 検品・承認画面
 * /arbitrage/inspection
 *
 * スタッフが初期ロット・リピート発注商品を検品・承認するUI
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProductForInspection {
  id: string
  sku: string
  title: string
  arbitrage_status: string
  arbitrage_score: number
  supplier_source_url: string
  cost: number
  images: any[]
}

export default function InspectionPage() {
  const [products, setProducts] = useState<ProductForInspection[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    fetchProductsForInspection()
  }, [])

  const fetchProductsForInspection = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products_master')
        .select('id, sku, title, arbitrage_status, arbitrage_score, supplier_source_url, cost, images')
        .in('arbitrage_status', ['initial_purchased', 'repeat_order_placed'])
        .order('updated_at', { ascending: false })

      if (error) throw error

      setProducts(data || [])
    } catch (error) {
      console.error('商品取得エラー:', error)
      alert('商品の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (selectedIds.length === 0) {
      alert('承認する商品を選択してください')
      return
    }

    const confirmed = window.confirm(
      `${selectedIds.length}件の商品を承認しますか？\n承認後、多販路出品が開始されます。`
    )
    if (!confirmed) return

    setApproving(true)
    try {
      const response = await fetch('/api/arbitrage/approve-inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedIds,
          inspectedBy: 'staff', // TODO: ログインユーザー名を取得
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.data.approvedCount}件の商品を承認しました\n出品済み: ${result.data.listedCount}件`)
        setSelectedIds([])
        fetchProductsForInspection()
      } else {
        alert(`❌ 承認失敗: ${result.message}`)
      }
    } catch (error) {
      console.error('承認エラー:', error)
      alert('承認処理に失敗しました')
    } finally {
      setApproving(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedIds(products.map(p => p.id))
  }

  const deselectAll = () => {
    setSelectedIds([])
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">検品・承認画面</h1>
        <p className="text-gray-600">
          初期ロット・リピート発注商品の検品・承認を行います
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-500">検品待ちの商品はありません</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                全て選択
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                選択解除
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {selectedIds.length}件選択中 / 全{products.length}件
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">選択</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">商品名</th>
                  <th className="px-4 py-3 text-left">ステータス</th>
                  <th className="px-4 py-3 text-left">スコア</th>
                  <th className="px-4 py-3 text-left">仕入れ先</th>
                  <th className="px-4 py-3 text-left">仕入れ値</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b hover:bg-gray-50 ${
                      selectedIds.includes(product.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{product.sku}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate">{product.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          product.arbitrage_status === 'initial_purchased'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {product.arbitrage_status === 'initial_purchased'
                          ? '初期ロット'
                          : 'リピート発注'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{product.arbitrage_score}</div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={product.supplier_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        仕入れ先URL
                      </a>
                    </td>
                    <td className="px-4 py-3">¥{product.cost?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleApprove}
              disabled={approving || selectedIds.length === 0}
              className={`px-6 py-3 rounded-lg font-semibold ${
                approving || selectedIds.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {approving ? '承認処理中...' : `${selectedIds.length}件を承認して出品`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
