'use client'

import React, { useState, useEffect } from 'react'
import {
  Calculator,
  Settings,
  Package,
  FileSearch,
  DollarSign,
  Globe,
  Wrench,
  Loader2,
  TrendingUp,
  Database,
  Layers,
  Table,
  RefreshCw,
} from 'lucide-react'
import {
  useHSCodes,
  useEbayCategoryFees,
  useShippingPolicies,
  useProfitMargins,
  useExchangeRate,
  useOriginCountries,
} from '@/hooks/use-ebay-pricing'
import { CalculatorTabComplete } from '@/components/ebay-pricing/calculator-tab-complete'
import { CalculatorTabCompleteV2 } from '@/components/ebay-pricing/calculator-tab-complete-v2'
import { MarginSettingsEdit } from '@/components/ebay-pricing/margin-settings-edit'
import { ShippingPoliciesTab } from '@/components/ebay-pricing/shipping-policies-tab'
import { ShippingPoliciesV2Tab } from '@/components/ebay-pricing/shipping-policies-v2-tab'
import { ShippingPoliciesMatrixTab } from '@/components/ebay-pricing/shipping-policies-matrix-tab'
import { ZoneManagementTab } from '@/components/ebay-pricing/zone-management-tab'
import { ZoneComparisonMatrixTab } from '@/components/ebay-pricing/zone-comparison-matrix-tab'
import { ProfitAnalysisEnhancedTab } from '@/components/ebay-pricing/profit-analysis-enhanced-tab'
import { PricingCalculatorV2 } from '@/components/ebay-pricing/pricing-calculator-v2'
import { HsCodeTab } from '@/components/ebay-pricing/hscode-tab'
import { FeeSettingsTab } from '@/components/ebay-pricing/fee-settings-tab'
import { TariffSettingsTab } from '@/components/ebay-pricing/tariff-settings-tab'
import { PackagingLaborCostsEdit } from '@/components/ebay-pricing/packaging-labor-costs-edit'
import { RateManagementTab } from '@/components/ebay-pricing/rate-management-tab'
import { DatabaseViewTab } from '@/components/ebay-pricing/database-view-tab'
import { DatabaseStructureMap } from '@/components/database-map/database-structure-map'
import { HTSCodeSearchTab } from '@/components/ebay-pricing/hts-code-search-tab'
import { BulkPatternCalculator } from '@/components/ebay-pricing/bulk-pattern-calculator'
import { PriceAutomationTab } from '@/components/pricing-automation/PriceAutomationTab'
import { TabButton } from '@/components/ebay-pricing/tab-button'
import { PriceCalculationEngine } from '@/lib/ebay-pricing/price-calculation-engine'
import { STORE_FEES } from '@/lib/constants/ebay'
import { UsaShippingCalculatorTest } from '@/components/ebay-pricing/usa-shipping-calculator-test'
import { UsaPriceCalculatorComplete } from '@/components/ebay-pricing/usa-price-calculator-complete'
import { testHTSSearch } from '@/lib/ebay-pricing/test-hts-search'
import { calculateUsaPrice } from '@/lib/ebay-pricing/usa-price-calculator'
import { calculateUsaPriceV2 } from '@/lib/ebay-pricing/usa-price-calculator-v2'
import { calculateUsaPriceV3 } from '@/lib/ebay-pricing/usa-price-calculator-v3'


export default function EbayPricingPage() {
  const [activeTab, setActiveTab] = useState('calculator-v2')
  const [calculationResultDDP, setCalculationResultDDP] = useState<any>(null)
  const [calculationResultDDU, setCalculationResultDDU] = useState<any>(null)

  const { hsCodes, loading: hsLoading } = useHSCodes()
  const { categoryFees: categoryFeesObj, getCategoryFee, loading: feesLoading } = useEbayCategoryFees()
  const { policies, selectOptimalPolicy, loading: policiesLoading } = useShippingPolicies()
  const { margins, getMarginSetting, loading: marginsLoading } = useProfitMargins()
  const { exchangeRate, loading: rateLoading } = useExchangeRate()
  const { countries, loading: countriesLoading } = useOriginCountries()

  const categoryFees = Object.values(categoryFeesObj)

  const [formData, setFormData] = useState({
    costJPY: 15000,
    actualWeight: 1.0,
    length: 40,
    width: 30,
    height: 20,
    destCountry: 'US',
    originCountry: 'JP',
    hsCode: '9620.00.20.00',
    fvfRate: 0.1315,
    storeType: 'none' as keyof typeof STORE_FEES,
    refundableFeesJPY: 0,
    shippingFeeUSD: 0,
    otherShippingFeeUSD: 0,
    exchangeRate: 150,
  })

  const hsCodesDB = hsCodes.reduce((acc: any, hs: any) => {
    acc[hs.code] = hs
    return acc
  }, {})

  const handleCalculate = async (adjustments?: {
    targetProfitMargin: number
    costAdjustmentPercent: number
    shippingAdjustmentPercent: number
    otherCostAdjustmentPercent: number
    adjustedCostJPY: number
    adjustedShippingCost: number
  }) => {
    if (hsLoading || feesLoading || marginsLoading || rateLoading) {
      const errorResult = {
        success: false,
        error: 'データを読み込み中です。少々お待ちください。',
      }
      setCalculationResultDDP(errorResult)
      setCalculationResultDDU(errorResult)
      return
    }

    const actualCostJPY = adjustments?.adjustedCostJPY || formData.costJPY
    const targetMargin = (adjustments?.targetProfitMargin || 15) / 100

    const effectiveWeight = PriceCalculationEngine.getEffectiveWeight(
      formData.actualWeight,
      formData.length,
      formData.width,
      formData.height
    )

    console.log('📦 DDP計算開始 (新ロジック) - 重量:', effectiveWeight, 'kg')
    try {
      const resultDDP = await calculateUsaPriceV2({
        costJPY: actualCostJPY,
        weight_kg: effectiveWeight,
        targetProductPriceRatio: 0.8,
        targetMargin: targetMargin,
        hsCode: formData.hsCode,
        originCountry: formData.originCountry,
        storeType: formData.storeType,
        fvfRate: formData.fvfRate,
        exchangeRate: formData.exchangeRate || exchangeRate.safe
      })
      
      console.log('📦 DDP計算結果:', resultDDP)
      
      if (resultDDP && resultDDP.success) {
        const adaptedResult = {
          success: true,
          hsCode: formData.hsCode,
          originCountry: formData.originCountry,
          productPrice: resultDDP.productPrice,
          shipping: resultDDP.shipping,
          handling: 0,
          totalRevenue: resultDDP.totalRevenue,
          searchDisplayPrice: resultDDP.searchDisplayPrice || resultDDP.totalRevenue,
          profitUSD: resultDDP.profitUSD_NoRefund,
          profitMargin: resultDDP.profitMargin_NoRefund,
          profitMargin_NoRefund: resultDDP.profitMargin_NoRefund,
          profitJPY: resultDDP.profitUSD_NoRefund * (formData.exchangeRate || exchangeRate.safe),
          profitJPY_NoRefund: resultDDP.profitUSD_NoRefund * (formData.exchangeRate || exchangeRate.safe),
          refundUSD: resultDDP.refundUSD,
          refundJPY: resultDDP.refundUSD * (formData.exchangeRate || exchangeRate.safe),
          refundAmount: resultDDP.refundUSD * (formData.exchangeRate || exchangeRate.safe),
          profitWithRefundUSD: resultDDP.profitUSD_WithRefund,
          profitWithRefundJPY: resultDDP.profitJPY_WithRefund,
          tariff: {
            hsCode: formData.hsCode,
            baseDuty: resultDDP.tariffRate * 100,
            effectiveDuty: resultDDP.tariffRate * 100,
            tariffUSD: resultDDP.tariffAmount,
            mpf: resultDDP.mpf,
            hmf: resultDDP.hmf,
            ddpFee: resultDDP.ddpServiceFee,
            ddpTotal: resultDDP.ddpTotal
          },
          breakdown: {
            costUSD: resultDDP.costUSD.toFixed(2),
            actualShipping: resultDDP.shippingCost.toFixed(2),
            tariff: resultDDP.tariffAmount.toFixed(2),
            mpf: resultDDP.mpf.toFixed(2),
            hmf: resultDDP.hmf.toFixed(2),
            ddpFee: resultDDP.ddpServiceFee.toFixed(2),
            ddpTotal: resultDDP.ddpTotal.toFixed(2),
            fvf: parseFloat(resultDDP.breakdown.fvf).toFixed(2),
            storeDiscount: '0.00',
            payoneer: parseFloat(resultDDP.breakdown.payoneer).toFixed(2),
            exchangeLoss: parseFloat(resultDDP.breakdown.exchangeLoss).toFixed(2),
            internationalFee: parseFloat(resultDDP.breakdown.internationalFee).toFixed(2),
            totalCosts: parseFloat(resultDDP.breakdown.totalCosts).toFixed(2)
          },
          costs: {
            costUSD: resultDDP.costUSD,
            actualShipping: resultDDP.shippingCost,
            tariff: resultDDP.tariffAmount,
            mpf: resultDDP.mpf,
            hmf: resultDDP.hmf,
            ddpFee: resultDDP.ddpServiceFee,
            ddpTotal: resultDDP.ddpTotal,
            fvf: parseFloat(resultDDP.breakdown.fvf),
            storeDiscount: 0,
            payoneer: parseFloat(resultDDP.breakdown.payoneer),
            exchangeLoss: parseFloat(resultDDP.breakdown.exchangeLoss),
            internationalFee: parseFloat(resultDDP.breakdown.internationalFee),
            totalCosts: parseFloat(resultDDP.breakdown.totalCosts)
          },
          calculationSteps: resultDDP.calculationSteps,
          formulas: resultDDP.formulas,
          policy: resultDDP.policy,
          recommended: resultDDP.recommended,
          alternative: resultDDP.alternative,
          comparison: resultDDP.comparison,
          targetProfitMargin: (adjustments?.targetProfitMargin || 15)
        }
        
        console.log('✅ DDP計算完了:', adaptedResult)
        
        if (typeof window !== 'undefined') {
          (window as any).calculationResultDDP = adaptedResult
        }
        
        setCalculationResultDDP(adaptedResult)
      } else {
        console.error('❌ DDP計算失敗:', resultDDP)
        setCalculationResultDDP({
          success: false,
          error: resultDDP?.error || 'DDP計算に失敗しました'
        })
      }
    } catch (error) {
      console.error('DDP計算エラー:', error)
      setCalculationResultDDP({
        success: false,
        error: `DDP計算エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
      })
    }

    console.log('🌍 DDU計算スキップ - 配送ポリシーAPIは使用しません')
    
    setCalculationResultDDU({
      success: false,
      error: '適切な配送ポリシーが見つかりませんでした。',
    })
  }

  useEffect(() => {}, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const isLoading = hsLoading || feesLoading || policiesLoading || marginsLoading || rateLoading || countriesLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              eBay DDP/DDU 価格計算システム（精密版）
            </h1>
          </div>
          <p className="text-gray-600">
            ✅ DDP精密計算（MPF/HMF対応） | HSコード連携 | 容積重量 | 消費税還付 | 港湾/空輸判定
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-6 p-2">
          <div className="flex gap-2 flex-wrap">
            <TabButton
              icon={Calculator}
              label="価格計算（精密版）"
              active={activeTab === 'calculator-v2'}
              onClick={() => setActiveTab('calculator-v2')}
              badge="NEW"
            />
            <TabButton
              icon={Calculator}
              label="価格計算（標準）"
              active={activeTab === 'calculator'}
              onClick={() => setActiveTab('calculator')}
            />
            <TabButton
              icon={RefreshCw}
              label="🔄 価格自動更新"
              active={activeTab === 'price-automation'}
              onClick={() => setActiveTab('price-automation')}
              badge="NEW"
            />
            <TabButton
              icon={Layers}
              label="36ポリシー"
              active={activeTab === 'policies-v2'}
              onClick={() => setActiveTab('policies-v2')}
            />
            <TabButton
              icon={Table}
              label="マトリックス表"
              active={activeTab === 'matrix'}
              onClick={() => setActiveTab('matrix')}
            />
            <TabButton
              icon={Globe}
              label="22 ZONE管理"
              active={activeTab === 'zones'}
              onClick={() => setActiveTab('zones')}
            />
            <TabButton
              icon={Globe}
              label="ZONE比較"
              active={activeTab === 'zone-matrix'}
              onClick={() => setActiveTab('zone-matrix')}
            />
            <TabButton
              icon={Calculator}
              label="利益率シミュレーション"
              active={activeTab === 'profit-analysis'}
              onClick={() => setActiveTab('profit-analysis')}
              badge="NEW"
            />
            <TabButton
              icon={Settings}
              label="利益率設定"
              active={activeTab === 'margin'}
              onClick={() => setActiveTab('margin')}
            />
            <TabButton
              icon={Package}
              label="配送ポリシー(旧)"
              active={activeTab === 'policies'}
              onClick={() => setActiveTab('policies')}
            />
            <TabButton
              icon={FileSearch}
              label="HSコード管理"
              active={activeTab === 'hscode'}
              onClick={() => setActiveTab('hscode')}
            />
            <TabButton
              icon={DollarSign}
              label="手数料設定"
              active={activeTab === 'fees'}
              onClick={() => setActiveTab('fees')}
            />
            <TabButton
              icon={Globe}
              label="原産国・関税"
              active={activeTab === 'tariffs'}
              onClick={() => setActiveTab('tariffs')}
            />
            <TabButton
              icon={Wrench}
              label="梱包費用設定"
              active={activeTab === 'packaging'}
              onClick={() => setActiveTab('packaging')}
            />
            <TabButton
              icon={TrendingUp}
              label="変動要素管理"
              active={activeTab === 'rates'}
              onClick={() => setActiveTab('rates')}
            />
            <TabButton
              icon={FileSearch}
              label="🔍 HTS検索"
              active={activeTab === 'hts-search'}
              onClick={() => setActiveTab('hts-search')}
              badge="NEW"
            />
            <TabButton
              icon={Database}
              label="📊 DBマップ"
              active={activeTab === 'db-map'}
              onClick={() => setActiveTab('db-map')}
              badge="NEW"
            />
            <TabButton
              icon={Database}
              label="データベース表示"
              active={activeTab === 'database'}
              onClick={() => setActiveTab('database')}
            />
            <TabButton
              icon={Package}
              label="USA配送テスト"
              active={activeTab === 'usa-shipping-test'}
              onClick={() => setActiveTab('usa-shipping-test')}
              badge="TEST"
            />
            <TabButton
              icon={Calculator}
              label="USA価格計算"
              active={activeTab === 'usa-price-calc'}
              onClick={() => setActiveTab('usa-price-calc')}
              badge="NEW"
            />
            <TabButton
              icon={Calculator}
              label="📊 一括計算"
              active={activeTab === 'bulk-calc'}
              onClick={() => setActiveTab('bulk-calc')}
              badge="NEW"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'calculator-v2' && (
            <CalculatorTabCompleteV2
              formData={formData}
              onInputChange={handleInputChange}
            />
          )}
          {activeTab === 'calculator' && (
            <CalculatorTabComplete
              formData={formData}
              onInputChange={handleInputChange}
              onCalculate={handleCalculate}
              resultDDP={calculationResultDDP}
              resultDDU={calculationResultDDU}
              hsCodes={hsCodes}
              countries={countries}
              categoryFees={categoryFees}
            />
          )}
          {activeTab === 'price-automation' && <PriceAutomationTab />}
          {activeTab === 'policies-v2' && <ShippingPoliciesV2Tab />}
          {activeTab === 'matrix' && <ShippingPoliciesMatrixTab />}
          {activeTab === 'zones' && <ZoneManagementTab />}
          {activeTab === 'zone-matrix' && <ZoneComparisonMatrixTab />}
          {activeTab === 'profit-analysis' && <ProfitAnalysisEnhancedTab />}
          {activeTab === 'margin' && <MarginSettingsEdit />}
          {activeTab === 'policies' && <ShippingPoliciesTab policies={policies} />}
          {activeTab === 'hscode' && <HsCodeTab hsCodes={hsCodes} />}
          {activeTab === 'fees' && <FeeSettingsTab categoryFees={categoryFees} />}
          {activeTab === 'tariffs' && <TariffSettingsTab countries={countries} />}
          {activeTab === 'packaging' && <PackagingLaborCostsEdit />}
          {activeTab === 'rates' && <RateManagementTab exchangeRate={exchangeRate} />}
          {activeTab === 'hts-search' && <HTSCodeSearchTab />}
          {activeTab === 'db-map' && <DatabaseStructureMap />}
          {activeTab === 'database' && <DatabaseViewTab />}
          {activeTab === 'usa-shipping-test' && <UsaShippingCalculatorTest />}
          {activeTab === 'usa-price-calc' && <UsaPriceCalculatorComplete />}
          {activeTab === 'bulk-calc' && <BulkPatternCalculator />}
        </div>
      </div>
    </div>
  )
}
