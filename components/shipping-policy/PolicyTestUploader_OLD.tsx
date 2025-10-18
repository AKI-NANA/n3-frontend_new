'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// 除外国77カ国リスト（ISO 2文字コード）
const EXCLUDED_COUNTRIES = [
  'AF', 'AL', 'DZ', 'AS', 'AO', 'AI', 'AQ', 'AG', 'AM', 'AZ', 'BH',
  'BD', 'BB', 'BY', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BV',
  'BN', 'BF', 'BI', 'KH', 'CM', 'CV', 'KY', 'CF', 'TD', 'CX', 'CC',
  'KM', 'CG', 'CD', 'CK', 'CU', 'DJ', 'DM', 'EC', 'GQ', 'ER', 'ET',
  'FK', 'FO', 'FJ', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'GH', 'GL',
  'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'VA',
  'IR', 'IQ', 'IM', 'JM', 'JE', 'KZ', 'KE', 'KI', 'KP', 'KG', 'LA'
]

export function PolicyTestUploader() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; policyId?: string } | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null)
  const [selectedAccount, setSelectedAccount] = useState<'mjt' | 'green'>('green')

  const loadTestPolicy = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ebay_shipping_policies_final')
      .select('*')
      .eq('policy_name', 'EXP_15_20')
      .single()

    if (!error && data) {
      setSelectedPolicy(data)
    }
  }

  useState(() => {
    loadTestPolicy()
  }, [])

  const testUpload = async () => {
    if (!selectedPolicy) return

    setLoading(true)
    setResult(null)

    try {
      // eBay APIペイロード作成
      const timestamp = Date.now()
      const randomCents = Math.floor(Math.random() * 100) / 100
      const uniqueShippingCost = (parseFloat(selectedPolicy.usa_total_shipping_usd) + randomCents).toFixed(2)
      
      const payload = {
        name: `${selectedPolicy.policy_name}_TEST_${timestamp}`,
        description: `エクスプレス配送（重量: ${selectedPolicy.weight_from_kg}-${selectedPolicy.weight_to_kg}kg、商品価格: $${selectedPolicy.product_price_usd}）。アメリカ国内への配送料金は関税・消費税込みです。`,
        marketplaceId: 'EBAY_US',
        categoryTypes: [
          {
            name: 'ALL_EXCLUDING_MOTORS_VEHICLES',
            default: false
          }
        ],

        // USA向け固定送料(DDP込み) - Rate Table使用
        shippingOptions: [
          {
            costType: 'FLAT_RATE',
            optionType: 'DOMESTIC',
            shippingServices: [
              {
                shippingCarrierCode: 'USPS',
                shippingServiceCode: 'USPSPriority', // 正しいサービスコード
                freeShipping: false,
                shippingCost: {
                  value: uniqueShippingCost,
                  currency: 'USD'
                },
                additionalShippingCost: {
                  value: uniqueShippingCost,
                  currency: 'USD'
                },
                shipToLocations: {
                  regionIncluded: [
                    {
                      regionName: 'US',
                      regionType: 'COUNTRY'
                    }
                  ],
                  regionExcluded: EXCLUDED_COUNTRIES.map(code => ({
                    regionName: code,
                    regionType: 'COUNTRY_CODE'
                  }))
                }
              }
            ]
          }
        ],

        // ハンドリングタイム: 10日
        handlingTime: {
          value: 10,
          unit: 'DAY'
        }
      }

      console.log('📦 送信ペイロード:', JSON.stringify(payload, null, 2))

      // API呼び出し（アカウント指定）
      const response = await fetch('/api/ebay/shipping-policy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-eBay-Account': selectedAccount
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('🔴 APIレスポンス:', data)

      if (response.ok) {
        // 成功
        setResult({
          success: true,
          message: `✅ ${selectedAccount.toUpperCase()}アカウントにポリシーを作成しました！`,
          policyId: data.fulfillmentPolicyId || data.shippingPolicyId
        })

        // DBを更新
        const supabase = createClient()
        await supabase
          .from('ebay_shipping_policies_final')
          .update({
            ebay_policy_id: data.fulfillmentPolicyId || data.shippingPolicyId,
            ebay_policy_status: 'created',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPolicy.id)

      } else {
        // 失敗
        setResult({
          success: false,
          message: data.error || 'エラーが発生しました'
        })
      }

    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || '通信エラーが発生しました'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!selectedPolicy) {
    return <div>ポリシーを読み込んでいます...</div>
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Play className="w-6 h-6" />
          テストアップロード（改良版）
        </h2>
        <p className="text-sm opacity-90">
          ✅ Handling time: 10日 | ✅ 除外国: 77カ国 | ✅ 日本語説明
        </p>
      </div>

      {/* アカウント選択 */}
      <Card>
        <CardHeader>
          <CardTitle>eBayアカウント選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={selectedAccount === 'green' ? 'default' : 'outline'}
              onClick={() => setSelectedAccount('green')}
              className="h-20"
            >
              <div>
                <div className="font-bold text-lg">green</div>
                <div className="text-xs opacity-70">greenアカウント</div>
              </div>
            </Button>
            <Button
              variant={selectedAccount === 'mjt' ? 'default' : 'outline'}
              onClick={() => setSelectedAccount('mjt')}
              className="h-20"
            >
              <div>
                <div className="font-bold text-lg">MJT</div>
                <div className="text-xs opacity-70">mystical-japan-treasures</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* テスト対象ポリシー */}
      <Card>
        <CardHeader>
          <CardTitle>テスト対象: {selectedPolicy.policy_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold">重量帯:</span>
                <span>{selectedPolicy.weight_from_kg}-{selectedPolicy.weight_to_kg}kg</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold">商品価格:</span>
                <span>${selectedPolicy.product_price_usd}</span>
              </div>
              <div className="flex justify-between p-2 bg-orange-50 rounded border border-orange-300">
                <span className="font-semibold">Handling:</span>
                <span className="font-bold text-orange-600">10日</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-green-50 rounded border-2 border-green-300">
                <span className="font-bold">USA総配送料:</span>
                <span className="font-bold text-green-600">${selectedPolicy.usa_total_shipping_usd}</span>
              </div>
              <div className="flex justify-between p-2 bg-red-50 rounded border border-red-300">
                <span className="font-semibold">除外国:</span>
                <span className="font-bold text-red-600">{EXCLUDED_COUNTRIES.length}カ国</span>
              </div>
            </div>
          </div>

          <Alert className="mb-4 bg-blue-50 border-blue-300">
            <AlertDescription>
              <strong>🎯 選択中: {selectedAccount === 'green' ? 'green' : 'Mystical Japan Treasures'}</strong>
              <div className="mt-2 text-sm">
                📝 Description: エクスプレス配送（重量: {selectedPolicy.weight_from_kg}-{selectedPolicy.weight_to_kg}kg...）
              </div>
            </AlertDescription>
          </Alert>

          <Button
            onClick={testUpload}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                eBayに作成中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {selectedAccount.toUpperCase()}にテストアップロード
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 結果表示 */}
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="font-bold mb-2">
              {result.success ? '✅ 成功' : '❌ 失敗'}
            </div>
            <div>{result.message}</div>
            {result.policyId && (
              <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-sm">
                Policy ID: {result.policyId}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
