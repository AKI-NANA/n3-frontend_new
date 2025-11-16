'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Zap, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'

interface RuleExecutionResult {
  rule: string
  success: boolean
  products_affected: number
  message: string
}

export function PriceAutomationTab() {
  const [executing, setExecuting] = useState<string | null>(null)
  const [results, setResults] = useState<RuleExecutionResult[]>([])

  const priceRules = [
    {
      id: 'follow_lowest',
      name: '最安値追従（最低利益確保）',
      description: '競合の最安値を追従しつつ、最低利益を確保',
      endpoint: '/api/pricing/follow-lowest',
      enabled: true
    },
    {
      id: 'sold_based',
      name: 'SOLD数値上げ',
      description: '販売実績に基づいて段階的に価格を上昇',
      endpoint: '/api/pricing/sold-based-adjustment',
      enabled: true
    },
    {
      id: 'watcher_based',
      name: 'ウォッチャー連動値上げ',
      description: 'ウォッチャー数が多い商品の価格を上昇',
      endpoint: '/api/pricing/watcher-based-adjustment',
      enabled: true
    },
    {
      id: 'seasonal',
      name: '季節・時期調整',
      description: 'カテゴリと時期に応じた価格調整',
      endpoint: '/api/pricing/seasonal-adjustment',
      enabled: true
    },
    {
      id: 'competitor_trust',
      name: '競合信頼度プレミアム',
      description: '高評価セラーの商品に信頼度プレミアムを加算',
      endpoint: '/api/pricing/competitor-premium',
      enabled: false // 次回実装
    }
  ]

  const executeRule = async (ruleId: string, endpoint: string) => {
    if (!endpoint || executing) return

    setExecuting(ruleId)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      })

      const data = await response.json()

      const result: RuleExecutionResult = {
        rule: ruleId,
        success: data.success || response.ok,
        products_affected: data.updated || data.affected || 0,
        message: data.message || data.error || '実行完了'
      }

      setResults(prev => [result, ...prev])

      if (result.success) {
        alert(`✅ ${result.products_affected}件の商品を更新しました`)
      } else {
        alert(`❌ エラー: ${result.message}`)
      }
    } catch (error) {
      console.error('ルール実行エラー:', error)
      alert('実行中にエラーが発生しました')
    } finally {
      setExecuting(null)
    }
  }

  const executeAllRules = async () => {
    if (!confirm('全ルールを実行しますか？')) return

    setExecuting('all')
    setResults([])

    for (const rule of priceRules.filter(r => r.enabled && r.endpoint)) {
      try {
        const response = await fetch(rule.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun: false })
        })

        const data = await response.json()

        setResults(prev => [
          ...prev,
          {
            rule: rule.id,
            success: data.success || response.ok,
            products_affected: data.updated || data.affected || 0,
            message: data.message || data.error || '実行完了'
          }
        ])

        // 各ルール間に0.5秒の遅延
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`${rule.name} 実行エラー:`, error)
        setResults(prev => [
          ...prev,
          {
            rule: rule.id,
            success: false,
            products_affected: 0,
            message: 'エラーが発生しました'
          }
        ])
      }
    }

    setExecuting(null)
    alert('全ルールの実行が完了しました')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                価格ルール管理
              </CardTitle>
              <CardDescription>
                各価格調整ルールを個別または一括で実行できます
              </CardDescription>
            </div>
            <Button
              onClick={executeAllRules}
              disabled={executing !== null}
              size="lg"
              className="gap-2"
            >
              {executing === 'all' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  実行中...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  全ルール一括実行
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ルール一覧 */}
      <div className="space-y-3">
        {priceRules.map((rule) => (
          <Card key={rule.id} className={!rule.enabled ? 'opacity-60' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{rule.name}</h3>
                    {rule.badge && (
                      <Badge variant="secondary">{rule.badge}</Badge>
                    )}
                    {!rule.enabled && (
                      <Badge variant="outline">未実装</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <Button
                  onClick={() => executeRule(rule.id, rule.endpoint)}
                  disabled={!rule.enabled || executing !== null}
                  variant={rule.enabled ? 'default' : 'outline'}
                  className="gap-2"
                >
                  {executing === rule.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      実行中
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      実行
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* 実行結果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>実行結果</CardTitle>
            <CardDescription>直近の実行履歴</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {priceRules.find(r => r.id === result.rule)?.name || result.rule}
                      </p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.products_affected}件
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 説明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">💡 価格ルールについて</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• 各ルールの有効/無効は「デフォルト設定」タブで管理します</li>
            <li>• ルールは設定で有効になっている商品のみに適用されます</li>
            <li>• 一括実行時は上から順番に実行されます</li>
            <li>• 実行前に必ずデフォルト設定を確認してください</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
