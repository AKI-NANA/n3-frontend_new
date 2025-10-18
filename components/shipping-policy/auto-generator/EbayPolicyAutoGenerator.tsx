'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Info, CheckCircle, Loader2 } from 'lucide-react'

interface DatabasePolicy {
  id: number
  policy_name: string
  weight_min_kg: number
  weight_max_kg: number
  handling_time_days: number
  is_ddp: boolean
}

interface AutoGeneratorProps {
  onBack: () => void
}

export function EbayPolicyAutoGenerator({ onBack }: AutoGeneratorProps) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dbPolicies, setDbPolicies] = useState<DatabasePolicy[]>([])
  const [selectedPolicies, setSelectedPolicies] = useState<number[]>([])
  const [generationResults, setGenerationResults] = useState<any[]>([])
  
  useEffect(() => {
    loadDatabasePolicies()
  }, [])
  
  async function loadDatabasePolicies() {
    try {
      const response = await fetch('/api/shipping-policies/list-db')
      const data = await response.json()
      
      if (data.success) {
        setDbPolicies(data.policies || [])
        // デフォルトで全て選択
        setSelectedPolicies(data.policies.map((p: DatabasePolicy) => p.id))
      }
    } catch (error) {
      console.error('Failed to load database policies:', error)
    } finally {
      setLoading(false)
    }
  }
  
  function togglePolicySelection(id: number) {
    if (selectedPolicies.includes(id)) {
      setSelectedPolicies(selectedPolicies.filter(p => p !== id))
    } else {
      setSelectedPolicies([...selectedPolicies, id])
    }
  }
  
  async function handleGenerate() {
    if (selectedPolicies.length === 0) {
      alert('少なくとも1つのポリシーを選択してください')
      return
    }
    
    const confirmed = confirm(
      `${selectedPolicies.length}個のポリシーをeBay APIに登録します。\n\n` +
      '各ポリシーには配送ゾーンと料金が自動設定されます。\n' +
      'よろしいですか？'
    )
    
    if (!confirmed) return
    
    setGenerating(true)
    setGenerationResults([])
    
    try {
      const response = await fetch('/api/shipping-policies/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyIds: selectedPolicies
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGenerationResults(data.results || [])
        alert(`✅ ${data.successCount}個のポリシーを正常に登録しました！`)
      } else {
        alert(`❌ エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Generation failed:', error)
      alert('ポリシーの生成中にエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto bg-white p-6">
      {/* ヘッダー */}
      <div className="mb-6 pb-4 border-b flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">配送ポリシー自動生成</h1>
          <p className="text-sm text-gray-500">データベースのポリシーからeBay APIに登録</p>
        </div>
      </div>
      
      {/* 説明 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <div className="font-bold mb-2">自動生成機能について</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>データベースに保存されている配送ポリシーと料金データを使用</li>
              <li>選択したポリシーをeBay Fulfillment Policy APIに自動登録</li>
              <li>各ポリシーに設定された配送ゾーンと料金が自動適用</li>
              <li>DDP/DDU方式、重量範囲、ハンドリング時間も自動設定</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* データベースポリシー一覧 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">登録可能なポリシー ({dbPolicies.length}件)</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPolicies(dbPolicies.map(p => p.id))}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              全て選択
            </button>
            <button
              onClick={() => setSelectedPolicies([])}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              選択解除
            </button>
          </div>
        </div>
        
        {dbPolicies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">データベースにポリシーが見つかりません</p>
            <p className="text-sm">まずはデータベースに配送ポリシーを作成してください</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {dbPolicies.map((policy) => {
              const isSelected = selectedPolicies.includes(policy.id)
              
              return (
                <div 
                  key={policy.id}
                  onClick={() => togglePolicySelection(policy.id)}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center
                        ${isSelected 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'border-gray-300'
                        }
                      `}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{policy.policy_name}</h3>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {policy.weight_min_kg}kg - {policy.weight_max_kg}kg
                        </span>
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-medium
                          ${policy.is_ddp 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                          }
                        `}>
                          {policy.is_ddp ? 'DDP (関税込み)' : 'DDU (関税別)'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        ハンドリングタイム: {policy.handling_time_days}営業日
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* 生成結果 */}
      {generationResults.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="font-semibold mb-3 text-green-800">✅ 生成完了</div>
          <div className="space-y-2">
            {generationResults.map((result, index) => (
              <div key={index} className="text-sm">
                {result.success ? (
                  <div className="text-green-700">
                    ✓ {result.policyName} → eBay Policy ID: {result.ebayPolicyId}
                  </div>
                ) : (
                  <div className="text-red-700">
                    ✗ {result.policyName} → エラー: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* ボタン */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleGenerate}
          disabled={selectedPolicies.length === 0 || generating}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating && <Loader2 className="w-4 h-4 animate-spin" />}
          {generating 
            ? 'eBay APIに登録中...' 
            : `${selectedPolicies.length}個のポリシーをeBayに登録`
          }
        </button>
        <button
          onClick={onBack}
          disabled={generating}
          className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          戻る
        </button>
      </div>
      
      {/* 注意事項 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-sm text-gray-700">
          <div className="font-bold mb-2">⚠️ 注意事項</div>
          <ul className="space-y-1 list-disc list-inside text-xs">
            <li>eBay APIの制限により、一度に大量のポリシーを登録するとエラーになる場合があります</li>
            <li>同じ名前のポリシーは登録できません（既存ポリシーと重複しないようにしてください）</li>
            <li>登録後、eBayのSeller Hubで確認できます</li>
            <li>登録したポリシーは商品出品時に選択できるようになります</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
