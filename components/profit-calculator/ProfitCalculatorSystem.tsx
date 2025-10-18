'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Globe, 
  CheckCircle,
  Package,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'
import { AdvancedProfitCalculator } from './AdvancedProfitCalculator'
import { EbayDDPCalculator } from './EbayDDPCalculator'
import { ShopeeMultiCountryCalculator } from './ShopeeMultiCountryCalculator'
import { ExchangeRateManager } from './ExchangeRateManager'

export default function ProfitCalculatorSystem() {
  const [activeTab, setActiveTab] = useState('advanced')
  const [exchangeRates, setExchangeRates] = useState({
    USD: 148.50,
    SGD: 110.45,
    MYR: 33.78,
    THB: 4.23,
    VND: 0.0061,
    PHP: 2.68,
    IDR: 0.0098,
    TWD: 4.75
  })
  
  const [systemStats, setSystemStats] = useState({
    totalCalculations: 0,
    todayCalculations: 0,
    averageProfit: 0,
    highProfitCount: 0
  })
  
  // クライアントサイドのみで使用する状態
  const [isClient, setIsClient] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  // 為替レート更新
  const updateExchangeRates = async () => {
    try {
      const response = await fetch('/api/profit-calculator?action=update_rates')
      const data = await response.json()
      if (data.success && data.data) {
        const newRates: Record<string, number> = {}
        Object.entries(data.data).forEach(([currency, rateData]: [string, any]) => {
          newRates[currency] = rateData.rate
        })
        setExchangeRates(newRates)
      }
    } catch (error) {
      console.error('為替レート更新エラー:', error)
    }
  }

  // 初期ロード
  useEffect(() => {
    setIsClient(true)
    setLastUpdated(new Date().toLocaleString('ja-JP'))
    updateExchangeRates()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            NAGANO-3 利益計算システム
          </h1>
          <p className="text-muted-foreground">
            高精度な多国籍プラットフォーム利益計算・最適化システム
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本日の計算数</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.todayCalculations}</div>
              <p className="text-xs text-muted-foreground">総計算数: {systemStats.totalCalculations}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">平均利益率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{systemStats.averageProfit}%</div>
              <p className="text-xs text-muted-foreground">全プラットフォーム平均</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">高利益取引</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{systemStats.highProfitCount}</div>
              <p className="text-xs text-muted-foreground">利益率25%以上</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">USD/JPY</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">¥{exchangeRates.USD.toFixed(2)}</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={updateExchangeRates}
                className="mt-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                レート更新
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* メインタブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              高精度計算
            </TabsTrigger>
            <TabsTrigger value="ebay" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              eBay DDP/DDU
            </TabsTrigger>
            <TabsTrigger value="shopee" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Shopee 7カ国
            </TabsTrigger>
            <TabsTrigger value="exchange" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              為替管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="advanced" className="mt-6">
            <AdvancedProfitCalculator exchangeRates={exchangeRates} />
          </TabsContent>

          <TabsContent value="ebay" className="mt-6">
            <EbayDDPCalculator exchangeRates={exchangeRates} />
          </TabsContent>

          <TabsContent value="shopee" className="mt-6">
            <ShopeeMultiCountryCalculator exchangeRates={exchangeRates} />
          </TabsContent>

          <TabsContent value="exchange" className="mt-6">
            <ExchangeRateManager 
              exchangeRates={exchangeRates} 
              onUpdate={setExchangeRates}
            />
          </TabsContent>
        </Tabs>

        {/* フッター情報 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  システム正常
                </Badge>
                <span>バージョン 2.0.0</span>
                {isClient && lastUpdated && (
                  <span>最終更新: {lastUpdated}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  データエクスポート
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  設定
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}