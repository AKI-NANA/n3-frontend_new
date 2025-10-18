'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface PolicyStats {
  total: number
  pending: number
  created: number
  failed: number
}

export function EbayPolicyUploader() {
  const [stats, setStats] = useState<PolicyStats>({ total: 0, pending: 0, created: 0, failed: 0 })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  const loadStats = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ebay_shipping_policies_final')
      .select('ebay_policy_status')

    if (error) {
      console.error(error)
      return
    }

    const total = data.length
    const pending = data.filter(p => p.ebay_policy_status === 'pending').length
    const created = data.filter(p => p.ebay_policy_status === 'created').length
    const failed = data.filter(p => p.ebay_policy_status === 'failed').length

    setStats({ total, pending, created, failed })
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const uploadPolicies = async () => {
    setUploading(true)
    setLogs([])
    addLog('📦 配送ポリシーのアップロード開始')

    try {
      const supabase = createClient()

      // pending状態のポリシーを取得
      const { data: policies, error } = await supabase
        .from('ebay_shipping_policies_final')
        .select('*')
        .eq('ebay_policy_status', 'pending')
        .order('weight_band_no, product_price_usd')

      if (error) throw error

      addLog(`✅ ${policies.length}個のポリシーを取得しました`)

      let successCount = 0
      let failCount = 0

      // バッチ処理（10個ずつ）
      for (let i = 0; i < policies.length; i += 10) {
        const batch = policies.slice(i, i + 10)
        
        addLog(`📤 バッチ ${Math.floor(i / 10) + 1}/${Math.ceil(policies.length / 10)}: ${batch.length}個を処理中...`)

        // eBay APIを呼び出し
        const results = await Promise.allSettled(
          batch.map(policy => createEbayShippingPolicy(policy))
        )

        // 結果を処理
        for (let j = 0; j < results.length; j++) {
          const policy = batch[j]
          const result = results[j]

          if (result.status === 'fulfilled' && result.value.success) {
            // 成功
            await supabase
              .from('ebay_shipping_policies_final')
              .update({
                ebay_policy_id: result.value.policyId,
                ebay_policy_status: 'created',
                updated_at: new Date().toISOString()
              })
              .eq('id', policy.id)

            successCount++
            addLog(`✅ ${policy.policy_name}: 作成成功`)
          } else {
            // 失敗
            const errorMsg = result.status === 'rejected' 
              ? result.reason.message 
              : (result.value as any).error

            await supabase
              .from('ebay_shipping_policies_final')
              .update({
                ebay_policy_status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq('id', policy.id)

            failCount++
            addLog(`❌ ${policy.policy_name}: ${errorMsg}`)
          }
        }

        // 進捗更新
        setProgress(Math.round(((i + batch.length) / policies.length) * 100))

        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      addLog(`🎉 完了: 成功 ${successCount}個、失敗 ${failCount}個`)
      await loadStats()

    } catch (err: any) {
      addLog(`❌ エラー: ${err.message}`)
      console.error(err)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const createEbayShippingPolicy = async (policy: any): Promise<{ success: boolean; policyId?: string; error?: string }> => {
    try {
      // eBay API呼び出し
      const response = await fetch('/api/ebay/shipping-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: policy.policy_name,
          marketplaceId: 'EBAY_US',
          categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES', default: true }],
          
          // USA向け固定送料
          shippingOptions: [
            {
              costType: 'FLAT_RATE',
              shippingServices: [
                {
                  shippingCarrierCode: 'USPS',
                  shippingServiceCode: 'USPSPriorityFlatRateEnvelope',
                  shippingCost: {
                    value: policy.usa_total_shipping_usd.toString(),
                    currency: 'USD'
                  },
                  additionalShippingCost: {
                    value: policy.usa_total_shipping_usd.toString(),
                    currency: 'USD'
                  },
                  shipToLocations: {
                    regionIncluded: [{ regionName: 'United States', regionType: 'COUNTRY' }]
                  }
                }
              ]
            }
          ],

          // その他の国はRate Table参照
          rateTables: [
            {
              rateTableId: policy.rate_table_name,
              countryCode: 'US',
              locality: 'DOMESTIC'
            }
          ],

          // 除外国設定
          shipToLocations: {
            regionExcluded: Array.from({ length: 77 }, (_, i) => ({
              regionType: 'COUNTRY'
            }))
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'API Error' }
      }

      const data = await response.json()
      return { success: true, policyId: data.shippingPolicyId }

    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  useState(() => {
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          eBay配送ポリシー アップローダー
        </h2>
        <p className="text-sm opacity-90">
          1200個の配送ポリシーをeBay APIに一括アップロード
        </p>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">合計</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">未作成</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.created}</div>
            <div className="text-sm text-gray-600">作成済み</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">失敗</div>
          </CardContent>
        </Card>
      </div>

      {/* アップロードコントロール */}
      <Card>
        <CardHeader>
          <CardTitle>アップロード実行</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>⚠️ 注意:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• 未作成（pending）の{stats.pending}個のポリシーをeBayに作成します</li>
                <li>• 10個ずつバッチ処理（レート制限対策）</li>
                <li>• 所要時間: 約{Math.ceil(stats.pending / 10)}分</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              onClick={uploadPolicies}
              disabled={uploading || stats.pending === 0}
              className="flex-1"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  {stats.pending}個をeBayにアップロード
                </>
              )}
            </Button>

            <Button
              onClick={loadStats}
              variant="outline"
              size="lg"
            >
              統計を更新
            </Button>
          </div>

          {uploading && (
            <div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center mt-2 text-gray-600">{progress}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ログ */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>実行ログ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
