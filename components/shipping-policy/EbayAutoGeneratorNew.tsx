'use client'

import { useState } from 'react'
import { Zap, Package, TrendingUp } from 'lucide-react'
import { autoGenerateEbayFulfillmentPolicy } from '@/lib/shipping/ebay-fulfillment-auto-generator'

const WEIGHT_PRESETS = [
  { label: '超軽量 (0.3kg)', value: 0.3, size: '20×15×5cm' },
  { label: '軽量 (0.5kg)', value: 0.5, size: '25×20×10cm' },
  { label: '中量 (1.0kg)', value: 1.0, size: '30×25×15cm' },
  { label: '重量 (2.0kg)', value: 2.0, size: '40×30×20cm' },
  { label: '超重量 (5.0kg)', value: 5.0, size: '50×40×30cm' },
]

export function EbayAutoGeneratorNew() {
  const [config, setConfig] = useState({
    policyName: 'Auto Generated Policy',
    weightKg: 0.5,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 10,
    productPriceUSD: 144.40,
    handlingDays: 10,
    targetMargin: 0.15
  })
  
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  async function handleGenerate() {
    setGenerating(true)
    setResult(null)
    
    try {
      const result = await autoGenerateEbayFulfillmentPolicy(config)
      
      setResult(result)
      
      alert(`✅ 配送ポリシー作成完了！\n\nポリシーID: ${result.policyId}\n対象国: ${result.totalCountries}カ国\n計算済: ${result.calculatedCountries}カ国\n平均利益率: ${(result.avgMargin * 100).toFixed(1)}%`)
      
    } catch (error: any) {
      alert(`❌ エラー: ${error.message}`)
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">eBay配送ポリシー自動生成</h2>
            <p className="text-sm text-gray-600">DDP/DDU調整で全世界統一利益率15%達成</p>
          </div>
        </div>
        
        {/* ポリシー名 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ポリシー名
          </label>
          <input
            type="text"
            value={config.policyName}
            onChange={(e) => setConfig({ ...config, policyName: e.target.value })}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 重量プリセット */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            重量プリセット
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {WEIGHT_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => {
                  const [l, w, h] = preset.size.replace('cm', '').split('×').map(Number)
                  setConfig({ 
                    ...config, 
                    weightKg: preset.value,
                    lengthCm: l,
                    widthCm: w,
                    heightCm: h
                  })
                }}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  config.weightKg === preset.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-sm">{preset.label}</div>
                <div className="text-xs text-gray-600">{preset.size}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* 詳細設定 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">詳細設定</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品価格（USD）
              </label>
              <input
                type="number"
                step="0.01"
                value={config.productPriceUSD}
                onChange={(e) => setConfig({ ...config, productPriceUSD: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                処理時間（営業日）
              </label>
              <input
                type="number"
                value={config.handlingDays}
                onChange={(e) => setConfig({ ...config, handlingDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                重量（kg）
              </label>
              <input
                type="number"
                step="0.1"
                value={config.weightKg}
                onChange={(e) => setConfig({ ...config, weightKg: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目標利益率
              </label>
              <select
                value={config.targetMargin}
                onChange={(e) => setConfig({ ...config, targetMargin: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              >
                <option value="0.15">15%（推奨）</option>
                <option value="0.20">20%</option>
                <option value="0.25">25%</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                長さ（cm）
              </label>
              <input
                type="number"
                value={config.lengthCm}
                onChange={(e) => setConfig({ ...config, lengthCm: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                幅（cm）
              </label>
              <input
                type="number"
                value={config.widthCm}
                onChange={(e) => setConfig({ ...config, widthCm: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                高さ（cm）
              </label>
              <input
                type="number"
                value={config.heightCm}
                onChange={(e) => setConfig({ ...config, heightCm: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
        
        {/* 自動設定内容 */}
        <div className="bg-white border-2 border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            自動計算される内容
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>推奨送料（保険込み）をCPASS/FedExデータから取得</li>
            <li>DDP国（USA）: 関税50%をHandling Feeで回収、見かけの送料を調整</li>
            <li>DDU国（その他）: バイヤー関税負担、送料を最適化</li>
            <li>全ての国で利益率{(config.targetMargin * 100).toFixed(0)}%を達成</li>
            <li>Economy（送料無料）+ Expedited（有料）の2サービス</li>
            <li>除外国: 9カ国（制裁国・APO/FPO）</li>
          </ul>
        </div>
        
        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 font-semibold text-lg"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              <span>自動生成中...</span>
            </>
          ) : (
            <>
              <Zap className="w-6 h-6" />
              <span>配送ポリシーを自動生成</span>
            </>
          )}
        </button>
        
        {/* 結果表示 */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="font-semibold text-green-900 mb-3">生成完了！</div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-gray-600">ポリシーID</div>
                <div className="font-semibold text-lg">{result.policyId}</div>
              </div>
              <div>
                <div className="text-gray-600">対象国</div>
                <div className="font-semibold text-lg text-green-600">{result.totalCountries}カ国</div>
              </div>
              <div>
                <div className="text-gray-600">計算済</div>
                <div className="font-semibold text-lg">{result.calculatedCountries}カ国</div>
              </div>
              <div>
                <div className="text-gray-600">平均利益率</div>
                <div className="font-semibold text-lg text-purple-600">
                  {(result.avgMargin * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* 国別詳細 */}
            {result.shippingResults && result.shippingResults.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">主要国の送料設定:</div>
                <div className="space-y-2">
                  {result.shippingResults.slice(0, 5).map((country: any) => (
                    <div key={country.countryCode} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <span className="font-semibold">{country.countryCode}</span>
                        <span className="text-xs text-gray-600 ml-2">
                          {country.isDDP ? 'DDP' : 'DDU'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          ${country.apparentShippingCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600">
                          利益率 {(country.calculatedMargin * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
