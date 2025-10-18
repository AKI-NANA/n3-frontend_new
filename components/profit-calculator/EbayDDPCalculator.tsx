'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Package, Truck, DollarSign, AlertCircle, ShieldCheck, Globe2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface EbayDDPCalculatorProps {
  exchangeRates: Record<string, number>
}

export function EbayDDPCalculator({ exchangeRates }: EbayDDPCalculatorProps) {
  const [formData, setFormData] = useState({
    declaredValue: '',
    weight: '',
    hsCode: '8517.12',
    destinationCountry: 'US',
    shippingMethod: 'standard',
    insuranceOption: 'basic',
    ddpMargin: '15',
    emergencyFee: '10',
    shippingMode: 'ddp',
    purchasePrice: '',
    outsourceFee: '500',
    packagingFee: '200'
  })

  const [calculation, setCalculation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // HSコードリスト
  const hsCodes = [
    { code: '8517.12', name: 'スマートフォン・電子機器' },
    { code: '9013.80', name: 'カメラレンズ・光学機器' },
    { code: '6203.42', name: 'アパレル・衣類' },
    { code: '9504.50', name: 'ゲーム機・玩具' },
    { code: '4202.12', name: 'バッグ・カバン' },
    { code: 'other', name: 'その他' }
  ]

  // 計算実行
  const calculateDDP = async () => {
    if (!formData.declaredValue || !formData.purchasePrice) {
      alert('必須項目を入力してください')
      return
    }

    setLoading(true)

    try {
      // DDP/DDU計算をここで実装
      const baseShipping = {
        'express': 35,
        'standard': 25,
        'economy': 15,
        'surface': 8
      }[formData.shippingMethod] || 25

      const tariffRates = {
        '8517.12': { US: 0, UK: 0, DE: 0, AU: 5, CA: 0, FR: 0 },
        '9013.80': { US: 0, UK: 0, DE: 0, AU: 5, CA: 6.5, FR: 0 },
        '6203.42': { US: 10.9, UK: 12, DE: 12, AU: 10, CA: 18, FR: 12 },
        '9504.50': { US: 0, UK: 0, DE: 0, AU: 5, CA: 0, FR: 0 },
        '4202.12': { US: 10.5, UK: 4.2, DE: 3.7, AU: 5, CA: 18.5, FR: 3.7 },
        'other': { US: 5, UK: 5, DE: 5, AU: 5, CA: 5, FR: 5 }
      }

      const vatRates = {
        'US': 0,
        'UK': 20,
        'DE': 19,
        'AU': 10,
        'CA': 13,
        'FR': 20
      }

      const declaredValue = parseFloat(formData.declaredValue)
      const tariffRate = (tariffRates[formData.hsCode as keyof typeof tariffRates] || tariffRates['other'])[formData.destinationCountry as keyof typeof vatRates] || 5
      const vatRate = vatRates[formData.destinationCountry as keyof typeof vatRates] || 0

      const tariff = formData.shippingMode === 'ddp' ? declaredValue * (tariffRate / 100) : 0
      const vat = formData.shippingMode === 'ddp' ? (declaredValue + tariff) * (vatRate / 100) : 0
      const insurance = declaredValue * (formData.insuranceOption === 'none' ? 0 : formData.insuranceOption === 'basic' ? 0.01 : formData.insuranceOption === 'premium' ? 0.02 : 0.03)
      
      const subtotal = baseShipping + tariff + vat + insurance + parseFloat(formData.emergencyFee)
      const ddpMarginAmount = subtotal * (parseFloat(formData.ddpMargin) / 100)
      const totalDDPCost = subtotal + ddpMarginAmount

      // 総利益計算
      const totalCostJPY = parseFloat(formData.purchasePrice) + parseFloat(formData.outsourceFee) + parseFloat(formData.packagingFee)
      const safeExchangeRate = exchangeRates.USD * 1.05
      const totalCostUSD = totalCostJPY / safeExchangeRate
      const netProfit = declaredValue - totalCostUSD - totalDDPCost
      const profitMargin = (netProfit / declaredValue) * 100

      setCalculation({
        baseShipping,
        tariff,
        vat,
        insurance,
        emergencyFee: parseFloat(formData.emergencyFee),
        ddpMarginAmount,
        subtotal,
        total: totalDDPCost,
        tariffRate,
        vatRate,
        totalCostJPY,
        totalCostUSD,
        netProfit,
        profitMargin,
        exchangeRate: safeExchangeRate
      })
    } catch (error) {
      console.error('DDP計算エラー:', error)
      alert('計算中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // サンプルデータ読み込み
  const loadSampleData = () => {
    setFormData({
      declaredValue: '120',
      weight: '0.5',
      hsCode: '8517.12',
      destinationCountry: 'US',
      shippingMethod: 'standard',
      insuranceOption: 'basic',
      ddpMargin: '15',
      emergencyFee: '10',
      shippingMode: 'ddp',
      purchasePrice: '15000',
      outsourceFee: '500',
      packagingFee: '200'
    })
  }

  return (
    <div className="space-y-6">
      {/* 配送モード選択 */}
      <Card>
        <CardHeader>
          <CardTitle>配送モード選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <label
              htmlFor="ddp"
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                formData.shippingMode === 'ddp' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}

            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="ddp"
                  name="shippingMode"
                  value="ddp"
                  checked={formData.shippingMode === 'ddp'}
                  onChange={(e) => setFormData({...formData, shippingMode: 'ddp'})}
                  className="sr-only"
                />
                <ShieldCheck className="h-5 w-5" />
                <span className="font-semibold">DDP (関税元払い)</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                売主が関税・税金を負担。購入者は追加費用なし。
              </p>
            </label>
            
            <label
              htmlFor="ddu"
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                formData.shippingMode === 'ddu' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}

            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="ddu"
                  name="shippingMode"
                  value="ddu"
                  checked={formData.shippingMode === 'ddu'}
                  onChange={(e) => setFormData({...formData, shippingMode: 'ddu'})}
                  className="sr-only"
                />
                <Truck className="h-5 w-5" />
                <span className="font-semibold">DDU (関税着払い)</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                購入者が受取時に関税・税金を支払い。
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 入力フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            eBay USA DDP/DDU 計算
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">基本情報</h3>
              <div>
                <Label htmlFor="purchasePrice">仕入価格 (円) *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                  placeholder="15000"
                  className=""
                />
              </div>
              <div>
                <Label htmlFor="declaredValue">申告価額 (USD) *</Label>
                <Input
                  id="declaredValue"
                  type="number"
                  step="0.01"
                  value={formData.declaredValue}
                  onChange={(e) => setFormData({...formData, declaredValue: e.target.value})}
                  placeholder="120.00"
                  className=""
                />
              </div>
              <div>
                <Label htmlFor="weight">重量 (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  placeholder="0.5"
                  className=""
                />
              </div>
            </div>

            {/* 配送情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">配送情報</h3>
              <div>
                <Label htmlFor="destinationCountry">仕向国</Label>
                <Select
                  value={formData.destinationCountry}
                  onValueChange={(value) => setFormData({...formData, destinationCountry: value})}
                >
                  <SelectTrigger id="destinationCountry">
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                    <SelectItem value="US">アメリカ</SelectItem>
                    <SelectItem value="UK">イギリス</SelectItem>
                    <SelectItem value="DE">ドイツ</SelectItem>
                    <SelectItem value="AU">オーストラリア</SelectItem>
                    <SelectItem value="CA">カナダ</SelectItem>
                    <SelectItem value="FR">フランス</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shippingMethod">配送方法</Label>
                <Select
                  value={formData.shippingMethod}
                  onValueChange={(value) => setFormData({...formData, shippingMethod: value})}
                >
                  <SelectTrigger id="shippingMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="express">Express ($35)</SelectItem>
                    <SelectItem value="standard">Standard ($25)</SelectItem>
                    <SelectItem value="economy">Economy ($15)</SelectItem>
                    <SelectItem value="surface">Surface ($8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="insuranceOption">保険オプション</Label>
                <Select
                  value={formData.insuranceOption}
                  onValueChange={(value) => setFormData({...formData, insuranceOption: value})}
                >
                  <SelectTrigger id="insuranceOption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし (0%)</SelectItem>
                    <SelectItem value="basic">基本 (1%)</SelectItem>
                    <SelectItem value="premium">プレミアム (2%)</SelectItem>
                    <SelectItem value="full">フルカバー (3%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 詳細設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">詳細設定</h3>
              <div>
                <Label htmlFor="hsCode">HSコード</Label>
                <Select
                  value={formData.hsCode}
                  onValueChange={(value) => setFormData({...formData, hsCode: value})}
                >
                  <SelectTrigger id="hsCode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hsCodes.map(hs => (
                      <SelectItem key={hs.code} value={hs.code}>
                        {hs.code} - {hs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ddpMargin">DDPマージン (%)</Label>
                <Input
                  id="ddpMargin"
                  type="number"
                  value={formData.ddpMargin}
                  onChange={(e) => setFormData({...formData, ddpMargin: e.target.value})}
                  placeholder="15"
                />
              </div>
              <div>
                <Label htmlFor="emergencyFee">緊急費用 (USD)</Label>
                <Input
                  id="emergencyFee"
                  type="number"
                  value={formData.emergencyFee}
                  onChange={(e) => setFormData({...formData, emergencyFee: e.target.value})}
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <Separator />
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={calculateDDP}
              disabled={loading}
              className=""
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {loading ? '計算中...' : 'DDP/DDU計算実行'}
            </Button>
            <Button 
              onClick={loadSampleData}
              variant="outline"
              className=""
            >
              サンプルデータ読み込み
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
                <Globe2 className="h-5 w-5" />
                {formData.shippingMode.toUpperCase()} 計算結果
              </span>
              <Badge variant={calculation.profitMargin > 15 ? 'default' : 'secondary'}>
                利益率: {calculation.profitMargin.toFixed(1)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 主要指標 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">総DDP費用</p>
                <p className="text-2xl font-bold text-primary">
                  ${calculation.total.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-sm">関税額</p>
                <p className="text-2xl font-bold text-secondary">
                  ${calculation.tariff.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-sm">VAT/消費税</p>
                <p className="text-2xl font-bold text-accent">
                  ${calculation.vat.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-sm">純利益</p>
                <p className={`text-2xl font-bold ${calculation.netProfit > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  ${calculation.netProfit.toFixed(2)}
                </p>
              </div>
            </div>

            <Separator />

            {/* 費用内訳 */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">費用内訳</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">基本送料</span>
                    <span>${calculation.baseShipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">関税 ({calculation.tariffRate}%)</span>
                    <span>${calculation.tariff.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({calculation.vatRate}%)</span>
                    <span>${calculation.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">保険料</span>
                    <span>${calculation.insurance.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">緊急費用</span>
                    <span>${calculation.emergencyFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DDPマージン</span>
                    <span>${calculation.ddpMarginAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-border pt-2">
                    <span>合計</span>
                    <span>${calculation.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            {formData.shippingMode === 'ddu' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>DDU配送の注意</AlertTitle>
                <AlertDescription>
                  購入者が受取時に関税・税金を支払う必要があります。
                  商品説明に明記することを推奨します。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
