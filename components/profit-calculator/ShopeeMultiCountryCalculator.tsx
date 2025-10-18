'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Globe, Star, TrendingUp, Package, DollarSign, Calculator } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ShopeeMultiCountryCalculatorProps {
  exchangeRates: Record<string, number>
}

interface CountryResult {
  country: string
  countryName: string
  currency: string
  flag: string
  targetPrice: number
  commissionRate: number
  totalFees: number
  netProfitLocal: number
  netProfitJPY: number
  profitMargin: number
  roi: number
  recommendation: {
    score: number
    stars: string
  }
}

export function ShopeeMultiCountryCalculator({ exchangeRates }: ShopeeMultiCountryCalculatorProps) {
  const [formData, setFormData] = useState({
    yahooPrice: '',
    domesticCosts: '800',
    category: 'electronics',
    targetMargin: '25',
    sellerLevel: 'preferred',
    promotion: 'none',
    shipping: 'standard',
    paymentFee: 'standard',
    exchangeMargin: '3'
  })

  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set(['SG', 'MY', 'TH']))
  const [results, setResults] = useState<CountryResult[]>([])
  const [loading, setLoading] = useState(false)

  // 国データ
  const countries = [
    { code: 'SG', name: 'シンガポール', currency: 'SGD', flag: '🇸🇬' },
    { code: 'MY', name: 'マレーシア', currency: 'MYR', flag: '🇲🇾' },
    { code: 'TH', name: 'タイ', currency: 'THB', flag: '🇹🇭' },
    { code: 'VN', name: 'ベトナム', currency: 'VND', flag: '🇻🇳' },
    { code: 'PH', name: 'フィリピン', currency: 'PHP', flag: '🇵🇭' },
    { code: 'ID', name: 'インドネシア', currency: 'IDR', flag: '🇮🇩' },
    { code: 'TW', name: '台湾', currency: 'TWD', flag: '🇹🇼' }
  ]

  // カテゴリーリスト
  const categories = [
    { value: 'electronics', name: '電子機器', commission: 4 },
    { value: 'fashion', name: 'ファッション', commission: 6 },
    { value: 'beauty', name: '美容品', commission: 4.5 },
    { value: 'home', name: 'ホーム&リビング', commission: 5 },
    { value: 'sports', name: 'スポーツ', commission: 5 },
    { value: 'toys', name: 'おもちゃ', commission: 4 },
    { value: 'books', name: '書籍', commission: 3 }
  ]

  // 国選択トグル
  const toggleCountry = (countryCode: string) => {
    const newSelected = new Set(selectedCountries)
    if (newSelected.has(countryCode)) {
      newSelected.delete(countryCode)
    } else {
      newSelected.add(countryCode)
    }
    
    // 最低1つは選択状態を保つ
    if (newSelected.size === 0) {
      newSelected.add('SG')
    }
    
    setSelectedCountries(newSelected)
  }

  // 計算実行
  const calculateMultiCountry = async () => {
    if (!formData.yahooPrice) {
      alert('Yahoo価格を入力してください')
      return
    }

    setLoading(true)
    const calculationResults: CountryResult[] = []

    try {
      // 各国の計算
      selectedCountries.forEach(countryCode => {
        const country = countries.find(c => c.code === countryCode)!
        const result = calculateCountryProfit(country)
        calculationResults.push(result)
      })

      // 結果をROI順でソート
      calculationResults.sort((a, b) => b.roi - a.roi)
      setResults(calculationResults)

    } catch (error) {
      console.error('計算エラー:', error)
      alert('計算中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 国別利益計算
  const calculateCountryProfit = (country: any): CountryResult => {
    const baseData = {
      yahooPrice: parseFloat(formData.yahooPrice),
      domesticCosts: parseFloat(formData.domesticCosts),
      category: formData.category,
      targetMargin: parseFloat(formData.targetMargin),
      sellerLevel: formData.sellerLevel,
      promotion: formData.promotion
    }

    // 為替レート（安全マージン込み）
    const exchangeRate = exchangeRates[country.currency] || 100
    const safeRate = exchangeRate * (1 - parseFloat(formData.exchangeMargin) / 100)

    // 現地通貨での総コスト
    const totalCostJPY = baseData.yahooPrice + baseData.domesticCosts
    const totalCostLocal = totalCostJPY / safeRate

    // Shopee手数料計算
    const categoryData = categories.find(c => c.value === baseData.category)!
    let commissionRate = categoryData.commission

    // セラーレベル割引
    if (formData.sellerLevel === 'preferred') commissionRate -= 0.5
    if (formData.sellerLevel === 'mall') commissionRate -= 1.0

    // プロモーション費用
    if (formData.promotion === 'flash') commissionRate += 1
    if (formData.promotion === 'campaign') commissionRate += 0.5
    if (formData.promotion === 'ads') commissionRate += 2

    commissionRate = Math.max(commissionRate, 1) // 最低1%

    // 目標価格計算（現地通貨）
    const targetPrice = totalCostLocal / (1 - (baseData.targetMargin + commissionRate) / 100)

    // 手数料計算
    const commissionAmount = targetPrice * (commissionRate / 100)
    const paymentFeeRate = 0.024 // 2.4%
    const paymentFixedFees: Record<string, number> = {
      'SGD': 0.5,
      'MYR': 2.0,
      'THB': 11.0,
      'VND': 5500,
      'PHP': 15.0,
      'IDR': 4000,
      'TWD': 10.0
    }
    const paymentFeeAmount = targetPrice * paymentFeeRate + (paymentFixedFees[country.currency] || 0)
    const totalFees = commissionAmount + paymentFeeAmount

    // 利益計算
    const netProfitLocal = targetPrice - totalCostLocal - totalFees
    const netProfitJPY = netProfitLocal * safeRate
    const profitMargin = (netProfitLocal / targetPrice) * 100
    const roi = (netProfitLocal / totalCostLocal) * 100

    // 推奨度計算
    let score = 3
    if (profitMargin >= 25) score += 2
    else if (profitMargin >= 15) score += 1
    else if (profitMargin < 5) score -= 1

    if (roi >= 30) score += 2
    else if (roi >= 20) score += 1
    else if (roi < 10) score -= 1

    // 市場リスク調整
    const marketRisk: Record<string, number> = {
      'SG': 1,
      'TW': 1,
      'MY': 0,
      'TH': 0,
      'VN': -1,
      'PH': -1,
      'ID': -1
    }
    score += marketRisk[country.code] || 0
    score = Math.max(1, Math.min(5, score))

    return {
      country: country.code,
      countryName: country.name,
      currency: country.currency,
      flag: country.flag,
      targetPrice: targetPrice,
      commissionRate: commissionRate,
      totalFees: totalFees,
      netProfitLocal: netProfitLocal,
      netProfitJPY: netProfitJPY,
      profitMargin: profitMargin,
      roi: roi,
      recommendation: {
        score: score,
        stars: '★'.repeat(score) + '☆'.repeat(5 - score)
      }
    }
  }

  // サンプルデータ読み込み
  const loadSampleData = () => {
    setFormData({
      yahooPrice: '8000',
      domesticCosts: '800',
      category: 'electronics',
      targetMargin: '25',
      sellerLevel: 'preferred',
      promotion: 'none',
      shipping: 'standard',
      paymentFee: 'standard',
      exchangeMargin: '3'
    })
  }

  // 利益率による色分け
  const getProfitColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600'
    if (margin >= 10) return 'text-yellow-600'
    return 'text-destructive'
  }

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Shopee 7カ国同時利益計算
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 国選択 */}
          <div>
            <Label className="mb-3 block">販売国選択（複数可）</Label>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {countries.map(country => (
                <Button
                  key={country.code}
                  variant={selectedCountries.has(country.code) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCountry(country.code)}
                  className={selectedCountries.has(country.code) ? '' : ''}
                >
                  {country.flag} {country.code}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">基本情報</h3>
              <div>
                <Label htmlFor="yahooPrice">Yahoo仕入価格 (円) *</Label>
                <Input
                  id="yahooPrice"
                  type="number"
                  value={formData.yahooPrice}
                  onChange={(e) => setFormData({...formData, yahooPrice: e.target.value})}
                  placeholder="8000"
                  className=""
                />
              </div>
              <div>
                <Label htmlFor="domesticCosts">国内費用 (円)</Label>
                <Input
                  id="domesticCosts"
                  type="number"
                  value={formData.domesticCosts}
                  onChange={(e) => setFormData({...formData, domesticCosts: e.target.value})}
                  placeholder="800"
                  className=""
                />
              </div>
              <div>
                <Label htmlFor="targetMargin">目標利益率 (%)</Label>
                <Input
                  id="targetMargin"
                  type="number"
                  value={formData.targetMargin}
                  onChange={(e) => setFormData({...formData, targetMargin: e.target.value})}
                  placeholder="25"
                  className=""
                />
              </div>
            </div>

            {/* カテゴリー・レベル */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">販売設定</h3>
              <div>
                <Label htmlFor="category">商品カテゴリー</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.name} (基本手数料 {cat.commission}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sellerLevel">セラーレベル</Label>
                <Select
                  value={formData.sellerLevel}
                  onValueChange={(value) => setFormData({...formData, sellerLevel: value})}
                >
                  <SelectTrigger id="sellerLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">新規セラー</SelectItem>
                    <SelectItem value="preferred">優遇セラー (-0.5%)</SelectItem>
                    <SelectItem value="mall">モールセラー (-1.0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="promotion">プロモーション</Label>
                <Select
                  value={formData.promotion}
                  onValueChange={(value) => setFormData({...formData, promotion: value})}
                >
                  <SelectTrigger id="promotion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    <SelectItem value="flash">フラッシュセール (+1%)</SelectItem>
                    <SelectItem value="campaign">キャンペーン (+0.5%)</SelectItem>
                    <SelectItem value="ads">広告利用 (+2%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 詳細設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">詳細設定</h3>
              <div>
                <Label htmlFor="exchangeMargin">為替安全マージン (%)</Label>
                <Input
                  id="exchangeMargin"
                  type="number"
                  value={formData.exchangeMargin}
                  onChange={(e) => setFormData({...formData, exchangeMargin: e.target.value})}
                  placeholder="3"
                  className="!bg-background"
                />
              </div>
              <div>
                <Label>現在の為替レート</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  {countries.map(country => (
                    <div key={country.code} className="flex justify-between text-muted-foreground">
                      <span>{country.flag} {country.currency}</span>
                      <span>¥{exchangeRates[country.currency]?.toFixed(2) || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <Separator />
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={calculateMultiCountry}
              disabled={loading}
              className=""
            >
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? '計算中...' : '7カ国同時計算'}
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
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              計算結果 - 推奨度順
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>国</TableHead>
                    <TableHead className="text-right">販売価格</TableHead>
                    <TableHead className="text-right">手数料率</TableHead>
                    <TableHead className="text-right">総手数料</TableHead>
                    <TableHead className="text-right">純利益(現地)</TableHead>
                    <TableHead className="text-right">純利益(円)</TableHead>
                    <TableHead className="text-right">利益率</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-center">推奨度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.country}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{result.flag}</span>
                          <span>{result.countryName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {result.targetPrice.toFixed(2)} {result.currency}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.commissionRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {result.totalFees.toFixed(2)} {result.currency}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getProfitColor(result.profitMargin)}`}>
                        {result.netProfitLocal.toFixed(2)} {result.currency}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getProfitColor(result.profitMargin)}`}>
                        ¥{Math.round(result.netProfitJPY).toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getProfitColor(result.profitMargin)}`}>
                        {result.profitMargin.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getProfitColor(result.profitMargin)}`}>
                        {result.roi.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <div className="text-center text-accent text-lg">
                          {result.recommendation.stars}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 最適販売国の推奨 */}
            {results.length > 0 && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary rounded-lg">
                <h4 className="font-semibold mb-2">販売戦略推奨</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    最も推奨される販売国: {results[0].flag} {results[0].countryName} 
                    (ROI {results[0].roi.toFixed(1)}%, 利益率 {results[0].profitMargin.toFixed(1)}%)
                  </p>
                  {results.filter(r => r.recommendation.score >= 4).length > 1 && (
                    <p>
                      その他の有望市場: {results.filter(r => r.recommendation.score >= 4 && r.country !== results[0].country)
                        .map(r => `${r.flag} ${r.countryName}`).join(', ')}
                    </p>
                  )}
                  {results.some(r => r.profitMargin < 10) && (
                    <p className="text-destructive">
                      ⚠️ 利益率10%未満の国があります。価格設定の見直しを検討してください。
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
