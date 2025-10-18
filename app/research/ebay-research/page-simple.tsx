"use client"

import { useState } from 'react'
import { Search, TrendingUp, Zap, Download, Eye, Heart, ShoppingCart, X, Award, Sliders, ChevronDown } from 'lucide-react'

// 簡易版 - スコアリング機能統合
export default function EbayResearchPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showScoring, setShowScoring] = useState(false)
  
  // スコアリング重み
  const [weights, setWeights] = useState({
    profit: 30,
    sales: 20,
    competition: 15,
    risk: 25,
    trend: 10
  })

  const handleSearch = async () => {
    if (!keyword) {
      alert('キーワードを入力してください')
      return
    }

    setLoading(true)
    
    // サンプルデータ生成（スコア付き）
    setTimeout(() => {
      const sampleData = Array.from({ length: 20 }, (_, i) => {
        const price = Math.random() * 1000 + 100
        const japanPrice = price * (0.6 + Math.random() * 0.2)
        const profitRate = ((price - japanPrice) / japanPrice) * 100
        const soldCount = Math.floor(Math.random() * 100) + 1
        const competitorCount = Math.floor(Math.random() * 50) + 1
        
        // スコア計算
        const profitScore = Math.min(100, (profitRate / 30) * 100)
        const salesScore = Math.min(100, (soldCount / 100) * 100)
        const compScore = Math.max(0, 100 - (competitorCount / 50) * 100)
        const riskScore = Math.random() * 100
        const trendScore = Math.random() * 100
        
        const totalScore = (
          profitScore * (weights.profit / 100) +
          salesScore * (weights.sales / 100) +
          compScore * (weights.competition / 100) +
          riskScore * (weights.risk / 100) +
          trendScore * (weights.trend / 100)
        )
        
        return {
          id: i + 1,
          title: `${keyword} Sample Product #${i + 1}`,
          price: price.toFixed(2),
          japanPrice: japanPrice.toFixed(0),
          profitRate: profitRate.toFixed(1),
          soldCount,
          competitorCount,
          totalScore: totalScore.toFixed(1),
          rank: 0,
          profitScore: profitScore.toFixed(0),
          salesScore: salesScore.toFixed(0),
          compScore: compScore.toFixed(0),
          riskScore: riskScore.toFixed(0),
          trendScore: trendScore.toFixed(0),
          image: `https://via.placeholder.com/300x200/3b82f6/ffffff?text=Product+${i+1}`
        }
      })
      
      // スコア順にソート
      const sorted = sampleData.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore))
      sorted.forEach((item, index) => {
        item.rank = index + 1
      })
      
      setResults(sorted)
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-8 px-6 shadow-lg">
        <div className="container mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm mb-4">
            <Zap className="w-4 h-4" />AI搭載 - スコアリング機能統合版
          </div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10" />eBay AI Research Tool
          </h1>
          <p className="text-blue-100">スコアリング機能でランク付けされた商品リサーチ</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* スコアリング設定パネル */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex justify-between items-center cursor-pointer"
            onClick={() => setShowScoring(!showScoring)}
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-bold">スコアリング設定</h3>
                <p className="text-sm text-purple-100">商品の評価基準をカスタマイズ</p>
              </div>
            </div>
            <ChevronDown className={`w-6 h-6 transition-transform ${showScoring ? 'rotate-180' : ''}`} />
          </div>
          
          {showScoring && (
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { key: 'profit', label: '💰 利益率重視度', color: 'bg-green-500' },
                  { key: 'sales', label: '🛒 売上数重視度', color: 'bg-blue-500' },
                  { key: 'competition', label: '👥 競合状況重視度', color: 'bg-purple-500' },
                  { key: 'risk', label: '🛡️ リスク回避度', color: 'bg-red-500' },
                  { key: 'trend', label: '⚡ トレンド重視度', color: 'bg-orange-500' },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{item.label}</span>
                      <span className="font-bold text-blue-600">{weights[item.key as keyof typeof weights]}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={weights[item.key as keyof typeof weights]}
                      onChange={(e) => setWeights({ ...weights, [item.key]: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">合計</span>
                  <span className="text-2xl font-bold text-green-600">
                    {Object.values(weights).reduce((sum, val) => sum + val, 0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 検索フォーム */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="商品名、ブランド、モデル名を入力..."
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
              {loading ? '検索中...' : '商品検索'}
            </button>
          </div>
        </div>

        {/* 結果表示 */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-slate-50 border-b p-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                検索結果 ({results.length}件) - スコア順
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:shadow-xl hover:border-blue-500 transition-all"
                >
                  {/* スコアバッジ */}
                  <div className="relative h-48">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    {item.rank <= 3 && (
                      <div className="absolute top-2 left-2 p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {/* スコア表示 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Award className={`w-5 h-5 ${
                          parseFloat(item.totalScore) >= 80 ? 'text-yellow-500' :
                          parseFloat(item.totalScore) >= 60 ? 'text-blue-500' : 'text-slate-400'
                        }`} />
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{item.totalScore}</div>
                          <div className="text-xs text-slate-500">総合スコア</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-700">
                          ランク #{item.rank}
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-800 mb-3 line-clamp-2">{item.title}</h3>

                    {/* スコア内訳 */}
                    <div className="mb-3 space-y-1">
                      <div className="text-xs font-semibold text-slate-600 mb-1">スコア内訳</div>
                      {[
                        { label: '利益率', value: item.profitScore, color: 'bg-green-500' },
                        { label: '売上', value: item.salesScore, color: 'bg-blue-500' },
                        { label: '競合', value: item.compScore, color: 'bg-purple-500' },
                        { label: 'リスク', value: item.riskScore, color: 'bg-red-500' },
                      ].map((bar) => (
                        <div key={bar.label} className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-12">{bar.label}</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${bar.color}`}
                              style={{ width: `${bar.value}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{bar.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* 統計 */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-blue-600">${item.price}</div>
                        <div className="text-xs text-slate-500">eBay価格</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-green-600">¥{item.japanPrice}</div>
                        <div className="text-xs text-slate-500">国内価格</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-purple-600">{item.soldCount}</div>
                        <div className="text-xs text-slate-500">売上数</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-green-600">{item.profitRate}%</div>
                        <div className="text-xs text-slate-500">利益率</div>
                      </div>
                    </div>

                    {/* ボタン */}
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
                        <Eye className="w-4 h-4" />詳細
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
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-center mb-2">スコアリング実行中...</h3>
              <p className="text-center text-slate-600">商品を分析してスコアを計算しています</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
