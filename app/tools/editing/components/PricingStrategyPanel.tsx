'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Save, RefreshCw, CheckCircle } from 'lucide-react'

const DEFAULT_STRATEGY = {
  pricing_strategy: 'follow_lowest',
  min_profit_usd: 10,
  price_adjust_percent: -5,
  follow_competitor: true,
  max_adjust_percent: 20,
  out_of_stock_action: 'set_zero',
  check_frequency: '1day'
}

interface PricingStrategyPanelProps {
  selectedProducts?: any[]
  onClose?: () => void
}

export function PricingStrategyPanel({ selectedProducts = [], onClose }: PricingStrategyPanelProps) {
  const [useDefault, setUseDefault] = useState(true)
  const [useDefaultInventory, setUseDefaultInventory] = useState(true)
  const [strategy, setStrategy] = useState(DEFAULT_STRATEGY)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  // デフォルト設定を読み込み
  useEffect(() => {
    if (useDefault) {
      loadDefaultStrategy()
    }
  }, [useDefault])

  const loadDefaultStrategy = async () => {
    try {
      const { data, error } = await supabase
        .from('global_pricing_strategy')
        .select('*')
        .eq('marketplace', 'ebay')
        .single()

      if (data) {
        setStrategy({
          pricing_strategy: data.pricing_strategy || DEFAULT_STRATEGY.pricing_strategy,
          min_profit_usd: data.min_profit_usd || DEFAULT_STRATEGY.min_profit_usd,
          price_adjust_percent: data.price_adjust_percent || DEFAULT_STRATEGY.price_adjust_percent,
          follow_competitor: data.follow_competitor ?? DEFAULT_STRATEGY.follow_competitor,
          max_adjust_percent: data.max_adjust_percent || DEFAULT_STRATEGY.max_adjust_percent,
          out_of_stock_action: data.out_of_stock_action || DEFAULT_STRATEGY.out_of_stock_action,
          check_frequency: data.check_frequency || DEFAULT_STRATEGY.check_frequency
        })
      }
    } catch (error) {
      console.error('デフォルト設定読み込みエラー:', error)
    }
  }

  const handleSave = async () => {
    if (selectedProducts.length === 0) {
      showMessage('商品を選択してください', 'error')
      return
    }

    setSaving(true)
    try {
      if (useDefault) {
        // デフォルト設定を使用する場合は、個別設定をクリア
        const { error } = await supabase
          .from('products_master')
          .update({ pricing_strategy: null })
          .in('id', selectedProducts.map(p => p.id))

        if (error) throw error
        showMessage(`${selectedProducts.length}件の商品にデフォルト設定を適用しました`)
      } else {
        // 個別設定を保存
        const { error } = await supabase
          .from('products_master')
          .update({ pricing_strategy: strategy })
          .in('id', selectedProducts.map(p => p.id))

        if (error) throw error
        showMessage(`${selectedProducts.length}件の商品に個別設定を保存しました`)
      }

      if (onClose) {
        setTimeout(onClose, 1500)
      }
    } catch (error) {
      console.error('保存エラー:', error)
      showMessage('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>価格戦略設定</CardTitle>
        <CardDescription>
          {selectedProducts.length > 0 
            ? `選択中: ${selectedProducts.length}件` 
            : 'デフォルト設定を管理します'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 設定の継承 */}
        <div className="bg-blue-50 border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">設定の継承</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-default"
              checked={useDefault}
              onCheckedChange={(checked) => setUseDefault(checked as boolean)}
            />
            <Label htmlFor="use-default" className="cursor-pointer">
              デフォルト価格戦略を使用
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            グローバル設定に従って自動で価格を自動調整
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-default-inventory"
              checked={useDefaultInventory}
              onCheckedChange={(checked) => setUseDefaultInventory(checked as boolean)}
            />
            <Label htmlFor="use-default-inventory" className="cursor-pointer">
              デフォルト在庫設定を使用
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            グローバル設定に従って在庫を管理
          </p>
        </div>

        {/* 現在の設定 */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">現在の設定</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">戦略ソース:</span>
              <span className="font-medium">
                {useDefault ? 'デフォルト' : 'カスタム'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">戦略タイプ:</span>
              <span className="font-medium">
                {strategy.pricing_strategy === 'follow_lowest' && '最安値追従（最低利益確保のみ）'}
                {strategy.pricing_strategy === 'price_difference' && '基準価格からの差分維持'}
                {strategy.pricing_strategy === 'minimum_profit' && '最低利益確保のみ'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">監視頻度:</span>
              <span className="font-medium">{strategy.check_frequency}</span>
            </div>
          </div>
        </div>

        {/* カスタム設定 */}
        {!useDefault && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-blue-600">カスタム設定</h3>

            <div className="space-y-3">
              <Label>価格戦略タイプ</Label>
              <RadioGroup
                value={strategy.pricing_strategy}
                onValueChange={(value) => setStrategy({ ...strategy, pricing_strategy: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="follow_lowest" id="custom-follow" />
                  <Label htmlFor="custom-follow" className="font-normal cursor-pointer">
                    最安値追従（最低利益確保）
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="price_difference" id="custom-diff" />
                  <Label htmlFor="custom-diff" className="font-normal cursor-pointer">
                    基準価格からの差分維持
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minimum_profit" id="custom-min" />
                  <Label htmlFor="custom-min" className="font-normal cursor-pointer">
                    最低利益確保のみ
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-min-profit">最低利益額（USD）</Label>
                <Input
                  id="custom-min-profit"
                  type="number"
                  value={strategy.min_profit_usd}
                  onChange={(e) => setStrategy({ ...strategy, min_profit_usd: Number(e.target.value) })}
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-adjust">価格調整率（%）</Label>
                <Input
                  id="custom-adjust"
                  type="number"
                  value={strategy.price_adjust_percent}
                  onChange={(e) => setStrategy({ ...strategy, price_adjust_percent: Number(e.target.value) })}
                  step="0.1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-stock-action">在庫切れ時の対応</Label>
              <Select
                value={strategy.out_of_stock_action}
                onValueChange={(value) => setStrategy({ ...strategy, out_of_stock_action: value })}
              >
                <SelectTrigger id="custom-stock-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set_zero">在庫を0に設定</SelectItem>
                  <SelectItem value="pause_listing">出品を一時停止</SelectItem>
                  <SelectItem value="end_listing">出品を終了</SelectItem>
                  <SelectItem value="notify_only">通知のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 保存ボタン */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || selectedProducts.length === 0}
            className="flex-1"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                設定を保存
              </>
            )}
          </Button>

          {onClose && (
            <Button variant="outline" onClick={onClose}>
              閉じる
            </Button>
          )}
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {message.text}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
