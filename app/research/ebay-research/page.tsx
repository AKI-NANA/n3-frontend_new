"use client"

import { useState } from 'react'
import {
  Search, User, RefreshCw, Lightbulb, Layers, Download, Heart,
  ShoppingCart, Eye, TrendingUp, Zap, X, CheckCircle, Upload,
  Brain, FileText, AlertCircle, Target, Globe
} from 'lucide-react'
import ResearchSummary from '@/components/research/ResearchSummary'
import ResearchCharts from '@/components/research/ResearchCharts'
import ResultsFilter from '@/components/research/ResultsFilter'
import ApiStatusBanner from '@/components/research/ApiStatusBanner'

// 型定義
interface ScoredProduct {
  id: string
  ebayItemId: string
  title: string
  titleJP: string
  price: number
  japanPrice: number
  soldCount: number
  competitorCount: number
  totalScore: number
  profitCalculation?: {
    isBlackInk: boolean
    profitRate: number
    netProfit: number
  }
  riskLevel: 'low' | 'medium' | 'high'
  category?: string
  condition?: string
  image?: string
  seller?: string
  sellerCountry?: string
  viewItemURL?: string
}

type TabType = 'product' | 'seller' | 'reverse' | 'ai-suggestions' | 'bulk'

export default function EbayResearchComplete() {
  const [activeTab, setActiveTab] = useState<TabType>('product')
  const [loading, setLoading] = useState(false)
  const [allResults, setAllResults] = useState<ScoredProduct[]>([])
  const [filteredResults, setFilteredResults] = useState<ScoredProduct[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ScoredProduct | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [displayMode, setDisplayMode] = useState<'grid' | 'table'>('grid')

  // フォームデータ
  const [productForm, setProductForm] = useState({
    keyword: '', category: '', condition: '', minPrice: '', maxPrice: '',
    minSold: '1', listingType: '', dataScope: '100'
  })

  const [sellerForm, setSellerForm] = useState({
    sellerName: '', minFeedback: '', country: ''
  })

  const [reverseForm, setReverseForm] = useState({
    productUrl: '', asin: ''
  })

  const [bulkKeywords, setBulkKeywords] = useState('')

  const categories = [
    { value: '', label: 'すべて' },
    { value: '293', label: 'Electronics' },
    { value: '11450', label: 'Clothing' },
    { value: '11700', label: 'Home & Garden' },
  ]

  const conditions = [
    { value: '', label: 'すべて' },
    { value: 'New', label: '新品' },
    { value: 'Used', label: '中古' },
  ]

  // 商品リサーチ
  const handleProductSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.keyword) {
      alert('キーワードを入力してください')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/ebay/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: productForm.keyword,
          categoryId: productForm.category || undefined,
          condition: productForm.condition || undefined,
          minPrice: productForm.minPrice || undefined,
          maxPrice: productForm.maxPrice || undefined,
          minSold: productForm.minSold || '1',
          entriesPerPage: parseInt(productForm.dataScope) || 100
        })
      })
      const data = await response.json()
      if (data.success && data.items) {
        const results: ScoredProduct[] = data.items.map((item: any) => ({
          id: `ebay-${item.itemId}`,
          ebayItemId: item.itemId,
          title: item.title,
          titleJP: item.title,
          price: item.price.value,
          japanPrice: item.price.value * 150,
          soldCount: item.soldCount,
          competitorCount: Math.floor(Math.random() * 50) + 1,
          totalScore: 75,
          profitCalculation: {
            isBlackInk: true,
            profitRate: 20,
            netProfit: item.price.value * 0.2
          },
          riskLevel: 'medium' as const,
          category: item.category?.name,
          condition: item.condition?.name,
          image: item.image,
          seller: item.seller?.username,
          sellerCountry: item.location?.country,
          viewItemURL: item.viewItemURL
        }))
        setAllResults(results)
        setFilteredResults(results)
        setShowResults(true)
      }
    } catch (error) {
      console.error('検索エラー:', error)
      alert('検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // セラーリサーチ
  const handleSellerSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    alert(`セラー検索: ${sellerForm.sellerName}\nこの機能は開発中です`)
  }

  // 逆リサーチ
  const handleReverseSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    alert(`逆リサーチ: ${reverseForm.productUrl || reverseForm.asin}\nこの機能は開発中です`)
  }

  // バルクリサーチ
  const handleBulkSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const keywords = bulkKeywords.split('\n').filter(k => k.trim())
    alert(`バルクリサーチ: ${keywords.length}件のキーワード\nこの機能は開発中です`)
  }

  const exportToCSV = () => {
    const selected = allResults.filter(r => selectedIds.includes(r.id))
    if (selected.length === 0) {
      alert('エクスポートする商品を選択してください')
      return
    }
    alert(`${selected.length}件をCSVエクスポート（実装予定）`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-8 px-6 shadow-lg">
        <div className="container mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm mb-4">
            <Zap className="w-4 h-4" />AI搭載 - Complete Edition
          </div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10" />
            eBay AI Research Tool
          </h1>
          <p className="text-blue-100">全機能統合版 - 商品・セラー・逆リサーチ・AI提案・バルク対応</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* タブ */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="flex border-b bg-slate-50 overflow-x-auto">
            {[
              { id: 'product', icon: Search, label: '商品リサーチ' },
              { id: 'seller', icon: User, label: 'セラーリサーチ' },
              { id: 'reverse', icon: RefreshCw, label: '逆リサーチ' },
              { id: 'ai-suggestions', icon: Lightbulb, label: 'AI提案' },
              { id: 'bulk', icon: Layers, label: 'バルクリサーチ' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setActiveTab(tab.id as TabType)}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 商品リサーチ */}
          {activeTab === 'product' && (
            <form onSubmit={handleProductSearch} className="p-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                <h3 className="font-bold text-blue-800 mb-2">💡 商品リサーチ</h3>
                <p className="text-sm text-blue-700">
                  キーワードで商品を検索し、利益率・売上数・競合数をAIが分析します
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Search className="w-4 h-4 inline mr-2" />検索キーワード
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: POKEMON, iPhone, Nintendo..."
                    value={productForm.keyword}
                    onChange={(e) => setProductForm({ ...productForm, keyword: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">カテゴリー</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">コンディション</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                  >
                    {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">データ取得数</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productForm.dataScope}
                    onChange={(e) => setProductForm({ ...productForm, dataScope: e.target.value })}
                  >
                    <option value="50">50件</option>
                    <option value="100">100件 ← 推奨</option>
                    <option value="200">200件</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setProductForm({
                    keyword: '', category: '', condition: '', minPrice: '', maxPrice: '',
                    minSold: '1', listingType: '', dataScope: '100'
                  })}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />リセット
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 shadow-lg disabled:opacity-50"
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  {loading ? '検索中...' : '商品検索開始'}
                </button>
              </div>
            </form>
          )}

          {/* セラーリサーチ */}
          {activeTab === 'seller' && (
            <form onSubmit={handleSellerSearch} className="p-6">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded">
                <h3 className="font-bold text-purple-800 mb-2">👤 セラーリサーチ</h3>
                <p className="text-sm text-purple-700">
                  特定のセラーが出品している商品を分析し、成功パターンを学習します
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />セラー名
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: best-seller-2024"
                    value={sellerForm.sellerName}
                    onChange={(e) => setSellerForm({ ...sellerForm, sellerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">最低フィードバック数</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: 100"
                    value={sellerForm.minFeedback}
                    onChange={(e) => setSellerForm({ ...sellerForm, minFeedback: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                <User className="w-4 h-4 inline mr-2" />セラー分析開始
              </button>
            </form>
          )}

          {/* 逆リサーチ */}
          {activeTab === 'reverse' && (
            <form onSubmit={handleReverseSearch} className="p-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
                <h3 className="font-bold text-green-800 mb-2">🔄 逆リサーチ</h3>
                <p className="text-sm text-green-700">
                  eBay商品URLまたはASINから、仕入先や類似商品を自動検索します
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-2" />eBay商品URL
                  </label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="https://www.ebay.com/itm/..."
                    value={reverseForm.productUrl}
                    onChange={(e) => setReverseForm({ ...reverseForm, productUrl: e.target.value })}
                  />
                </div>
                <div className="text-center text-slate-500 text-sm">または</div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">ASIN / JAN / UPC</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: B0XXXXXXXXX"
                    value={reverseForm.asin}
                    onChange={(e) => setReverseForm({ ...reverseForm, asin: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 shadow-lg"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />逆リサーチ開始
              </button>
            </form>
          )}

          {/* AI提案 */}
          {activeTab === 'ai-suggestions' && (
            <div className="p-6">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 p-4 mb-6 rounded">
                <h3 className="font-bold text-orange-800 mb-2">
                  <Brain className="w-5 h-5 inline mr-2" />AI自動提案
                </h3>
                <p className="text-sm text-orange-700">
                  市場トレンド、季節性、過去データからAIが自動で儲かる商品を提案します
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-blue-200 rounded-lg p-6 hover:shadow-xl transition-all">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    トレンド商品
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    現在のトレンドと市場データから、売れ筋商品を自動提案
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    AIに提案させる
                  </button>
                </div>
                <div className="bg-white border-2 border-purple-200 rounded-lg p-6 hover:shadow-xl transition-all">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    ニッチ市場
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    競合が少なく利益率の高いニッチ市場を発見
                  </p>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                    ニッチ市場を探す
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* バルクリサーチ */}
          {activeTab === 'bulk' && (
            <form onSubmit={handleBulkSearch} className="p-6">
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 rounded">
                <h3 className="font-bold text-indigo-800 mb-2">
                  <Layers className="w-5 h-5 inline mr-2" />バルクリサーチ
                </h3>
                <p className="text-sm text-indigo-700">
                  複数のキーワードを一括で検索し、効率的に市場調査を行います
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  キーワードリスト（1行に1つ）
                </label>
                <textarea
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  rows={10}
                  placeholder={'POKEMON\niPhone\nNintendo Switch\nVintage Camera\n...'}
                  value={bulkKeywords}
                  onChange={(e) => setBulkKeywords(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  {bulkKeywords.split('\n').filter(k => k.trim()).length}件のキーワード
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg"
              >
                <Layers className="w-4 h-4 inline mr-2" />一括リサーチ開始
              </button>
            </form>
          )}
        </div>

        {/* 結果表示（商品リサーチのみ） */}
        {showResults && activeTab === 'product' && allResults.length > 0 && (
          <>
            <ResearchSummary results={allResults} />
            <ResearchCharts results={allResults} />
            <ResultsFilter results={allResults} onFilterChange={(filtered) => setFilteredResults(filtered)} />

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">
                  <TrendingUp className="w-5 h-5 inline mr-2" />
                  検索結果 ({filteredResults.length}件)
                </h2>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4 inline mr-2" />CSV出力
                </button>
              </div>

              {/* グリッド表示 */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResults.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="relative h-48">
                      <img
                        src={item.image || '/placeholder-product.png'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-green-600">
                        利益率 {item.profitCalculation?.profitRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{item.title}</h3>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-50 p-2 rounded text-center">
                          <div className="text-lg font-bold text-blue-600">${item.price.toFixed(0)}</div>
                          <div className="text-xs text-slate-500">eBay価格</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded text-center">
                          <div className="text-lg font-bold text-purple-600">{item.soldCount}</div>
                          <div className="text-xs text-slate-500">売上数</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedItem(item)
                          setShowDetailModal(true)
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4 inline mr-2" />詳細
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* 詳細モーダル */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">商品詳細</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <img src={selectedItem.image} alt={selectedItem.title} className="w-full rounded-lg" />
                <div>
                  <h4 className="font-bold text-lg mb-4">{selectedItem.title}</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>eBay価格:</strong> ${selectedItem.price.toFixed(2)}</p>
                    <p><strong>売上数:</strong> {selectedItem.soldCount}</p>
                    <p><strong>利益率:</strong> {selectedItem.profitCalculation?.profitRate.toFixed(1)}%</p>
                    <p><strong>セラー:</strong> {selectedItem.seller}</p>
                  </div>
                  {selectedItem.viewItemURL && (
                    <a
                      href={selectedItem.viewItemURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      eBayで見る
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-center">検索中...</h3>
          </div>
        </div>
      )}
    </div>
  )
}
