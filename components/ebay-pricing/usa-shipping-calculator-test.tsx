'use client'

import React, { useState } from 'react'
import { useEbayUsaShippingPolicies } from '@/hooks/use-ebay-pricing'
import { Calculator, Package, DollarSign, TrendingUp } from 'lucide-react'

/**
 * USA配送ポリシーベース計算テスト
 * 
 * 新しいロジックの動作確認用コンポーネント
 */
export function UsaShippingCalculatorTest() {
  const { usaPolicies, selectUsaPolicy, calculateMultiItemShipping, loading } = useEbayUsaShippingPolicies()
  
  const [weight, setWeight] = useState<number>(0.5)
  const [itemPrice, setItemPrice] = useState<number>(100)
  const [quantity, setQuantity] = useState<number>(1)
  
  const [result, setResult] = useState<any>(null)

  const handleCalculate = () => {
    // 単品計算
    const policy = selectUsaPolicy(weight)
    
    if (!policy) {
      setResult({
        error: `重量${weight}kgに対応する配送ポリシーが見つかりません`
      })
      return
    }

    // 複数アイテム計算
    const multiResult = calculateMultiItemShipping([
      { weight_kg: weight, quantity }
    ])

    setResult({
      policy,
      multiResult,
      calculations: {
        // 1個目の送料
        first_item: policy.usa_ddp_total_usd,
        
        // 追加送料（数量-1）
        additional: policy.usa_additional_item_usd * (quantity - 1),
        
        // 合計送料
        total: policy.usa_ddp_total_usd + (policy.usa_additional_item_usd * (quantity - 1)),
        
        // 内訳
        breakdown: {
          base_rate: policy.usa_ddp_base_rate_usd,
          ddp_duty: policy.usa_ddp_duty_usd,
          ddp_tax: policy.usa_ddp_tax_usd,
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="p-6 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800">配送ポリシーを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Calculator className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">USA配送ポリシーベース計算（テスト）</h2>
            <p className="text-blue-100 mt-1">
              新しいロジックの動作確認 - ebay_shipping_policies テーブル使用
            </p>
          </div>
        </div>
      </div>

      {/* 利用可能なポリシー一覧 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          利用可能な配送ポリシー: {usaPolicies.length}件
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ポリシー名</th>
                <th className="px-4 py-2 text-left">重量範囲</th>
                <th className="px-4 py-2 text-right">送料</th>
                <th className="px-4 py-2 text-right">追加送料</th>
                <th className="px-4 py-2 text-right">基本料金</th>
                <th className="px-4 py-2 text-right">関税</th>
                <th className="px-4 py-2 text-right">税金</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usaPolicies.slice(0, 10).map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{policy.policy_name}</td>
                  <td className="px-4 py-2">
                    {policy.weight_from_kg} - {policy.weight_to_kg}kg
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    ${policy.usa_ddp_total_usd.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-blue-600">
                    ${policy.usa_additional_item_usd.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    ${policy.usa_ddp_base_rate_usd.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    ${policy.usa_ddp_duty_usd.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    ${policy.usa_ddp_tax_usd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usaPolicies.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">
              ※ 最初の10件のみ表示（全{usaPolicies.length}件）
            </p>
          )}
        </div>
      </div>

      {/* 計算フォーム */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          送料計算テスト
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">重量 (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">商品価格 (USD)</label>
            <input
              type="number"
              value={itemPrice}
              onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">数量</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              step="1"
              min="1"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          送料を計算
        </button>
      </div>

      {/* 計算結果 */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            計算結果
          </h3>

          {result.error ? (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
              {result.error}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 選択されたポリシー */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">📦 選択されたポリシー</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>ポリシー名:</div>
                  <div className="font-mono">{result.policy.policy_name}</div>
                  
                  <div>重量範囲:</div>
                  <div>{result.policy.weight_from_kg} - {result.policy.weight_to_kg}kg</div>
                  
                  <div>Rate Table:</div>
                  <div>{result.policy.rate_table_name}</div>
                  
                  <div>DDP Type:</div>
                  <div>{result.policy.ddp_type_code}</div>
                </div>
              </div>

              {/* 送料内訳 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">💰 送料内訳</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">基本送料:</span>
                    <span className="font-semibold">
                      ${result.calculations.breakdown.base_rate.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-700">DDP関税:</span>
                    <span className="font-semibold">
                      ${result.calculations.breakdown.ddp_duty.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-700">DDP税金:</span>
                    <span className="font-semibold">
                      ${result.calculations.breakdown.ddp_tax.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2 flex justify-between text-lg">
                    <span className="font-bold">1個目の送料:</span>
                    <span className="font-bold text-green-600">
                      ${result.calculations.first_item.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 数量計算 */}
              {quantity > 1 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">📦 複数個の送料</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">1個目の送料:</span>
                      <span className="font-semibold">
                        ${result.calculations.first_item.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        追加送料 (×{quantity - 1}個):
                      </span>
                      <span className="font-semibold">
                        ${result.policy.usa_additional_item_usd.toFixed(2)} × {quantity - 1} = 
                        ${result.calculations.additional.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="border-t pt-2 flex justify-between text-lg">
                      <span className="font-bold">合計送料:</span>
                      <span className="font-bold text-purple-600">
                        ${result.calculations.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* デバッグ情報 */}
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer font-semibold">
                  🔍 デバッグ情報（開発者向け）
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
