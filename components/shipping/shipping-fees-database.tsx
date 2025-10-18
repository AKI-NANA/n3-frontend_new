'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Scale, FileSignature, Shield, AlertTriangle, 
  Ruler, DollarSign, TrendingUp, Database, 
  Calendar, CheckCircle, XCircle
} from 'lucide-react'

// モックデータ
const MOCK_OVERSIZE_RULES = [
  // 重量超過
  {
    id: '1',
    service_name: 'FedEx',
    rule_type: 'OVERWEIGHT',
    threshold_value: 68,
    threshold_unit: 'kg',
    surcharge_jpy: 15000,
    surcharge_usd: 135,
    description: 'FedEx 68kg超過料金'
  },
  {
    id: '2',
    service_name: 'UPS',
    rule_type: 'OVERWEIGHT',
    threshold_value: 44,
    threshold_unit: 'kg',
    surcharge_jpy: 12000,
    surcharge_usd: 110,
    description: 'UPS 44kg超過料金（推定）'
  },
  {
    id: '3',
    service_name: 'EMS',
    rule_type: 'OVERWEIGHT',
    threshold_value: 30,
    threshold_unit: 'kg',
    surcharge_jpy: 0,
    surcharge_usd: 0,
    description: 'EMS 30kg上限（配送不可）'
  },
  // 長辺超過
  {
    id: '4',
    service_name: 'DHL',
    rule_type: 'OVERSIZE_LENGTH',
    threshold_value: 100,
    threshold_unit: 'cm',
    surcharge_jpy: 3000,
    surcharge_usd: 27,
    description: 'DHL 一辺100cm超 - 規定外貨物手数料（寸法）'
  },
  {
    id: '5',
    service_name: 'FedEx',
    rule_type: 'OVERSIZE_LENGTH',
    threshold_value: 121,
    threshold_unit: 'cm',
    surcharge_jpy: 2500,
    surcharge_usd: 22.5,
    description: 'FedEx 長辺121cm超 - 特別取扱料金（最低18kg請求）'
  },
  {
    id: '6',
    service_name: 'FedEx',
    rule_type: 'OVERSIZE_LENGTH',
    threshold_value: 175,
    threshold_unit: 'cm',
    surcharge_jpy: 7000,
    surcharge_usd: 65,
    description: 'FedEx 175cm超過料金'
  },
  {
    id: '7',
    service_name: 'FedEx',
    rule_type: 'OVERSIZE_LENGTH',
    threshold_value: 243,
    threshold_unit: 'cm',
    surcharge_jpy: 5000,
    surcharge_usd: 45,
    description: 'FedEx 長辺243cm超 - オーバーサイズ料金'
  },
  // 長さ+周囲
  {
    id: '8',
    service_name: 'FedEx',
    rule_type: 'OVERSIZE_DIMENSION',
    threshold_value: 266,
    threshold_unit: 'cm',
    surcharge_jpy: 2500,
    surcharge_usd: 22.5,
    description: 'FedEx 長さ+周囲266cm超 - 特別取扱料金'
  },
  {
    id: '9',
    service_name: 'FedEx',
    rule_type: 'OVERSIZE_DIMENSION',
    threshold_value: 330,
    threshold_unit: 'cm',
    surcharge_jpy: 5000,
    surcharge_usd: 45,
    description: 'FedEx 長さ+周囲330cm超 - オーバーサイズ料金'
  }
]

const MOCK_SIGNATURE_FEES = [
  { id: '1', service_name: '全サービス共通', signature_type: 'BASIC', fee_jpy: 0, fee_usd: 0, is_included: true },
  { id: '2', service_name: '全サービス共通', signature_type: 'INDIRECT', fee_jpy: 380, fee_usd: 3.5, is_included: false },
  { id: '3', service_name: '全サービス共通', signature_type: 'DIRECT', fee_jpy: 440, fee_usd: 4.0, is_included: false },
  { id: '4', service_name: '全サービス共通', signature_type: 'ADULT', fee_jpy: 540, fee_usd: 5.0, is_included: false },
  { id: '5', service_name: '全サービス共通', signature_type: 'REGISTERED', fee_jpy: 460, fee_usd: 4.0, is_included: false }
]

const MOCK_INSURANCE_RATES = [
  { id: '1', service_name: '全サービス共通', item_value_from_usd: 0, item_value_to_usd: 100, insurance_fee_jpy: 0, insurance_fee_usd: 0, is_mandatory: true },
  { id: '2', service_name: '全サービス共通', item_value_from_usd: 100, item_value_to_usd: 500, insurance_fee_jpy: 500, insurance_fee_usd: 4.5, is_mandatory: false },
  { id: '3', service_name: '全サービス共通', item_value_from_usd: 500, item_value_to_usd: 1000, insurance_fee_jpy: 800, insurance_fee_usd: 7.5, is_mandatory: false },
  { id: '4', service_name: '全サービス共通', item_value_from_usd: 0, item_value_to_usd: 140, insurance_fee_jpy: 400, insurance_fee_usd: 2.8, is_mandatory: false },
  { id: '5', service_name: '全サービス共通', item_value_from_usd: 140, item_value_to_usd: 280, insurance_fee_jpy: 560, insurance_fee_usd: 3.92, is_mandatory: false }
]

const MOCK_FUEL_SURCHARGES = [
  {
    id: '1',
    carrier_name: 'DHL',
    base_surcharge_rate: 29.75,
    discount_rate: 25.0,
    surcharge_rate: 22.31,
    effective_month: '2025-10-01',
    applies_to_surcharges: true
  },
  {
    id: '2',
    carrier_name: 'FedEx',
    base_surcharge_rate: 29.75,
    discount_rate: 0,
    surcharge_rate: 35.7,
    effective_month: '2025-10-01',
    applies_to_surcharges: true
  },
  {
    id: '3',
    carrier_name: 'DHL',
    base_surcharge_rate: 30.0,
    discount_rate: 25.0,
    surcharge_rate: 22.5,
    effective_month: '2025-09-01',
    applies_to_surcharges: true
  }
]

const MOCK_DEMAND_SURCHARGES = [
  {
    id: '1',
    carrier_name: 'CPass',
    surcharge_type: 'RESIDENTIAL',
    surcharge_rate: null,
    surcharge_fixed_jpy: 0,
    description: '住宅配送サーチャージ（期間限定無料）',
    is_active: false
  },
  {
    id: '2',
    carrier_name: 'Eloji',
    surcharge_type: 'ELOJI_RESIDENTIAL',
    surcharge_rate: null,
    surcharge_fixed_jpy: 210,
    description: 'Eloji住宅配送サーチャージ',
    is_active: true
  },
  {
    id: '3',
    carrier_name: 'DHL',
    surcharge_type: 'PEAK_KG',
    surcharge_rate: null,
    surcharge_fixed_jpy: 280,
    description: 'DHL繁忙期追加金（日本→アメリカ ¥280/kg）',
    is_active: true
  },
  {
    id: '4',
    carrier_name: 'FedEx',
    surcharge_type: 'PEAK',
    surcharge_rate: 12.0,
    surcharge_fixed_jpy: null,
    description: 'ピークシーズンサーチャージ（11月〜1月）',
    is_active: true
  },
  {
    id: '5',
    carrier_name: 'FedEx',
    surcharge_type: 'REMOTE_AREA',
    surcharge_rate: null,
    surcharge_fixed_jpy: 850,
    description: '遠隔地サーチャージ',
    is_active: true
  }
]

export function ShippingFeesDatabase() {
  const [oversizeRules] = useState(MOCK_OVERSIZE_RULES)
  const [signatureFees] = useState(MOCK_SIGNATURE_FEES)
  const [insuranceRates] = useState(MOCK_INSURANCE_RATES)
  const [fuelSurcharges] = useState(MOCK_FUEL_SURCHARGES)
  const [demandSurcharges] = useState(MOCK_DEMAND_SURCHARGES)
  const [loading, setLoading] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(price))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long'
    })
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">配送料金データベース管理</h1>
            <p className="text-indigo-100">
              全ての追加料金・サーチャージ・オプション料金の一元管理
            </p>
          </div>
          <Badge className="bg-white text-indigo-600">
            読み込み完了
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="oversize" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="oversize">
            <Ruler className="h-4 w-4 mr-2" />
            サイズ超過 ({oversizeRules.length})
          </TabsTrigger>
          <TabsTrigger value="signature">
            <FileSignature className="h-4 w-4 mr-2" />
            署名料金 ({signatureFees.length})
          </TabsTrigger>
          <TabsTrigger value="insurance">
            <Shield className="h-4 w-4 mr-2" />
            保険料 ({insuranceRates.length})
          </TabsTrigger>
          <TabsTrigger value="fuel">
            <TrendingUp className="h-4 w-4 mr-2" />
            燃油 ({fuelSurcharges.length})
          </TabsTrigger>
          <TabsTrigger value="demand">
            <Scale className="h-4 w-4 mr-2" />
            需要 ({demandSurcharges.length})
          </TabsTrigger>
        </TabsList>

        {/* サイズ超過ルール */}
        <TabsContent value="oversize">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                サイズ・重量超過料金
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {oversizeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-r-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold mb-2">{rule.description}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline">{rule.rule_type}</Badge>
                          <span className="text-gray-600 dark:text-gray-400">
                            閾値: {rule.threshold_value}{rule.threshold_unit}
                          </span>
                          {rule.surcharge_jpy === 0 && (
                            <Badge variant="destructive">配送不可</Badge>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <strong>計算式:</strong> {rule.threshold_value}{rule.threshold_unit}を超過した場合、
                          {rule.surcharge_jpy > 0 ? `¥${formatPrice(rule.surcharge_jpy)}を追加` : '配送不可'}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {rule.surcharge_jpy > 0 ? (
                          <>
                            <div className="text-xl font-bold text-red-600">
                              ¥{formatPrice(rule.surcharge_jpy)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ${rule.surcharge_usd.toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <div className="text-xl font-bold text-red-600">
                            配送不可
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 署名料金 */}
        <TabsContent value="signature">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                署名確認オプション料金
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {signatureFees.map((fee) => (
                  <div
                    key={fee.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold mb-1">{fee.signature_type}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {fee.service_name}
                        </div>
                      </div>
                      {fee.is_included ? (
                        <Badge className="bg-green-600">標準含む</Badge>
                      ) : (
                        <Badge variant="outline">追加料金</Badge>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          ¥{formatPrice(fee.fee_jpy)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ${fee.fee_usd.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {fee.is_included ? '追加料金なし' : '追加料金'}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 pt-3 border-t">
                      <strong>計算式:</strong> 選択した場合、{fee.is_included ? '無料' : `¥${formatPrice(fee.fee_jpy)}を追加`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 保険料 */}
        <TabsContent value="insurance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                運送保険料金表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">商品価値範囲（USD）</th>
                      <th className="text-right p-3">保険料（円）</th>
                      <th className="text-right p-3">保険料（USD）</th>
                      <th className="text-center p-3">必須/オプション</th>
                      <th className="text-left p-3">計算式</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceRates.map((rate, index) => (
                      <tr
                        key={rate.id}
                        className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                      >
                        <td className="p-3">
                          ${rate.item_value_from_usd.toFixed(0)} - ${rate.item_value_to_usd.toFixed(0)}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          ¥{formatPrice(rate.insurance_fee_jpy)}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          ${rate.insurance_fee_usd.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {rate.is_mandatory ? (
                            <Badge variant="destructive">必須</Badge>
                          ) : (
                            <Badge variant="outline">オプション</Badge>
                          )}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          商品価値が${rate.item_value_from_usd}〜${rate.item_value_to_usd}の場合
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>計算方法:</strong> 商品の申告価値に基づいて、該当する価格帯の保険料を適用します。
                  必須の場合は自動的に追加され、オプションの場合はユーザーが選択できます。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 燃油サーチャージ */}
        <TabsContent value="fuel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                燃油サーチャージ（毎月変動）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fuelSurcharges.map((fuel) => (
                  <div
                    key={fuel.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-lg">{fuel.carrier_name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          適用月: {formatDate(fuel.effective_month)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600">
                          {fuel.surcharge_rate}%
                        </div>
                        <div className="text-xs text-gray-500">実効料率</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">基本料率</div>
                        <div className="font-semibold">{fuel.base_surcharge_rate}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">割引率</div>
                        <div className="font-semibold">{fuel.discount_rate}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">追加料金適用</div>
                        <div>
                          {fuel.applies_to_surcharges ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      <strong>計算式:</strong> 基本料金 × {fuel.base_surcharge_rate}%
                      {fuel.discount_rate > 0 && ` × (1 - ${fuel.discount_rate}%)`} = 
                      基本料金 × {fuel.surcharge_rate}%
                      {fuel.applies_to_surcharges && (
                        <div className="mt-1 text-orange-600">
                          ※ 住宅配送、繁忙期などの追加料金にも適用されます
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 需要サーチャージ */}
        <TabsContent value="demand">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                需要サーチャージ（時期・地域変動）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demandSurcharges.map((demand) => (
                  <div
                    key={demand.id}
                    className={`p-4 border-l-4 rounded-r-lg ${
                      demand.is_active 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-300 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{demand.surcharge_type}</Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {demand.carrier_name}
                          </span>
                          {demand.is_active ? (
                            <Badge className="bg-green-600">有効</Badge>
                          ) : (
                            <Badge variant="outline">無効</Badge>
                          )}
                        </div>
                        <div className="font-semibold">{demand.description}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          <strong>計算式:</strong> 
                          {demand.surcharge_rate 
                            ? ` 基本料金 × ${demand.surcharge_rate}%` 
                            : demand.surcharge_fixed_jpy 
                              ? ` 固定額 ¥${formatPrice(demand.surcharge_fixed_jpy)}を追加`
                              : ' 地域・条件により変動'}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {demand.surcharge_rate ? (
                          <div className="text-xl font-bold text-blue-600">
                            {demand.surcharge_rate}%
                          </div>
                        ) : demand.surcharge_fixed_jpy ? (
                          <div className="text-xl font-bold text-blue-600">
                            ¥{formatPrice(demand.surcharge_fixed_jpy)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">変動</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* データベース情報 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              データソース: モックデータ（開発用）
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              最終更新: {new Date().toLocaleDateString('ja-JP')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
