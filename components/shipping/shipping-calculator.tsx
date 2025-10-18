'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Package, 
  Truck, 
  Calculator, 
  Globe, 
  DollarSign, 
  Clock, 
  Scale,
  Ruler,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

// 送料計算結果の型定義
interface ShippingResult {
  target_country: string
  country_name: string
  zone_code: string
  actual_weight_g: number
  volumetric_weight_g: number
  billing_weight_g: number
  base_price_jpy: number
  surcharge_rate: number
  fuel_surcharge_jpy: number
  total_price_jpy: number
  dimensions: string
}

export default function ShippingCalculator() {
  // Layer 1: 重量・サイズ入力
  const [weight, setWeight] = useState(2000)
  const [length, setLength] = useState(25.0)
  const [width, setWidth] = useState(20.0)
  const [height, setHeight] = useState(15.0)
  
  // Layer 2: 配送先・商品情報
  const [country, setCountry] = useState('USA')
  const [serviceType, setServiceType] = useState('FEDEX_ICP') // ICP, IE, IP
  const [itemValueUSD, setItemValueUSD] = useState(100)
  const [needSignature, setNeedSignature] = useState(false)
  const [needInsurance, setNeedInsurance] = useState(false)
  
  // Layer 3: 計算結果
  const [results, setResults] = useState<ShippingResult[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 容積重量計算
  const calculateVolumetricWeight = () => {
    return Math.ceil((length * width * height) / 5000)
  }
  
  // 請求重量計算
  const getBillingWeight = () => {
    const actualWeightKg = weight / 1000
    const volumetricWeightKg = calculateVolumetricWeight() / 1000
    return Math.max(actualWeightKg, volumetricWeightKg)
  }
  
  // 送料計算実行
  const calculateShipping = async () => {
    setIsCalculating(true)
    setError(null)
    
    try {
      // Supabaseへの実際のAPI呼び出し（将来実装）
      // 現在はモックデータで動作確認（ICP vs IE の料金差を反映）
      
      const getBasePrices = () => {
        if (serviceType === 'FEDEX_ICP') {
          // FedEx International Connect Plus
          return {
            USA: 3600, GBR: 4400, HKG: 2600, KOR: 3600, CHN: 6200
          }
        } else if (serviceType === 'FEDEX_IE') {
          // FedEx International Economy（エコノミー）
          return {
            USA: 2800, GBR: 3300, HKG: 2700, KOR: 4600, CHN: 5100
          }
        } else {
          // FedEx International Priority（最速・最高額）
          return {
            USA: 4700, GBR: 5600, HKG: 3800, KOR: 5100, CHN: 5200
          }
        }
      }
      
      const basePrices = getBasePrices()
      const basePrice = basePrices[country as keyof typeof basePrices] || basePrices.USA
      
      const mockResult: ShippingResult = {
        target_country: country,
        country_name: country === 'USA' ? 'アメリカ' : country === 'GBR' ? 'イギリス' : country === 'HKG' ? '香港' : country === 'KOR' ? '韓国' : '中国',
        zone_code: country === 'USA' ? 'E' : country === 'GBR' ? 'H' : country === 'HKG' ? 'V' : country === 'KOR' ? 'Z' : 'A',
        actual_weight_g: weight,
        volumetric_weight_g: calculateVolumetricWeight(),
        billing_weight_g: weight,
        base_price_jpy: basePrice,
        surcharge_rate: 21.5,
        fuel_surcharge_jpy: Math.round(basePrice * 0.215),
        total_price_jpy: Math.round(basePrice * 1.215),
        dimensions: `${length}x${width}x${height}`
      }
      
      // 少し遅延を追加してリアルな感じに
      await new Promise(resolve => setTimeout(resolve, 1000))
      setResults([mockResult])
      
    } catch (err) {
      setError('送料計算中にエラーが発生しました')
      console.error(err)
    } finally {
      setIsCalculating(false)
    }
  }
  
  // オプション料金計算
  const calculateOptions = (basePrice: number) => {
    let total = 0
    if (needSignature) total += 500
    if (needInsurance) total += Math.max(itemValueUSD * 154 * 0.02, 500)
    return total
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Truck className="text-primary" />
          FedEx送料計算システム
        </h1>
        <p className="text-muted-foreground">
          FedEx International Connect Plus の送料を正確に計算
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Layer 1: 重量・サイズ入力 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              荷物情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Scale className="h-4 w-4" />
                重量 (g)
              </label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                placeholder="2000"
              />
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                サイズ (cm)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  placeholder="長さ"
                />
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  placeholder="幅"
                />
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  placeholder="高さ"
                />
              </div>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>実重量:</span>
                  <span className="font-medium">{(weight / 1000).toFixed(1)}kg</span>
                </div>
                <div className="flex justify-between">
                  <span>容積重量:</span>
                  <span className="font-medium">{(calculateVolumetricWeight() / 1000).toFixed(1)}kg</span>
                </div>
                <div className="flex justify-between text-primary font-semibold">
                  <span>請求重量:</span>
                  <span>{getBillingWeight().toFixed(1)}kg</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Layer 2: 配送先・オプション */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              配送先・オプション
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">FedExサービス</label>
              <select 
                className="w-full p-2 border rounded-md bg-background mb-3"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                <option value="FEDEX_IP">🚀 International Priority (最速 1-3日)</option>
                <option value="FEDEX_ICP">📦 International Connect Plus (標準 5-10日)</option>
                <option value="FEDEX_IE">🚛 International Economy (エコノミー 7-14日)</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">配送先国</label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="USA">🇺🇸 アメリカ</option>
                <option value="GBR">🇬🇧 イギリス</option>
                <option value="HKG">🇭🇰 香港</option>
                <option value="KOR">🇰🇷 韓国</option>
                <option value="CHN">🇨🇳 中国</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                商品価値 (USD)
              </label>
              <Input
                type="number"
                value={itemValueUSD}
                onChange={(e) => setItemValueUSD(Number(e.target.value))}
                placeholder="100"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium">オプションサービス</h4>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={needSignature}
                  onChange={(e) => setNeedSignature(e.target.checked)}
                />
                <span className="text-sm">サイン確認 (+500円)</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={needInsurance}
                  onChange={(e) => setNeedInsurance(e.target.checked)}
                />
                <span className="text-sm">保険 (商品価値の2%、最低500円)</span>
              </label>
            </div>
          </CardContent>
        </Card>
        
        {/* Layer 3: 計算結果 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              送料計算結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={calculateShipping}
              disabled={isCalculating}
              className="w-full"
              size="lg"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  計算中...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  送料を計算
                </>
              )}
            </Button>
            
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
            
            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-semibold">
                          {serviceType === 'FEDEX_ICP' ? 'FedEx ICP' : serviceType === 'FEDEX_IE' ? 'FedEx IE' : 'FedEx IP'}
                        </span>
                        <Badge variant={serviceType === 'FEDEX_IP' ? 'destructive' : serviceType === 'FEDEX_ICP' ? 'default' : 'outline'} className="text-xs">
                          {serviceType === 'FEDEX_IP' ? '最速' : serviceType === 'FEDEX_ICP' ? '標準' : 'エコノミー'}
                        </Badge>
                      </div>
                      <Badge variant="secondary">Zone {result.zone_code}</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>配送先:</span>
                        <span className="font-medium">{result.country_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>請求重量:</span>
                        <span className="font-medium">{(result.billing_weight_g / 1000).toFixed(1)}kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>基本料金:</span>
                        <span className="font-medium">¥{result.base_price_jpy.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>燃料サーチャージ ({result.surcharge_rate}%):</span>
                        <span className="font-medium">¥{result.fuel_surcharge_jpy.toLocaleString()}</span>
                      </div>
                      
                      {(needSignature || needInsurance) && (
                        <>
                          <Separator />
                          {needSignature && (
                            <div className="flex justify-between text-blue-600">
                              <span>サイン確認:</span>
                              <span className="font-medium">¥500</span>
                            </div>
                          )}
                          {needInsurance && (
                            <div className="flex justify-between text-blue-600">
                              <span>保険:</span>
                              <span className="font-medium">¥{Math.max(itemValueUSD * 154 * 0.02, 500).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between text-lg font-bold text-primary">
                        <span>合計:</span>
                        <span>¥{(result.total_price_jpy + calculateOptions(result.base_price_jpy)).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>お届け予定: {serviceType === 'FEDEX_IP' ? '1-3営業日' : serviceType === 'FEDEX_ICP' ? '5-10営業日' : '7-14営業日'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 詳細情報 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>計算詳細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">実重量:</span>
                <p className="font-medium">{(weight / 1000).toFixed(1)}kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">容積重量:</span>
                <p className="font-medium">{(calculateVolumetricWeight() / 1000).toFixed(1)}kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">サイズ:</span>
                <p className="font-medium">{length}×{width}×{height}cm</p>
              </div>
              <div>
                <span className="text-muted-foreground">容積:</span>
                <p className="font-medium">{(length * width * height).toLocaleString()}cm³</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
