// components/ebay-pricing/calculation-steps-display-enhanced.tsx
'use client'

import { HelpCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

/**
 * 🆕 パイプライン進行状況を表示する拡張版コンポーネント
 * 
 * 機能:
 * - リサーチ → 計算 → 承認 → 出品の4段階を可視化
 * - エラー発生箇所の特定と表示
 * - 各ステップの詳細情報表示
 */

export interface PipelineStage {
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped'
  message?: string
  error?: string
  data?: any
}

export interface EnhancedCalculationResult {
  success: boolean
  error?: string
  
  // パイプライン情報
  pipeline?: {
    currentStage: 'research' | 'calculation' | 'approval' | 'listing' | 'inventory'
    stages: PipelineStage[]
  }
  
  // 既存のフィールド
  tariff?: any
  calculationSteps?: any[]
  recommended?: any
  alternative?: any
  comparison?: any
  originCountry?: string
  
  // リサーチデータ
  researchData?: {
    competitorPrices?: Array<{
      title: string
      price: number
      shipping: number
      seller: string
      condition: string
    }>
    salesVelocity?: {
      last7Days: number
      last30Days: number
      averagePrice: number
    }
    marketDemand?: 'high' | 'medium' | 'low'
  }
  
  // 承認情報
  approval?: {
    status: 'pending' | 'approved' | 'rejected'
    approvedBy?: string
    approvedAt?: string
    comments?: string
  }
  
  // 出品情報
  listing?: {
    ebayItemId?: string
    listingUrl?: string
    listedAt?: string
    status?: 'active' | 'ended' | 'draft'
  }
}

export function CalculationStepsDisplayEnhanced({ result }: { result: EnhancedCalculationResult | null }) {
  if (!result) return null

  return (
    <div className="space-y-4">
      {/* 🔄 パイプライン進行状況 */}
      {result.pipeline && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-lg p-4 border-2 border-indigo-300">
          <h4 className="font-bold text-indigo-800 mb-4 text-base flex items-center gap-2">
            🔄 パイプライン進行状況
          </h4>
          
          <div className="space-y-3">
            {result.pipeline.stages.map((stage, idx) => (
              <div 
                key={idx} 
                className={`
                  bg-white rounded-lg p-4 border-2 transition-all
                  ${stage.status === 'completed' ? 'border-green-300' : ''}
                  ${stage.status === 'in-progress' ? 'border-blue-400 shadow-lg' : ''}
                  ${stage.status === 'failed' ? 'border-red-400' : ''}
                  ${stage.status === 'pending' ? 'border-gray-200 opacity-50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* ステータスアイコン */}
                  <div className="flex-shrink-0">
                    {stage.status === 'completed' && (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    )}
                    {stage.status === 'in-progress' && (
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    {stage.status === 'failed' && (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                    {stage.status === 'pending' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full" />
                    )}
                    {stage.status === 'skipped' && (
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    )}
                  </div>
                  
                  {/* ステージ情報 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold text-gray-800">{stage.name}</h5>
                      <span className={`
                        px-2 py-0.5 text-xs rounded-full font-semibold
                        ${stage.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        ${stage.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : ''}
                        ${stage.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                        ${stage.status === 'pending' ? 'bg-gray-100 text-gray-600' : ''}
                        ${stage.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {stage.status === 'completed' && '完了'}
                        {stage.status === 'in-progress' && '実行中'}
                        {stage.status === 'failed' && '失敗'}
                        {stage.status === 'pending' && '待機中'}
                        {stage.status === 'skipped' && 'スキップ'}
                      </span>
                    </div>
                    
                    {stage.message && (
                      <p className="text-sm text-gray-600">{stage.message}</p>
                    )}
                    
                    {stage.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>エラー:</strong> {stage.error}
                      </div>
                    )}
                    
                    {stage.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                          詳細データを表示
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(stage.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ❌ エラー詳細表示 */}
      {!result.success && result.error && (
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow-lg p-4 border-2 border-red-400">
          <h4 className="font-bold text-red-800 mb-3 text-base flex items-center gap-2">
            ❌ 計算エラー
          </h4>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="text-red-700 mb-2">{result.error}</p>
            
            <div className="mt-3 p-3 bg-red-50 rounded text-sm">
              <p className="font-semibold text-red-800 mb-2">トラブルシューティング:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                <li>HTSコードが正しく入力されているか確認してください</li>
                <li>重量が適切な範囲内か確認してください</li>
                <li>配送ポリシーが設定されているか確認してください</li>
                <li>問題が解決しない場合は、コンソールログを確認してください</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 リサーチデータ表示 */}
      {result.researchData && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg shadow-lg p-4 border-2 border-cyan-300">
          <h4 className="font-bold text-cyan-800 mb-3 text-base flex items-center gap-2">
            🔍 リサーチデータ
            <Tooltip text="eBayの競合商品データと市場分析" />
          </h4>
          
          <div className="bg-white rounded-lg p-4 space-y-3">
            {/* 市場需要 */}
            {result.researchData.marketDemand && (
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-gray-700 font-semibold">市場需要:</span>
                <span className={`
                  px-3 py-1 rounded-full font-bold
                  ${result.researchData.marketDemand === 'high' ? 'bg-green-100 text-green-800' : ''}
                  ${result.researchData.marketDemand === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${result.researchData.marketDemand === 'low' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {result.researchData.marketDemand === 'high' && '高'}
                  {result.researchData.marketDemand === 'medium' && '中'}
                  {result.researchData.marketDemand === 'low' && '低'}
                </span>
              </div>
            )}
            
            {/* 販売速度 */}
            {result.researchData.salesVelocity && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-600">7日間</div>
                  <div className="font-bold text-blue-700">{result.researchData.salesVelocity.last7Days}個</div>
                </div>
                <div className="bg-indigo-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-600">30日間</div>
                  <div className="font-bold text-indigo-700">{result.researchData.salesVelocity.last30Days}個</div>
                </div>
                <div className="bg-purple-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-600">平均価格</div>
                  <div className="font-bold text-purple-700">${result.researchData.salesVelocity.averagePrice.toFixed(2)}</div>
                </div>
              </div>
            )}
            
            {/* 競合価格 */}
            {result.researchData.competitorPrices && result.researchData.competitorPrices.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-semibold text-gray-800 mb-2">競合商品価格:</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.researchData.competitorPrices.map((comp, idx) => (
                    <div key={idx} className="bg-gray-50 rounded p-2 text-sm border border-gray-200">
                      <div className="font-semibold text-gray-800 truncate">{comp.title}</div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-600">{comp.seller}</span>
                        <div className="text-right">
                          <div className="font-bold text-green-700">${comp.price.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">送料: ${comp.shipping.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ 承認情報 */}
      {result.approval && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-4 border-2 border-green-300">
          <h4 className="font-bold text-green-800 mb-3 text-base flex items-center gap-2">
            ✅ 承認ステータス
          </h4>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-gray-700 font-semibold">ステータス:</span>
              <span className={`
                px-3 py-1 rounded-full font-bold
                ${result.approval.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                ${result.approval.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${result.approval.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
              `}>
                {result.approval.status === 'approved' && '承認済み'}
                {result.approval.status === 'pending' && '承認待ち'}
                {result.approval.status === 'rejected' && '却下'}
              </span>
            </div>
            
            {result.approval.approvedBy && (
              <div className="text-sm text-gray-600">
                承認者: {result.approval.approvedBy} ({result.approval.approvedAt})
              </div>
            )}
            
            {result.approval.comments && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <strong>コメント:</strong> {result.approval.comments}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📦 出品情報 */}
      {result.listing && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow-lg p-4 border-2 border-orange-300">
          <h4 className="font-bold text-orange-800 mb-3 text-base flex items-center gap-2">
            📦 eBay出品情報
          </h4>
          
          <div className="bg-white rounded-lg p-4">
            {result.listing.ebayItemId && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <span className="text-gray-700 font-semibold">Item ID:</span>
                <span className="font-mono font-bold text-orange-800">{result.listing.ebayItemId}</span>
              </div>
            )}
            
            {result.listing.listingUrl && (
              <a 
                href={result.listing.listingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                eBayで商品を見る →
              </a>
            )}
            
            {result.listing.listedAt && (
              <div className="mt-3 text-sm text-gray-600 text-center">
                出品日時: {result.listing.listedAt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 既存の計算ステップ表示（成功時のみ） */}
      {result.success && result.calculationSteps && result.calculationSteps.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-4 border-2 border-blue-300">
          <h4 className="font-bold text-blue-800 mb-3 text-base flex items-center gap-2">
            📊 計算プロセス
          </h4>
          <div className="space-y-2">
            {result.calculationSteps.map((step: any, idx: number) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900 text-base mb-1">{step.value}</div>
                    <div className="text-sm text-gray-600">{step.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 推奨案・代替案（成功時のみ） */}
      {result.success && result.recommended && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-4 border-2 border-green-400">
          <h4 className="font-bold text-green-800 mb-3 text-base flex items-center gap-2">
            ⭐ 推奨販売価格
          </h4>
          
          <div className="bg-white rounded-lg p-4 mb-3">
            <div className="text-center mb-3">
              <div className="text-4xl font-bold text-green-700 mb-1">
                ${result.recommended.total.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">推奨販売価格</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded p-2 text-center">
                <div className="text-xs text-gray-600 mb-1">商品価格</div>
                <div className="text-2xl font-bold text-green-700">${result.recommended.productPrice}</div>
              </div>
              <div className="bg-blue-50 rounded p-2 text-center">
                <div className="text-xs text-gray-600 mb-1">送料</div>
                <div className="text-2xl font-bold text-blue-700">${result.recommended.shipping.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl right-0 top-6">
        {text}
      </div>
    </div>
  )
}
