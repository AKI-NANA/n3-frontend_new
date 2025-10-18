'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Calculator, TrendingUp, AlertTriangle, CheckCircle, Info, Download } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface AdvancedProfitCalculatorProps {
  exchangeRates: Record<string, number>
}

export function AdvancedProfitCalculator({ exchangeRates }: AdvancedProfitCalculatorProps) {
  const [formData, setFormData] = useState({
    yahooPrice: '',
    domesticShipping: '800',
    outsourceFee: '500',
    packagingFee: '200',
    assumedPrice: '',
    assumedShipping: '15',
    daysSinceListing: '0',
    ebayCategory: '293',
    itemCondition: 'Used',
    sellingStrategy: 'standard'
  })

  const [calculation, setCalculation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // カテゴリーリスト
  const categories = [
    { id: '293', name: 'Consumer Electronics', tier1: 10.0, tier2: 12.35, threshold: 7500 },
    { id: '11450', name: 'Clothing & Accessories', tier1: 12.9, tier2: 14.70, threshold: 10000 },
    { id: '58058', name: 'Collectibles', tier1: 9.15, tier2: 11.70, threshold: 5000 },
    { id: '267', name: 'Books', tier1: 15.0, tier2: 15.0, threshold: 999999 },
    { id: '550', name: 'Art', tier1: 12.9, tier2: 15.0, threshold: 10000 }
  ]

  // 計算実行
  const calculateProfit = async () => {
    if (!formData.yahooPrice || !formData.assumedPrice) {
      alert('必須項目を入力してください')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/profit-calculator?action=advanced_calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          strategy: formData.sellingStrategy,
          daysSince: parseInt(formData.daysSinceListing)
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setCalculation(data.data)
      } else {
        alert('計算エラー: ' + data.error)
      }
    } catch (error) {
      console.error('計算エラー:', error)
      alert('計算中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // サンプルデータ読み込み
  const loadSampleData = () => {
    setFormData({
      yahooPrice: '15000',
      domesticShipping: '800',
      outsourceFee: '500',
      packagingFee: '200',
      assumedPrice: '120.00',
      assumedShipping: '15.00',
      daysSinceListing: '0',
      ebayCategory: '293',
      itemCondition: 'Used',
      sellingStrategy: 'standard'
    })
  }

  // フォームクリア
  const clearForm = () => {
    setFormData({
      yahooPrice: '',
      domesticShipping: '800',
      outsourceFee: '500',
      packagingFee: '200',
      assumedPrice: '',
      assumedShipping: '15',
      daysSinceListing: '0',
      ebayCategory: '293',
      itemCondition: 'Used',
      sellingStrategy: 'standard'
    })
    setCalculation(null)
  }

  // 利益率による色分け
  const getProfitColor = (margin: number) => {
    if (margin >= 25) return 'text-green-600 dark:text-green-400'
    if (margin >= 15) return 'text-yellow-600 dark:text-yellow-400'
    if (margin >= 0) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            高精度利益計算（段階手数料・階層型利益率対応）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* コスト情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">コスト情報</h3>
              <div>
                <Label htmlFor="yahooPrice">Yahoo仕入価格 *</Label>
                <Input
                  id="yahooPrice"
                  type="number"
                  value={formData.yahooPrice}
                  onChange={(e) => setFormData({...formData, yahooPrice: e.target.value})}
                  placeholder="15000"
                />
              </div>
              <div>
                <Label htmlFor="domesticShipping">国内送料</Label>
                <Input
                  id="domesticShipping"
                  type="number"
                  value={formData.domesticShipping}
                  onChange={(e) => setFormData({...formData, domesticShipping: e.target.value})}
                  placeholder="800"
                />
              </div>
              <div>
                <Label htmlFor="outsourceFee">外注手数料</Label>
                <Input
                  id="outsourceFee"
                  type="number"
                  value={formData.outsourceFee}
                  onChange={(e) => setFormData({...formData, outsourceFee: e.target.value})}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="packagingFee">梱包費</Label>
                <Input
                  id="packagingFee"
                  type="number"
                  value={formData.packagingFee}
                  onChange={(e) => setFormData({...formData, packagingFee: e.target.value})}
                  placeholder="200"
                />
              </div>
            </div>

            {/* 販売情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">販売情報</h3>
              <div>
                <Label htmlFor="assumedPrice">想定販売価格 (USD) *</Label>
                <Input
                  id="assumedPrice"
                  type="number"
                  step="0.01"
                  value={formData.assumedPrice}
                  onChange={(e) => setFormData({...formData, assumedPrice: e.target.value})}
                  placeholder="120.00"
                />
              </div>
              <div>
                <Label htmlFor="assumedShipping">送料設定 (USD)</Label>
                <Input
                  id="assumedShipping"
                  type="number"
                  step="0.01"
                  value={formData.assumedShipping}
                  onChange={(e) => setFormData({...formData, assumedShipping: e.target.value})}
                  placeholder="15.00"
                />
              </div>
              <div>
                <Label htmlFor="daysSinceListing">出品経過日数</Label>
                <Input
                  id="daysSinceListing"
                  type="number"
                  value={formData.daysSinceListing}
                  onChange={(e) => setFormData({...formData, daysSinceListing: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>

            {/* 設定情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">詳細設定</h3>
              <div>
                <Label htmlFor="ebayCategory">eBayカテゴリー</Label>
                <Select
                  value={formData.ebayCategory}
                  onValueChange={(value) => setFormData({...formData, ebayCategory: value})}
                >
                  <SelectTrigger id="ebayCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="itemCondition">商品状態</Label>
                <Select
                  value={formData.itemCondition}
                  onValueChange={(value) => setFormData({...formData, itemCondition: value})}
                >
                  <SelectTrigger id="itemCondition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Refurbished">Refurbished</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="ForParts">For Parts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sellingStrategy">販売戦略</Label>
                <Select
                  value={formData.sellingStrategy}
                  onValueChange={(value) => setFormData({...formData, sellingStrategy: value})}
                >
                  <SelectTrigger id="sellingStrategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">速売り (-5%)</SelectItem>
                    <SelectItem value="standard">標準</SelectItem>
                    <SelectItem value="premium">プレミアム (+10%)</SelectItem>
                    <SelectItem value="volume">大量販売 (-3%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <Separator />
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={calculateProfit}
              disabled={loading}
            >
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? '計算中...' : '利益計算実行'}
            </Button>
            <Button 
              onClick={loadSampleData}
              variant="outline"
            >
              サンプルデータ読み込み
            </Button>
            <Button 
              onClick={clearForm}
              variant="outline"
            >
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 計算結果 */}
      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                計算結果
              </span>
              <Badge className={getProfitColor(calculation.profitMargin)}>
                利益率: {calculation.profitMargin}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 主要指標 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">純利益</p>
                <p className={`text-2xl font-bold ${getProfitColor(calculation.profitMargin)}`}>
                  ${calculation.netProfit}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">利益率</p>
                <p className={`text-2xl font-bold ${getProfitColor(calculation.profitMargin)}`}>
                  {calculation.profitMargin}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className={`text-2xl font-bold ${calculation.roi > 20 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {calculation.roi}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">推奨価格</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${calculation.recommendedPrice}
                </p>
              </div>
            </div>

            <Separator />

            {/* 詳細内訳 */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">詳細内訳</h4>
              {calculation.details && calculation.details.map((detail: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{detail.label}</p>
                    <p className="text-sm text-muted-foreground">{detail.note}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{detail.amount}</p>
                    <p className="text-xs text-muted-foreground">{detail.formula}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 段階手数料情報 */}
            {calculation.feeDetails && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>段階手数料適用</AlertTitle>
                <AlertDescription>
                  Tier {calculation.feeDetails.tier} ({calculation.feeDetails.rate}%) - 
                  閾値: ${calculation.feeDetails.threshold}
                </AlertDescription>
              </Alert>
            )}

            {/* 推奨事項 */}
            {calculation.profitMargin < 15 && (
              <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>利益率改善の余地あり</AlertTitle>
                <AlertDescription>
                  現在の利益率は{calculation.profitMargin}%です。
                  推奨価格${calculation.recommendedPrice}での販売を検討してください。
                </AlertDescription>
              </Alert>
            )}

            {/* エクスポートボタン */}
            <div className="flex justify-end">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                計算結果をダウンロード
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
