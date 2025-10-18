"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Package, Truck, Globe, Calculator, 
  DollarSign, Weight, MapPin, AlertCircle,
  TrendingUp, BarChart3, Info
} from "lucide-react"

// 型定義
interface ShippingZone {
  id: string
  name: string
  countries: string[]
  baseRate: number
  multiplier: number
}

interface Carrier {
  id: string
  name: string
  logo?: string
  services: CarrierService[]
}

interface CarrierService {
  id: string
  name: string
  maxWeight: number
  maxDimension: number
  transitTime: string
}

interface ShippingRate {
  carrier: string
  service: string
  price: number
  currency: string
  transitTime: string
  ddp?: boolean
  tariff?: number
}

// サンプルデータ
const carriers: Carrier[] = [
  {
    id: "japan-post",
    name: "日本郵便",
    services: [
      { id: "ems", name: "EMS", maxWeight: 30, maxDimension: 150, transitTime: "3-5日" },
      { id: "airmail", name: "航空便", maxWeight: 2, maxDimension: 90, transitTime: "5-7日" },
      { id: "sal", name: "SAL便", maxWeight: 30, maxDimension: 150, transitTime: "10-14日" },
      { id: "surface", name: "船便", maxWeight: 30, maxDimension: 150, transitTime: "30-60日" },
    ]
  },
  {
    id: "fedex",
    name: "FedEx",
    services: [
      { id: "priority", name: "International Priority", maxWeight: 68, maxDimension: 274, transitTime: "1-3日" },
      { id: "economy", name: "International Economy", maxWeight: 68, maxDimension: 274, transitTime: "4-6日" },
    ]
  },
  {
    id: "dhl",
    name: "DHL",
    services: [
      { id: "express", name: "Express Worldwide", maxWeight: 70, maxDimension: 300, transitTime: "1-3日" },
      { id: "economy-select", name: "Economy Select", maxWeight: 70, maxDimension: 300, transitTime: "5-7日" },
    ]
  }
]

const zones: ShippingZone[] = [
  { id: "zone1", name: "アジア", countries: ["韓国", "台湾", "中国"], baseRate: 1000, multiplier: 1.0 },
  { id: "zone2", name: "北米", countries: ["アメリカ", "カナダ"], baseRate: 1500, multiplier: 1.2 },
  { id: "zone3", name: "ヨーロッパ", countries: ["イギリス", "フランス", "ドイツ"], baseRate: 1800, multiplier: 1.3 },
  { id: "zone4", name: "オセアニア", countries: ["オーストラリア", "ニュージーランド"], baseRate: 1400, multiplier: 1.1 },
  { id: "zone5", name: "その他", countries: ["ブラジル", "南アフリカ"], baseRate: 2000, multiplier: 1.5 },
]

export default function ShippingCalculatorPage() {
  // 計算フォームの状態
  const [weight, setWeight] = useState("1")
  const [length, setLength] = useState("30")
  const [width, setWidth] = useState("20")
  const [height, setHeight] = useState("10")
  const [selectedCountry, setSelectedCountry] = useState("アメリカ")
  const [selectedCarrier, setSelectedCarrier] = useState("japan-post")
  const [includeTariff, setIncludeTariff] = useState(true)
  const [itemValue, setItemValue] = useState("10000")

  // 計算結果
  const [calculatedRates, setCalculatedRates] = useState<ShippingRate[]>([])
  const [showResults, setShowResults] = useState(false)

  // 送料計算
  const calculateShipping = () => {
    const weightNum = parseFloat(weight) || 0
    const itemValueNum = parseFloat(itemValue) || 0
    const zone = zones.find(z => z.countries.includes(selectedCountry)) || zones[0]
    
    const rates: ShippingRate[] = []
    
    carriers.forEach(carrier => {
      carrier.services.forEach(service => {
        if (weightNum <= service.maxWeight) {
          const basePrice = zone.baseRate + (weightNum * 100 * zone.multiplier)
          const tariff = includeTariff ? itemValueNum * 0.1 : 0 // 仮の関税率10%
          
          rates.push({
            carrier: carrier.name,
            service: service.name,
            price: Math.round(basePrice + tariff),
            currency: "JPY",
            transitTime: service.transitTime,
            ddp: includeTariff,
            tariff: tariff
          })
        }
      })
    })
    
    setCalculatedRates(rates.sort((a, b) => a.price - b.price))
    setShowResults(true)
  }

  // 容積重量計算
  const calculateVolumetricWeight = () => {
    const l = parseFloat(length) || 0
    const w = parseFloat(width) || 0
    const h = parseFloat(height) || 0
    return (l * w * h) / 5000 // 一般的な容積重量計算式
  }

  const volumetricWeight = calculateVolumetricWeight()
  const actualWeight = parseFloat(weight) || 0
  const chargeableWeight = Math.max(volumetricWeight, actualWeight)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">送料計算</h1>
        <p className="text-muted-foreground mt-2">
          国際配送料金を計算し、最適な配送方法を選択します
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">対応キャリア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carriers.length}</div>
            <p className="text-xs text-muted-foreground">配送業者</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">配送ゾーン</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{zones.length}</div>
            <p className="text-xs text-muted-foreground">地域区分</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均配送料</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥1,850</div>
            <p className="text-xs text-muted-foreground">過去30日間</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DDP対応率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">関税込み配送</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 計算フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>配送情報入力</CardTitle>
            <CardDescription>
              商品の詳細と配送先を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 重量・サイズ */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>実重量 (kg)</Label>
                <Input
                  type="number"
                  placeholder="1.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>長さ (cm)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                  />
                </div>
                <div>
                  <Label>幅 (cm)</Label>
                  <Input
                    type="number"
                    placeholder="20"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                <div>
                  <Label>高さ (cm)</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>

              {/* 容積重量表示 */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">容積重量</span>
                  </div>
                  <span className="font-medium">{volumetricWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">課金重量</span>
                  <span className="font-bold text-primary">{chargeableWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* 配送先 */}
            <div className="space-y-4">
              <div>
                <Label>配送先国</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map(zone => (
                      <div key={zone.id}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {zone.name}
                        </div>
                        {zone.countries.map(country => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>商品価格 (JPY)</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={itemValue}
                  onChange={(e) => setItemValue(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-tariff"
                  checked={includeTariff}
                  onChange={(e) => setIncludeTariff(e.target.checked)}
                />
                <Label htmlFor="include-tariff">
                  関税・税金を含む (DDP)
                </Label>
              </div>
            </div>

            <Button className="w-full" onClick={calculateShipping}>
              <Calculator className="mr-2 h-4 w-4" />
              送料を計算
            </Button>
          </CardContent>
        </Card>

        {/* 計算結果 */}
        <Card>
          <CardHeader>
            <CardTitle>計算結果</CardTitle>
            <CardDescription>
              最適な配送オプションを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showResults ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Package className="h-12 w-12 mb-4" />
                <p>配送情報を入力して計算してください</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calculatedRates.map((rate, index) => (
                  <div
                    key={`${rate.carrier}-${rate.service}`}
                    className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer
                      ${index === 0 ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{rate.carrier}</span>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              最安値
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rate.service}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            <span>{rate.transitTime}</span>
                          </div>
                          {rate.ddp && (
                            <Badge variant="secondary" className="text-xs">
                              DDP対応
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          ¥{rate.price.toLocaleString()}
                        </div>
                        {rate.tariff && rate.tariff > 0 && (
                          <p className="text-xs text-muted-foreground">
                            (関税込み: ¥{Math.round(rate.tariff).toLocaleString()})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 料金マトリックス */}
      <Card>
        <CardHeader>
          <CardTitle>料金マトリックス</CardTitle>
          <CardDescription>
            重量とゾーンによる基本料金表
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">重量 (kg)</th>
                  {zones.map(zone => (
                    <th key={zone.id} className="text-center p-2">{zone.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0.5, 1, 2, 5, 10, 20, 30].map(w => (
                  <tr key={w} className="border-b">
                    <td className="p-2 font-medium">{w}kg</td>
                    {zones.map(zone => (
                      <td key={zone.id} className="text-center p-2">
                        ¥{Math.round(zone.baseRate + (w * 100 * zone.multiplier)).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
