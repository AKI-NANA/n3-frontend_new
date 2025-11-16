'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { Save, RefreshCw, CheckCircle, Globe } from 'lucide-react'

const RECOMMENDED_DEFAULTS = {
  pricing_strategy: 'follow_lowest',
  min_profit_usd: 10,
  price_adjust_percent: -5,
  follow_competitor: true,
  max_adjust_percent: 20,
  price_difference_usd: 5,
  apply_above_lowest: true,
  out_of_stock_action: 'set_zero',
  check_frequency: '1day',
  multi_source_enabled: false,
  seasonal_pricing_enabled: false,
  sold_based_pricing_enabled: false,
  watcher_based_pricing_enabled: false,
  auto_swap_enabled: false,
  competitor_trust_enabled: false
}

export default function PricingDefaultsSettings() {
  const [marketplace, setMarketplace] = useState('ebay')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState(RECOMMENDED_DEFAULTS)

  const supabase = createClient()

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchDefaults = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('global_pricing_strategy')
        .select('*')
        .eq('marketplace', marketplace)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('デフォルト設定取得エラー:', error)
        showMessage('設定の取得に失敗しました', 'error')
        return
      }

      if (data) {
        setFormData({
          pricing_strategy: data.pricing_strategy || 'follow_lowest',
          min_profit_usd: data.min_profit_usd || 10,
          price_adjust_percent: data.price_adjust_percent || -5,
          follow_competitor: data.follow_competitor ?? true,
          max_adjust_percent: data.max_adjust_percent || 20,
          price_difference_usd: data.price_difference_usd || 5,
          apply_above_lowest: data.apply_above_lowest ?? true,
          out_of_stock_action: data.out_of_stock_action || 'set_zero',
          check_frequency: data.check_frequency || '1day',
          multi_source_enabled: data.multi_source_enabled ?? false,
          seasonal_pricing_enabled: data.seasonal_pricing_enabled ?? false,
          sold_based_pricing_enabled: data.sold_based_pricing_enabled ?? false,
          watcher_based_pricing_enabled: data.watcher_based_pricing_enabled ?? false,
          auto_swap_enabled: data.auto_swap_enabled ?? false,
          competitor_trust_enabled: data.competitor_trust_enabled ?? false
        })
      } else {
        setFormData(RECOMMENDED_DEFAULTS)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDefaults()
  }, [marketplace])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('global_pricing_strategy')
        .upsert({
          marketplace,
          ...formData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'marketplace'
        })

      if (error) {
        console.error('保存エラー:', error)
        showMessage('保存に失敗しました', 'error')
      } else {
        showMessage('設定を保存しました')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleResetToRecommended = () => {
    if (confirm('おすすめ設定に戻しますか？')) {
      setFormData(RECOMMENDED_DEFAULTS)
      showMessage('おすすめ設定を適用しました')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            マーケットプレイス選択
          </CardTitle>
          <CardDescription>
            設定を管理するマーケットプレイスを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={marketplace} onValueChange={setMarketplace} className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="ebay">eBay</TabsTrigger>
              <TabsTrigger value="amazon_us">Amazon US</TabsTrigger>
              <TabsTrigger value="amazon_jp">Amazon JP</TabsTrigger>
              <TabsTrigger value="shopee">Shopee</TabsTrigger>
              <TabsTrigger value="coupang">Coupang</TabsTrigger>
              <TabsTrigger value="shopify">Shopify</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>グローバルデフォルト価格戦略</CardTitle>
              <CardDescription>
                すべての商品に適用される基本的な価格戦略を設定します
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetToRecommended} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                おすすめに戻す
              </Button>
              <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    設定を保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold">💰 価格戦略</Label>
                <RadioGroup
                  value={formData.pricing_strategy}
                  onValueChange={(value) => setFormData({ ...formData, pricing_strategy: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="follow_lowest" id="follow_lowest" />
                    <Label htmlFor="follow_lowest" className="font-normal cursor-pointer">
                      最安値追従（最低利益確保）★おすすめ
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="price_difference" id="price_difference" />
                    <Label htmlFor="price_difference" className="font-normal cursor-pointer">
                      基準価格からの差分維持
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minimum_profit" id="minimum_profit" />
                    <Label htmlFor="minimum_profit" className="font-normal cursor-pointer">
                      最低利益確保のみ
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="seasonal" id="seasonal" />
                    <Label htmlFor="seasonal" className="font-normal cursor-pointer">
                      季節戦略
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="font-normal cursor-pointer">
                      戦略なし（手動管理）
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">🎯 価格調整パラメータ</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_profit">最低利益額（USD）</Label>
                    <Input
                      id="min_profit"
                      type="number"
                      value={formData.min_profit_usd}
                      onChange={(e) => setFormData({ ...formData, min_profit_usd: Number(e.target.value) })}
                      step="0.01"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      最低限確保したい利益額を設定します
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_adjust">価格調整率（%）</Label>
                    <Input
                      id="price_adjust"
                      type="number"
                      value={formData.price_adjust_percent}
                      onChange={(e) => setFormData({ ...formData, price_adjust_percent: Number(e.target.value) })}
                      step="0.1"
                    />
                    <p className="text-xs text-muted-foreground">
                      競合価格からの調整率（マイナスで安く）
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_adjust">最大調整幅（%）</Label>
                    <Input
                      id="max_adjust"
                      type="number"
                      value={formData.max_adjust_percent}
                      onChange={(e) => setFormData({ ...formData, max_adjust_percent: Number(e.target.value) })}
                      step="1"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      価格変動の最大許容範囲
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_diff">価格差分（USD）</Label>
                    <Input
                      id="price_diff"
                      type="number"
                      value={formData.price_difference_usd}
                      onChange={(e) => setFormData({ ...formData, price_difference_usd: Number(e.target.value) })}
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      基準価格からの固定差分
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="follow_competitor"
                      checked={formData.follow_competitor}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, follow_competitor: checked as boolean })
                      }
                    />
                    <Label htmlFor="follow_competitor" className="font-normal cursor-pointer">
                      競合追従を有効にする
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="apply_above_lowest"
                      checked={formData.apply_above_lowest}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, apply_above_lowest: checked as boolean })
                      }
                    />
                    <Label htmlFor="apply_above_lowest" className="font-normal cursor-pointer">
                      最安値より高い場合のみ適用
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-semibold">📦 在庫切れ時の対応</Label>
                <Select
                  value={formData.out_of_stock_action}
                  onValueChange={(value) => setFormData({ ...formData, out_of_stock_action: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set_zero">在庫を0に設定</SelectItem>
                    <SelectItem value="pause_listing">出品を一時停止</SelectItem>
                    <SelectItem value="end_listing">出品を終了</SelectItem>
                    <SelectItem value="notify_only">通知のみ（自動変更なし）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-semibold">⏰ 監視頻度</Label>
                <Select
                  value={formData.check_frequency}
                  onValueChange={(value) => setFormData({ ...formData, check_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6hours">6時間ごと</SelectItem>
                    <SelectItem value="12hours">12時間ごと ★おすすめ</SelectItem>
                    <SelectItem value="1day">1日1回</SelectItem>
                    <SelectItem value="2days">2日1回</SelectItem>
                    <SelectItem value="3days">3日1回</SelectItem>
                    <SelectItem value="1week">1週間1回</SelectItem>
                    <SelectItem value="manual">手動のみ</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mt-2">
                  <p className="text-xs text-yellow-900 font-semibold mb-1">⚠️ スクレイピングについて</p>
                  <p className="text-xs text-yellow-800">
                    頻繁なアクセスはロボット検知されるリスクがあります。
                    <strong>12時間ごと</strong>または<strong>1日1回</strong>が安全でおすすめです。
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">🤖 自動化機能</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    各価格調整機能のON/OFFを設定します
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="multi_source" className="font-medium cursor-pointer">
                        複数仕入れ元管理
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        在庫切れ時に自動で次の仕入れ元に切替
                      </p>
                    </div>
                    <Checkbox
                      id="multi_source"
                      checked={formData.multi_source_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, multi_source_enabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="seasonal" className="font-medium cursor-pointer">
                        季節・時期変動
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        カテゴリごとに季節で価格を自動調整
                      </p>
                    </div>
                    <Checkbox
                      id="seasonal"
                      checked={formData.seasonal_pricing_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, seasonal_pricing_enabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="sold_based" className="font-medium cursor-pointer">
                        SOLD数ベース値上げ
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        販売数が増えたら段階的に価格を上げる
                      </p>
                    </div>
                    <Checkbox
                      id="sold_based"
                      checked={formData.sold_based_pricing_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, sold_based_pricing_enabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="watcher_based" className="font-medium cursor-pointer">
                        ウォッチャー連動値上げ
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        ウォッチャー数に応じて価格を上げる
                      </p>
                    </div>
                    <Checkbox
                      id="watcher_based"
                      checked={formData.watcher_based_pricing_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, watcher_based_pricing_enabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="auto_swap" className="font-medium cursor-pointer">
                        スコアベース自動入れ替え
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        低スコア商品を自動で入れ替え
                      </p>
                    </div>
                    <Checkbox
                      id="auto_swap"
                      checked={formData.auto_swap_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, auto_swap_enabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="competitor_trust" className="font-medium cursor-pointer">
                        競合信頼度プレミアム
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        高評価セラーの商品価格に+5-10%のプレミアムを加算して最安値を計算
                      </p>
                    </div>
                    <Checkbox
                      id="competitor_trust"
                      checked={formData.competitor_trust_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, competitor_trust_enabled: checked as boolean })
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {message && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white z-50 flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {message.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}
    </div>
  )
}
