"use client"

import { useState, useCallback } from 'react'
import {
  Search, User, RefreshCw, Lightbulb, Layers, Download, FileText, Heart,
  ShoppingCart, Eye, TrendingUp, Shield, DollarSign, Zap, X,
  CheckCircle, AlertCircle, Upload
} from 'lucide-react'
import ResearchSummary from '@/components/research/ResearchSummary'
import ResearchCharts from '@/components/research/ResearchCharts'
import ResultsFilter from '@/components/research/ResultsFilter'
import ApiStatusBanner from '@/components/research/ApiStatusBanner'

// 型定義
interface SearchFormData {
  keyword: string
  category: string
  sellerCountry: string
  condition: string
  minPrice: string
  maxPrice: string
  minSold: string
  listingType: string // 追加
  period: string
  dataScope: string
  minProfitRate: string
  riskLevel: string
  duplicateFilter: string
}

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
type DisplayMode = 'grid' | 'table'

export default function EbayResearchPage() {
  const [activeTab, setActiveTab] = useState<TabType>('product')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingSteps, setLoadingSteps] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [allResults, setAllResults] = useState<ScoredProduct[]>([])
  const [filteredResults, setFilteredResults] = useState<ScoredProduct[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showResults, setShowResults] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ScoredProduct | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [apiStatus, setApiStatus] = useState<any>(null)

  const [productFormData, setProductFormData] = useState<SearchFormData>({
    keyword: '',
    category: '',
    sellerCountry: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    minSold: '1',
    listingType: '', // デフォルト: すべて
    period: '90',
    dataScope: '100',
    minProfitRate: '',
    riskLevel: '',
    duplicateFilter: 'all',
  })

  const categories = [
    { value: '', label: 'すべて' },
    { value: '293', label: 'Electronics' },
    { value: '11450', label: 'Clothing, Shoes & Accessories' },
    { value: '11700', label: 'Home & Garden' },
    { value: '220', label: 'Toys & Hobbies' },
    { value: '550', label: 'Art' },
    { value: '281', label: 'Jewelry & Watches' },
  ]

  const countries = [
    { value: '', label: 'すべて' },
    { value: 'JP', label: '🇯🇵 日本' },
    { value: 'US', label: '🇺🇸 アメリカ' },
    { value: 'CN', label: '🇨🇳 中国' },
    { value: 'GB', label: '🇬🇧 イギリス' },
  ]

  const conditions = [
    { value: '', label: 'すべて' },
    { value: 'New', label: '新品' },
    { value: 'Used', label: '中古' },
    { value: 'Refurbished', label: '整備済み' },
    { value: 'For parts or not working', label: '部品取り・動作不良' },
  ]

  const showLoadingWithSteps = (title: string, steps: string[]) => {
    setLoading(true)
    setLoadingMessage(title)
    setLoadingSteps([])
    setProgress(0)

    let currentStep = 0
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setLoadingSteps(prev => [...prev, steps[currentStep]])
        setProgress(((currentStep + 1) / steps.length) * 100)
        currentStep++
      } else {
        clearInterval(stepInterval)
      }
    }, 800)

    return () => clearInterval(stepInterval)
  }

  // 実際のeBay API呼び出し
  const searchEbayProducts = async (keyword: string, count: number): Promise<ScoredProduct[]> => {
    try {
      console.log('🔍 API呼び出し開始:', { keyword, count })
      
      const response = await fetch('/api/ebay/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keyword,
          categoryId: productFormData.category || undefined,
          condition: productFormData.condition || undefined,
          minPrice: productFormData.minPrice || undefined,
          maxPrice: productFormData.maxPrice || undefined,
          minSold: productFormData.minSold || '1',
          listingType: productFormData.listingType || undefined, // 追加
          entriesPerPage: count,
          sortOrder: 'BestMatch'
        })
      })

      console.log('📡 レスポンスステータス:', response.status)

      // 必ずJSONをパース（エラーレスポンスでも）
      const data = await response.json()
      console.log('📦 レスポンスデータ:', data)

      // レート制限エラー（429）の場合
      if (response.status === 429 || data.errorCode === '10001' || data.errorCode === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('⚠️ eBay APIのレート制限に達しました。\n\nキャッシュされたデータがない新しいキーワードの検索は、24時間後に再度お試しください。\n\n既に検索したキーワードは、キャッシュから即座に取得できます。')
      }

      // その他のエラー
      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'eBay API検索失敗'
        console.error('❌ エラー:', errorMsg)
        throw new Error(errorMsg)
      }

      // データが空の場合
      if (!data.items || data.items.length === 0) {
        console.warn('⚠️ 検索結果が0件です')
        throw new Error('検索結果が見つかりませんでした。\n\nキーワードを変更するか、フィルター条件を緩和してください。')
      }

      console.log('✅ 取得成功:', data.items.length, '件')

      // API状況を保存
      if (data.apiStatus) {
        setApiStatus(data.apiStatus)
      }

      // キャッシュ情報を表示
      if (data.cached) {
        console.log('🚀 キャッシュから取得（API呼び出しなし）')
      }

      // 取得したデータをスコアリング
      const scoredProducts: ScoredProduct[] = data.items.map((item: any, index: number) => {
        const price = item.price.value
        const japanPrice = price * 150 // 仮の日本価格（USD * 150 JPY）
        const profitRate = ((price - japanPrice) / japanPrice) * 100
        
        // スコア計算（簡易版）
        const soldScore = Math.min((item.soldCount / 50) * 100, 100)
        const priceScore = price > 50 && price < 1000 ? 80 : 60
        const sellerScore = item.seller.positiveFeedbackPercent || 70
        const totalScore = (soldScore * 0.4 + priceScore * 0.3 + sellerScore * 0.3)
        
        // リスクレベル計算
        let riskLevel: 'low' | 'medium' | 'high' = 'medium'
        if (item.seller.positiveFeedbackPercent > 95 && item.soldCount > 30) {
          riskLevel = 'low'
        } else if (item.seller.positiveFeedbackPercent < 90 || item.soldCount < 10) {
          riskLevel = 'high'
        }

        return {
          id: `ebay-${item.itemId}`,
          ebayItemId: item.itemId,
          title: item.title,
          titleJP: `${item.title}`, // TODO: 翻訳API統合
          price: price,
          japanPrice: japanPrice,
          soldCount: item.soldCount,
          competitorCount: Math.floor(Math.random() * 50) + 1, // TODO: 実際の競合数取得
          totalScore: totalScore,
          profitCalculation: {
            isBlackInk: profitRate > 0,
            profitRate: Math.abs(profitRate),
            netProfit: price - japanPrice
          },
          riskLevel: riskLevel,
          category: item.category.name,
          condition: item.condition.name,
          image: item.image,
          seller: item.seller.username,
          sellerCountry: item.location.country,
          viewItemURL: item.viewItemURL
        }
      })

      return scoredProducts.sort((a, b) => b.totalScore - a.totalScore)
    } catch (error) {
      console.error('❌ searchEbayProducts エラー:', error)
      throw error
    }
  }

  const handleProductSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFormData.keyword) {
      alert('キーワードを入力してください')
      return
    }

    const steps = [
      'eBay Finding API接続中...',
      '部分一致検索実行中...',
      '商品データ取得中...',
      '画像URL取得中...',
      'コンディション情報取得中...',
      'スコアリング計算中...',
      '結果生成中...'
    ]
    const clearSteps = showLoadingWithSteps('eBay商品データを検索中...', steps)

    try {
      const results = await searchEbayProducts(
        productFormData.keyword,
        parseInt(productFormData.dataScope) || 100
      )
      
      setAllResults(results)
      setFilteredResults(results)
      clearSteps()
      
      setTimeout(() => {
        setLoading(false)
        if (results.length > 0) {
          setShowResults(true)
        } else {
          alert('検索結果が見つかりませんでした。キーワードを変更して再度お試しください。')
        }
      }, 500)
    } catch (error) {
      clearSteps()
      setLoading(false)
      console.error('検索エラー:', error)
    }
  }

  const handleFilterChange = (filtered: ScoredProduct[], page: number, total: number) => {
    setFilteredResults(filtered)
    setCurrentPage(page)
    setTotalPages(total)
  }

  const handleReset = () => {
    setProductFormData({
      keyword: '',
      category: '',
      sellerCountry: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
      minSold: '',
      period: '90',
      dataScope: '200',
      minProfitRate: '',
      riskLevel: '',
      duplicateFilter: 'all',
    })
  }

  const viewDetails = (item: ScoredProduct) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === filteredResults.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredResults.map(r => r.id))
    }
  }

  const exportToCSV = () => {
    const selected = allResults.filter(r => selectedIds.includes(r.id))
    if (selected.length === 0) {
      alert('エクスポートする商品を選択してください')
      return
    }

    const headers = [
      'ID', 'eBay Item ID', 'タイトル', 'eBay価格', '国内価格', '売上数',
      '競合数', 'スコア', '利益率', '純利益', 'リスク', 'コンディション',
      'カテゴリ', 'セラー', '画像URL', 'eBay URL'
    ]
    
    const rows = selected.map(item => [
      item.id,
      item.ebayItemId,
      `"${item.title}"`,
      item.price,
      item.japanPrice,
      item.soldCount,
      item.competitorCount,
      item.totalScore.toFixed(1),
      item.profitCalculation?.profitRate.toFixed(1) || '',
      item.profitCalculation?.netProfit.toFixed(0) || '',
      item.riskLevel,
      item.condition || '',
      item.category || '',
      item.seller || '',
      item.image || '',
      item.viewItemURL || ''
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ebay_research_${new Date().getTime()}.csv`
    link.click()
    alert(`${selected.length}件をCSVエクスポートしました`)
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
          <p className="text-blue-100">実際のeBay APIと完全統合 - スコアリング・グラフ・フィルタリング</p>
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

          {/* 商品リサーチフォーム */}
          {activeTab === 'product' && (
            <form onSubmit={handleProductSearch} className="p-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                <h3 className="font-bold text-blue-800 mb-2">💡 部分一致検索について</h3>
                <p className="text-sm text-blue-700">
                  「POKEMON」と入力すると「POKEMON #101」「POKEMON #181」など、POKEMONを含む全ての商品が表示されます。
                  関連度の高い商品から順に表示されます。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    検索キーワード（部分一致）
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: POKEMON, iPhone, Nintendo..."
                    value={productFormData.keyword}
                    onChange={(e) => setProductFormData({ ...productFormData, keyword: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">カテゴリー</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">コンディション</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productFormData.condition}
                    onChange={(e) => setProductFormData({ ...productFormData, condition: e.target.value })}
                  >
                    {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">💰 リスティングタイプ</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productFormData.listingType}
                    onChange={(e) => setProductFormData({ ...productFormData, listingType: e.target.value })}
                  >
                    <option value="">🔍 すべて</option>
                    <option value="FixedPrice">💵 即決価格 (Buy It Now)</option>
                    <option value="Auction">🔨 オークション</option>
                    <option value="AuctionWithBIN">🔨+💵 オークション+即決</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    ※ リスティングタイプはAPI側でフィルタリングされます
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">データ取得範囲</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productFormData.dataScope}
                    onChange={(e) => setProductFormData({ ...productFormData, dataScope: e.target.value })}
                  >
                    <option value="50">50件 (API 1回)</option>
                    <option value="100">100件 (API 1回) ← 推奨</option>
                    <option value="200">200件 (API 2回)</option>
                    <option value="500">500件 (API 5回)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    ※ API消費回数を考慮して選択してください
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">最低価格 ($)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: 10"
                    value={productFormData.minPrice}
                    onChange={(e) => setProductFormData({ ...productFormData, minPrice: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">最高価格 ($)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例: 1000"
                    value={productFormData.maxPrice}
                    onChange={(e) => setProductFormData({ ...productFormData, maxPrice: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">📊 売上数フィルター</label>
                  <select
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={productFormData.minSold}
                    onChange={(e) => setProductFormData({ ...productFormData, minSold: e.target.value })}
                  >
                    <option value="1">✅ 売上数あり（sold ≥ 1）のみ</option>
                    <option value="0">🔍 すべて（売上0も含む）</option>
                    <option value="5">🔥 売上5以上</option>
                    <option value="10">⭐ 売上10以上</option>
                    <option value="20">📈 売上20以上</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    ※ 売上数フィルターはAPI側で適用され、効率的にデータを取得します
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  リセット
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  {loading ? '検索中...' : '商品検索開始'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* API使用状況バナー */}
        {apiStatus && <ApiStatusBanner apiStatus={apiStatus} />}

        {/* 結果表示 */}
        {showResults && allResults.length > 0 && (
          <>
            <ResearchSummary results={allResults} />
            <ResearchCharts results={allResults} />
            <ResultsFilter
              results={allResults}
              onFilterChange={handleFilterChange}
            />

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-slate-50 border-b p-4 flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  検索結果 ({filteredResults.length}件)
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <div className="bg-white rounded-lg overflow-hidden border-2 border-slate-200">
                    <button
                      className={`px-4 py-2 text-sm font-medium ${
                        displayMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      onClick={() => setDisplayMode('grid')}
                    >
                      カード
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium ${
                        displayMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      onClick={() => setDisplayMode('table')}
                    >
                      テーブル
                    </button>
                  </div>
                  <button
                    onClick={exportToCSV}
                    disabled={selectedIds.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    CSV出力 ({selectedIds.length}件選択)
                  </button>
                </div>
              </div>

              {displayMode === 'grid' && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResults.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:shadow-xl hover:border-blue-500 transition-all"
                    >
                      <div className="relative h-48">
                        <img
                          src={item.image || '/placeholder-product.png'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = '/placeholder-product.png'
                          }}
                        />
                        <div
                          className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-semibold text-white ${
                            (item.profitCalculation?.profitRate || 0) > 30
                              ? 'bg-green-600'
                              : (item.profitCalculation?.profitRate || 0) > 15
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                        >
                          利益率 {item.profitCalculation?.profitRate.toFixed(1)}%
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="absolute top-2 left-2 w-5 h-5"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2 h-12">{item.title}</h3>
                        <p className="text-xs text-slate-500 mb-2">コンディション: {item.condition}</p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {[
                            { value: `$${item.price.toFixed(0)}`, label: 'eBay価格', color: 'blue' },
                            { value: `¥${Math.round(item.japanPrice)}`, label: '国内価格', color: 'green' },
                            { value: item.soldCount, label: '売上数', color: 'purple' },
                            { value: item.totalScore.toFixed(0), label: 'スコア', color: 'orange' },
                          ].map((stat, i) => (
                            <div key={i} className="bg-slate-50 p-2 rounded text-center">
                              <div className={`text-lg font-bold text-${stat.color}-600`}>{stat.value}</div>
                              <div className="text-xs text-slate-500">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              item.riskLevel === 'low'
                                ? 'bg-green-500'
                                : item.riskLevel === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          />
                          <span className="text-sm text-slate-600">
                            リスク: {item.riskLevel === 'low' ? '低' : item.riskLevel === 'medium' ? '中' : '高'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewDetails(item)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            詳細
                          </button>
                          <button className="px-3 py-2 bg-pink-600 text-white rounded text-sm font-medium hover:bg-pink-700">
                            <Heart className="w-4 h-4" />
                          </button>
                          <button className="px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700">
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {displayMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b-2 border-slate-300">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input type="checkbox" onChange={selectAll} checked={selectedIds.length === filteredResults.length && filteredResults.length > 0} />
                        </th>
                        {['画像', '商品名', 'EBAY価格', '国内価格', '売上数', '利益率', 'リスク', '操作'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredResults.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                          </td>
                          <td className="px-4 py-3">
                            <img src={item.image || '/placeholder-product.png'} alt={item.title} className="w-16 h-16 object-cover rounded" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 max-w-xs truncate">{item.title}</div>
                            <div className="text-xs text-slate-500">{item.condition}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">${item.price.toFixed(0)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">¥{Math.round(item.japanPrice)}</td>
                          <td className="px-4 py-3 text-sm">{item.soldCount}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${
                                (item.profitCalculation?.profitRate || 0) > 30
                                  ? 'bg-green-600'
                                  : (item.profitCalculation?.profitRate || 0) > 15
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                            >
                              {item.profitCalculation?.profitRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  item.riskLevel === 'low' ? 'bg-green-500' : item.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                              />
                              <span className="text-sm">{item.riskLevel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => viewDetails(item)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              詳細
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ローディングモーダル */}
      {loading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-center mb-2">eBay API検索中...</h3>
            <p className="text-center text-slate-600 mb-4">{loadingMessage}</p>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-sm text-slate-500 mt-2">{progress.toFixed(0)}%</p>
            {loadingSteps.length > 0 && (
              <div className="mt-4 space-y-2">
                {loadingSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">商品詳細分析</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <img src={selectedItem.image || '/placeholder-product.png'} alt={selectedItem.title} className="w-full rounded-lg" />
                  {selectedItem.viewItemURL && (
                    <a
                      href={selectedItem.viewItemURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      eBayで見る
                    </a>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">基本情報</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      ['商品名', selectedItem.title],
                      ['eBay Item ID', selectedItem.ebayItemId],
                      ['カテゴリ', selectedItem.category],
                      ['コンディション', selectedItem.condition],
                      ['eBay価格', `$${selectedItem.price.toFixed(2)}`],
                      ['国内価格（概算）', `¥${Math.round(selectedItem.japanPrice)}`],
                      ['利益率', `${selectedItem.profitCalculation?.profitRate.toFixed(1)}%`],
                      ['純利益', `$${selectedItem.profitCalculation?.netProfit.toFixed(2)}`],
                      ['売上数', selectedItem.soldCount],
                      ['スコア', selectedItem.totalScore.toFixed(1)],
                      ['リスクレベル', selectedItem.riskLevel],
                      ['セラー', selectedItem.seller],
                      ['セラー国', selectedItem.sellerCountry],
                    ].map(([label, value]) => (
                      <p key={label as string}>
                        <strong className="text-slate-700">{label}:</strong> <span className="text-slate-900">{value}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h4 className="font-bold text-blue-800 mb-2">💡 次のステップ</h4>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>日本国内の仕入先を検索（Amazon、楽天、メルカリ等）</li>
                  <li>DDP計算で正確な利益率を算出</li>
                  <li>リスク要因を詳細分析</li>
                  <li>出品戦略を立案</li>
                </ul>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3 justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">
                閉じる
              </button>
              <button className="px-6 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                お気に入り追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
