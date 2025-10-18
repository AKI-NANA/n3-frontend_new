'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Calculator, Loader2, TrendingUp, Settings, RefreshCw, Info, Package, AlertCircle, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PolicyOption {
  id: number
  policy_number: number
  policy_name: string
  pricing_basis: 'DDP' | 'DDU'
  zone_count: number
  is_recommended: boolean
}

interface ZoneCalculation {
  zoneCode: string
  zoneName: string
  zoneType: string
  policyName: string
  policyBasis: 'DDP' | 'DDU'
  productPrice: number
  displayShipping: number
  policyHandling: number
  totalRevenue: number
  actualShippingCost: number
  shippingRatio: number
  handlingRatio: number
  tariff: number
  totalCosts: number
  profit: number
  profitMargin: number
  roi: number
  // 還付関連
  shippingRefund: number // 送料還付
  fvfRefund: number // FVF還付
  totalRefund: number // 合計還付
  profitWithRefund: number // 還付込み利益
  profitMarginWithRefund: number // 還付込み利益率
  // Payoneer
  payoneerFee: number
  status: 'excellent' | 'good' | 'acceptable' | 'warning' | 'danger'
}

export function ProfitAnalysisEnhancedTab() {
  const [loading, setLoading] = useState(true)
  const [policiesLoading, setPoliciesLoading] = useState(true)
  const [calculations, setCalculations] = useState<ZoneCalculation[]>([])
  const [availablePolicies, setAvailablePolicies] = useState<PolicyOption[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null)
  const [selectedZoneCode, setSelectedZoneCode] = useState<string | null>(null)
  
  // 調整可能なパラメータ
  const [costJPY, setCostJPY] = useState(15000)
  const [actualWeight, setActualWeight] = useState(1.0)
  const [tariffRate, setTariffRate] = useState(6.5)
  const [targetProfitMargin, setTargetProfitMargin] = useState(15)
  const [exchangeRate, setExchangeRate] = useState(150)
  
  // 🆕 梱包資材費・人件費
  const [packagingCostJPY, setPackagingCostJPY] = useState(200) // デフォルト200円
  const [laborCostJPY, setLaborCostJPY] = useState(300) // デフォルト300円
  
  // フィルター
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'good' | 'warning' | 'danger'>('ALL')
  const [showAllPolicies, setShowAllPolicies] = useState(false)

  useEffect(() => {
    loadAvailablePolicies()
  }, [showAllPolicies])

  useEffect(() => {
    if (selectedPolicyId) {
      loadAndCalculate()
    }
  }, [selectedPolicyId, costJPY, targetProfitMargin, exchangeRate, tariffRate, packagingCostJPY, laborCostJPY])

  const loadAvailablePolicies = async () => {
    try {
      setPoliciesLoading(true)
      const supabase = createClient()

      const { data: policies, error } = await supabase
        .from('ebay_shipping_policies_v2')
        .select('*')
        .order('policy_number')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (!policies || policies.length === 0) {
        console.warn('No policies found')
        setAvailablePolicies([])
        setPoliciesLoading(false)
        return
      }

      const policiesWithZoneCounts = await Promise.all(
        policies.map(async (p) => {
          const { count } = await supabase
            .from('ebay_policy_zone_rates_v2')
            .select('*', { count: 'exact', head: true })
            .eq('policy_id', p.id)
          
          return {
            id: p.id,
            policy_number: p.policy_number,
            policy_name: p.policy_name,
            pricing_basis: p.pricing_basis as 'DDP' | 'DDU',
            zone_count: count || 0,
            is_recommended: true
          }
        })
      )

      setAvailablePolicies(policiesWithZoneCounts)

      if (policiesWithZoneCounts.length > 0 && !selectedPolicyId) {
        setSelectedPolicyId(policiesWithZoneCounts[0].id)
      }
    } catch (error) {
      console.error('ポリシー読み込みエラー:', error)
      setAvailablePolicies([])
    } finally {
      setPoliciesLoading(false)
    }
  }

  const loadAndCalculate = async () => {
    if (!selectedPolicyId) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data: policy, error: policyError } = await supabase
        .from('ebay_shipping_policies_v2')
        .select(`
          *,
          zones:ebay_policy_zone_rates_v2(*)
        `)
        .eq('id', selectedPolicyId)
        .single()

      if (policyError) throw policyError
      if (!policy) {
        setCalculations([])
        setLoading(false)
        return
      }

      const policyBasis = policy.pricing_basis as 'DDP' | 'DDU'
      const costUSD = costJPY / exchangeRate
      // 🆕 梱包資材費・人件費をUSDに変換
      const packagingCostUSD = packagingCostJPY / exchangeRate
      const laborCostUSD = laborCostJPY / exchangeRate

      // 🔑 ステップ1: 配送ポリシーレベルでHandlingと商品価格を決定
      let policyHandling = 0
      let baseProductPrice = 0
      
      if (policyBasis === 'DDP') {
        const usaZone = policy.zones.find((z: any) => z.zone_type === 'USA')
        if (usaZone) {
          policyHandling = usaZone.handling_fee_usd || 0
          const displayShipping = usaZone.display_shipping_usd || 0
          const actualCost = usaZone.actual_cost_usd || 0
          
          const cifPrice = costUSD + actualCost
          const tariff = cifPrice * (tariffRate / 100)
          const ddpFees = tariff + 5
          
          // 🔴 固定費: 仕入れ + 送料 + 関税 + 出品料 + 梱包 + 人件
          const fixedCosts = costUSD + actualCost + ddpFees + 0.35 + packagingCostUSD + laborCostUSD
          // 🔴 変動費率: FVF(13.15%) + Payoneer(2%) = 15.15%
          const variableRate = 0.1315 + 0.02
          // 🔴 目標利益率を正しく反映: 必要売上 = 固定費 / (1 - 変動費率 - 目標利益率)
          const requiredRevenue = fixedCosts / (1 - variableRate - (targetProfitMargin / 100))
          
          baseProductPrice = requiredRevenue - displayShipping - policyHandling
          baseProductPrice = Math.round(baseProductPrice / 5) * 5
        }
        
      } else {
        const europeZone = policy.zones.find((z: any) => z.zone_code === 'FH')
        
        if (europeZone) {
          policyHandling = europeZone.handling_fee_usd || 0
          const displayShipping = europeZone.display_shipping_usd || 0
          const actualCost = europeZone.actual_cost_usd || 0
          
          // 🔴 固定費: 仕入れ + 送料 + 出品料 + 梱包 + 人件
          const fixedCosts = costUSD + actualCost + 0.35 + packagingCostUSD + laborCostUSD
          // 🔴 変動費率: FVF(13.15%) + Payoneer(2%) = 15.15%
          const variableRate = 0.1315 + 0.02
          // 🔴 目標利益率を正しく反映: 必要売上 = 固定費 / (1 - 変動費率 - 目標利益率)
          const requiredRevenue = fixedCosts / (1 - variableRate - (targetProfitMargin / 100))
          
          baseProductPrice = requiredRevenue - displayShipping - policyHandling
          baseProductPrice = Math.round(baseProductPrice / 5) * 5
        }
      }

      // 🔑 ステップ2: 各ZONEで計算
      const allCalculations: ZoneCalculation[] = []

      for (const zone of policy.zones || []) {
        const isDDP = zone.zone_type === 'USA'
        const productPrice = baseProductPrice
        const handling = policyHandling
        
        const displayShipping = zone.display_shipping_usd || 0
        const actualCost = zone.actual_cost_usd || 0
        
        const cifPrice = costUSD + actualCost
        const tariff = isDDP ? cifPrice * (tariffRate / 100) : 0
        const ddpFees = isDDP ? tariff + 5 : 0

        const totalRevenue = productPrice + displayShipping + handling
        
        // コスト計算
        // 🔴 固定費: 仕入れ + 送料 + 関税(DDPのみ) + 出品料 + 梱包 + 人件
        const fixedCosts = costUSD + actualCost + ddpFees + 0.35 + packagingCostUSD + laborCostUSD
        const fvf = totalRevenue * 0.1315
        const payoneerFee = totalRevenue * 0.02
        // 🔴 変動費: FVF + Payoneerのみ
        const variableCosts = fvf + payoneerFee
        const totalCosts = fixedCosts + variableCosts
        
        const profit = totalRevenue - totalCosts
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
        const roi = costUSD > 0 ? (profit / costUSD) * 100 : 0
        
        // 還付計算
        const shippingRefund = displayShipping > actualCost ? 0 : actualCost - displayShipping
        const fvfRefund = shippingRefund * 0.1315 // 送料還付分のFVF還付
        const totalRefund = shippingRefund + fvfRefund
        const profitWithRefund = profit + totalRefund
        const profitMarginWithRefund = totalRevenue > 0 ? (profitWithRefund / totalRevenue) * 100 : 0
        
        const shippingRatio = actualCost > 0 ? displayShipping / actualCost : 0
        const handlingRatio = productPrice > 0 ? (handling / productPrice) * 100 : 0

        // ステータス判定
        let status: ZoneCalculation['status'] = 'acceptable'
        if (profitMarginWithRefund >= 20 && roi >= 50 && profitWithRefund * exchangeRate >= 3000) {
          status = 'excellent'
        } else if (profitMarginWithRefund >= targetProfitMargin && roi >= 30 && profitWithRefund * exchangeRate >= 3000) {
          status = 'good'
        } else if (profitMarginWithRefund >= 10 && roi >= 20 && profitWithRefund * exchangeRate >= 3000) {
          status = 'acceptable'
        } else if (profitWithRefund * exchangeRate >= 3000) {
          status = 'warning'
        } else {
          status = 'danger'
        }

        allCalculations.push({
          zoneCode: zone.zone_code || 'Unknown',
          zoneName: zone.zone_name || 'Unknown',
          zoneType: zone.zone_type || 'OTHER',
          policyName: policy.policy_name || 'Unknown',
          policyBasis,
          productPrice,
          displayShipping,
          policyHandling: handling,
          totalRevenue,
          actualShippingCost: actualCost,
          shippingRatio,
          handlingRatio,
          tariff: isDDP ? tariff : 0,
          totalCosts,
          profit,
          profitMargin,
          roi,
          shippingRefund,
          fvfRefund,
          totalRefund,
          profitWithRefund,
          profitMarginWithRefund,
          payoneerFee,
          status
        })
      }

      setCalculations(allCalculations)
    } catch (error) {
      console.error('計算エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCalculations = useMemo(() => {
    return calculations.filter(calc => {
      if (filterStatus !== 'ALL' && calc.status !== filterStatus) return false
      return true
    })
  }, [calculations, filterStatus])

  const selectedZoneCalc = useMemo(() => {
    if (!selectedZoneCode) return null
    return calculations.find(c => c.zoneCode === selectedZoneCode)
  }, [selectedZoneCode, calculations])

  const stats = useMemo(() => {
    if (calculations.length === 0) {
      return {
        total: 0,
        excellentCount: 0,
        goodCount: 0,
        warningCount: 0,
        dangerCount: 0,
        avgProfitMargin: 0,
        avgProfitMarginWithRefund: 0,
        avgROI: 0,
        minProfitMargin: 0,
        maxProfitMargin: 0,
        productPrice: 0,
        policyHandling: 0,
        handlingRatio: 0,
        avgRefund: 0
      }
    }

    const excellentCount = calculations.filter(c => c.status === 'excellent').length
    const goodCount = calculations.filter(c => c.status === 'good').length
    const warningCount = calculations.filter(c => c.status === 'warning').length
    const dangerCount = calculations.filter(c => c.status === 'danger').length
    const avgProfitMargin = calculations.reduce((sum, c) => sum + c.profitMargin, 0) / calculations.length
    const avgProfitMarginWithRefund = calculations.reduce((sum, c) => sum + c.profitMarginWithRefund, 0) / calculations.length
    const avgROI = calculations.reduce((sum, c) => sum + c.roi, 0) / calculations.length
    const minProfitMargin = Math.min(...calculations.map(c => c.profitMarginWithRefund))
    const maxProfitMargin = Math.max(...calculations.map(c => c.profitMarginWithRefund))
    const productPrice = calculations[0]?.productPrice || 0
    const policyHandling = calculations[0]?.policyHandling || 0
    const handlingRatio = calculations[0]?.handlingRatio || 0
    const avgRefund = calculations.reduce((sum, c) => sum + c.totalRefund, 0) / calculations.length

    return {
      total: calculations.length,
      excellentCount,
      goodCount,
      warningCount,
      dangerCount,
      avgProfitMargin,
      avgProfitMarginWithRefund,
      avgROI,
      minProfitMargin,
      maxProfitMargin,
      productPrice,
      policyHandling,
      handlingRatio,
      avgRefund
    }
  }, [calculations])

  const getStatusBadge = (status: ZoneCalculation['status']) => {
    const badges = {
      excellent: { label: 'S級', color: 'bg-green-600 text-white', icon: '🌟' },
      good: { label: 'A級', color: 'bg-blue-600 text-white', icon: '⭐' },
      acceptable: { label: 'B級', color: 'bg-yellow-600 text-white', icon: '⭐' },
      warning: { label: 'C級', color: 'bg-orange-600 text-white', icon: '⚠️' },
      danger: { label: 'D級', color: 'bg-red-600 text-white', icon: '❌' }
    }
    const badge = badges[status]
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    )
  }

  const displayedPolicies = showAllPolicies 
    ? availablePolicies 
    : availablePolicies.filter(p => p.is_recommended)

  if (policiesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">配送ポリシー読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-7 h-7" />
          全ZONE利益率シミュレーション（還付込み）
        </h2>
        <p className="text-purple-100 text-sm mt-1">
          配送ポリシー固定 | Payoneer 2% | 送料還付 + FVF還付
        </p>
      </div>

      {/* パラメータ設定 */}
      <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-purple-200">
        <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          商品パラメータ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              仕入れ値（円）
            </label>
            <input
              type="number"
              value={costJPY}
              onChange={(e) => setCostJPY(parseFloat(e.target.value) || 15000)}
              className="w-full px-3 py-2 border rounded"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              重量（kg）
            </label>
            <input
              type="number"
              value={actualWeight}
              onChange={(e) => setActualWeight(parseFloat(e.target.value) || 1.0)}
              className="w-full px-3 py-2 border rounded"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              関税率（%）
            </label>
            <input
              type="number"
              value={tariffRate}
              onChange={(e) => setTariffRate(parseFloat(e.target.value) || 6.5)}
              className="w-full px-3 py-2 border rounded"
              step="0.5"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              目標利益率（%）
            </label>
            <input
              type="number"
              value={targetProfitMargin}
              onChange={(e) => setTargetProfitMargin(parseFloat(e.target.value) || 15)}
              className="w-full px-3 py-2 border rounded"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              為替レート
            </label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 150)}
              className="w-full px-3 py-2 border rounded"
              step="1"
            />
          </div>
        </div>
        
        {/* 🆕 梱包資材費・人件費 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-300">
          <div>
            <label className="block text-sm font-semibold text-yellow-800 mb-1">
              📦 梱包資材費（円）
            </label>
            <input
              type="number"
              value={packagingCostJPY}
              onChange={(e) => setPackagingCostJPY(parseFloat(e.target.value) || 200)}
              className="w-full px-3 py-2 border rounded"
              step="10"
            />
            <div className="text-xs text-yellow-700 mt-1">
              段ボール、緑巻きテープ、緩衝材等
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-yellow-800 mb-1">
              👨‍💼 人件費（円）
            </label>
            <input
              type="number"
              value={laborCostJPY}
              onChange={(e) => setLaborCostJPY(parseFloat(e.target.value) || 300)}
              className="w-full px-3 py-2 border rounded"
              step="10"
            />
            <div className="text-xs text-yellow-700 mt-1">
              梱包作業・検品・発送作業等
            </div>
          </div>
        </div>
      </div>

      {/* 配送ポリシー選択 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow-lg border-2 border-blue-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h3 className="font-bold text-blue-800 text-lg">配送ポリシー選択</h3>
          </div>
          <button
            onClick={() => setShowAllPolicies(!showAllPolicies)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {showAllPolicies ? '推奨のみ表示' : '全て表示'}
          </button>
        </div>
        
        {displayedPolicies.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">配送ポリシーがありません</p>
              <p className="text-sm text-yellow-700 mt-1">
                配送ポリシーを作成してください。
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedPolicies.map(policy => {
              const policyCalc = calculations.find(c => c.policyName === policy.policy_name)
              return (
                <button
                  key={policy.id}
                  onClick={() => setSelectedPolicyId(policy.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPolicyId === policy.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{policy.policy_name}</div>
                      <div className="text-xs text-gray-500">#{policy.policy_number}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>方式:</span>
                      <span className={`font-semibold ${
                        policy.pricing_basis === 'DDP' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {policy.pricing_basis}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ZONE数:</span>
                      <span>{policy.zone_count}</span>
                    </div>
                    {policyCalc && (
                      <div className="flex justify-between">
                        <span>平均利益率:</span>
                        <span className="font-semibold text-green-600">
                          {policyCalc.profitMarginWithRefund.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">計算中...</span>
        </div>
      ) : calculations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-600">配送ポリシーを選択してください</p>
        </div>
      ) : (
        <>
          {/* 統計情報 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-sm text-gray-600">商品価格</div>
              <div className="text-2xl font-bold text-purple-700">${stats.productPrice}</div>
              <div className="text-xs text-gray-500">全ZONE統一</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Handling</div>
              <div className="text-2xl font-bold text-blue-700">${stats.policyHandling.toFixed(2)}</div>
              <div className="text-xs text-gray-500">{stats.handlingRatio.toFixed(1)}% (固定)</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-sm text-gray-600">梱包+人件</div>
              <div className="text-2xl font-bold text-yellow-700">¥{(packagingCostJPY + laborCostJPY).toLocaleString()}</div>
              <div className="text-xs text-gray-500">${((packagingCostJPY + laborCostJPY) / exchangeRate).toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-600">平均還付</div>
              <div className="text-2xl font-bold text-green-700">${stats.avgRefund.toFixed(2)}</div>
              <div className="text-xs text-gray-500">送料+FVF</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
              <div className="text-sm text-gray-600">還付込利益率</div>
              <div className="text-2xl font-bold text-indigo-700">{stats.avgProfitMarginWithRefund.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">
                {stats.minProfitMargin.toFixed(1)}% ～ {stats.maxProfitMargin.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-sm text-gray-600">優良ZONE</div>
              <div className="text-2xl font-bold text-green-700">
                {stats.excellentCount + stats.goodCount}
              </div>
              <div className="text-xs text-gray-500">S+A級</div>
            </div>
          </div>
          
          {/* 🆕 変動費率の内訳 */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-300">
            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Info className="w-5 h-5" />
              費用構造
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded">
                <div className="font-semibold text-gray-700 mb-2">固定費</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>仕入れ原価:</span>
                    <span>¥{costJPY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>梱包資材費:</span>
                    <span className="text-yellow-700 font-semibold">¥{packagingCostJPY}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>人件費:</span>
                    <span className="text-yellow-700 font-semibold">¥{laborCostJPY}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>送料実費:</span>
                    <span>変動</span>
                  </div>
                  <div className="flex justify-between">
                    <span>関税(DDPのみ):</span>
                    <span>変動</span>
                  </div>
                  <div className="flex justify-between">
                    <span>出品料:</span>
                    <span>$0.35</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="font-semibold text-gray-700 mb-2">変動費率</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>FVF:</span>
                    <span className="font-semibold">13.15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payoneer:</span>
                    <span className="font-semibold">2.00%</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold text-base">
                    <span>合計:</span>
                    <span className="text-indigo-700">15.15%</span>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-red-600">
                      <span>削除した項目:</span>
                      <span></span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ・送金手数料(2%) → 不要<br/>
                      ・事務手数料(2%) → 不明<br/>
                      ・保険料(3%) → 不明<br/>
                      ・梱包費(1.5%) → 固定費化
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ZONE選択（送料一覧） */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-green-200">
            <h3 className="font-bold text-green-800 mb-4 text-lg flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              ZONEごとの送料一覧
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {calculations.map((calc, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedZoneCode(calc.zoneCode)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedZoneCode === calc.zoneCode
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className="font-bold text-sm">{calc.zoneCode}</div>
                  <div className="text-xs text-gray-500 truncate">{calc.zoneName}</div>
                  <div className="text-sm font-semibold text-green-700 mt-1">
                    ${calc.displayShipping.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">
                    実費: ${calc.actualShippingCost.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DDP vs DDU 比較表示 */}
          {selectedZoneCalc && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg shadow-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-800 mb-4 text-lg">
                {selectedZoneCalc.zoneCode} - {selectedZoneCalc.zoneName} 詳細
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                {/* 左側: 売上・コスト */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">売上・コスト</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品価格:</span>
                      <span className="font-semibold">${selectedZoneCalc.productPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">送料:</span>
                      <span className="font-semibold">${selectedZoneCalc.displayShipping.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Handling:</span>
                      <span className="font-semibold">${selectedZoneCalc.policyHandling.toFixed(2)}</span>
                    </div>
                    {selectedZoneCalc.policyBasis === 'DDP' && (
                      <div className="flex justify-between text-red-600">
                        <span>関税:</span>
                        <span className="font-semibold">${selectedZoneCalc.tariff.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-bold text-lg">
                      <span>総売上:</span>
                      <span className="text-blue-700">${selectedZoneCalc.totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 右側: 利益・還付 */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">利益・還付</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">基本利益:</span>
                      <span className="font-semibold">${selectedZoneCalc.profit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>送料還付:</span>
                      <span className="font-semibold">+${selectedZoneCalc.shippingRefund.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>FVF還付:</span>
                      <span className="font-semibold">+${selectedZoneCalc.fvfRefund.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg">
                      <span>還付込利益:</span>
                      <span className="text-green-700">${selectedZoneCalc.profitWithRefund.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg">
                      <span>利益率:</span>
                      <span className="text-indigo-700">{selectedZoneCalc.profitMarginWithRefund.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 結果テーブル */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">ZONE</th>
                    <th className="px-4 py-3 text-right">商品価格</th>
                    <th className="px-4 py-3 text-right">送料</th>
                    <th className="px-4 py-3 text-right">Handling</th>
                    <th className="px-4 py-3 text-right">関税</th>
                    <th className="px-4 py-3 text-right">総売上</th>
                    <th className="px-4 py-3 text-right">基本利益</th>
                    <th className="px-4 py-3 text-right">還付</th>
                    <th className="px-4 py-3 text-right">還付込利益</th>
                    <th className="px-4 py-3 text-right">利益率</th>
                    <th className="px-4 py-3 text-left">評価</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCalculations.map((calc, idx) => (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedZoneCode(calc.zoneCode)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        calc.status === 'danger' ? 'bg-red-50' :
                        calc.status === 'warning' ? 'bg-orange-50' :
                        calc.status === 'excellent' ? 'bg-green-50' :
                        selectedZoneCode === calc.zoneCode ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold">
                        {calc.zoneCode}
                        <div className="text-xs text-gray-500">{calc.zoneName}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-700">
                        ${calc.productPrice}
                      </td>
                      <td className="px-4 py-3 text-right">${calc.displayShipping.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${calc.policyHandling.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-red-600">${calc.tariff.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${calc.totalRevenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${calc.profit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">
                        +${calc.totalRefund.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        ${calc.profitWithRefund.toFixed(2)}
                        <div className="text-xs text-gray-500">
                          ¥{Math.round(calc.profitWithRefund * exchangeRate).toLocaleString()}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        calc.profitMarginWithRefund >= 20 ? 'text-green-700' :
                        calc.profitMarginWithRefund >= 15 ? 'text-blue-700' :
                        calc.profitMarginWithRefund >= 10 ? 'text-orange-700' :
                        'text-red-700'
                      }`}>
                        {calc.profitMarginWithRefund.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(calc.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
