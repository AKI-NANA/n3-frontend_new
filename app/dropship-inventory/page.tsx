'use client'

/**
 * 無在庫輸入管理ダッシュボード
 *
 * Amazon/eBay ハイブリッド無在庫輸入システムの管理画面
 */

import { useState, useEffect } from 'react'
import { Product } from '@/types/product'

interface Stats {
  totalProducts: number
  listingCandidates: number
  activeListings: number
  activeOrders: number
  avgScore: number
}

export default function DropshipInventoryPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'listings' | 'orders'>('dashboard')
  const [loading, setLoading] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // 統計情報を取得
  useEffect(() => {
    fetchStats()
  }, [])

  // タブ切り替え時にデータを取得
  useEffect(() => {
    if (activeTab === 'candidates') {
      fetchCandidates()
    } else if (activeTab === 'listings') {
      fetchListings()
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dropship/products?action=stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('統計情報取得エラー:', error)
    }
  }

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dropship/products?action=candidates')
      const data = await res.json()
      if (data.success) {
        setCandidates(data.products)
      }
    } catch (error) {
      console.error('出品候補取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchListings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dropship/products?status=listed_on_multi')
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('出品中商品取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScoreProducts = async () => {
    if (selectedProducts.length === 0) {
      alert('商品を選択してください')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/dropship/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`${data.count}件の商品をスコアリングしました`)
        fetchCandidates()
        fetchStats()
      }
    } catch (error) {
      console.error('スコアリングエラー:', error)
      alert('スコアリングに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoList = async () => {
    if (selectedProducts.length === 0) {
      alert('商品を選択してください')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/dropship/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts, testMode: false }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`${data.summary.success}件の出品に成功しました`)
        fetchListings()
        fetchStats()
      }
    } catch (error) {
      console.error('出品エラー:', error)
      alert('出品に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePrices = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dropship/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`${data.summary.updated}件の価格を更新しました`)
        fetchListings()
      }
    } catch (error) {
      console.error('価格更新エラー:', error)
      alert('価格更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const selectAllProducts = () => {
    if (activeTab === 'candidates') {
      setSelectedProducts(candidates.map(c => c.id))
    } else if (activeTab === 'listings') {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const deselectAllProducts = () => {
    setSelectedProducts([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">無在庫輸入管理</h1>
          <p className="text-gray-600 mt-2">Amazon/eBay ハイブリッド無在庫輸入システム</p>
        </div>

        {/* 統計情報 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">総商品数</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">出品候補</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{stats.listingCandidates}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">出品中</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{stats.activeListings}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">受注数</div>
              <div className="text-3xl font-bold text-purple-600 mt-2">{stats.activeOrders}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">平均スコア</div>
              <div className="text-3xl font-bold text-orange-600 mt-2">{stats.avgScore.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ダッシュボード
              </button>
              <button
                onClick={() => setActiveTab('candidates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'candidates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                出品候補
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'listings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                出品中の商品
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                受注管理
              </button>
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="p-6">
            {/* ダッシュボードタブ */}
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">システム概要</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">無在庫輸入フロー</h3>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                      <li>商品リサーチとスコアリング</li>
                      <li>出品判定（スコア ≥ 60）</li>
                      <li>Amazon JP / eBay JPへ自動出品</li>
                      <li>仕入れ元価格の監視と自動改定</li>
                      <li>受注検知と自動決済</li>
                      <li>納期連絡と追跡</li>
                      <li>検品・発送</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-900 mb-2">主要機能</h3>
                      <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                        <li>スコアリングエンジン（利益率、納期、信頼性）</li>
                        <li>自動出品（Amazon JP / eBay JP）</li>
                        <li>価格自動改定</li>
                        <li>受注自動処理</li>
                      </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-purple-900 mb-2">仕入れ元</h3>
                      <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                        <li>Amazon US（高信頼性・安定納期）</li>
                        <li>Amazon EU（高信頼性・安定納期）</li>
                        <li>AliExpress（低価格・限定的利用）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 出品候補タブ */}
            {activeTab === 'candidates' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">出品候補商品</h2>
                  <div className="space-x-2">
                    <button
                      onClick={selectAllProducts}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      全選択
                    </button>
                    <button
                      onClick={deselectAllProducts}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      選択解除
                    </button>
                    <button
                      onClick={handleScoreProducts}
                      disabled={loading || selectedProducts.length === 0}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      スコアリング実行
                    </button>
                    <button
                      onClick={handleAutoList}
                      disabled={loading || selectedProducts.length === 0}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      自動出品
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="text-gray-600">読み込み中...</div>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-600">出品候補がありません</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">選択</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">優先度</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入れ元</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">リードタイム</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {candidates.map(candidate => (
                          <tr key={candidate.id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(candidate.id)}
                                onChange={() => toggleProductSelection(candidate.id)}
                                className="h-4 w-4 text-blue-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {candidate.sku}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{candidate.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  candidate.arbitrage_score >= 80
                                    ? 'bg-green-100 text-green-800'
                                    : candidate.arbitrage_score >= 60
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {candidate.arbitrage_score?.toFixed(1) || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  candidate.listing_priority === 'high'
                                    ? 'bg-red-100 text-red-800'
                                    : candidate.listing_priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {candidate.listing_priority || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {candidate.potential_supplier || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {candidate.estimated_lead_time_days ? `${candidate.estimated_lead_time_days}日` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 出品中の商品タブ */}
            {activeTab === 'listings' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">出品中の商品</h2>
                  <div className="space-x-2">
                    <button
                      onClick={selectAllProducts}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      全選択
                    </button>
                    <button
                      onClick={deselectAllProducts}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      選択解除
                    </button>
                    <button
                      onClick={handleUpdatePrices}
                      disabled={loading || selectedProducts.length === 0}
                      className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      価格更新
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="text-gray-600">読み込み中...</div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-600">出品中の商品がありません</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">選択</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">価格</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amazon JP</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">eBay JP</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入れ価格</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="h-4 w-4 text-blue-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.sku}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{product.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ¥{product.price?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {product.amazon_jp_listing_id ? (
                                <span className="text-green-600">●</span>
                              ) : (
                                <span className="text-gray-300">○</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {product.ebay_jp_listing_id ? (
                                <span className="text-green-600">●</span>
                              ) : (
                                <span className="text-gray-300">○</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${product.supplier_current_price?.toFixed(2) || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 受注管理タブ */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">受注管理</h2>
                <div className="text-center py-12">
                  <div className="text-gray-600">受注管理機能は開発中です</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
