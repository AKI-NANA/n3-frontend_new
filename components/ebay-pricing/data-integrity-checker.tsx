// components/ebay-pricing/data-integrity-checker.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react'

export function DataIntegrityChecker() {
  const [status, setStatus] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  const checkData = async () => {
    setChecking(true)
    try {
      // HTSコード数確認（詳細統計）
      const { data: hsCodes, count: hsCount } = await supabase
        .from('hs_codes')
        .select('*', { count: 'exact' })
      
      // 税率別集計
      const tariffStats: any = {}
      hsCodes?.forEach((hs: any) => {
        const rate = Math.round(hs.base_duty * 100)
        tariffStats[rate] = (tariffStats[rate] || 0) + 1
      })
      
      // カテゴリ確認
      const { data: categories } = await supabase
        .from('ebay_pricing_category_fees')
        .select('*')
        .eq('active', true)
      
      const invalidFVF = categories?.filter((c: any) => 
        isNaN(c.fvf_rate) || c.fvf_rate === null || c.fvf_rate === 0
      ) || []
      
      // FVF別集計
      const fvfStats: any = {}
      categories?.forEach((c: any) => {
        const fvf = Math.round((c.fvf_rate || 0) * 100)
        fvfStats[fvf] = (fvfStats[fvf] || 0) + 1
      })
      
      // 原産国確認
      const { count: countryCount } = await supabase
        .from('origin_countries')
        .select('*', { count: 'exact' })
        .eq('active', true)
      
      // 配送ポリシー確認
      const { count: policyCount } = await supabase
        .from('ebay_shipping_policies')
        .select('*', { count: 'exact' })
        .eq('active', true)
      
      // 配送ゾーン確認（送料実費）
      const { count: zoneCount } = await supabase
        .from('ebay_shipping_zones')
        .select('*', { count: 'exact' })
      
      setStatus({
        hsCodes: hsCount || 0,
        categories: categories?.length || 0,
        countries: countryCount || 0,
        policies: policyCount || 0,
        zones: zoneCount || 0,
        invalidFVF: invalidFVF.length,
        invalidFVFList: invalidFVF.map((c: any) => c.category_name),
        tariffStats,
        fvfStats,
      })
    } catch (error) {
      console.error('データ確認エラー:', error)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkData()
  }, [])

  if (!status) return null

  const hasIssues = status.invalidFVF > 0 || status.hsCodes < 100 || status.categories < 10 || status.policies < 10 || status.zones < 20

  return (
    <div className={`p-4 rounded-lg border-2 ${hasIssues ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'}`}>
      <div className="flex items-center gap-2 mb-3">
        {hasIssues ? (
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
        <h3 className="font-bold text-gray-800">データベース状態</h3>
        <button
          onClick={checkData}
          disabled={checking}
          className="ml-auto px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
          {checking ? '確認中...' : '再確認'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <div className="bg-white rounded p-2">
          <div className="text-gray-600 text-xs">HTSコード</div>
          <div className={`font-bold ${status.hsCodes < 100 ? 'text-yellow-600' : 'text-green-600'}`}>
            {status.hsCodes}件
          </div>
          {status.tariffStats && (
            <div className="text-xs text-gray-500 mt-1">
              税率: {Object.keys(status.tariffStats).length}種類
            </div>
          )}
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-600 text-xs">カテゴリ</div>
          <div className={`font-bold ${status.categories < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
            {status.categories}件
          </div>
          {status.invalidFVF > 0 && (
            <div className="text-xs text-red-600">
              FVF無効: {status.invalidFVF}件
            </div>
          )}
          {status.fvfStats && (
            <div className="text-xs text-gray-500 mt-1">
              FVF: {Object.keys(status.fvfStats).length}種類
            </div>
          )}
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-600 text-xs">原産国</div>
          <div className="font-bold text-green-600">
            {status.countries}件
          </div>
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-600 text-xs">配送ポリシー</div>
          <div className={`font-bold ${status.policies < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
            {status.policies}件
          </div>
        </div>
        
        <div className="bg-white rounded p-2">
          <div className="text-gray-600 text-xs">送料ゾーン</div>
          <div className={`font-bold ${status.zones < 20 ? 'text-yellow-600' : 'text-green-600'}`}>
            {status.zones}件
          </div>
        </div>
      </div>
      
      {hasIssues && (
        <div className="mt-3 text-xs text-yellow-800 bg-yellow-100 rounded p-2">
          <div className="font-semibold mb-1">⚠️ 推奨アクション:</div>
          {status.hsCodes < 100 && <div>• HTSコードデータを追加してください（現在{status.hsCodes}件、推奨100件以上）</div>}
          {status.categories < 10 && <div>• eBayカテゴリデータを追加してください（現在{status.categories}件、推奨10件以上）</div>}
          {status.invalidFVF > 0 && (
            <div>• 以下のカテゴリのFVFを修正してください: {status.invalidFVFList.join(', ')}</div>
          )}
          {status.policies < 10 && <div>• 配送ポリシーを追加してください（推奨10件以上、現在{status.policies}件）</div>}
          {status.zones < 20 && <div>• 送料ゾーンを追加してください（推奨20件以上、現在{status.zones}件）</div>}
          <div className="mt-2 pt-2 border-t border-yellow-300">
            <div className="font-semibold">📋 自動生成スクリプト:</div>
            <div className="mt-1 bg-gray-800 text-green-400 p-2 rounded font-mono text-xs">
              await window.runFullAnalysisAndGeneration()
            </div>
            <div className="text-xs text-gray-600 mt-1">
              ブラウザコンソールで実行可能（DRY RUNモード）
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
