'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Loader2, CheckCircle, Pause, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface UploadProgress {
  total: number
  success: number
  failed: number
  current: number
  currentPolicyName: string
}

export function PartialBulkUploader() {
  const [uploading, setUploading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    success: 0,
    failed: 0,
    current: 0,
    currentPolicyName: ''
  })
  const [selectedAccount, setSelectedAccount] = useState<'mjt' | 'green'>('green')
  const [errors, setErrors] = useState<string[]>([])
  const [intervalMs, setIntervalMs] = useState(1000)

  // 存在するRate Table番号（1-16）
  const existingRateTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

  const loadExcludedCountries = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('excluded_countries_master')
        .select('country_code')
        .order('country_code')

      if (error) throw error
      return data.map(item => item.country_code)
    } catch (error) {
      console.error('Failed to load excluded countries:', error)
      return []
    }
  }

  const startPartialUpload = async () => {
    setUploading(true)
    setPaused(false)
    setErrors([])

    try {
      const supabase = createClient()

      // 存在するRate Tableに該当するポリシーのみを取得
      console.log('🚀 該当ポリシーを読み込み中...')
      
      let targetPolicies: any[] = []
      
      for (const rtNum of existingRateTables) {
        const { data, error } = await supabase
          .from('shipping_policies')
          .select('*')
          .ilike('rate_table_name', `RT_Express_${rtNum}`)
          .order('id', { ascending: true })

        if (error) throw error
        if (data) {
          targetPolicies = [...targetPolicies, ...data]
        }
      }

      console.log(`✅ ${targetPolicies.length}個の該当ポリシーを読み込みました`)

      // 除外国リストを取得
      const excludedCountries = await loadExcludedCountries()
      console.log(`✅ ${excludedCountries.length}カ国の除外国を読み込みました`)

      setProgress({
        total: targetPolicies.length,
        success: 0,
        failed: 0,
        current: 0,
        currentPolicyName: ''
      })

      let successCount = 0
      let failedCount = 0
      const errorLog: string[] = []

      // 各ポリシーをアップロード
      for (let i = 0; i < targetPolicies.length; i++) {
        while (paused) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        const policy = targetPolicies[i]

        setProgress(prev => ({
          ...prev,
          current: i + 1,
          currentPolicyName: policy.policy_name
        }))

        try {
          console.log(`📋 Policy data:`, {
            name: policy.policy_name,
            rate_table_name: policy.rate_table_name,
            flat_shipping_cost: policy.flat_shipping_cost
          })

          const shippingOptions: any[] = [
            // USA向け（固定料金・DDP込み）
            {
              costType: 'FLAT_RATE',
              optionType: 'DOMESTIC',
              shippingServices: [
                {
                  shippingCarrierCode: 'OTHER',
                  shippingServiceCode: 'ExpeditedShippingFromOutsideUS',
                  deliveryTimeMin: 1,
                  deliveryTimeMax: 4,
                  freeShipping: false,
                  shippingCost: {
                    value: policy.flat_shipping_cost.toFixed(2),
                    currency: 'USD'
                  },
                  additionalShippingCost: {
                    value: policy.flat_shipping_cost.toFixed(2),
                    currency: 'USD'
                  },
                  shipToLocations: {
                    regionIncluded: [
                      {
                        regionName: 'US',
                        regionType: 'COUNTRY'
                      }
                    ]
                  }
                }
              ]
            },
            // 国際配送（Rate Table使用・DDU）
            {
              costType: 'CALCULATED',
              optionType: 'INTERNATIONAL',
              rateTableId: policy.rate_table_name,
              shippingServices: [
                {
                  shippingCarrierCode: 'OTHER',
                  shippingServiceCode: 'ExpeditedShippingFromOutsideUS',
                  deliveryTimeMin: 7,
                  deliveryTimeMax: 15,
                  freeShipping: false,
                  shipToLocations: {
                    regionIncluded: [
                      {
                        regionName: 'WORLDWIDE',
                        regionType: 'WORLD_REGION'
                      }
                    ],
                    regionExcluded: [
                      {
                        regionName: 'US',
                        regionType: 'COUNTRY'
                      },
                      ...excludedCountries.map(code => ({
                        regionName: code,
                        regionType: 'COUNTRY_CODE'
                      }))
                    ]
                  }
                }
              ]
            }
          ]

          const payload = {
            name: policy.policy_name,
            description: policy.description,
            marketplaceId: 'EBAY_US',
            categoryTypes: [
              {
                name: 'ALL_EXCLUDING_MOTORS_VEHICLES',
                default: false
              }
            ],
            handlingTime: {
              value: policy.handling_time_days,
              unit: 'DAY'
            },
            shippingOptions
          }

          console.log(`📤 [${i + 1}/${targetPolicies.length}] アップロード中: ${policy.policy_name}`)
          console.log('📦 Payload:', JSON.stringify(payload, null, 2))

          const response = await fetch('/api/ebay/shipping-policy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-eBay-Account': selectedAccount
            },
            body: JSON.stringify(payload)
          })

          const data = await response.json()

          if (response.ok) {
            successCount++
            console.log(`✅ [${i + 1}/${targetPolicies.length}] 成功: ${policy.policy_name}`)

            await supabase
              .from('shipping_policies')
              .update({
                status: 'uploaded',
                updated_at: new Date().toISOString()
              })
              .eq('id', policy.id)

          } else {
            failedCount++
            const errorMsg = `❌ ${policy.policy_name}: ${data.error || 'Unknown error'}`
            errorLog.push(errorMsg)
            console.error(errorMsg)
          }

        } catch (error: any) {
          failedCount++
          const errorMsg = `❌ ${policy.policy_name}: ${error.message}`
          errorLog.push(errorMsg)
          console.error(errorMsg)
        }

        setProgress(prev => ({
          ...prev,
          success: successCount,
          failed: failedCount
        }))

        if (i < targetPolicies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs))
        }
      }

      console.log(`🎉 アップロード完了: 成功 ${successCount}件、失敗 ${failedCount}件`)
      setErrors(errorLog)

    } catch (error: any) {
      console.error('❌ 一括アップロードエラー:', error)
      setErrors([error.message])
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          部分的一括アップロード
        </h2>
        <p className="text-sm opacity-90">
          Rate Table 1-16に該当するポリシーのみアップロード
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>対象Rate Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {existingRateTables.map(num => (
              <div key={num} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-mono">
                RT_Express_{num}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>eBayアカウント選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={selectedAccount === 'green' ? 'default' : 'outline'}
              onClick={() => setSelectedAccount('green')}
              disabled={uploading}
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
              disabled={uploading}
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

      <Card>
        <CardHeader>
          <CardTitle>アップロード設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium mb-2">
              API呼び出し間隔（ミリ秒）
            </label>
            <input
              type="number"
              value={intervalMs}
              onChange={(e) => setIntervalMs(parseInt(e.target.value))}
              disabled={uploading}
              min={500}
              max={5000}
              step={100}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {uploading && (
        <Card>
          <CardHeader>
            <CardTitle>アップロード進捗</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  {progress.current} / {progress.total} ポリシー
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{progress.current}</div>
                <div className="text-xs text-gray-600">処理中</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{progress.success}</div>
                <div className="text-xs text-gray-600">成功</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                <div className="text-xs text-gray-600">失敗</div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">現在処理中:</div>
              <div className="text-xs font-mono text-gray-600 mt-1">{progress.currentPolicyName}</div>
            </div>

            <Button
              onClick={() => setPaused(!paused)}
              variant="outline"
              className="w-full"
            >
              {paused ? <><Play className="w-4 h-4 mr-2" />再開</> : <><Pause className="w-4 h-4 mr-2" />一時停止</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {!uploading && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={startPartialUpload}
              size="lg"
              className="w-full"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  {selectedAccount.toUpperCase()}にアップロード開始
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">エラーログ ({errors.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-xs font-mono text-red-600 p-2 bg-red-50 rounded">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!uploading && progress.total > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="font-bold mb-2">✅ アップロード完了</div>
            <div>成功: {progress.success}件 / 失敗: {progress.failed}件 / 合計: {progress.total}件</div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
