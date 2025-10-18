'use client'

import React, { useState, useEffect } from 'react'
import { Database, Table, FileText, Globe, Package, DollarSign, ChevronRight, ChevronDown, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TableInfo {
  name: string
  count: number
  columns: string[]
  category: string
  description: string
  sampleData?: any[]
}

export function DatabaseStructureMap() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadDatabaseStructure()
  }, [])

  const loadDatabaseStructure = async () => {
    setLoading(true)
    
    // 主要テーブルの情報を取得
    const tableDefinitions = [
      // HTSコード・関税関連
      {
        name: 'hs_codes',
        category: 'HTS・関税',
        description: 'HTSコード基本情報（基本関税率、Section 301）',
        icon: FileText
      },
      {
        name: 'hts_codes_details',
        category: 'HTS・関税',
        description: 'HTSコード詳細（28,881件の完全データ）',
        icon: FileText
      },
      {
        name: 'hts_codes_headings',
        category: 'HTS・関税',
        description: 'HTSコード見出し（1,022件）',
        icon: FileText
      },
      {
        name: 'hts_codes_subheadings',
        category: 'HTS・関税',
        description: 'HTSコード小見出し（4,398件）',
        icon: FileText
      },
      {
        name: 'country_additional_tariffs',
        category: 'HTS・関税',
        description: '原産国別追加関税（トランプ相互関税2025）',
        icon: Globe
      },
      {
        name: 'hts_country_rates',
        category: 'HTS・関税',
        description: '国別HTS関税率',
        icon: FileText
      },
      {
        name: 'hts_tariff_rates',
        category: 'HTS・関税',
        description: 'HTS関税率詳細',
        icon: FileText
      },
      
      // 配送関連
      {
        name: 'usa_ddp_rates',
        category: '配送・送料',
        description: 'USA DDP配送料金マトリックス（重量×価格）',
        icon: Package
      },
      {
        name: 'ebay_shipping_policies',
        category: '配送・送料',
        description: 'eBay配送ポリシー',
        icon: Package
      },
      {
        name: 'shipping_country_zones',
        category: '配送・送料',
        description: '配送国ゾーン設定',
        icon: Globe
      },
      
      // eBay関連
      {
        name: 'ebay_categories',
        category: 'eBay',
        description: 'eBayカテゴリマスタ（17000件）',
        icon: Table
      },
      {
        name: 'ebay_category_fees',
        category: 'eBay',
        description: 'eBayカテゴリ別手数料（FVF）',
        icon: DollarSign
      },
      
      // その他
      {
        name: 'origin_countries',
        category: '原産国',
        description: '原産国マスタ',
        icon: Globe
      },
      {
        name: 'hts_countries',
        category: '原産国',
        description: 'HTS対象国リスト',
        icon: Globe
      },
      {
        name: 'profit_margins',
        category: '設定',
        description: '利益率設定',
        icon: DollarSign
      },
      {
        name: 'exchange_rates',
        category: '設定',
        description: '為替レート',
        icon: DollarSign
      }
    ]

    const tableInfoPromises = tableDefinitions.map(async (def) => {
      try {
        // テーブルの件数を取得
        const { count, error: countError } = await supabase
          .from(def.name)
          .select('*', { count: 'exact', head: true })

        if (countError) {
          console.warn(`テーブル ${def.name} の件数取得エラー:`, countError)
          return null
        }

        // サンプルデータを取得
        const { data: sampleData, error: sampleError } = await supabase
          .from(def.name)
          .select('*')
          .limit(3)

        // カラム名を取得
        const columns = sampleData && sampleData.length > 0 
          ? Object.keys(sampleData[0]) 
          : []

        return {
          name: def.name,
          count: count || 0,
          columns,
          category: def.category,
          description: def.description,
          sampleData: sampleData || []
        }
      } catch (error) {
        console.error(`テーブル ${def.name} の取得エラー:`, error)
        return null
      }
    })

    const results = await Promise.all(tableInfoPromises)
    const validTables = results.filter((t): t is TableInfo => t !== null)
    
    setTables(validTables)
    setLoading(false)
  }

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tableName)) {
        newSet.delete(tableName)
      } else {
        newSet.add(tableName)
      }
      return newSet
    })
  }

  const categories = ['all', ...Array.from(new Set(tables.map(t => t.category)))]
  
  const filteredTables = tables.filter(table => {
    const matchesSearch = searchQuery === '' || 
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || table.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'HTS・関税': return 'bg-purple-100 text-purple-700 border-purple-300'
      case '配送・送料': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'eBay': return 'bg-green-100 text-green-700 border-green-300'
      case '原産国': return 'bg-orange-100 text-orange-700 border-orange-300'
      case '設定': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">データベース構造を読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6" />
          <h2 className="text-xl font-bold">Supabase データベース構造</h2>
        </div>
        <p className="text-blue-100 text-sm">
          全テーブル: {tables.length}件 | 総レコード数: {tables.reduce((sum, t) => sum + t.count, 0).toLocaleString()}件
        </p>
      </div>

      {/* 検索・フィルター */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="テーブル名または説明で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? '全て' : cat}
              {cat !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({tables.filter(t => t.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル一覧 */}
      <div className="space-y-2">
        {filteredTables.map(table => (
          <div key={table.name} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleTable(table.name)}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                {expandedTables.has(table.name) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <Database className="w-5 h-5 text-gray-600" />
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {table.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(table.category)}`}>
                      {table.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{table.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {table.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">レコード</div>
                </div>
              </div>
            </button>

            {expandedTables.has(table.name) && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    カラム ({table.columns.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {table.columns.map(col => (
                      <span
                        key={col}
                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {table.sampleData && table.sampleData.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">
                      サンプルデータ
                    </h4>
                    <div className="bg-white border border-gray-200 rounded p-2 text-xs font-mono overflow-x-auto">
                      <pre className="text-gray-700">
                        {JSON.stringify(table.sampleData[0], null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>該当するテーブルが見つかりません</p>
        </div>
      )}
    </div>
  )
}
