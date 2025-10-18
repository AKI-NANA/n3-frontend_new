'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ExchangeRateManagerProps {
  exchangeRates: Record<string, number>
  onUpdate: (rates: Record<string, number>) => void
}

export function ExchangeRateManager({ exchangeRates, onUpdate }: ExchangeRateManagerProps) {
  const [rates, setRates] = useState(exchangeRates)
  const [safetyMargin, setSafetyMargin] = useState('5')
  const [manualRates, setManualRates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [rateHistory, setRateHistory] = useState<Array<{
    timestamp: Date
    rates: Record<string, number>
  }>>([])

  // 通貨情報
  const currencies = [
    { code: 'USD', name: '米ドル', flag: '🇺🇸', volatility: 'medium' },
    { code: 'SGD', name: 'シンガポールドル', flag: '🇸🇬', volatility: 'low' },
    { code: 'MYR', name: 'マレーシアリンギット', flag: '🇲🇾', volatility: 'medium' },
    { code: 'THB', name: 'タイバーツ', flag: '🇹🇭', volatility: 'medium' },
    { code: 'VND', name: 'ベトナムドン', flag: '🇻🇳', volatility: 'high' },
    { code: 'PHP', name: 'フィリピンペソ', flag: '🇵🇭', volatility: 'high' },
    { code: 'IDR', name: 'インドネシアルピア', flag: '🇮🇩', volatility: 'high' },
    { code: 'TWD', name: '台湾ドル', flag: '🇹🇼', volatility: 'low' }
  ]

  // 初期化
  useEffect(() => {
    const initialManualRates: Record<string, string> = {}
    Object.entries(rates).forEach(([currency, rate]) => {
      initialManualRates[currency] = rate.toString()
    })
    setManualRates(initialManualRates)
  }, [])

  // 自動更新（実装例）
  const autoUpdateRates = async () => {
    setLoading(true)
    try {
      // 実際のAPI呼び出しの代わりにシミュレーション
      const newRates: Record<string, number> = {}
      
      currencies.forEach(currency => {
        const currentRate = rates[currency.code] || 100
        // ボラティリティに基づく変動幅
        const volatilityMultiplier = {
          low: 0.005,
          medium: 0.01,
          high: 0.02
        }[currency.volatility] || 0.01
        
        const change = (Math.random() - 0.5) * 2 * volatilityMultiplier
        newRates[currency.code] = parseFloat((currentRate * (1 + change)).toFixed(4))
      })
      
      setRates(newRates)
      onUpdate(newRates)
      setLastUpdate(new Date())
      
      // 履歴に追加
      setRateHistory(prev => [...prev, { timestamp: new Date(), rates: newRates }].slice(-10))
      
      // 手動レートも更新
      const updatedManualRates: Record<string, string> = {}
      Object.entries(newRates).forEach(([currency, rate]) => {
        updatedManualRates[currency] = rate.toString()
      })
      setManualRates(updatedManualRates)
      
    } catch (error) {
      console.error('為替レート更新エラー:', error)
      alert('為替レート更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 手動レート変更
  const handleManualRateChange = (currency: string, value: string) => {
    setManualRates(prev => ({ ...prev, [currency]: value }))
  }

  // 手動レート適用
  const applyManualRates = () => {
    const newRates: Record<string, number> = {}
    Object.entries(manualRates).forEach(([currency, rate]) => {
      const numRate = parseFloat(rate)
      if (!isNaN(numRate) && numRate > 0) {
        newRates[currency] = numRate
      }
    })
    
    setRates(newRates)
    onUpdate(newRates)
    setLastUpdate(new Date())
    alert('手動レートを適用しました')
  }

  // 安全レート計算
  const calculateSafeRate = (rate: number) => {
    const margin = parseFloat(safetyMargin) || 5
    return rate * (1 + margin / 100)
  }

  // レート変動計算
  const calculateChange = (currency: string) => {
    if (rateHistory.length === 0) return 0
    const oldRate = rateHistory[0].rates[currency] || rates[currency]
    const currentRate = rates[currency]
    return ((currentRate - oldRate) / oldRate) * 100
  }

  // ボラティリティによる色分け
  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'low': return ''
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-destructive'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              為替レート管理
            </span>
            <Badge variant="outline">
              最終更新: {lastUpdate.toLocaleString('ja-JP')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="safetyMargin">安全マージン (%)</Label>
              <Input
                id="safetyMargin"
                type="number"
                value={safetyMargin}
                onChange={(e) => setSafetyMargin(e.target.value)}
                className="w-32 !bg-background"
              />
            </div>
            <Button 
              onClick={autoUpdateRates}
              disabled={loading}
              className=""
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '更新中...' : '自動更新'}
            </Button>
            <Button 
              onClick={applyManualRates}
              variant="outline"
              className=""
            >
              手動レート適用
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 為替レートテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>為替レート詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>通貨</TableHead>
                  <TableHead className="text-right">現在レート</TableHead>
                  <TableHead className="text-right">安全レート</TableHead>
                  <TableHead className="text-right">変動率</TableHead>
                  <TableHead className="text-center">ボラティリティ</TableHead>
                  <TableHead className="text-right">手動設定</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map(currency => {
                  const rate = rates[currency.code] || 0
                  const safeRate = calculateSafeRate(rate)
                  const change = calculateChange(currency.code)
                  
                  return (
                    <TableRow key={currency.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{currency.flag}</span>
                          <div>
                            <p className="font-medium">{currency.code}</p>
                            <p className="text-sm text-muted-foreground">{currency.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ¥{rate.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        ¥{safeRate.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {Math.abs(change).toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getVolatilityColor(currency.volatility)}>
                          {currency.volatility.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.0001"
                          value={manualRates[currency.code] || ''}
                          onChange={(e) => handleManualRateChange(currency.code, e.target.value)}
                          className="w-24 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 注意事項 */}
          <Alert className="mt-6 border-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>為替リスクについて</AlertTitle>
            <AlertDescription>
              為替レートは常に変動しています。安全マージンを適切に設定し、
              定期的にレートを更新することを推奨します。
              高ボラティリティ通貨（VND, PHP, IDR）は特に注意が必要です。
            </AlertDescription>
          </Alert>

          {/* 履歴サマリー */}
          {rateHistory.length > 0 && (
            <div className="mt-6 p-4 bg-card rounded-lg">
              <h4 className="font-semibold mb-2">直近の為替変動サマリー</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {currencies.slice(0, 4).map(currency => {
                  const change = calculateChange(currency.code)
                  return (
                    <div key={currency.code} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{currency.code}</span>
                      <span className={change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                        {change > 0 ? '+' : ''}{change.toFixed(2)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
