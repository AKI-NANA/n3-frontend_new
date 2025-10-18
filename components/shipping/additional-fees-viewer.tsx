'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Fuel, Shield, FileSignature, Package, AlertTriangle,
  ExternalLink, TrendingUp, Calendar, DollarSign
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FuelSurcharge {
  id: string
  carrier_name: string
  surcharge_rate: number
  effective_month: string
  url?: string
}

interface OversizeRule {
  id: string
  service_name: string
  rule_type: string
  threshold_value: number
  threshold_unit: string
  surcharge_jpy: number
  surcharge_usd: number
  description: string
}

interface InsuranceRate {
  id: string
  service_name: string
  item_value_from_usd: number
  item_value_to_usd: number
  insurance_fee_jpy: number
  insurance_fee_usd: number
  is_mandatory: boolean
}

interface SignatureFee {
  id: string
  service_name: string
  signature_type: string
  fee_jpy: number
  fee_usd: number
  is_included: boolean
}

export function AdditionalFeesViewer() {
  const [fuelSurcharges, setFuelSurcharges] = useState<FuelSurcharge[]>([])
  const [oversizeRules, setOversizeRules] = useState<OversizeRule[]>([])
  const [insuranceRates, setInsuranceRates] = useState<InsuranceRate[]>([])
  const [signatureFees, setSignatureFees] = useState<SignatureFee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadFuelSurcharges(),
      loadOversizeRules(),
      loadInsuranceRates(),
      loadSignatureFees()
    ])
    setLoading(false)
  }

  const loadFuelSurcharges = async () => {
    const { data, error } = await supabase
      .from('fuel_surcharges')
      .select(`
        id,
        surcharge_rate,
        effective_month,
        shipping_carriers!inner(
          carrier_name
        )
      `)
      .order('effective_month', { ascending: false })

    if (data) {
      setFuelSurcharges(data.map((d: any) => ({
        id: d.id,
        carrier_name: d.shipping_carriers.carrier_name,
        surcharge_rate: Number(d.surcharge_rate),
        effective_month: d.effective_month
      })))
    }
  }

  const loadOversizeRules = async () => {
    const { data, error } = await supabase
      .from('oversize_rules')
      .select('*')
      .order('threshold_value', { ascending: true })

    if (data) {
      setOversizeRules(data.map((d: any) => ({
        id: d.id,
        service_name: d.description || 'N/A',
        rule_type: d.rule_type,
        threshold_value: Number(d.threshold_value),
        threshold_unit: d.threshold_unit,
        surcharge_jpy: Number(d.surcharge_jpy),
        surcharge_usd: Number(d.surcharge_usd),
        description: d.description
      })))
    }
  }

  const loadInsuranceRates = async () => {
    const { data, error } = await supabase
      .from('insurance_rates')
      .select('*')
      .order('item_value_from_usd', { ascending: true })
      .limit(50)

    if (data) {
      setInsuranceRates(data.map((d: any) => ({
        id: d.id,
        service_name: 'サービス共通',
        item_value_from_usd: Number(d.item_value_from_usd),
        item_value_to_usd: Number(d.item_value_to_usd),
        insurance_fee_jpy: Number(d.insurance_fee_jpy),
        insurance_fee_usd: Number(d.insurance_fee_usd),
        is_mandatory: d.is_mandatory
      })))
    }
  }

  const loadSignatureFees = async () => {
    const { data, error } = await supabase
      .from('signature_fees')
      .select('*')
      .order('fee_jpy', { ascending: true })

    if (data) {
      setSignatureFees(data.map((d: any) => ({
        id: d.id,
        service_name: 'サービス共通',
        signature_type: d.signature_type,
        fee_jpy: Number(d.fee_jpy),
        fee_usd: Number(d.fee_usd),
        is_included: d.is_included
      })))
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(price))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long'
    })
  }

  // 燃油サーチャージの公式URL
  const fuelSurchargeUrls = {
    'FedEx': 'https://www.fedex.com/ja-jp/shipping/surcharges-and-fees.html',
    'DHL': 'https://www.dhl.com/jp-ja/home/footer/express-conditions-of-carriage.html',
    'UPS': 'https://www.ups.com/jp/ja/support/shipping-support/shipping-costs-rates/surcharges.page',
    '日本郵便': 'https://www.post.japanpost.jp/int/information/'
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">追加料金・オプション料金データベース</h2>
        <p className="text-blue-100">
          燃油サーチャージ、サイズ超過料金、保険料、署名料金の詳細情報
        </p>
      </div>

      <Tabs defaultValue="fuel" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fuel" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            燃油サーチャージ ({fuelSurcharges.length})
          </TabsTrigger>
          <TabsTrigger value="oversize" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            サイズ超過 ({oversizeRules.length})
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            保険料 ({insuranceRates.length})
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            署名料金 ({signatureFees.length})
          </TabsTrigger>
        </TabsList>

        {/* 燃油サーチャージタブ */}
        <TabsContent value="fuel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                燃油サーチャージ（Fuel Surcharge）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      燃油サーチャージについて
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      燃油サーチャージは毎月変動します。各配送業者の公式サイトから最新の料率を確認してください。
                      システムは定期的にスクレイピングで自動更新されますが、手動での確認を推奨します。
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">公式リンク:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(fuelSurchargeUrls).map(([carrier, url]) => (
                          <a
                            key={carrier}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {carrier}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {fuelSurcharges.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  燃油サーチャージデータがありません
                </p>
              ) : (
                <div className="space-y-4">
                  {fuelSurcharges.map((surcharge) => (
                    <div
                      key={surcharge.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                          <Fuel className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{surcharge.carrier_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            適用月: {formatDate(surcharge.effective_month)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                          {surcharge.surcharge_rate}%
                        </div>
                        <div className="text-xs text-gray-500">
                          基本料金に対して
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">計算例</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  基本料金 ¥10,000 × 燃油サーチャージ 21.5% = 追加 ¥2,150<br />
                  <span className="font-semibold">合計: ¥12,150</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* サイズ超過料金タブ */}
        <TabsContent value="oversize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                サイズ超過料金（Oversize Surcharge）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-200 mb-1">
                      重要: 規定サイズ・重量を超過すると追加料金が発生します
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      各配送業者ごとに異なる制限があります。大型・重量物の発送前に必ず確認してください。
                    </p>
                  </div>
                </div>
              </div>

              {oversizeRules.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  サイズ超過ルールデータがありません
                </p>
              ) : (
                <div className="space-y-3">
                  {oversizeRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 border-l-4 border-red-500 bg-gray-50 dark:bg-gray-800 rounded-r-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold mb-1">{rule.description}</div>
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline" className="font-mono">
                              {rule.rule_type}
                            </Badge>
                            <span className="text-gray-600 dark:text-gray-400">
                              閾値: {rule.threshold_value}{rule.threshold_unit}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold text-red-600 dark:text-red-400">
                            ¥{formatPrice(rule.surcharge_jpy)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${rule.surcharge_usd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 保険料タブ */}
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                保険料（Insurance Fee）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                      配送保険について
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      商品価値に応じた保険料を設定します。高額商品の場合は必ず保険への加入をお勧めします。
                      一部のサービスでは保険が必須（Mandatory）となっています。
                    </p>
                  </div>
                </div>
              </div>

              {insuranceRates.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  保険料データがありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">商品価値（USD）</th>
                        <th className="text-right p-3 font-semibold">保険料（円）</th>
                        <th className="text-right p-3 font-semibold">保険料（USD）</th>
                        <th className="text-center p-3 font-semibold">必須</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuranceRates.slice(0, 20).map((rate, index) => (
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
                          <td className="p-3 text-right text-gray-600 dark:text-gray-400">
                            ${rate.insurance_fee_usd.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            {rate.is_mandatory ? (
                              <Badge variant="destructive">必須</Badge>
                            ) : (
                              <Badge variant="outline">オプション</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 署名料金タブ */}
        <TabsContent value="signature" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                署名料金（Signature Fee）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileSignature className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                      署名確認オプション
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      配送時の署名確認サービスです。確実な受け取りを保証します。
                      署名タイプによって料金が異なります（間接署名、直接署名、成人署名など）。
                    </p>
                  </div>
                </div>
              </div>

              {signatureFees.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  署名料金データがありません
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {signatureFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold mb-1">
                            {fee.signature_type}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {fee.service_name}
                          </div>
                        </div>
                        {fee.is_included && (
                          <Badge className="bg-green-600">標準含む</Badge>
                        )}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
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
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">署名タイプの説明</h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div><strong>INDIRECT:</strong> 間接署名 - 同居者または隣人の署名でも可</div>
                  <div><strong>DIRECT:</strong> 直接署名 - 受取人本人の署名が必要</div>
                  <div><strong>ADULT:</strong> 成人署名 - 21歳以上の成人の署名が必要</div>
                  <div><strong>BASIC:</strong> 基本署名 - 標準の署名確認</div>
                  <div><strong>REGISTERED:</strong> 書留 - 日本郵便の書留サービス</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* データ更新情報 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              最終更新: {new Date().toLocaleDateString('ja-JP')}
            </div>
            <Button
              onClick={loadAllData}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? '読み込み中...' : 'データを再読み込み'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
