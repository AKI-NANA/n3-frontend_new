'use client'

import React, { useState } from 'react'
import {
  Calculator,
  Settings,
  Package,
  FileSearch,
  DollarSign,
  Globe,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import {
  useHSCodes,
  useEbayCategoryFees,
  useShippingPolicies,
  useProfitMargins,
  useExchangeRate,
  useOriginCountries,
  useSaveCalculation,
} from '@/hooks/use-ebay-pricing'
import { CalculatorTab } from '@/components/ebay-pricing/calculator-tab'
import { MarginSettingsTab } from '@/components/ebay-pricing/margin-settings-tab'
import { ShippingPoliciesTab } from '@/components/ebay-pricing/shipping-policies-tab'
import { HsCodeTab } from '@/components/ebay-pricing/hscode-tab'
import { FeeSettingsTab } from '@/components/ebay-pricing/fee-settings-tab'
import { TariffSettingsTab } from '@/components/ebay-pricing/tariff-settings-tab'
import { PackagingCostTab } from '@/components/ebay-pricing/packaging-cost-tab'
import { TabButton } from '@/components/ebay-pricing/tab-button'

// 消費税率
const CONSUMPTION_TAX_RATE = 0.1

// ストアタイプ
export const STORE_FEES = {
  none: { name: 'ストアなし', fvf_discount: 0 },
  basic: { name: 'Basic', fvf_discount: 0.04 },
  premium: { name: 'Premium', fvf_discount: 0.06 },
  anchor: { name: 'Anchor', fvf_discount: 0.08 },
}

// 価格計算エンジン
export const PriceCalculationEngine = {
  calculateVolumetricWeight(length: number, width: number, height: number) {
    return (length * width * height) / 5000
  },

  getEffectiveWeight(actualWeight: number, length: number, width: number, height: number) {
    const volumetric = this.calculateVolumetricWeight(length, width, height)
    return Math.max(actualWeight, volumetric)
  },

  getTariffRate(hsCode: string, originCountry: string, hsCodesDB: any) {
    const hsData = hsCodesDB[hsCode]
    if (!hsData)
      return { rate: 0.06, description: 'HSコード未登録', section301: false }

    let totalRate = hsData.base_duty
    if (originCountry === 'CN' && hsData.section301) {
      totalRate += (hsData.section301_rate || 0.25)
    }

    return {
      rate: totalRate,
      description: hsData.description,
      section301: hsData.section301,
    }
  },

  calculateDDPFee(cifPrice: number) {
    return Math.min(3.5 + cifPrice * 0.025, 25.0)
  },

  calculateConsumptionTaxRefund(costJPY: number, refundableFeesJPY: number) {
    const taxableAmount = costJPY + refundableFeesJPY
    const refund = taxableAmount * (CONSUMPTION_TAX_RATE / (1 + CONSUMPTION_TAX_RATE))
    return {
      taxableAmount,
      refund,
      effectiveCost: costJPY - refund,
    }
  },

  calculate(params: any, policy: any, marginSetting: any, categoryFee: any, exchangeRate: any, hsCodesDB: any) {
    const {
      costJPY,
      actualWeight,
      length,
      width,
      height,
      destCountry,
      originCountry = 'JP',
      hsCode,
      storeType = 'none',
      refundableFeesJPY = 0,
    } = params

    const effectiveWeight = this.getEffectiveWeight(actualWeight, length, width, height)
    const volumetricWeight = this.calculateVolumetricWeight(length, width, height)
    const refundCalc = this.calculateConsumptionTaxRefund(costJPY, refundableFeesJPY)
    const costUSD = costJPY / exchangeRate.safe

    const zone = policy.zones?.find((z: any) => z.country_code === destCountry)
    if (!zone) {
      return { success: false, error: `国 ${destCountry} は未対応です` }
    }

    const tariffData = this.getTariffRate(hsCode, originCountry, hsCodesDB)
    const cifPrice = costUSD + zone.actual_cost
    const tariff = cifPrice * tariffData.rate

    const isDDP = destCountry === 'US'
    let ddpFee = 0
    if (isDDP) {
      ddpFee = this.calculateDDPFee(cifPrice)
    }

    const fixedCosts = costUSD + zone.actual_cost + tariff + ddpFee + categoryFee.insertion_fee
    const targetMargin = marginSetting.default_margin
    const minMargin = marginSetting.min_margin
    const minProfitAmount = marginSetting.min_amount

    const storeFee = STORE_FEES[storeType as keyof typeof STORE_FEES]
    const finalFVF = Math.max(0, categoryFee.fvf - storeFee.fvf_discount)
    const variableRate = finalFVF + 0.02 + 0.03 + 0.015
    const requiredRevenue = fixedCosts / (1 - variableRate - targetMargin)

    const baseHandling = isDDP ? (zone.handling_ddp || 0) : zone.handling_ddu
    let productPrice = requiredRevenue - zone.display_shipping - baseHandling
    productPrice = Math.round(productPrice / 5) * 5

    const totalRevenue = productPrice + zone.display_shipping + baseHandling

    let fvf = totalRevenue * finalFVF
    if (categoryFee.cap && fvf > categoryFee.cap) {
      fvf = categoryFee.cap
    }

    const variableCosts = fvf + totalRevenue * 0.02 + totalRevenue * 0.03 + totalRevenue * 0.015
    const totalCosts = fixedCosts + variableCosts
    const profitUSD_NoRefund = totalRevenue - totalCosts
    const profitMargin_NoRefund = profitUSD_NoRefund / totalRevenue

    const refundUSD = refundCalc.refund / exchangeRate.safe
    const profitUSD_WithRefund = profitUSD_NoRefund + refundUSD
    const profitJPY_WithRefund = profitUSD_WithRefund * exchangeRate.spot

    if (profitMargin_NoRefund < minMargin || profitUSD_NoRefund < minProfitAmount) {
      return {
        success: false,
        error: '最低利益率・最低利益額を確保できません（還付なし基準）',
        current_profit_no_refund: profitUSD_NoRefund.toFixed(2),
        current_margin: (profitMargin_NoRefund * 100).toFixed(2) + '%',
        min_profit_amount: minProfitAmount,
        min_margin: (minMargin * 100).toFixed(1) + '%',
      }
    }

    const searchDisplayPrice = productPrice + zone.display_shipping + baseHandling

    return {
      success: true,
      productPrice,
      shipping: zone.display_shipping,
      handling: baseHandling,
      totalRevenue,
      searchDisplayPrice,
      profitUSD_NoRefund,
      profitMargin_NoRefund,
      profitJPY_NoRefund: profitUSD_NoRefund * exchangeRate.spot,
      profitUSD_WithRefund,
      profitJPY_WithRefund,
      refundAmount: refundCalc.refund,
      refundUSD,
      minMargin,
      minProfitAmount,
      policyUsed: policy.policy_name,
      isDDP,
      hsCode,
      tariffData,
      effectiveWeight,
      volumetricWeight,
      actualWeight,
      formulas: [
        { step: 1, label: '容積重量', formula: `(${length} × ${width} × ${height}) ÷ 5000 = ${volumetricWeight.toFixed(2)}kg` },
        { step: 2, label: '適用重量', formula: `max(実重量${actualWeight}kg, 容積${volumetricWeight.toFixed(2)}kg) = ${effectiveWeight.toFixed(2)}kg` },
        { step: 3, label: '消費税還付額', formula: `(仕入¥${costJPY.toLocaleString()} + 還付対象手数料¥${refundableFeesJPY.toLocaleString()}) × 10/110 = ¥${Math.round(refundCalc.refund).toLocaleString()}` },
        { step: 4, label: 'USD変換', formula: `¥${costJPY.toLocaleString()} ÷ ${exchangeRate.safe.toFixed(2)} = $${costUSD.toFixed(2)}` },
        { step: 5, label: 'CIF価格', formula: `原価$${costUSD.toFixed(2)} + 実送料$${zone.actual_cost} = $${cifPrice.toFixed(2)}` },
        { step: 6, label: '関税', formula: `CIF × ${(tariffData.rate * 100).toFixed(2)}% (${tariffData.description}) = $${tariff.toFixed(2)}` },
        { step: 7, label: 'DDP手数料', formula: isDDP ? `min($3.50 + CIF×2.5%, $25) = $${ddpFee.toFixed(2)}` : 'DDUのため不要' },
        { step: 8, label: '固定コスト', formula: `原価 + 実送料 + 関税 + ${isDDP ? 'DDP手数料' : '0'} + 出品料 = $${fixedCosts.toFixed(2)}` },
        { step: 9, label: 'Handling', formula: `${isDDP ? 'DDP' : 'DDU'}モード、価格帯${policy.policy_name} = $${baseHandling}` },
        { step: 10, label: '商品価格', formula: `必要売上 - 送料 - Handling = $${productPrice}` },
        { step: 11, label: '検索表示価格', formula: `$${productPrice} + $${zone.display_shipping} + $${baseHandling} = $${searchDisplayPrice.toFixed(2)}` },
        { step: 12, label: '利益（還付なし）', formula: `売上$${totalRevenue.toFixed(2)} - コスト$${totalCosts.toFixed(2)} = $${profitUSD_NoRefund.toFixed(2)} (${(profitMargin_NoRefund * 100).toFixed(2)}%)` },
        { step: 13, label: '利益（還付込み）', formula: `還付なし$${profitUSD_NoRefund.toFixed(2)} + 還付$${refundUSD.toFixed(2)} = $${profitUSD_WithRefund.toFixed(2)} (¥${Math.round(profitJPY_WithRefund).toLocaleString()})` },
      ],
      breakdown: {
        costUSD: costUSD.toFixed(2),
        actualShipping: zone.actual_cost.toFixed(2),
        cifPrice: cifPrice.toFixed(2),
        tariff: tariff.toFixed(2),
        ddpFee: ddpFee.toFixed(2),
        fvf: fvf.toFixed(2),
        fvfRate: (finalFVF * 100).toFixed(2) + '%',
        storeDiscount: (storeFee.fvf_discount * 100).toFixed(2) + '%',
        payoneer: (totalRevenue * 0.02).toFixed(2),
        exchangeLoss: (totalRevenue * 0.03).toFixed(2),
        internationalFee: (totalRevenue * 0.015).toFixed(2),
        totalCosts: totalCosts.toFixed(2),
      },
    }
  },
}

export default function EbayPricingPage() {
  const [activeTab, setActiveTab] = useState('calculator')
  const [calculationResult, setCalculationResult] = useState<any>(null)

  const { hsCodes, loading: hsLoading } = useHSCodes()
  const { categoryFees, getCategoryFee, loading: feesLoading } = useEbayCategoryFees()
  const { policies, selectOptimalPolicy, loading: policiesLoading } = useShippingPolicies()
  const { margins, getMarginSetting, loading: marginsLoading } = useProfitMargins()
  const { exchangeRate, loading: rateLoading } = useExchangeRate()
  const { countries, loading: countriesLoading } = useOriginCountries()
  const { saveCalculation } = useSaveCalculation()

  const [formData, setFormData] = useState({
    costJPY: 15000,
    actualWeight: 1.0,
    length: 40,
    width: 30,
    height: 20,
    destCountry: 'US',
    originCountry: 'JP',
    hsCode: '9023.00.0000',
    category: 'Collectibles',
    storeType: 'none',
    refundableFeesJPY: 0,
  })

  const hsCodesDB = hsCodes.reduce((acc: any, hs: any) => {
    acc[hs.code] = hs
    return acc
  }, {})

  const handleCalculate = async () => {
    if (hsLoading || feesLoading || policiesLoading || marginsLoading || rateLoading) {
      setCalculationResult({
        success: false,
        error: 'データを読み込み中です。少々お待ちください。',
      })
      return
    }

    const estimatedPrice = (formData.costJPY / exchangeRate.safe) * 1.5
    const effectiveWeight = PriceCalculationEngine.getEffectiveWeight(
      formData.actualWeight,
      formData.length,
      formData.width,
      formData.height
    )
    const policy = selectOptimalPolicy(effectiveWeight, estimatedPrice)

    if (!policy) {
      setCalculationResult({
        success: false,
        error: '適切な配送ポリシーが見つかりませんでした。',
      })
      return
    }

    const categoryFee = getCategoryFee(formData.category)
    const marginSetting = getMarginSetting(formData.category, formData.destCountry, 'used')

    const result = PriceCalculationEngine.calculate(
      formData,
      policy,
      marginSetting,
      categoryFee,
      exchangeRate,
      hsCodesDB
    )

    setCalculationResult(result)

    if (result.success) {
      try {
        await saveCalculation({
          ...formData,
          product_price: result.productPrice,
          shipping: result.shipping,
          handling: result.handling,
          total_revenue: result.totalRevenue,
          profit_usd_no_refund: result.profitUSD_NoRefund,
          profit_usd_with_refund: result.profitUSD_WithRefund,
          profit_jpy_no_refund: result.profitJPY_NoRefund,
          profit_jpy_with_refund: result.profitJPY_WithRefund,
          profit_margin: result.profitMargin_NoRefund,
          refund_amount: result.refundAmount,
          success: true,
        })
      } catch (err) {
        console.error('Failed to save calculation:', err)
      }
    }
  }

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              eBay DDP/DDU 価格計算システム
            </h1>
          </div>
          <p className="text-gray-600">
            HSコード連携 | 容積重量 | 消費税還付（2パターン利益表示） | DDP/DDU最適化
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-6 p-2">
          <div className="flex gap-2 flex-wrap">
            <TabButton
              icon={Calculator}
              label="価格計算"
              active={activeTab === 'calculator'}
              onClick={() => setActiveTab('calculator')}
            />
            <TabButton
              icon={Settings}
              label="利益率設定"
              active={activeTab === 'margin'}
              onClick={() => setActiveTab('margin')}
            />
            <TabButton
              icon={Package}
              label="配送ポリシー"
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'calculator' && (
            <CalculatorTab
              formData={formData}
              onInputChange={handleInputChange}
              onCalculate={handleCalculate}
              result={calculationResult}
              hsCodes={hsCodes}
              countries={countries}
              categoryFees={Object.keys(categoryFees)}
            />
          )}
          {activeTab === 'margin' && <MarginSettingsTab margins={margins} />}
          {activeTab === 'policies' && <ShippingPoliciesTab policies={policies} />}
          {activeTab === 'hscode' && <HsCodeTab hsCodes={hsCodes} />}
          {activeTab === 'fees' && <FeeSettingsTab categoryFees={categoryFees} />}
          {activeTab === 'tariffs' && <TariffSettingsTab countries={countries} />}
          {activeTab === 'packaging' && <PackagingCostTab />}
        </div>
      </div>
    </div>
  )
}
