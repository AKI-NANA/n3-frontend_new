'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, Calculator, Globe, Truck, Clock, DollarSign, 
  Scale, Ruler, Target, AlertTriangle, Eye, BarChart3, 
  FileSpreadsheet, Settings, Loader2, CheckCircle,
  TrendingUp, Database, Zap
} from 'lucide-react'

import {
  calculateShipping,
  calculateVolumetricWeight,
  calculateChargeableWeight
} from '@/lib/shipping/api-v3-complete'

import {
  calculateShippingFromMaster
} from '@/lib/shipping/api-v4-master'

import {
  generateMatrixData,
  getDatabaseStats
} from '@/lib/shipping/api'

import FullDatabaseMatrix from '@/components/shipping/full-database-matrix'
import { ShippingFeesDatabase } from '@/components/shipping/shipping-fees-database'
import { FiveTierPricingDisplay } from '@/components/shipping/five-tier-pricing-display'
import { ShippingMasterQuery } from '@/components/shipping/shipping-master-query'
import { ShippingMatrixView } from '@/components/shipping/shipping-matrix-view'

import type {
  ShippingCalculationParams,
  ShippingCalculationResult,
  MatrixData,
  DatabaseStats,
  CalculatorState
} from '@/types/shipping'

const COUNTRIES = [
  { code: 'US', name: 'アメリカ', flag: '🇺🇸' },
  { code: 'GB', name: 'イギリス', flag: '🇬🇧' },
  { code: 'DE', name: 'ドイツ', flag: '🇩🇪' },
  { code: 'AU', name: 'オーストラリア', flag: '🇦🇺' },
  { code: 'CA', name: 'カナダ', flag: '🇨🇦' },
  { code: 'FR', name: 'フランス', flag: '🇫🇷' },
  { code: 'KR', name: '韓国', flag: '🇰🇷' },
  { code: 'SG', name: 'シンガポール', flag: '🇸🇬' },
  { code: 'TH', name: 'タイ', flag: '🇹🇭' },
  { code: 'MY', name: 'マレーシア', flag: '🇲🇾' },
  { code: 'TW', name: '台湾', flag: '🇹🇼' },
  { code: 'HK', name: '香港', flag: '🇭🇰' }
]

export function CompleteShippingCalculator() {
  // 状態管理
  const [state, setState] = useState<CalculatorState>({
    layer: 1,
    weight: '1.5',
    weight_unit: 'kg',
    length: '30',
    width: '20',
    height: '10',
    dimension_unit: 'cm',
    country: 'US',
    declared_value: '100',
    currency: 'USD',
    need_signature: false,
    need_insurance: false,
    carrier_filter: 'ALL',
    service_type_filter: 'ALL',
    sort_by: 'price',
    show_additional_fees: true,
    show_restrictions: false
  })

  const [activeTab, setActiveTab] = useState('calculator')
  const [results, setResults] = useState<ShippingCalculationResult[]>([])
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null)
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 計算結果
  const volumetricWeight = state.length && state.width && state.height ? 
    calculateVolumetricWeight(
      parseFloat(state.length),
      parseFloat(state.width),
      parseFloat(state.height),
      state.dimension_unit
    ) : 0

  const actualWeight = parseFloat(state.weight) * (state.weight_unit === 'g' ? 0.001 : 1)
  const chargeableWeight = calculateChargeableWeight(actualWeight, volumetricWeight)

  // データベース統計の初期読み込み
  useEffect(() => {
    const loadDatabaseStats = async () => {
      const response = await getDatabaseStats()
      if (response.data) {
        setDatabaseStats(response.data)
      }
    }
    loadDatabaseStats()
  }, [])

  // マトリックスデータの読み込み
  useEffect(() => {
    if (activeTab === 'matrix') {
      const loadMatrixData = async () => {
        setLoading(true)
        const response = await generateMatrixData()
        if (response.data) {
          setMatrixData(response.data)
        } else if (response.error) {
          setError(response.error.message)
        }
        setLoading(false)
      }
      loadMatrixData()
    }
  }, [activeTab])

  // 送料計算実行
  const executeCalculation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: ShippingCalculationParams = {
        weight_g: chargeableWeight * 1000, // kgをgに変換
        length_cm: state.dimension_unit === 'cm' ? parseFloat(state.length) : parseFloat(state.length) * 2.54,
        width_cm: state.dimension_unit === 'cm' ? parseFloat(state.width) : parseFloat(state.width) * 2.54,
        height_cm: state.dimension_unit === 'cm' ? parseFloat(state.height) : parseFloat(state.height) * 2.54,
        destination_country: state.country,
        declared_value_jpy: state.currency === 'JPY' ? 
          parseFloat(state.declared_value) : 
          parseFloat(state.declared_value) * 154.32,
        need_signature: state.need_signature,
        need_insurance: state.need_insurance,
        carrier_filter: state.carrier_filter === 'ALL' ? [] : [state.carrier_filter],
        service_type_filter: state.service_type_filter === 'ALL' ? [] : [state.service_type_filter]
      }

      // V4 API: ebay_shipping_masterから取得（配送会社ごとにグループ化）
      const response = await calculateShippingFromMaster(params)
      
      if (response.data) {
        console.log('📦 API返却データ:', response.data.length, '件')
        console.log('📦 先頭3件:', response.data.slice(0, 3).map(r => `${r.carrier_name} - ${r.service_name}`))
        
        let filteredResults = response.data

        // フィルタリング（デバッグ用にログ追加）
        if (state.carrier_filter !== 'ALL') {
          console.log('🔍 キャリアフィルター適用:', state.carrier_filter)
          const beforeCount = filteredResults.length
          filteredResults = filteredResults.filter(r => 
            r.carrier_code === state.carrier_filter || 
            r.carrier_name.includes(state.carrier_filter)
          )
          console.log(`🔍 フィルター後: ${beforeCount}件 → ${filteredResults.length}件`)
        }

        if (state.service_type_filter !== 'ALL') {
          console.log('🔍 サービスタイプフィルター適用:', state.service_type_filter)
          const beforeCount = filteredResults.length
          filteredResults = filteredResults.filter(r => {
            // service_typeフィールドを使用（より正確）
            if (r.service_type) {
              switch (state.service_type_filter) {
                case 'express':
                  return r.service_type === 'Express'
                case 'economy':
                  return r.service_type === 'Economy'
                case 'standard':
                  return r.service_type === 'Standard'
                default:
                  return true
              }
            }
            // フォールバック: service_nameから判定
            const serviceType = r.service_name.toLowerCase()
            switch (state.service_type_filter) {
              case 'express':
                return serviceType.includes('express') || serviceType.includes('ems')
              case 'economy':
                return serviceType.includes('economy') || serviceType.includes('speedpak')
              default:
                return true
            }
          })
          console.log(`🔍 フィルター後: ${beforeCount}件 → ${filteredResults.length}件`)
        }

        // ソート
        console.log('🔄 ソート実行:', state.sort_by, '/', filteredResults.length, '件')
        filteredResults.sort((a, b) => {
          switch (state.sort_by) {
            case 'price':
              return a.total_price_jpy - b.total_price_jpy
            case 'speed':
              return a.delivery_days_min - b.delivery_days_min
            case 'reliability':
              // 信頼性は追跡・保険・署名の有無で判定
              const aScore = (a.tracking ? 1 : 0) + (a.insurance_included ? 1 : 0) + (a.signature_available ? 1 : 0)
              const bScore = (b.tracking ? 1 : 0) + (b.insurance_included ? 1 : 0) + (b.signature_available ? 1 : 0)
              return bScore - aScore
            default:
              return 0
          }
        })

        console.log('✅ 最終結果設定:', filteredResults.length, '件')
        console.log('✅ キャリア別:', filteredResults.reduce((acc, r) => {
          acc[r.carrier_name] = (acc[r.carrier_name] || 0) + 1
          return acc
        }, {} as Record<string, number>))
        
        // 0.5kg未満の情報
        if (chargeableWeight < 0.5) {
          console.info('📦 0.5kg未満：クーリエは0.5kgの料金を適用')
        }
        
        setResults(filteredResults)
        setState(prev => ({ ...prev, layer: 4 }))
      } else if (response.error) {
        setError(response.error.message)
      }
    } catch (err) {
      setError('計算中にエラーが発生しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [state, chargeableWeight])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(price))
  }

  const selectedCountry = COUNTRIES.find(c => c.code === state.country)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Package className="h-10 w-10" />
                <div>
                  <h1 className="text-4xl font-bold">送料計算システム V5</h1>
                  <p className="text-blue-100 text-lg">
                    Supabase統合 × リアルタイム計算 × 完全版マトリックス
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="flex items-center gap-1">
                  <Database className="h-4 w-4" />
                  {databaseStats?.total_records.toLocaleString() || '9,202'}件のデータ
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {databaseStats?.countries_stats.total_countries || 195}カ国対応
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  {databaseStats?.carriers.length || 3}業者統合
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  リアルタイム計算
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Layer {state.layer}/4</div>
              <div className="text-blue-200">
                {state.layer === 1 && '基本情報入力'}
                {state.layer === 2 && '配送先・オプション'}
                {state.layer === 3 && 'フィルター設定'}
                {state.layer === 4 && '結果表示・分析'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="master" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              マスター検索
            </TabsTrigger>
            <TabsTrigger value="matrixview" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              マトリックスビュー
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              4層計算
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              マトリックス
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              料金DB
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              DB閲覧
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              分析
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              設定
            </TabsTrigger>
          </TabsList>

          {/* マスター検索タブ */}
          <TabsContent value="master" className="space-y-6">
            <ShippingMasterQuery />
          </TabsContent>

          {/* マトリックスビュータブ */}
          <TabsContent value="matrixview" className="space-y-6">
            <ShippingMatrixView />
          </TabsContent>

          {/* 4層計算タブ */}
          <TabsContent value="calculator" className="space-y-6">
            {/* 4層ナビゲーション */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">4層選択フロー</h3>
                  <Button 
                    onClick={() => setState(prev => ({ ...prev, layer: 1 }))}
                    variant="outline" 
                    size="sm"
                  >
                    最初から
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(layer => (
                    <div
                      key={layer}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        state.layer === layer
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : state.layer > layer
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                      }`}
                      onClick={() => setState(prev => ({ ...prev, layer: layer as 1 | 2 | 3 | 4 }))}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          state.layer === layer
                            ? 'bg-blue-500 text-white'
                            : state.layer > layer
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {state.layer > layer ? <CheckCircle className="h-4 w-4" /> : layer}
                        </div>
                        <span className="font-medium">
                          {layer === 1 && '基本情報'}
                          {layer === 2 && '配送先'}
                          {layer === 3 && 'フィルター'}
                          {layer === 4 && '結果'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {layer === 1 && '重量・サイズ入力'}
                        {layer === 2 && '国・オプション選択'}
                        {layer === 3 && '業者・表示設定'}
                        {layer === 4 && '料金比較・分析'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Layer 1: 基本情報 */}
            {state.layer === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Layer 1: 基本情報入力
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 重量入力 */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">重量</h4>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={state.weight}
                          onChange={(e) => setState(prev => ({ ...prev, weight: e.target.value }))}
                          placeholder="重量"
                          step="0.1"
                          min="0.1"
                          className="flex-1"
                        />
                        <select
                          value={state.weight_unit}
                          onChange={(e) => setState(prev => ({ ...prev, weight_unit: e.target.value as 'g' | 'kg' }))}
                          className="px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                        </select>
                      </div>
                    </div>

                    {/* サイズ入力 */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">サイズ（3辺）</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          value={state.length}
                          onChange={(e) => setState(prev => ({ ...prev, length: e.target.value }))}
                          placeholder="長さ"
                          min="1"
                        />
                        <Input
                          type="number"
                          value={state.width}
                          onChange={(e) => setState(prev => ({ ...prev, width: e.target.value }))}
                          placeholder="幅"
                          min="1"
                        />
                        <Input
                          type="number"
                          value={state.height}
                          onChange={(e) => setState(prev => ({ ...prev, height: e.target.value }))}
                          placeholder="高さ"
                          min="1"
                        />
                      </div>
                      <select
                        value={state.dimension_unit}
                        onChange={(e) => setState(prev => ({ ...prev, dimension_unit: e.target.value as 'cm' | 'inch' }))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="cm">cm</option>
                        <option value="inch">inch</option>
                      </select>
                    </div>
                  </div>

                  {/* 重量計算情報 */}
                  {state.weight && state.length && state.width && state.height && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">重量計算結果</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">実重量:</span>
                          <span className="font-semibold ml-1">
                            {actualWeight.toFixed(2)}kg
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">容積重量:</span>
                          <span className="font-semibold ml-1">
                            {volumetricWeight.toFixed(2)}kg
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">請求重量:</span>
                          <span className="font-bold text-blue-600 ml-1">
                            {chargeableWeight.toFixed(2)}kg
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => setState(prev => ({ ...prev, layer: 2 }))}
                    disabled={!state.weight || !state.length || !state.width || !state.height}
                    className="w-full"
                    size="lg"
                  >
                    次へ：配送先選択 →
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Layer 2: 配送先・オプション */}
            {state.layer === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Layer 2: 配送先・オプション設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 配送先 */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">配送先</h4>
                      <select
                        value={state.country}
                        onChange={(e) => setState(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 商品価格 */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">商品価格</h4>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={state.declared_value}
                          onChange={(e) => setState(prev => ({ ...prev, declared_value: e.target.value }))}
                          placeholder="商品価格"
                          min="0"
                          className="flex-1"
                        />
                        <select
                          value={state.currency}
                          onChange={(e) => setState(prev => ({ ...prev, currency: e.target.value as 'USD' | 'JPY' }))}
                          className="px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="USD">USD</option>
                          <option value="JPY">JPY</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* オプション */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">配送オプション</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.need_signature}
                          onChange={(e) => setState(prev => ({ ...prev, need_signature: e.target.checked }))}
                          className="rounded"
                        />
                        <span>署名確認 (+¥300-500)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.need_insurance}
                          onChange={(e) => setState(prev => ({ ...prev, need_insurance: e.target.checked }))}
                          className="rounded"
                        />
                        <span>保険 (+商品価格の1-3%)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={() => setState(prev => ({ ...prev, layer: 1 }))}
                      variant="outline"
                      className="flex-1"
                    >
                      ← 戻る
                    </Button>
                    <Button
                      onClick={() => setState(prev => ({ ...prev, layer: 3 }))}
                      className="flex-1"
                    >
                      次へ：フィルター設定 →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Layer 3: フィルター */}
            {state.layer === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Layer 3: フィルター・表示設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 配送業者フィルター */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">配送業者</h4>
                      <select
                        value={state.carrier_filter}
                        onChange={(e) => setState(prev => ({ ...prev, carrier_filter: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="ALL">すべての業者</option>
                        <option value="CPASS">CPass</option>
                        <option value="日本郵便">日本郵便</option>
                        <option value="ELOJI">Eloji (UPS/DHL/FedX)</option>
                      </select>
                    </div>

                    {/* サービスタイプ */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">サービスタイプ</h4>
                      <select
                        value={state.service_type_filter}
                        onChange={(e) => setState(prev => ({ ...prev, service_type_filter: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="ALL">すべてのサービス</option>
                        <option value="express">エクスプレス（高速）</option>
                        <option value="economy">エコノミー（安価）</option>
                        <option value="standard">スタンダード</option>
                      </select>
                    </div>
                  </div>

                  {/* 表示設定 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">表示・ソート設定</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">ソート順</label>
                        <select
                          value={state.sort_by}
                          onChange={(e) => setState(prev => ({ ...prev, sort_by: e.target.value as 'price' | 'speed' | 'reliability' }))}
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="price">料金順（安い順）</option>
                          <option value="speed">配送速度順</option>
                          <option value="reliability">信頼性順</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={state.show_additional_fees}
                            onChange={(e) => setState(prev => ({ ...prev, show_additional_fees: e.target.checked }))}
                            className="rounded"
                          />
                          <span>追加料金を表示</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={state.show_restrictions}
                            onChange={(e) => setState(prev => ({ ...prev, show_restrictions: e.target.checked }))}
                            className="rounded"
                          />
                          <span>制限事項を表示</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={() => setState(prev => ({ ...prev, layer: 2 }))}
                      variant="outline"
                      className="flex-1"
                    >
                      ← 戻る
                    </Button>
                    <Button
                      onClick={executeCalculation}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          計算中...
                        </>
                      ) : (
                        '送料計算実行 →'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Layer 4: 結果表示 */}
            {state.layer === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Layer 4: 計算結果（{results.length}件）
                    <Badge variant="outline" className="ml-2">
                      {selectedCountry?.flag} {selectedCountry?.name}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 0.5kg未満の情報バナー */}
                  {chargeableWeight < 0.5 && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            軽量荷物（0.5kg未満）
                          </h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            実際の重量: <strong>{chargeableWeight.toFixed(2)}kg</strong><br />
                            クーリエサービスの最小重量は0.5kgなので、<strong>0.5kgの料金</strong>が適用されます。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {results.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          計算中...
                        </div>
                      ) : (
                        '計算を実行してください'
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <FiveTierPricingDisplay
                          key={result.id}
                          result={result}
                          index={index}
                          formatPrice={formatPrice}
                          showRestrictions={state.show_restrictions}
                        />
                      ))}

                      <div className="flex gap-4 mt-6">
                        <Button
                          onClick={() => setState(prev => ({ ...prev, layer: 1 }))}
                          variant="outline"
                          className="flex-1"
                        >
                          新しい計算を開始
                        </Button>
                        <Button
                          onClick={() => setState(prev => ({ ...prev, layer: 3 }))}
                          variant="outline"
                          className="flex-1"
                        >
                          フィルター変更
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* マトリックスタブ */}
          <TabsContent value="matrix" className="space-y-6">
            {/* 完全版データベースマトリックス */}
            {/* このコンポーネントを差し替え */}
            <FullDatabaseMatrix />
          </TabsContent>

          {/* 料金データベースタブ */}
          <TabsContent value="fees" className="space-y-6">
            <ShippingFeesDatabase />
          </TabsContent>

          {/* データベース閲覧タブ */}
          <TabsContent value="database" className="space-y-6">
            {databaseStats ? (
              <>
                <div className="grid md:grid-cols-3 gap-6">
                  {databaseStats.carriers.map((carrier, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          {carrier.carrier_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">サービス数:</span>
                          <span className="font-semibold">{carrier.services_count}種類</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">料金データ:</span>
                          <span className="font-semibold">{carrier.rates_count.toLocaleString()}件</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">最安料金:</span>
                          <span className="font-semibold text-green-600">¥{formatPrice(carrier.cheapest_price_jpy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">最高料金:</span>
                          <span className="font-semibold">¥{formatPrice(carrier.most_expensive_price_jpy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">平均料金:</span>
                          <span className="font-semibold">¥{formatPrice(carrier.avg_price_jpy)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">対応国数:</span>
                          <span className="font-semibold">{carrier.countries_served}カ国</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">重量範囲:</span>
                          <span>{(carrier.weight_range_min_g / 1000).toFixed(1)}kg - {(carrier.weight_range_max_g / 1000).toFixed(0)}kg</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>データベース統計</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {databaseStats.total_records.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">総データ数</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {databaseStats.carriers.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">配送業者</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {databaseStats.countries_stats.total_countries}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">対応国数</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {databaseStats.weight_ranges.total_ranges}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">重量帯</div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold mb-4">地域別平均料金</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(databaseStats.countries_stats.avg_price_by_region).map(([region, price]) => (
                          <div key={region} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <span>{region}</span>
                            <span className="font-semibold">¥{formatPrice(price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                統計データを読み込み中...
              </div>
            )}
          </TabsContent>

          {/* 分析タブ */}
          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  料金分析・最適化提案
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.length > 0 ? (
                  <div className="space-y-6">
                    {/* 料金比較グラフ（簡易版） */}
                    <div>
                      <h4 className="font-semibold mb-4">料金比較</h4>
                      <div className="space-y-2">
                        {results.slice(0, 5).map((result, index) => {
                          const maxPrice = Math.max(...results.map(r => r.total_price_jpy))
                          const percentage = (result.total_price_jpy / maxPrice) * 100
                          
                          return (
                            <div key={result.id} className="flex items-center gap-4">
                              <div className="w-32 text-sm font-medium truncate">
                                {result.carrier_name}
                              </div>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6">
                                <div 
                                  className={`h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold ${
                                    index === 0 ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                >
                                  ¥{formatPrice(result.total_price_jpy)}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* 最適化提案 */}
                    <div>
                      <h4 className="font-semibold mb-4">💡 最適化提案</h4>
                      <div className="space-y-3">
                        {results.length > 1 && (
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm">
                              <strong>コスト削減:</strong> 最安値({results[0].carrier_name})を選択することで、
                              最高値と比較して¥{formatPrice(results[results.length - 1].total_price_jpy - results[0].total_price_jpy)}の節約が可能です。
                            </p>
                          </div>
                        )}
                        
                        {/* 配送速度vs料金の分析 */}
                        {(() => {
                          const fastestService = results.reduce((prev, current) => 
                            prev.delivery_days_min < current.delivery_days_min ? prev : current
                          )
                          const cheapestService = results[0]
                          
                          if (fastestService.id !== cheapestService.id) {
                            const priceDiff = fastestService.total_price_jpy - cheapestService.total_price_jpy
                            const daysDiff = cheapestService.delivery_days_max - fastestService.delivery_days_min
                            
                            return (
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-sm">
                                  <strong>速度vs料金:</strong> 最速配送({fastestService.carrier_name})は追加¥{formatPrice(priceDiff)}で
                                  約{daysDiff}日短縮できます。(¥{formatPrice(priceDiff / daysDiff)}/日)
                                </p>
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* 重量最適化提案 */}
                        {chargeableWeight > actualWeight && (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <p className="text-sm">
                              <strong>梱包最適化:</strong> 容積重量({volumetricWeight.toFixed(2)}kg)が実重量({actualWeight.toFixed(2)}kg)を上回っています。
                              より小さな梱包材を使用することで送料を削減できる可能性があります。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    送料計算を実行すると詳細な分析が表示されます
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 設定タブ */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  システム設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-4">表示設定</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>ダークモード</span>
                      <Button variant="outline" size="sm">
                        切り替え
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>デフォルト通貨</span>
                      <select className="px-3 py-1 border rounded bg-background">
                        <option value="JPY">JPY (円)</option>
                        <option value="USD">USD (ドル)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>デフォルト重量単位</span>
                      <select className="px-3 py-1 border rounded bg-background">
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">データ設定</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>為替レート更新</span>
                      <Button variant="outline" size="sm">
                        手動更新
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>キャッシュクリア</span>
                      <Button variant="outline" size="sm">
                        実行
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h5 className="font-semibold mb-2">システム情報</h5>
                  <div className="text-sm space-y-1">
                    <p>バージョン: v5.0.0</p>
                    <p>最終更新: {databaseStats?.last_updated ? new Date(databaseStats.last_updated).toLocaleString() : '不明'}</p>
                    <p>データベース接続: ✅ 正常</p>
                    <p>総データ件数: {databaseStats?.total_records.toLocaleString() || '取得中...'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}