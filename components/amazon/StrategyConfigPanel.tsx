'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Save, Settings, TrendingUp, Shield, Eye } from 'lucide-react'
import { AmazonResearchStrategy, StrategyExecutionResult } from '@/types/amazon-strategy'

export function StrategyConfigPanel() {
  const [strategy, setStrategy] = useState<Partial<AmazonResearchStrategy>>({
    enable_inventory_protection: true,
    min_profit_score_threshold: 5000,
    enable_new_products: true,
    new_products_days: 30,
    monitor_categories: [],
    monitor_keywords: [],
    enable_competitor_tracking: false,
    competitor_seller_ids: [],
    enable_ebay_sold_tracking: false,
    execution_frequency: 'daily',
    max_asins_per_execution: 100,
    is_active: true
  })

  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [lastResult, setLastResult] = useState<StrategyExecutionResult | null>(null)

  // 戦略設定をロード
  useEffect(() => {
    loadStrategy()
  }, [])

  const loadStrategy = async () => {
    try {
      const response = await fetch('/api/amazon/strategy/config')
      const data = await response.json()
      if (data.strategy) {
        setStrategy(data.strategy)
      }
    } catch (error) {
      console.error('Load strategy error:', error)
    }
  }

  const saveStrategy = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/amazon/strategy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy)
      })

      if (!response.ok) {
        throw new Error('Failed to save strategy')
      }

      alert('戦略設定を保存しました')
      await loadStrategy()
    } catch (error) {
      console.error('Save strategy error:', error)
      alert('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const executeStrategy = async () => {
    if (!confirm('戦略を実行してASINをキューに追加しますか？')) {
      return
    }

    try {
      setExecuting(true)
      const response = await fetch('/api/amazon/strategy/execute', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute strategy')
      }

      setLastResult(data.result)
      alert(`成功: ${data.result.asins_selected}個のASINを選定し、${data.result.asins_queued}個をキューに追加しました`)
    } catch (error: any) {
      console.error('Execute strategy error:', error)
      alert(`実行に失敗しました: ${error.message}`)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Amazonリサーチ戦略設定
          </h2>
          <p className="text-muted-foreground mt-1">
            自動でASINを選定し、継続的な更新キューに投入する戦略を設定します
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveStrategy} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
          <Button onClick={executeStrategy} disabled={executing} variant="default">
            <Play className="w-4 h-4 mr-2" />
            今すぐ実行
          </Button>
        </div>
      </div>

      {/* 1. 資産の保護 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            1. 資産の保護（有在庫品・高スコア品）
          </CardTitle>
          <CardDescription>
            既に仕入れ済み、または高評価の商品のデータ鮮度を維持します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 有在庫品の更新 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>有在庫品の更新</Label>
              <p className="text-sm text-muted-foreground">
                SKUマスター内の全ASINを最優先で更新
              </p>
            </div>
            <Switch
              checked={strategy.enable_inventory_protection}
              onCheckedChange={(checked) =>
                setStrategy({ ...strategy, enable_inventory_protection: checked })
              }
            />
          </div>

          <Separator />

          {/* 最低スコア設定 */}
          <div className="space-y-2">
            <Label>最低$U_i$スコア</Label>
            <p className="text-sm text-muted-foreground">
              過去にこのスコアを超えたASINを継続監視
            </p>
            <Input
              type="number"
              value={strategy.min_profit_score_threshold}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  min_profit_score_threshold: parseInt(e.target.value) || 0
                })
              }
              placeholder="例: 5000"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. 市場の開拓 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            2. 市場の開拓（新規・特定の条件）
          </CardTitle>
          <CardDescription>
            利益率が高くなる可能性のあるニッチな商品を探し出します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 新規出品の監視 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>新規出品の監視</Label>
              <p className="text-sm text-muted-foreground">
                最近追加された商品を自動追跡
              </p>
            </div>
            <Switch
              checked={strategy.enable_new_products}
              onCheckedChange={(checked) =>
                setStrategy({ ...strategy, enable_new_products: checked })
              }
            />
          </div>

          {strategy.enable_new_products && (
            <div className="space-y-2">
              <Label>新規商品の期間（日数）</Label>
              <Input
                type="number"
                value={strategy.new_products_days}
                onChange={(e) =>
                  setStrategy({
                    ...strategy,
                    new_products_days: parseInt(e.target.value) || 30
                  })
                }
                placeholder="例: 30"
              />
            </div>
          )}

          <Separator />

          {/* 監視キーワード */}
          <div className="space-y-2">
            <Label>監視キーワード</Label>
            <p className="text-sm text-muted-foreground">
              利益率が高いと予想されるニッチなワードをカンマ区切りで入力
            </p>
            <Input
              value={strategy.monitor_keywords?.join(', ') || ''}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  monitor_keywords: e.target.value
                    .split(',')
                    .map(k => k.trim())
                    .filter(Boolean)
                })
              }
              placeholder="例: トレーディングカード, 限定品, プレミアム"
            />
            {strategy.monitor_keywords && strategy.monitor_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {strategy.monitor_keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* 価格帯フィルタ */}
          <div className="space-y-2">
            <Label>価格帯フィルタ</Label>
            <p className="text-sm text-muted-foreground">
              特定の価格範囲の商品のみを監視
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs">下限（円）</Label>
                <Input
                  type="number"
                  value={strategy.price_range_min || ''}
                  onChange={(e) =>
                    setStrategy({
                      ...strategy,
                      price_range_min: e.target.value ? parseInt(e.target.value) : undefined
                    })
                  }
                  placeholder="例: 10000"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">上限（円）</Label>
                <Input
                  type="number"
                  value={strategy.price_range_max || ''}
                  onChange={(e) =>
                    setStrategy({
                      ...strategy,
                      price_range_max: e.target.value ? parseInt(e.target.value) : undefined
                    })
                  }
                  placeholder="例: 50000"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 競合の追跡 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            3. 競合の追跡（外部データとの連携）
          </CardTitle>
          <CardDescription>
            競合セラーや他モールの動向からASINを選定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 競合セラーの監視 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>競合セラーの監視</Label>
              <p className="text-sm text-muted-foreground">
                特定のセラーが出品する商品を追跡
              </p>
            </div>
            <Switch
              checked={strategy.enable_competitor_tracking}
              onCheckedChange={(checked) =>
                setStrategy({ ...strategy, enable_competitor_tracking: checked })
              }
            />
          </div>

          {strategy.enable_competitor_tracking && (
            <div className="space-y-2">
              <Label>競合セラーID</Label>
              <Input
                value={strategy.competitor_seller_ids?.join(', ') || ''}
                onChange={(e) =>
                  setStrategy({
                    ...strategy,
                    competitor_seller_ids: e.target.value
                      .split(',')
                      .map(id => id.trim())
                      .filter(Boolean)
                  })
                }
                placeholder="例: A1B2C3D4E5, F6G7H8I9J0"
              />
              {strategy.competitor_seller_ids && strategy.competitor_seller_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {strategy.competitor_seller_ids.map((id, i) => (
                    <Badge key={i} variant="outline">
                      {id}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* eBay Sold実績の追跡 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>eBay Sold実績の追跡</Label>
              <p className="text-sm text-muted-foreground">
                eBayで売れた商品と同じASINを監視
              </p>
            </div>
            <Switch
              checked={strategy.enable_ebay_sold_tracking}
              onCheckedChange={(checked) =>
                setStrategy({ ...strategy, enable_ebay_sold_tracking: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 実行設定 */}
      <Card>
        <CardHeader>
          <CardTitle>実行設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>1回の実行で選定する最大ASIN数</Label>
            <Input
              type="number"
              value={strategy.max_asins_per_execution}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  max_asins_per_execution: parseInt(e.target.value) || 100
                })
              }
              placeholder="例: 100"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>戦略を有効化</Label>
              <p className="text-sm text-muted-foreground">
                オフにすると自動実行されません
              </p>
            </div>
            <Switch
              checked={strategy.is_active}
              onCheckedChange={(checked) =>
                setStrategy({ ...strategy, is_active: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 最終実行結果 */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>最終実行結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">選定ASIN数</p>
                <p className="text-2xl font-bold">{lastResult.asins_selected}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">キュー追加数</p>
                <p className="text-2xl font-bold text-green-600">{lastResult.asins_queued}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">スキップ数</p>
                <p className="text-2xl font-bold text-gray-600">{lastResult.asins_skipped}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">状態</p>
                <Badge variant={lastResult.success ? 'default' : 'destructive'}>
                  {lastResult.success ? '成功' : '失敗'}
                </Badge>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <p className="text-sm font-medium mb-2">ソース別内訳</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(lastResult.breakdown).map(([source, count]) => (
                  count > 0 && (
                    <div key={source} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-xs">{source}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  )
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
