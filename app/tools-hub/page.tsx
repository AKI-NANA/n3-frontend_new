'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Calculator,
  Package,
  TrendingUp,
  Database,
  ShoppingCart,
  BarChart3,
  FileText,
  Settings,
  Zap,
  DollarSign,
  Box,
  Layers,
  Brain,
  Target,
  ChevronRight,
  Sparkles,
  Filter,
  CheckCircle,
  Edit3,
  Upload,
  Warehouse,
  AlertCircle,
  GitBranch,
  Globe,
  Truck,
  Tags,
  Calendar,
  ArrowRight,
  Code
} from 'lucide-react'

interface Tool {
  id: string
  name: string
  description: string
  category: 'research' | 'data-editing' | 'pricing' | 'approval' | 'listing' | 'inventory' | 'management'
  icon: React.ElementType
  path: string
  status: 'active' | 'beta' | 'new' | 'coming-soon'
  features: string[]
  color: string
  order: number // ワークフロー順序
}

const tools: Tool[] = [
  // ========== ワークフローSTEP 1: リサーチ ==========
  {
    id: 'ebay-research',
    name: 'eBay AI リサーチツール',
    description: 'AI搭載の次世代リサーチツール。競合分析、市場調査、仕入判断を自動化してスコアリング',
    category: 'research',
    icon: Brain,
    path: '/research/ebay-research',
    status: 'new',
    features: ['AI分析', '競合価格調査', '販売速度分析', 'スコアリング', 'DB連携'],
    color: 'from-purple-500 to-indigo-600',
    order: 1
  },
  
  // ========== ワークフローSTEP 2: データ編集（中心点）==========
  {
    id: 'data-editing',
    name: '📊 データ編集・管理',
    description: '【中心機能】スクレイピングデータの確認・編集。モーダルで商品詳細を表示し、個別編集や一括操作が可能',
    category: 'data-editing',
    icon: Edit3,
    path: '/tools/editing',
    status: 'active',
    features: ['モーダル表示', '個別編集', 'CSV読取', 'AI解析', '次ステップ連携'],
    color: 'from-orange-500 to-red-600',
    order: 2
  },
  {
    id: 'data-collection',
    name: 'データ取得・スクレイピング',
    description: 'Yahoo!オークションなどから商品情報を自動取得',
    category: 'data-editing',
    icon: Database,
    path: '/data-collection',
    status: 'active',
    features: ['高速取得', 'データ正規化', 'API統合', 'スケジュール実行'],
    color: 'from-cyan-500 to-blue-600',
    order: 3
  },
  
  // ========== ワークフローSTEP 3: 価格計算 ==========
  {
    id: 'ebay-pricing',
    name: 'eBay DDP/DDU 価格計算',
    description: 'USA向けDDP配送の精密価格計算。関税、送料、利益率を自動算出',
    category: 'pricing',
    icon: Calculator,
    path: '/ebay-pricing',
    status: 'active',
    features: ['DDP計算', '関税自動算出', '利益率シミュレーション', '36ポリシー対応'],
    color: 'from-green-500 to-emerald-600',
    order: 4
  },
  {
    id: 'shipping-calculator',
    name: '配送料金計算・ポリシー管理',
    description: '配送方法別の料金比較と最適ルート提案、ポリシー自動選択',
    category: 'pricing',
    icon: Truck,
    path: '/shipping-calculator',
    status: 'active',
    features: ['マルチキャリア対応', '重量帯別計算', 'ゾーン別料金', 'ポリシー管理'],
    color: 'from-blue-500 to-indigo-600',
    order: 5
  },
  {
    id: 'profit-calculator',
    name: '多国籍利益計算',
    description: 'eBay/Shopee7カ国の高精度利益計算・最適化',
    category: 'pricing',
    icon: DollarSign,
    path: '/tools/profit-calculator',
    status: 'new',
    features: ['段階手数料', 'DDP/DDU', 'Shopee7カ国', '為替自動更新'],
    color: 'from-emerald-500 to-teal-600',
    order: 6
  },
  
  // ========== ワークフローSTEP 4: フィルター・承認 ==========
  {
    id: 'filter-approval',
    name: 'フィルター・商品承認',
    description: '出品可否判定フィルターと人間による最終承認。条件に基づく自動フィルタリング',
    category: 'approval',
    icon: Filter,
    path: '/tools/approval',
    status: 'active',
    features: ['条件フィルタ', '一括承認', '個別審査', '履歴管理', '自動判定'],
    color: 'from-yellow-500 to-orange-600',
    order: 7
  },
  
  // ========== ワークフローSTEP 5: 出品管理 ==========
  {
    id: 'html-editor',
    name: 'HTMLテンプレート編集',
    description: '商品説明用HTMLテンプレートの作成・編集・プレビュー。変数システムで一括適用可能',
    category: 'listing',
    icon: Code,
    path: '/tools/html-editor',
    status: 'new',
    features: ['テンプレート作成', '変数システム', 'プレビュー', '一括適用', 'DB保存'],
    color: 'from-purple-500 to-indigo-600',
    order: 7.5
  },
  {
    id: 'bulk-listing',
    name: '一括出品ツール',
    description: 'CSV/Excelから一括出品。承認済み商品の自動出品',
    category: 'listing',
    icon: Upload,
    path: '/bulk-listing',
    status: 'active',
    features: ['CSV対応', 'テンプレート', '画像一括アップロード', '予約出品', '自動出品'],
    color: 'from-pink-500 to-rose-600',
    order: 8
  },
  {
    id: 'listing-management',
    name: '出品管理ダッシュボード',
    description: '全出品の一元管理。在庫・価格・ステータスをリアルタイム監視',
    category: 'listing',
    icon: ShoppingCart,
    path: '/listing-management',
    status: 'active',
    features: ['在庫管理', '価格自動調整', 'ステータス監視', 'アラート機能'],
    color: 'from-indigo-500 to-purple-600',
    order: 9
  },
  {
    id: 'listing-scheduler',
    name: '出品スケジューラー',
    description: '時間指定での自動出品、再出品管理',
    category: 'listing',
    icon: Calendar,
    path: '/listing-management',
    status: 'active',
    features: ['予約出品', '自動再出品', 'タイムゾーン対応', 'カレンダー表示'],
    color: 'from-violet-500 to-purple-600',
    order: 10
  },
  
  // ========== ワークフローSTEP 6: 在庫管理 ==========
  {
    id: 'inventory',
    name: '在庫管理システム',
    description: '出品後の在庫追跡、補充アラート、在庫最適化',
    category: 'inventory',
    icon: Warehouse,
    path: '/inventory',
    status: 'active',
    features: ['在庫追跡', '補充アラート', '在庫最適化', 'マルチ倉庫対応'],
    color: 'from-slate-500 to-gray-600',
    order: 11
  },
  {
    id: 'inventory-monitoring',
    name: '在庫監視・分析',
    description: '在庫回転率、売れ筋分析、デッドストック検出',
    category: 'inventory',
    icon: BarChart3,
    path: '/inventory-monitoring',
    status: 'active',
    features: ['回転率分析', '売れ筋検出', 'デッドストック警告', 'レポート生成'],
    color: 'from-teal-500 to-cyan-600',
    order: 12
  },
  
  // ========== マスター管理・分析 ==========
  {
    id: 'category-management',
    name: 'カテゴリ管理',
    description: 'eBayカテゴリマスタの管理と自動マッピング',
    category: 'management',
    icon: Tags,
    path: '/category-management',
    status: 'active',
    features: ['カテゴリマッピング', '手数料管理', '自動提案', '一括更新'],
    color: 'from-amber-500 to-orange-600',
    order: 13
  },
  {
    id: 'database-map',
    name: 'データベース構造マップ',
    description: 'Supabaseテーブル構造の可視化とデータ分析',
    category: 'management',
    icon: Database,
    path: '/ebay-pricing?tab=db-map',
    status: 'new',
    features: ['テーブル可視化', 'データ統計', 'リレーション表示', 'SQL実行'],
    color: 'from-violet-500 to-purple-600',
    order: 14
  },
  {
    id: 'profit-analysis',
    name: '利益分析ダッシュボード',
    description: '売上・利益・コストの詳細分析とレポート生成',
    category: 'management',
    icon: TrendingUp,
    path: '/dashboard',
    status: 'active',
    features: ['売上分析', '利益率計算', 'コスト追跡', 'レポート出力'],
    color: 'from-blue-500 to-indigo-600',
    order: 15
  },
  {
    id: 'master-data',
    name: 'マスターデータ管理',
    description: 'HTSコード、関税率、為替レートなどの基本データ管理',
    category: 'management',
    icon: Settings,
    path: '/ebay-pricing',
    status: 'active',
    features: ['HTSコード管理', '関税率設定', '為替レート', '配送ポリシー'],
    color: 'from-gray-500 to-slate-600',
    order: 16
  },
]

const categories = [
  { id: 'all', name: '全て', icon: Sparkles, color: 'text-purple-600' },
  { id: 'research', name: 'リサーチ', icon: Search, color: 'text-cyan-600' },
  { id: 'data-editing', name: 'データ編集', icon: Edit3, color: 'text-orange-600' },
  { id: 'pricing', name: '価格計算', icon: DollarSign, color: 'text-green-600' },
  { id: 'approval', name: 'フィルター・承認', icon: CheckCircle, color: 'text-yellow-600' },
  { id: 'listing', name: '出品管理', icon: Upload, color: 'text-pink-600' },
  { id: 'inventory', name: '在庫管理', icon: Warehouse, color: 'text-slate-600' },
  { id: 'management', name: 'マスター管理', icon: Database, color: 'text-gray-600' }
]

export default function ToolsHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTools = tools
    .filter(tool => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
      const matchesSearch = searchQuery === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesCategory && matchesSearch
    })
    .sort((a, b) => a.order - b.order) // ワークフロー順にソート

  const getStatusBadge = (status: Tool['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-300',
      beta: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      new: 'bg-blue-100 text-blue-800 border-blue-300',
      'coming-soon': 'bg-gray-100 text-gray-600 border-gray-300'
    }
    
    const labels = {
      active: '稼働中',
      beta: 'ベータ',
      new: '新規',
      'coming-soon': '近日公開'
    }
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-10 h-10" />
            <h1 className="text-4xl font-bold">ツールハブ</h1>
          </div>
          <p className="text-xl text-blue-100 mb-2">
            リサーチから在庫管理まで、完全自動連携ワークフロー
          </p>
          <p className="text-sm text-blue-200">
            中心は「データ編集」。ここから全てのツールが連携します
          </p>
          
          {/* 統計情報 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">{tools.length}</div>
              <div className="text-sm text-blue-100">利用可能ツール</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">
                {tools.filter(t => t.status === 'active').length}
              </div>
              <div className="text-sm text-blue-100">稼働中</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">
                {tools.filter(t => t.status === 'new').length}
              </div>
              <div className="text-sm text-blue-100">新規追加</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-blue-100">自動連携率</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 検索・フィルター */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 検索ボックス */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ツール名や機能で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* カテゴリフィルター */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map(category => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all
                      ${selectedCategory === category.id
                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {category.name}
                    {category.id !== 'all' && (
                      <span className="ml-1 text-xs opacity-75">
                        ({tools.filter(t => t.category === category.id).length})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ワークフローフロー図 */}
        <div className="bg-gradient-to-r from-orange-50 via-yellow-50 to-red-50 rounded-xl p-8 mb-8 border-2 border-orange-200">
          <div className="flex items-start gap-4 mb-6">
            <GitBranch className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                完全自動連携ワークフロー
              </h3>
              <p className="text-gray-600">
                各ツールは自動で連携し、データ編集を中心に全工程が流れます
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-purple-200">
              <Brain className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-xs text-gray-500">STEP 1</div>
                <div className="font-bold text-sm">リサーチ</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-lg shadow-lg border-2 border-orange-300">
              <Edit3 className="w-5 h-5" />
              <div>
                <div className="text-xs opacity-90">STEP 2 【中心】</div>
                <div className="font-bold text-sm">データ編集</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-green-200">
              <Calculator className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xs text-gray-500">STEP 3</div>
                <div className="font-bold text-sm">価格計算</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-yellow-200">
              <Filter className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-xs text-gray-500">STEP 4</div>
                <div className="font-bold text-sm">フィルター・承認</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-pink-200">
              <Upload className="w-5 h-5 text-pink-600" />
              <div>
                <div className="text-xs text-gray-500">STEP 5</div>
                <div className="font-bold text-sm">自動出品</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-slate-200">
              <Warehouse className="w-5 h-5 text-slate-600" />
              <div>
                <div className="text-xs text-gray-500">STEP 6</div>
                <div className="font-bold text-sm">在庫管理</div>
              </div>
            </div>
          </div>
        </div>

        {/* ツール一覧 */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600">該当するツールが見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => {
              const Icon = tool.icon
              const isCenter = tool.id === 'data-editing'
              
              return (
                <Link
                  key={tool.id}
                  href={tool.path}
                  className={`group block bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 ${isCenter ? 'ring-4 ring-orange-400' : ''}`}
                >
                  {/* カードヘッダー */}
                  <div className={`bg-gradient-to-r ${tool.color} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                      <Icon className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="w-10 h-10" />
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(tool.status)}
                          {isCenter && (
                            <span className="px-2 py-0.5 bg-white text-orange-600 rounded-full text-xs font-bold">
                              中心機能
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-1">{tool.name}</h3>
                      <div className="text-xs opacity-90">ワークフロー順序: {tool.order}</div>
                    </div>
                  </div>

                  {/* カードコンテンツ */}
                  <div className="p-6">
                    <p className="text-gray-600 mb-4 text-sm line-clamp-3">
                      {tool.description}
                    </p>

                    {/* 機能タグ */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tool.features.slice(0, 3).map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                      {tool.features.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                          +{tool.features.length - 3}
                        </span>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        {categories.find(c => c.id === tool.category)?.name}
                      </span>
                      <div className="flex items-center gap-2 text-indigo-600 font-semibold group-hover:gap-3 transition-all">
                        ツールを開く
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
