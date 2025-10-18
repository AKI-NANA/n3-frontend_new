// components/shipping-policy/handling-fee-configurator.tsx
/**
 * Handling Fee 設定コンポーネント
 * 配送ポリシーマネージャーから使用
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface HandlingRule {
  id: number
  rule_name: string
  calculation_method: string
  percentage: number
  max_amount: number
  description: string
  is_active: boolean
}

interface RateTier {
  id: number
  tier_name: string
  tier_level: number
  markup_amount: number
  min_ddp_fee: number
  max_ddp_fee: number
}

export default function HandlingFeeConfigurator() {
  const [rules, setRules] = useState<HandlingRule[]>([])
  const [tiers, setTiers] = useState<RateTier[]>([])
  const [loading, setLoading] = useState(true)
  
  const [testActual, setTestActual] = useState(25)
  const [testDdp, setTestDdp] = useState(13.49)
  const [testResult, setTestResult] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Handling Rules
    const { data: rulesData } = await supabase
      .from('ebay_handling_fee_rules')
      .select('*')
      .order('priority')

    // Rate Tiers
    const { data: tiersData } = await supabase
      .from('ebay_rate_table_tiers')
      .select('*')
      .order('tier_level')

    setRules(rulesData || [])
    setTiers(tiersData || [])
    setLoading(false)
  }

  async function testCalculation() {
    const { data, error } = await supabase.rpc('calculate_optimal_handling', {
      p_actual_shipping: testActual,
      p_ddp_fee: testDdp,
    })

    if (error) {
      alert(`エラー: ${error.message}`)
    } else {
      setTestResult(data[0])
    }
  }

  if (loading) {
    return <div className="p-4">読み込み中...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Handling Fee 設定</h1>

      {/* Rate Tiers */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Rate Table Tiers</h2>
        <p className="text-sm text-gray-600 mb-4">
          DDP手数料に応じて選択される上乗せ額のパターン
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Tier</th>
                <th className="border p-2 text-right">上乗せ額</th>
                <th className="border p-2 text-right">DDP対応範囲</th>
                <th className="border p-2 text-left">説明</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(tier => (
                <tr key={tier.id}>
                  <td className="border p-2 font-semibold">{tier.tier_name}</td>
                  <td className="border p-2 text-right text-lg font-bold text-blue-600">
                    ${tier.markup_amount.toFixed(2)}
                  </td>
                  <td className="border p-2 text-right text-sm">
                    ${tier.min_ddp_fee.toFixed(2)} - ${tier.max_ddp_fee.toFixed(2)}
                  </td>
                  <td className="border p-2 text-sm text-gray-600">
                    DDP手数料が${tier.min_ddp_fee}-${tier.max_ddp_fee}の範囲で選択
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Handling Rules */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">⚙️ Handling Fee ルール</h2>
        <p className="text-sm text-gray-600 mb-4">
          Handlingの計算方法と上限設定
        </p>

        <div className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="border rounded p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{rule.rule_name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {rule.is_active ? '有効' : '無効'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-500">計算方法:</span>{' '}
                  <span className="font-mono">{rule.calculation_method}</span>
                </div>
                <div>
                  <span className="text-gray-500">比率:</span>{' '}
                  <span className="font-bold">{rule.percentage}%</span>
                </div>
                <div>
                  <span className="text-gray-500">上限:</span>{' '}
                  <span className="font-bold">${rule.max_amount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Test Calculator */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🧪 Handling Fee 計算テスト</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">実送料 (USD)</label>
            <input
              type="number"
              step="0.01"
              value={testActual}
              onChange={(e) => setTestActual(parseFloat(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">DDP手数料 (USD)</label>
            <input
              type="number"
              step="0.01"
              value={testDdp}
              onChange={(e) => setTestDdp(parseFloat(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <button
          onClick={testCalculation}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          計算実行
        </button>

        {testResult && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold mb-4">📊 計算結果</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">Handling Fee</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${testResult.handling_fee?.toFixed(2)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">表示送料</div>
                <div className="text-2xl font-bold text-green-600">
                  ${testResult.display_shipping?.toFixed(2)}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-sm text-gray-600">顧客支払合計</div>
                <div className="text-2xl font-bold text-purple-600">
                  ${testResult.total_to_customer?.toFixed(2)}
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <div className="text-sm text-gray-600">DDP回収状況</div>
                <div className="text-2xl font-bold text-yellow-600">
                  ${testResult.ddp_recovered?.toFixed(2)} / ${testDdp.toFixed(2)}
                </div>
                {testResult.is_fully_recovered ? (
                  <div className="text-xs text-green-600 mt-1">✅ 完全回収</div>
                ) : (
                  <div className="text-xs text-red-600 mt-1">
                    ⚠️ 不足 ${testResult.ddp_shortfall?.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <div className="text-sm text-gray-600">採用戦略</div>
              <div className="font-semibold">{testResult.strategy}</div>
            </div>
          </div>
        )}
      </section>

      {/* eBay設定ガイド */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📝 eBayでの設定方法</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <strong>Business Policies</strong> → <strong>Shipping policies</strong> に移動
          </li>
          <li>
            各配送サービスの <strong>"Handling cost"</strong> フィールドに金額を入力
          </li>
          <li>
            本システムで計算された <code>handling_fee</code> の値を設定
          </li>
          <li>
            保存して配送ポリシーを更新
          </li>
        </ol>
        <div className="mt-4 p-3 bg-white rounded border">
          <div className="text-xs text-gray-600 mb-1">例:</div>
          <code className="text-xs">
            Shipping: $40.00<br/>
            Handling cost: $10.00  ← ここに設定
          </code>
        </div>
      </section>
    </div>
  )
}
