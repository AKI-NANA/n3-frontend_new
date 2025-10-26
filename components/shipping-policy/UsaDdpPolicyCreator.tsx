'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package, Eye, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

interface WeightBand {
  weight_min_kg: number
  weight_max_kg: number
  weight_band_name: string
}

interface DdpRate {
  weight_min_kg: number
  weight_max_kg: number
  weight_band_name: string
  product_price_usd: number
  base_shipping_usd: number
  ddp_fee_usd: number
  total_shipping_usd: number
}

interface PolicyPreview {
  policyName: string
  description: string
  weightBand: string
  productPrice: number
  usaShipping: number
  baseShipping: number
  ddpFee: number
  handlingTime: number
  usaDeliveryMin: number
  usaDeliveryMax: number
  intlDeliveryMin: number
  intlDeliveryMax: number
  rateTable: string
}

// 除外場所データ（121カ国）
const EXCLUDED_LOCATIONS = {
  domestic: [
    { code: 'AK', name: 'Alaska' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'APO', name: 'APO/FPO' },
    { code: 'US_PROTECTORATES', name: 'US Protectorates', count: 5 }
  ],
  international: {
    'Africa': 51,
    'Asia': 35,
    'Central America and Caribbean': 13,
    'Europe': 7,
    'Middle East': 0,
    'North America': 0,
    'Oceania': 0,
    'South America': 0
  },
  totalCount: 121
}

export function UsaDdpPolicyCreator() {
  const [weightBands, setWeightBands] = useState<WeightBand[]>([])
  const [pricePoints, setPricePoints] = useState<number[]>([])
  const [selectedWeight, setSelectedWeight] = useState<string>('')
  const [selectedPrice, setSelectedPrice] = useState<number>(0)
  const [preview, setPreview] = useState<PolicyPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [excludedLocations, setExcludedLocations] = useState<any>({})

  useEffect(() => {
    loadAvailableOptions()
    loadExcludedLocationsFromExistingPolicy()
    loadExcludedCountriesFromMaster()
  }, [])

  useEffect(() => {
    if (selectedWeight && selectedPrice > 0) {
      generatePreview()
    }
  }, [selectedWeight, selectedPrice])

  async function loadExcludedLocationsFromExistingPolicy() {
    try {
      const supabase = createClient()
      
      console.log('🔍 Searching for existing policy...')
      
      // 複数のテーブル名を試す
      const possibleTables = [
        'shipping_policies',
        'ebay_shipping_policies', 
        'policies',
        'fulfillment_policies',
        'shipping_policy'
      ]
      
      for (const tableName of possibleTables) {
        console.log(`Trying table: ${tableName}`)
        
        const { data: policies, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(5)
        
        if (!error && policies && policies.length > 0) {
          console.log(`✅ Found policies in table: ${tableName}`)
          console.log('Sample policy:', policies[0])
          
          // W1_400_1760408323011 を探す
          const targetPolicy = policies.find(p => 
            p.policy_name === 'W1_400_1760408323011' ||
            p.name === 'W1_400_1760408323011' ||
            p.policyName === 'W1_400_1760408323011'
          )
          
          if (targetPolicy) {
            console.log('🎯 Found target policy:', targetPolicy)
            console.log('Excluded locations fields:', {
              excludedShipToLocations: targetPolicy?.excludedShipToLocations,
              excluded_locations: targetPolicy?.excluded_locations,
              regionExcluded: targetPolicy?.regionExcluded,
              shipToLocations: targetPolicy?.shipToLocations,
              allFields: Object.keys(targetPolicy)
            })
          } else {
            console.log('Available policies:', policies.map(p => p.policy_name || p.name || p.policyName))
          }
          
          return
        }
      }
      
      // 既存ポリシーが見つからない場合は新規作成
      console.log('ℹ️ No existing policies found, ready for new policy creation')
    } catch (error) {
      console.error('Error loading excluded locations:', error)
    }
  }

  // 除外国マスターからデータを読み込む
  async function loadExcludedCountriesFromMaster() {
    try {
      const response = await fetch('/api/shipping/excluded-countries')
      const data = await response.json()
      
      if (data.success && data.excluded_countries && data.excluded_countries.length > 0) {
        console.log(`✅ Loaded ${data.excluded_countries.length} excluded countries from master`)
        
        // 除外国をexcludedLocationsステートに設定
        const newExcluded: any = {}
        
        data.excluded_countries.forEach((country: any) => {
          const region = country.region.toLowerCase().replace(/\s+/g, '_').replace(/,/g, '')
          if (!newExcluded[region]) {
            newExcluded[region] = []
          }
          newExcluded[region].push(country.country_code)
        })
        
        setExcludedLocations(newExcluded)
        console.log('Excluded locations set:', newExcluded)
      }
    } catch (error) {
      console.error('Error loading excluded countries from master:', error)
    }
  }

  // 除外国のカウントを計算
  const getExcludedCount = (region: string) => {
    const regionKey = region.toLowerCase().replace(/\s+/g, '_').replace(/,/g, '')
    return excludedLocations[regionKey]?.length || 0
  }

  const getTotalExcludedCount = () => {
    return Object.values(excludedLocations).reduce((total: number, countries: any) => {
      return total + (countries?.length || 0)
    }, 0)
  }

  async function loadAvailableOptions() {
    try {
      const supabase = createClient()

      // ページネーションで全データを取得
      let allWeightBands: any[] = []
      let from = 0
      const limit = 1000
      
      while (true) {
        const { data, error } = await supabase
          .from('usa_ddp_rates')
          .select('weight_min_kg, weight_max_kg, weight_band_name')
          .order('weight_min_kg', { ascending: true })
          .range(from, from + limit - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        
        allWeightBands = [...allWeightBands, ...data]
        
        if (data.length < limit) break  // 最後のページ
        from += limit
      }

      // 手動で重複削除（Map使用）
      const weightMap = new Map()
      allWeightBands.forEach(w => {
        if (!weightMap.has(w.weight_band_name)) {
          weightMap.set(w.weight_band_name, w)
        }
      })
      const uniqueWeights = Array.from(weightMap.values())

      console.log('📏 Raw weights fetched:', allWeightBands.length)
      console.log('✅ Unique weight bands:', uniqueWeights.length)
      
      setWeightBands(uniqueWeights as WeightBand[])

      // 価格もページネーションで取得
      let allPrices: any[] = []
      from = 0
      
      while (true) {
        const { data, error } = await supabase
          .from('usa_ddp_rates')
          .select('product_price_usd')
          .order('product_price_usd', { ascending: true })
          .range(from, from + limit - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        
        allPrices = [...allPrices, ...data]
        
        if (data.length < limit) break
        from += limit
      }

      // 手動で重複削除（Set使用）
      const uniquePrices = [...new Set(allPrices.map(p => p.product_price_usd))]
      
      console.log('📏 Raw prices fetched:', allPrices.length)
      console.log('✅ Unique price points:', uniquePrices.length)
      console.log('Prices:', uniquePrices)
      
      setPricePoints(uniquePrices)

      // 正しい数を確認
      if (uniqueWeights.length === 60 && uniquePrices.length === 20) {
        console.log('🎉 全データ取得成功: 60重量帯 × 20価格 = 1200ポリシー')
      } else {
        console.warn(`⚠️ データ不足: 重量帯=${uniqueWeights.length}/60, 価格=${uniquePrices.length}/20`)
      }

      setLoading(false)
    } catch (error) {
      console.error('Failed to load options:', error)
      setLoading(false)
    }
  }

  async function generatePreview() {
    try {
      const supabase = createClient()

      // 選択された重量帯と価格に対応するデータを取得
      const { data, error } = await supabase
        .from('usa_ddp_rates')
        .select('*')
        .eq('weight_band_name', selectedWeight)
        .eq('product_price_usd', selectedPrice)
        .single()

      if (error) throw error

      const rate = data as DdpRate

      // 重量帯インデックスを計算（RT_Express_1から60まで）
      const bandIndex = weightBands.findIndex(b => b.weight_band_name === selectedWeight) + 1
      const rateTableName = `RT_Express_${bandIndex}`

      // ポリシー名を生成 (RT01_P0050 形式)
      const rtNum = String(bandIndex).padStart(2, '0')
      const priceStr = String(selectedPrice).padStart(4, '0')
      const policyName = `RT${rtNum}_P${priceStr}`

      // プレビューデータを生成
      const previewData: PolicyPreview = {
        policyName,
        description: `エクスプレス配送（${rate.weight_band_name}、商品${rate.product_price_usd}）。USA本土: ${rate.total_shipping_usd.toFixed(1)}（DDP、送料${rate.base_shipping_usd}+商品+DDP${rate.ddp_fee_usd.toFixed(0)}）。その他: ${rateTableName}（DDU）。日本発送、USA 1-4日、International 7-15日。`,
        weightBand: rate.weight_band_name,
        productPrice: rate.product_price_usd,
        usaShipping: rate.total_shipping_usd,
        baseShipping: rate.base_shipping_usd,
        ddpFee: rate.ddp_fee_usd,
        handlingTime: 10,
        usaDeliveryMin: 1,
        usaDeliveryMax: 4,
        intlDeliveryMin: 7,
        intlDeliveryMax: 15,
        rateTable: rateTableName,
      }

      setPreview(previewData)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }

  async function handleSyncToEbay() {
    if (!preview) return

    setSyncing(true)
    setSyncStatus('idle')

    try {
      const supabase = createClient()

      // 配送ポリシーをDBに保存
      const { data: policyData, error: policyError } = await supabase
        .from('shipping_policies')
        .insert({
          policy_name: preview.policyName,
          policy_type: 'USA_DDP',
          description: preview.description,
          service_type: 'Expedited',
          handling_time_days: preview.handlingTime,
          free_shipping: false,
          flat_shipping_cost: preview.usaShipping,
          domestic_shipping: true,
          international_shipping: true,
          status: 'active'
        })
        .select()
        .single()

      if (policyError) throw policyError

      const policyId = policyData.id

      // 除外国を保存
      const excludedCountriesData = Object.entries(excludedLocations).flatMap(([region, countries]: [string, any]) => 
        countries.map((countryCode: string) => ({
          policy_id: policyId,
          country_code: countryCode,
          region: region
        }))
      )

      if (excludedCountriesData.length > 0) {
        const { error: excludedError } = await supabase
          .from('shipping_excluded_locations')
          .insert(excludedCountriesData)

        if (excludedError) throw excludedError
      }

      console.log(`✅ Policy saved: ${preview.policyName} (ID: ${policyId})`)

      setSyncStatus('success')
      setSyncing(false)
    } catch (error) {
      console.error('Failed to sync to DB:', error)
      setSyncStatus('error')
      setSyncing(false)
    }
  }

  // 全ての配送ポリシーを一括作成
  async function handleCreateAllPolicies() {
    if (!weightBands.length || !pricePoints.length) return

    setSyncing(true)
    setSyncStatus('idle')

    try {
      const supabase = createClient()
      let successCount = 0
      let totalPolicies = weightBands.length * pricePoints.length

      console.log(`🚀 Creating ${totalPolicies} policies...`)

      for (let bandIndex = 0; bandIndex < weightBands.length; bandIndex++) {
        const band = weightBands[bandIndex]
        
        for (const price of pricePoints) {
          // レートデータを取得
          const { data: rate, error: rateError } = await supabase
            .from('usa_ddp_rates')
            .select('*')
            .eq('weight_band_name', band.weight_band_name)
            .eq('product_price_usd', price)
            .single()

          if (rateError || !rate) continue

          // Rate Table名を生成 (RT_Express_1 〜 RT_Express_60)
          const rateTableNumber = bandIndex + 1
          const rateTableName = `RT_Express_${rateTableNumber}`
          
          // ポリシー名を生成 (RT01_P0050 形式)
          const rtNum = String(rateTableNumber).padStart(2, '0')
          const priceStr = String(price).padStart(4, '0')
          const policyName = `RT${rtNum}_P${priceStr}`

          // ポリシーを保存
          const { data: policyData, error: policyError } = await supabase
            .from('shipping_policies')
            .insert({
              policy_name: policyName,
              policy_type: 'USA_DDP',
              description: `エクスプレス配送（${rate.weight_band_name}、商品${rate.product_price_usd}）。USA本土: ${rate.total_shipping_usd.toFixed(1)}（DDP、送料${rate.base_shipping_usd}+商品+DDP${rate.ddp_fee_usd.toFixed(0)}）。その他: ${rateTableName}（DDU）。日本発送、USA 1-4日、International 7-15日。`,
              service_type: 'Expedited',
              handling_time_days: 10,
              free_shipping: false,
              flat_shipping_cost: rate.total_shipping_usd,
              rate_table_name: rateTableName,
              domestic_shipping: true,
              international_shipping: true,
              status: 'active'
            })
            .select()
            .single()

          if (policyError) {
            console.error(`❌ Failed to create policy: ${policyName}`, policyError)
            continue
          }

          const policyId = policyData.id

          // 除外国を保存
          const excludedCountriesData = Object.entries(excludedLocations).flatMap(([region, countries]: [string, any]) => 
            countries.map((countryCode: string) => ({
              policy_id: policyId,
              country_code: countryCode,
              region: region
            }))
          )

          if (excludedCountriesData.length > 0) {
            await supabase
              .from('shipping_excluded_locations')
              .insert(excludedCountriesData)
          }

          successCount++
          if (successCount % 50 === 0) {
            console.log(`✅ Created policy ${successCount}/${totalPolicies}: ${policyName}`)
          }
        }
      }

      console.log(`🎉 Successfully created ${successCount} policies!`)

      setSyncStatus('success')
      setSyncing(false)
    } catch (error) {
      console.error('Failed to create all policies:', error)
      setSyncStatus('error')
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Package className="w-6 h-6" />
          USA DDP配送ポリシー作成
        </h2>
        <p className="text-sm opacity-90">
          重量帯と商品価格を選択して、eBay配送ポリシーを自動生成
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 設定フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>配送ポリシー設定</CardTitle>
            <CardDescription>
              重量帯と商品価格を選択してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 重量帯選択 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                重量帯 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedWeight}
                onChange={(e) => setSelectedWeight(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">重量帯を選択...</option>
                {weightBands.map((band) => (
                  <option key={band.weight_band_name} value={band.weight_band_name}>
                    {band.weight_band_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 商品価格選択 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                商品価格 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value={0}>商品価格を選択...</option>
                {pricePoints.map((price) => (
                  <option key={price} value={price}>
                    ${price}
                  </option>
                ))}
              </select>
            </div>

            {/* 生成ボタン */}
            <Button
              onClick={generatePreview}
              disabled={!selectedWeight || selectedPrice === 0}
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              プレビュー生成
            </Button>
          </CardContent>
        </Card>

        {/* 右側: プレビュー */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              eBayプレビュー
            </CardTitle>
            <CardDescription>
              実際のeBay画面での表示イメージ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div className="text-center text-gray-500 py-12">
                重量帯と商品価格を選択してください
              </div>
            ) : (
              <div className="space-y-4">
                {/* ポリシー名 */}
                <div className="border-b pb-3">
                  <label className="text-sm text-gray-600">ポリシー名</label>
                  <div className="font-mono text-lg font-bold text-blue-600">
                    {preview.policyName}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    例: Free domestic shipping
                  </div>
                </div>

                {/* 説明 */}
                <div className="border-b pb-3">
                  <label className="text-sm text-gray-600">説明（オプション）</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                    {preview.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {preview.description.length}/250
                  </div>
                </div>

                {/* 国内配送（USA本土） */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold">国内配送</h4>
                    <div className="text-xs text-blue-600">配送サービスを追加する ON</div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      コストタイプ: フラット: すべての購入者に同じコスト
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          🌐
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">サービス名</div>
                          <div className="text-sm">Expedited Shipping from outside US</div>
                        </div>
                        <div className="text-sm">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked disabled />
                            送料無料を提供
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <label className="text-gray-600">最短配送日数（営業日）</label>
                          <div className="font-medium">{preview.usaDeliveryMin}</div>
                        </div>
                        <div>
                          <label className="text-gray-600">最長配送日数（営業日）</label>
                          <div className="font-medium">{preview.usaDeliveryMax}</div>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">購入者が支払う（最初のアイテム）</span>
                          <span className="text-lg font-bold text-green-600">
                            ${preview.usaShipping.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          内訳: 実送料 ${preview.baseShipping.toFixed(2)} + DDP手数料 ${preview.ddpFee.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 国際配送 */}
                <div className="border rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold">国際配送</h4>
                    <div className="text-xs text-purple-600">配送サービスを追加する ON</div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      コストタイプ: フラット: すべての購入者に同じコスト
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          🌐
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">サービス名</div>
                          <div className="text-sm">Expedited International Shipping</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <label className="text-gray-600">最短配送日数（営業日）</label>
                          <div className="font-medium">{preview.intlDeliveryMin}</div>
                        </div>
                        <div>
                          <label className="text-gray-600">最長配送日数（営業日）</label>
                          <div className="font-medium">{preview.intlDeliveryMax}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-sm text-gray-600 block mb-1">配送先: Worldwide →</label>
                      </div>

                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm text-gray-700 mb-1">Rate table (optional)</div>
                        <div className="font-mono text-sm font-bold text-blue-600">
                          {preview.rateTable}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 除外する場所 */}
                <div className="border-t pt-4">
                  <h4 className="font-bold mb-2">除外する場所（オプション）</h4>
                  
                  {/* Domestic除外 */}
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-2">Domestic</div>
                    <div className="space-y-1">
                      {EXCLUDED_LOCATIONS.domestic.map((location) => (
                        <div key={location.code} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked disabled className="rounded" />
                          <span>{location.name}</span>
                          {location.count && <span className="text-gray-500">({location.count})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* International除外 */}
                  <div>
                    <div className="text-sm font-medium mb-2">International</div>
                    <div className="space-y-1">
                      {[
                        ['Africa', getExcludedCount('africa')],
                        ['Asia', getExcludedCount('asia')],
                        ['Central America and Caribbean', getExcludedCount('central_america_and_caribbean')],
                        ['Europe', getExcludedCount('europe')],
                        ['Middle East', getExcludedCount('middle_east')],
                        ['North America', getExcludedCount('north_america')],
                        ['Oceania', getExcludedCount('oceania')],
                        ['South America', getExcludedCount('south_america')]
                      ].map(([region, count]) => (
                        <div key={region} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={count > 0} disabled className="rounded" />
                          <span>{region}</span>
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            {count} countries
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-3">
                    合計 {getTotalExcludedCount()} カ国・地域を除外
                  </div>
                </div>

                {/* Preferences */}
                <div className="border-t pt-4">
                  <h4 className="font-bold mb-2">Preferences</h4>
                  <div className="text-sm">
                    <label className="text-gray-600">Handling time</label>
                    <div className="font-medium">{preview.handlingTime} business days</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* eBay同期ボタン */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>DBに保存</CardTitle>
            <CardDescription>
              プレビューを確認して、問題なければDBに保存してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus === 'success' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ DBへの保存が完了しました！
                </AlertDescription>
              </Alert>
            )}

            {syncStatus === 'error' && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  ❌ 保存に失敗しました。もう一度お試しください。
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleSyncToEbay}
                disabled={syncing || syncStatus === 'success'}
                size="lg"
                variant="default"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : syncStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    保存完了
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    このポリシーを保存
                  </>
                )}
              </Button>

              <Button
                onClick={handleCreateAllPolicies}
                disabled={syncing}
                size="lg"
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Package className="w-5 h-5 mr-2" />
                全ポリシー一括作成
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              全ポリシー一括作成: {weightBands.length} 重量帯 × {pricePoints.length} 価格 = {weightBands.length * pricePoints.length} ポリシー
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
