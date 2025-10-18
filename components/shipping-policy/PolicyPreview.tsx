'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, Copy, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function PolicyPreview() {
  const [policies, setPolicies] = useState<any[]>([])
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ebay_shipping_policies_final')
      .select('*')
      .order('weight_band_no, product_price_usd')
      .limit(100)

    if (!error && data) {
      setPolicies(data)
      if (data.length > 0) {
        setSelectedPolicy(data[1]) // EXP_15_20を選択
      }
    }
  }

  const generateEbayPayload = (policy: any) => {
    if (!policy) return null

    return {
      name: policy.policy_name,
      description: `Express shipping for ${policy.weight_from_kg}-${policy.weight_to_kg}kg, Product price $${policy.product_price_usd}`,
      marketplaceId: 'EBAY_US',
      categoryTypes: [
        {
          name: 'ALL_EXCLUDING_MOTORS_VEHICLES',
          default: true
        }
      ],

      // USA向け固定送料（DDP込み）
      shippingOptions: [
        {
          costType: 'FLAT_RATE',
          optionType: 'DOMESTIC',
          shippingServices: [
            {
              shippingCarrierCode: 'USPS',
              shippingServiceCode: 'USPSPriorityFlatRateEnvelope',
              freeShipping: false,
              shippingCost: {
                value: policy.usa_total_shipping_usd.toString(),
                currency: 'USD'
              },
              additionalShippingCost: {
                value: policy.usa_total_shipping_usd.toString(),
                currency: 'USD'
              },
              shipToLocations: {
                regionIncluded: [
                  {
                    regionName: 'United States',
                    regionType: 'COUNTRY'
                  }
                ]
              }
            }
          ]
        },
        // その他の国（Rate Table参照）
        {
          costType: 'CALCULATED',
          optionType: 'INTERNATIONAL',
          rateTableId: policy.rate_table_name,
          shippingServices: [
            {
              shippingCarrierCode: 'FedEx',
              shippingServiceCode: 'FedExInternationalPriority',
              freeShipping: false,
              shipToLocations: {
                regionIncluded: [
                  {
                    regionName: 'Worldwide',
                    regionType: 'WORLD_REGION'
                  }
                ],
                regionExcluded: [
                  // 除外国77カ国（実際の国コードリストが必要）
                  { regionName: 'Afghanistan', regionType: 'COUNTRY' },
                  { regionName: 'Cuba', regionType: 'COUNTRY' },
                  { regionName: 'Iran', regionType: 'COUNTRY' },
                  { regionName: 'North Korea', regionType: 'COUNTRY' },
                  { regionName: 'Syria', regionType: 'COUNTRY' }
                  // ... 残り72カ国
                ]
              }
            }
          ]
        }
      ],

      // 発送元
      shipToLocations: {
        regionIncluded: [
          {
            regionName: 'Worldwide',
            regionType: 'WORLD_REGION'
          }
        ]
      },

      // ハンドリングタイム
      handlingTime: {
        value: 1,
        unit: 'BUSINESS_DAY'
      },

      // 送料タイプ
      freightShipping: false,
      localPickup: false,
      globalShipping: false
    }
  }

  const copyToClipboard = () => {
    if (!selectedPolicy) return
    const payload = generateEbayPayload(selectedPolicy)
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Eye className="w-6 h-6" />
          配送ポリシー プレビュー
        </h2>
        <p className="text-sm opacity-90">
          eBay APIに送信されるペイロードを確認
        </p>
      </div>

      {/* ポリシー選択 */}
      <Card>
        <CardHeader>
          <CardTitle>ポリシーを選択</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedPolicy?.id?.toString()}
            onValueChange={(value) => {
              const policy = policies.find(p => p.id.toString() === value)
              setSelectedPolicy(policy)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="ポリシーを選択..." />
            </SelectTrigger>
            <SelectContent>
              {policies.map((policy) => (
                <SelectItem key={policy.id} value={policy.id.toString()}>
                  {policy.policy_name} - {policy.weight_from_kg}-{policy.weight_to_kg}kg - ${policy.product_price_usd}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPolicy && (
        <>
          {/* ポリシー詳細 */}
          <Card>
            <CardHeader>
              <CardTitle>ポリシー詳細: {selectedPolicy.policy_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">重量帯:</span>
                    <span>{selectedPolicy.weight_from_kg}-{selectedPolicy.weight_to_kg}kg</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">商品価格:</span>
                    <span>${selectedPolicy.product_price_usd}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">USA基本送料:</span>
                    <span>${selectedPolicy.usa_base_shipping_usd}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">DDP追加料金:</span>
                    <span>${selectedPolicy.usa_ddp_additional_usd}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-green-50 rounded border-2 border-green-300">
                    <span className="font-bold">USA総配送料:</span>
                    <span className="font-bold text-green-600">${selectedPolicy.usa_total_shipping_usd}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">Rate Table:</span>
                    <span>{selectedPolicy.rate_table_name}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">除外国数:</span>
                    <span>{selectedPolicy.excluded_countries_count}カ国</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold">2個目以降:</span>
                    <span>{selectedPolicy.additional_item_same_price ? '同額' : '異なる'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 説明 */}
          <Alert>
            <AlertDescription>
              <strong>📦 このポリシーの動作:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• <strong>USA宛:</strong> 固定料金 ${selectedPolicy.usa_total_shipping_usd}（送料$
{selectedPolicy.usa_base_shipping_usd} + DDP$
{selectedPolicy.usa_ddp_additional_usd}）</li>
                <li>• <strong>その他176カ国:</strong> Rate Table "{selectedPolicy.rate_table_name}"を参照して自動計算</li>
                <li>• <strong>除外:</strong> {selectedPolicy.excluded_countries_count}カ国（制裁国など）</li>
                <li>• <strong>2個目以降:</strong> 同額請求（追加割引なし）</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* eBay APIペイロード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>eBay APIペイロード（JSON）</span>
                <Button onClick={copyToClipboard} variant="outline" size="sm">
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      コピー完了
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      コピー
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                {JSON.stringify(generateEbayPayload(selectedPolicy), null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Alert variant="destructive">
            <AlertDescription>
              <strong>⚠️ 実装前の確認事項:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Rate Table ID "{selectedPolicy.rate_table_name}" がeBayに存在する必要があります</li>
                <li>• 除外国77カ国の正確な国コードリストが必要です</li>
                <li>• eBay APIトークンの権限を確認してください</li>
                <li>• まず1個だけテスト作成することを推奨します</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}
