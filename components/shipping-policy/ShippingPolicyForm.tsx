'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, Plus, Trash2, Globe, Package, CheckCircle } from 'lucide-react'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { DomesticShippingStep } from './steps/DomesticShippingStep'
import { InternationalShippingStep } from './steps/InternationalShippingStep'
import { ExclusionStep } from './steps/ExclusionStep'
import { ConfirmationStep } from './steps/ConfirmationStep'

interface ShippingPolicyFormProps {
  mode: 'create' | 'edit'
  initialData?: any
}

export function ShippingPolicyForm({ mode, initialData }: ShippingPolicyFormProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // 基本情報
    policyName: initialData?.policyName || '',
    marketplace: initialData?.marketplace || 'EBAY_US',
    categoryType: initialData?.categoryType || 'ALL_EXCLUDING_MOTORS_VEHICLES',
    handlingTime: initialData?.handlingTime || 3,
    
    // オプション
    localPickup: initialData?.localPickup || false,
    freightShipping: initialData?.freightShipping || false,
    globalShipping: initialData?.globalShipping || false,
    
    // 配送サービス
    domesticServices: initialData?.domesticServices || [] as any[],
    internationalServices: initialData?.internationalServices || [] as any[],
    
    // 除外設定
    excludedCountries: initialData?.excludedCountries || [] as string[],
    excludedRegions: initialData?.excludedRegions || [] as string[],
  })

  const [zones, setZones] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [carriers, setCarriers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMasterData()
  }, [])

  async function loadMasterData() {
    try {
      // Zone情報取得
      const zonesRes = await fetch('/api/shipping/zones')
      const zonesData = await zonesRes.json()
      setZones(zonesData)

      // 国情報取得
      const countriesRes = await fetch('/api/shipping/countries')
      const countriesData = await countriesRes.json()
      setCountries(countriesData)

      // 配送業者取得
      const carriersRes = await fetch('/api/shipping/carriers')
      const carriersData = await carriersRes.json()
      setCarriers(carriersData)

      // 配送サービス取得  
      const servicesRes = await fetch('/api/shipping/services')
      const servicesData = await servicesRes.json()
      setServices(servicesData)
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to load master data:', error)
      setLoading(false)
    }
  }

  const totalSteps = 5

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-indigo-700">
            ステップ {step} / {totalSteps}
          </span>
          <span className="text-sm text-indigo-600 font-medium">
            {Math.round((step / totalSteps) * 100)}% 完了
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-3 shadow-inner">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out shadow-md"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs font-medium">
          <span className={step === 1 ? 'text-indigo-600' : 'text-gray-500'}>📝 基本情報</span>
          <span className={step === 2 ? 'text-indigo-600' : 'text-gray-500'}>🏠 国内配送</span>
          <span className={step === 3 ? 'text-indigo-600' : 'text-gray-500'}>🌍 国際配送</span>
          <span className={step === 4 ? 'text-indigo-600' : 'text-gray-500'}>🚫 除外設定</span>
          <span className={step === 5 ? 'text-indigo-600' : 'text-gray-500'}>✅ 確認</span>
        </div>
      </div>

      {/* ステップコンテンツ */}
      <div className="border-2 border-gray-200 rounded-xl p-6 bg-white shadow-lg">
        {step === 1 && (
          <BasicInfoStep
            formData={formData}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        )}
        {step === 2 && (
          <DomesticShippingStep
            formData={formData}
            carriers={carriers}
            services={services}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        )}
        {step === 3 && (
          <InternationalShippingStep
            formData={formData}
            zones={zones}
            countries={countries}
            carriers={carriers}
            services={services}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        )}
        {step === 4 && (
          <ExclusionStep
            formData={formData}
            countries={countries}
            zones={zones}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        )}
        {step === 5 && (
          <ConfirmationStep
            formData={formData}
            zones={zones}
            countries={countries}
            carriers={carriers}
            services={services}
          />
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
        >
          ← 戻る
        </button>
        
        <div className="text-sm text-gray-600">
          {step === 1 && '基本情報を入力してください'}
          {step === 2 && '国内配送サービスを設定してください'}
          {step === 3 && '国際配送サービスを設定してください'}
          {step === 4 && '配送除外国を設定してください（任意）'}
          {step === 5 && '内容を確認して保存してください'}
        </div>
        
        {step < totalSteps ? (
          <button
            onClick={() => setStep(Math.min(totalSteps, step + 1))}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
          >
            次へ →
          </button>
        ) : (
          <button
            onClick={() => handleSubmit(formData)}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
          >
            <Save className="w-5 h-5" />
            ポリシーを保存
          </button>
        )}
      </div>
    </div>
  )
}

async function handleSubmit(formData: any) {
  try {
    const response = await fetch('/api/ebay/fulfillment-policy/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      alert('✅ 配送ポリシーを作成しました！\neBay APIに同期されました。')
      window.location.href = '/shipping-policy-manager'
    } else {
      alert('❌ エラー: ' + result.error)
    }
  } catch (error) {
    alert('❌ エラーが発生しました')
    console.error(error)
  }
}
