import { useState } from 'react'
import { Package, Ruler, MapPin, Calculator, DollarSign, Shield, FileSignature, Truck, AlertCircle, Table, TrendingDown, Download, Printer, BarChart3, Clock, Search, Filter, Zap, Info } from 'lucide-react'

// ====================================
// サンプルデータ構造
// ====================================

// 日本郵便 EMS（エクスプレス） - kg単位
const JPPOST_EMS_RATES = {
  'US-ZONE4': [
    { weight_kg: 0.5, base: 3900, fuel: 390, total: 4290, days: '3-6' },
    { weight_kg: 1, base: 5300, fuel: 530, total: 5830, days: '3-6' },
    { weight_kg: 2, base: 7900, fuel: 790, total: 8690, days: '3-6' },
    { weight_kg: 3, base: 10300, fuel: 1030, total: 11330, days: '3-6' },
    { weight_kg: 5, base: 15100, fuel: 1510, total: 16610, days: '3-6' },
    { weight_kg: 10, base: 27100, fuel: 2710, total: 29810, days: '3-6' },
    { weight_kg: 15, base: 39100, fuel: 3910, total: 43010, days: '3-6' },
    { weight_kg: 20, base: 51100, fuel: 5110, total: 56210, days: '3-6' },
    { weight_kg: 25, base: 63100, fuel: 6310, total: 69410, days: '3-6' },
    { weight_kg: 30, base: 75100, fuel: 7510, total: 82610, days: '3-6' },
  ],
  'GB-ZONE1': [
    { weight_kg: 0.5, base: 3500, fuel: 350, total: 3850, days: '3-6' },
    { weight_kg: 1, base: 4800, fuel: 480, total: 5280, days: '3-6' },
    { weight_kg: 2, base: 7200, fuel: 720, total: 7920, days: '3-6' },
    { weight_kg: 5, base: 13800, fuel: 1380, total: 15180, days: '3-6' },
    { weight_kg: 10, base: 24800, fuel: 2480, total: 27280, days: '3-6' },
    { weight_kg: 20, base: 46800, fuel: 4680, total: 51480, days: '3-6' },
    { weight_kg: 30, base: 68800, fuel: 6880, total: 75680, days: '3-6' },
  ],
}

// 日本郵便 小型包装物（エコノミー） - g単位
const JPPOST_SMALL_PACKET_RATES = {
  'US-ZONE4': [
    { weight_g: 100, base: 1200, fuel: 0, total: 1200, days: '7-14' },
    { weight_g: 200, base: 1500, fuel: 0, total: 1500, days: '7-14' },
    { weight_g: 500, base: 2200, fuel: 0, total: 2200, days: '7-14' },
    { weight_g: 1000, base: 3400, fuel: 0, total: 3400, days: '7-14' },
    { weight_g: 1500, base: 4200, fuel: 0, total: 4200, days: '7-14' },
    { weight_g: 2000, base: 5000, fuel: 0, total: 5000, days: '7-14' },
  ],
  'GB-ZONE1': [
    { weight_g: 100, base: 1000, fuel: 0, total: 1000, days: '7-14' },
    { weight_g: 200, base: 1300, fuel: 0, total: 1300, days: '7-14' },
    { weight_g: 500, base: 1900, fuel: 0, total: 1900, days: '7-14' },
    { weight_g: 1000, base: 3000, fuel: 0, total: 3000, days: '7-14' },
    { weight_g: 2000, base: 4500, fuel: 0, total: 4500, days: '7-14' },
  ],
}

// CPass SpeedPak Economy（エコノミー） - g単位
const CPASS_SPEEDPAK_ECONOMY_RATES = {
  'US-ZONE1': [
    { weight_g: 100, base: 1227, fuel: 123, total: 1350, days: '8-12' },
    { weight_g: 200, base: 1367, fuel: 137, total: 1504, days: '8-12' },
    { weight_g: 500, base: 2060, fuel: 206, total: 2266, days: '8-12' },
    { weight_g: 1000, base: 3020, fuel: 302, total: 3322, days: '8-12' },
    { weight_g: 1500, base: 3816, fuel: 382, total: 4198, days: '8-12' },
    { weight_g: 2000, base: 5245, fuel: 525, total: 5770, days: '8-12' },
  ],
  'GB-ZONE1': [
    { weight_g: 100, base: 938, fuel: 94, total: 1032, days: '7-10' },
    { weight_g: 500, base: 1571, fuel: 157, total: 1728, days: '7-10' },
    { weight_g: 1000, base: 2240, fuel: 224, total: 2464, days: '7-10' },
    { weight_g: 2000, base: 3620, fuel: 362, total: 3982, days: '7-10' },
  ],
}

// CPass DHL Express（エクスプレス） - kg単位
const CPASS_DHL_EXPRESS_RATES = {
  'US-ZONE1': [
    { weight_kg: 0.5, base: 4500, fuel: 900, total: 5400, days: '2-4' },
    { weight_kg: 1, base: 5800, fuel: 1160, total: 6960, days: '2-4' },
    { weight_kg: 2, base: 8200, fuel: 1640, total: 9840, days: '2-4' },
    { weight_kg: 5, base: 15500, fuel: 3100, total: 18600, days: '2-4' },
    { weight_kg: 10, base: 28000, fuel: 5600, total: 33600, days: '2-4' },
    { weight_kg: 20, base: 52000, fuel: 10400, total: 62400, days: '2-4' },
    { weight_kg: 30, base: 76000, fuel: 15200, total: 91200, days: '2-4' },
  ],
  'GB-ZONE1': [
    { weight_kg: 0.5, base: 4200, fuel: 840, total: 5040, days: '2-4' },
    { weight_kg: 1, base: 5400, fuel: 1080, total: 6480, days: '2-4' },
    { weight_kg: 2, base: 7600, fuel: 1520, total: 9120, days: '2-4' },
    { weight_kg: 5, base: 14200, fuel: 2840, total: 17040, days: '2-4' },
    { weight_kg: 10, base: 25800, fuel: 5160, total: 30960, days: '2-4' },
    { weight_kg: 20, base: 48000, fuel: 9600, total: 57600, days: '2-4' },
    { weight_kg: 30, base: 70000, fuel: 14000, total: 84000, days: '2-4' },
  ],
}

// Eloji UPS Ground（エコノミー） - g単位
const ELOJI_UPS_GROUND_RATES = {
  'US-ZONE1': [
    { weight_g: 100, base: 1150, fuel: 115, total: 1265, days: '5-7' },
    { weight_g: 500, base: 1950, fuel: 195, total: 2145, days: '5-7' },
    { weight_g: 1000, base: 2850, fuel: 285, total: 3135, days: '5-7' },
    { weight_g: 2000, base: 4950, fuel: 495, total: 5445, days: '5-7' },
  ],
}

// Eloji FedEx Express（エクスプレス） - kg単位
const ELOJI_FEDEX_EXPRESS_RATES = {
  'US-ZONE1': [
    { weight_kg: 0.5, base: 4800, fuel: 960, total: 5760, days: '2-3' },
    { weight_kg: 1, base: 6100, fuel: 1220, total: 7320, days: '2-3' },
    { weight_kg: 2, base: 8600, fuel: 1720, total: 10320, days: '2-3' },
    { weight_kg: 5, base: 16200, fuel: 3240, total: 19440, days: '2-3' },
    { weight_kg: 10, base: 29500, fuel: 5900, total: 35400, days: '2-3' },
    { weight_kg: 20, base: 54800, fuel: 10960, total: 65760, days: '2-3' },
    { weight_kg: 30, base: 80000, fuel: 16000, total: 96000, days: '2-3' },
  ],
  'GB-ZONE1': [
    { weight_kg: 0.5, base: 4500, fuel: 900, total: 5400, days: '2-3' },
    { weight_kg: 1, base: 5700, fuel: 1140, total: 6840, days: '2-3' },
    { weight_kg: 2, base: 8000, fuel: 1600, total: 9600, days: '2-3' },
    { weight_kg: 5, base: 15000, fuel: 3000, total: 18000, days: '2-3' },
    { weight_kg: 10, base: 27200, fuel: 5440, total: 32640, days: '2-3' },
    { weight_kg: 20, base: 50600, fuel: 10120, total: 60720, days: '2-3' },
    { weight_kg: 30, base: 74000, fuel: 14800, total: 88800, days: '2-3' },
  ],
}

const CARRIERS = [
  { code: 'JPPOST', name: '日本郵便', color: '#2EC4B6', icon: '📮', marketplace: '全プラットフォーム（米国除く）' },
  { code: 'CPASS', name: 'CPass', color: '#1E90FF', icon: '✈️', marketplace: 'eBayのみ' },
  { code: 'ELOJI', name: 'Eloji', color: '#FF6B6B', icon: '🚀', marketplace: 'eBayのみ' },
]

const SERVICES = {
  JPPOST: [
    { code: 'EMS', name: 'EMS', type: 'express', unit: 'kg', maxWeight: 30000 },
    { code: 'SMALL_PACKET', name: '小型包装物書留', type: 'economy', unit: 'g', maxWeight: 2000 },
  ],
  CPASS: [
    { code: 'SPEEDPAK_ECONOMY', name: 'SpeedPak Economy', type: 'economy', unit: 'g', maxWeight: 2000 },
    { code: 'DHL_EXPRESS', name: 'DHL Express', type: 'express', unit: 'kg', maxWeight: 30000 },
  ],
  ELOJI: [
    { code: 'UPS_GROUND', name: 'UPS Ground', type: 'economy', unit: 'g', maxWeight: 2000 },
    { code: 'FEDEX_EXPRESS', name: 'FedEx Express', type: 'express', unit: 'kg', maxWeight: 30000 },
  ],
}

const COUNTRIES = [
  { code: 'US', name: 'アメリカ', flag: '🇺🇸', zones: { JPPOST: 'ZONE4', CPASS: 'ZONE1', ELOJI: 'ZONE1' } },
  { code: 'GB', name: 'イギリス', flag: '🇬🇧', zones: { JPPOST: 'ZONE1', CPASS: 'ZONE1', ELOJI: 'ZONE1' } },
  { code: 'DE', name: 'ドイツ', flag: '🇩🇪', zones: { JPPOST: 'ZONE1', CPASS: 'ZONE1', ELOJI: 'ZONE1' } },
  { code: 'AU', name: 'オーストラリア', flag: '🇦🇺', zones: { JPPOST: 'ZONE3', CPASS: 'ZONE2', ELOJI: 'ZONE2' } },
]

export default function ShippingCalculatorV6() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'matrix'>('calculator')
  
  // 計算用の状態
  const [weightInput, setWeightInput] = useState('1000')
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg'>('g')
  const [length, setLength] = useState(30)
  const [width, setWidth] = useState(20)
  const [height, setHeight] = useState(10)
  const [country, setCountry] = useState('US')
  const [itemValueUSD, setItemValueUSD] = useState(100)
  const [needSignature, setNeedSignature] = useState(false)
  const [needInsurance, setNeedInsurance] = useState(false)
  const [signatureType, setSignatureType] = useState<'STANDARD' | 'ADULT'>('STANDARD')
  
  // フィルター
  const [selectedCarrier, setSelectedCarrier] = useState('ALL')
  const [selectedServiceType, setSelectedServiceType] = useState<'ALL' | 'express' | 'economy'>('ALL')
  const [currency, setCurrency] = useState<'JPY' | 'USD'>('JPY')
  const exchangeRate = 154.32
  
  // 計算結果
  const [results, setResults] = useState<any[]>([])
  const [statistics, setStatistics] = useState({
    totalServices: 0,
    cheapestPrice: 0,
    fastestDays: 0,
    avgPrice: 0,
  })
  
  // マトリックス表示
  const [matrixCarrier, setMatrixCarrier] = useState('JPPOST')
  const [matrixService, setMatrixService] = useState('EMS')

  const getWeightInGrams = () => {
    const value = parseFloat(weightInput) || 0
    return weightUnit === 'kg' ? value * 1000 : value
  }

  const calculateVolumetricWeight = () => {
    return (length * width * height) / 5000 // kg
  }

  const getBillingWeight = () => {
    const actualWeight = getWeightInGrams() / 1000 // kg
    const volumetricWeight = calculateVolumetricWeight()
    return Math.max(actualWeight, volumetricWeight) * 1000 // g
  }

  const calculateOversizeFee = () => {
    const girth = length + width + height
    if (girth > 300) {
      return (girth - 300) * 50
    }
    return 0
  }

  const getRateForService = (carrier: string, service: string, weight: number, unit: 'g' | 'kg') => {
    const countryData = COUNTRIES.find(c => c.code === country)
    if (!countryData) return null
    
    const zone = countryData.zones[carrier]
    const key = `${country}-${zone}`
    
    // 料金表を取得
    let rates: any[] = []
    
    if (carrier === 'JPPOST' && service === 'EMS') {
      rates = JPPOST_EMS_RATES[key] || []
    } else if (carrier === 'JPPOST' && service === 'SMALL_PACKET') {
      rates = JPPOST_SMALL_PACKET_RATES[key] || []
    } else if (carrier === 'CPASS' && service === 'SPEEDPAK_ECONOMY') {
      rates = CPASS_SPEEDPAK_ECONOMY_RATES[key] || []
    } else if (carrier === 'CPASS' && service === 'DHL_EXPRESS') {
      rates = CPASS_DHL_EXPRESS_RATES[key] || []
    } else if (carrier === 'ELOJI' && service === 'UPS_GROUND') {
      rates = ELOJI_UPS_GROUND_RATES[key] || []
    } else if (carrier === 'ELOJI' && service === 'FEDEX_EXPRESS') {
      rates = ELOJI_FEDEX_EXPRESS_RATES[key] || []
    }
    
    if (rates.length === 0) return null
    
    // 重量に応じた料金を検索
    if (unit === 'kg') {
      const weightKg = weight / 1000
      const rate = rates.find(r => r.weight_kg >= weightKg)
      return rate || rates[rates.length - 1]
    } else {
      const rate = rates.find(r => r.weight_g >= weight)
      return rate || rates[rates.length - 1]
    }
  }

  const calculateShipping = () => {
    const weight = getBillingWeight()
    const newResults: any[] = []
    
    for (const carrier of CARRIERS) {
      if (selectedCarrier !== 'ALL' && carrier.code !== selectedCarrier) continue
      
      // 米国配送停止チェック
      if (carrier.code === 'JPPOST' && country === 'US') {
        newResults.push({
          carrier: carrier.name,
          carrierCode: carrier.code,
          service: '全サービス',
          available: false,
          reason: '現在アメリカへの配送停止中',
          marketplace: carrier.marketplace,
        })
        continue
      }
      
      for (const service of SERVICES[carrier.code]) {
        if (selectedServiceType !== 'ALL' && service.type !== selectedServiceType) continue
        
        // 重量制限チェック
        if (weight > service.maxWeight) {
          newResults.push({
            carrier: carrier.name,
            carrierCode: carrier.code,
            service: service.name,
            serviceType: service.type,
            available: false,
            reason: `重量制限超過（最大${service.maxWeight}g）`,
            marketplace: carrier.marketplace,
          })
          continue
        }
        
        // 料金取得
        const rate = getRateForService(carrier.code, service.code, weight, service.unit)
        if (!rate) {
          newResults.push({
            carrier: carrier.name,
            carrierCode: carrier.code,
            service: service.name,
            serviceType: service.type,
            available: false,
            reason: '選択された国への配送料金データがありません',
            marketplace: carrier.marketplace,
          })
          continue
        }
        
        // 追加料金計算
        const oversizeFee = calculateOversizeFee()
        const insuranceFee = needInsurance ? Math.max(itemValueUSD * exchangeRate * 0.02, 500) : 0
        const signatureFee = needSignature ? (signatureType === 'ADULT' ? 800 : 500) : 0
        
        const total = rate.total + oversizeFee + insuranceFee + signatureFee
        
        newResults.push({
          carrier: carrier.name,
          carrierCode: carrier.code,
          service: service.name,
          serviceType: service.type,
          serviceUnit: service.unit,
          days: rate.days,
          basePrice: rate.base,
          fuelSurcharge: rate.fuel,
          oversizeFee,
          insuranceFee,
          signatureFee,
          total,
          marketplace: carrier.marketplace,
          available: true,
        })
      }
    }
    
    // 利用可能なものを料金順にソート
    const available = newResults.filter(r => r.available).sort((a, b) => a.total - b.total)
    const unavailable = newResults.filter(r => !r.available)
    
    setResults([...available, ...unavailable])
    
    // 統計計算
    if (available.length > 0) {
      const prices = available.map(r => r.total)
      const days = available.map(r => parseInt(r.days.split('-')[0]))
      
      setStatistics({
        totalServices: available.length,
        cheapestPrice: Math.min(...prices),
        fastestDays: Math.min(...days),
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      })
    }
  }

  const formatPrice = (jpy: number) => {
    if (currency === 'JPY') {
      return `¥${Math.round(jpy).toLocaleString()}`
    }
    return `$${(jpy / exchangeRate).toFixed(2)}`
  }

  const getMatrixData = () => {
    const service = SERVICES[matrixCarrier]?.find(s => s.code === matrixService)
    if (!service) return []
    
    const countryData = COUNTRIES.find(c => c.code === country)
    if (!countryData) return []
    
    const zone = countryData.zones[matrixCarrier]
    const key = `${country}-${zone}`
    
    if (matrixCarrier === 'JPPOST' && matrixService === 'EMS') {
      return JPPOST_EMS_RATES[key] || []
    } else if (matrixCarrier === 'JPPOST' && matrixService === 'SMALL_PACKET') {
      return JPPOST_SMALL_PACKET_RATES[key] || []
    } else if (matrixCarrier === 'CPASS' && matrixService === 'SPEEDPAK_ECONOMY') {
      return CPASS_SPEEDPAK_ECONOMY_RATES[key] || []
    } else if (matrixCarrier === 'CPASS' && matrixService === 'DHL_EXPRESS') {
      return CPASS_DHL_EXPRESS_RATES[key] || []
    } else if (matrixCarrier === 'ELOJI' && matrixService === 'UPS_GROUND') {
      return ELOJI_UPS_GROUND_RATES[key] || []
    } else if (matrixCarrier === 'ELOJI' && matrixService === 'FEDEX_EXPRESS') {
      return ELOJI_FEDEX_EXPRESS_RATES[key] || []
    }
    
    return []
  }

  const exportToCSV = () => {
    if (results.length === 0) {
      alert('計算結果がありません')
      return
    }
    
    const headers = ['業者', 'サービス', '基本料金', '燃料代', '超過料金', '保険料', 'サイン料金', '合計', '配送日数']
    const rows = results.filter(r => r.available).map(r => [
      r.carrier,
      r.service,
      r.basePrice,
      r.fuelSurcharge,
      r.oversizeFee,
      r.insuranceFee,
      r.signatureFee,
      r.total,
      r.days,
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipping_rates_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl p-8 mb-6 shadow-xl">
          <h1 className="text-4xl font-bold mb-3">国際送料計算システム V6</h1>
          <p className="text-xl text-blue-50 mb-2">
            完全実装版・サンプルデータ・エコノミーg単位/エクスプレスkg単位対応
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1 bg-white/20 rounded-full">✓ 重量単位自動切替</span>
            <span className="px-3 py-1 bg-white/20 rounded-full">✓ Zone別料金</span>
            <span className="px-3 py-1 bg-white/20 rounded-full">✓ マトリックス表示</span>
            <span className="px-3 py-1 bg-white/20 rounded-full">✓ CSV出力</span>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'calculator'
                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                : 'bg-card hover:bg-muted border'
            }`}
          >
            <Calculator className="h-5 w-5" />
            送料計算
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                : 'bg-card hover:bg-muted border'
            }`}
          >
            <Table className="h-5 w-5" />
            料金マトリックス
          </button>
        </div>

        {/* 送料計算タブ */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            {/* 荷物情報 */}
            <div className="bg-card rounded-xl border-2 p-6 shadow-md">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                荷物情報
              </h2>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">重量</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="flex-1 px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                      min="1"
                      step={weightUnit === 'kg' ? '0.1' : '100'}
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value as 'g' | 'kg')}
                      className="px-4 py-3 bg-muted border-2 border-input rounded-lg font-bold"
                    >
                      <option value="g">g（エコノミー用）</option>
                      <option value="kg">kg（エクスプレス用）</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {weightUnit === 'g' 
                      ? '100g～2,000g（エコノミーサービス）' 
                      : '0.5kg～30kg（エクスプレスサービス）'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">長さ</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={length}
                      onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                    />
                    <span className="px-4 py-3 bg-muted rounded-lg">cm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">幅</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                    />
                    <span className="px-4 py-3 bg-muted rounded-lg">cm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">高さ</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                    />
                    <span className="px-4 py-3 bg-muted rounded-lg">cm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">配送先国</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">商品価格</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={itemValueUSD}
                      onChange={(e) => setItemValueUSD(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                      min="0"
                      step="0.01"
                    />
                    <span className="px-4 py-3 bg-muted rounded-lg font-bold">USD</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground font-medium">実重量</div>
                    <div className="text-2xl font-bold text-blue-600">{(getWeightInGrams() / 1000).toFixed(2)} kg</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium">容積重量</div>
                    <div className="text-2xl font-bold text-indigo-600">{calculateVolumetricWeight().toFixed(2)} kg</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium">請求重量</div>
                    <div className="text-2xl font-bold text-purple-600">{(getBillingWeight() / 1000).toFixed(2)} kg</div>
                  </div>
                </div>
              </div>
            </div>

            {/* オプション・フィルター */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border-2 p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4">追加オプション</h2>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 bg-background rounded-lg cursor-pointer hover:bg-muted/50 border-2 border-transparent hover:border-primary transition-all">
                    <input
                      type="checkbox"
                      checked={needInsurance}
                      onChange={(e) => setNeedInsurance(e.target.checked)}
                      className="mt-1 w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <Shield className="h-5 w-5 text-green-600" />
                        保険（商品価格の2%、最低¥500）
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-background rounded-lg cursor-pointer hover:bg-muted/50 border-2 border-transparent hover:border-primary transition-all">
                    <input
                      type="checkbox"
                      checked={needSignature}
                      onChange={(e) => setNeedSignature(e.target.checked)}
                      className="mt-1 w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <FileSignature className="h-5 w-5 text-blue-600" />
                        配達時サイン
                      </div>
                      {needSignature && (
                        <select
                          value={signatureType}
                          onChange={(e) => setSignatureType(e.target.value as 'STANDARD' | 'ADULT')}
                          className="mt-2 w-full px-3 py-2 bg-background border-2 border-input rounded-lg text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="STANDARD">通常サイン（¥500）</option>
                          <option value="ADULT">成人確認サイン（¥800）</option>
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-card rounded-xl border-2 p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4">フィルター・設定</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">配送業者</label>
                    <select
                      value={selectedCarrier}
                      onChange={(e) => setSelectedCarrier(e.target.value)}
                      className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                    >
                      <option value="ALL">全業者を表示</option>
                      {CARRIERS.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">サービスタイプ</label>
                    <select
                      value={selectedServiceType}
                      onChange={(e) => setSelectedServiceType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                    >
                      <option value="ALL">全て</option>
                      <option value="express">エクスプレス（速い・kg単位）</option>
                      <option value="economy">エコノミー（安い・g単位）</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">表示通貨</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as 'JPY' | 'USD')}
                      className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                    >
                      <option value="JPY">日本円 (¥)</option>
                      <option value="USD">米ドル ($)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={calculateShipping}
                  className="w-full mt-4 py-4 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <Calculator className="h-6 w-6" />
                  送料を計算する
                  <Zap className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* 統計サマリー */}
            {results.filter(r => r.available).length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-green-200 dark:border-green-800 p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                  計算結果サマリー
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center shadow-md">
                    <div className="text-3xl font-bold text-blue-600">{statistics.totalServices}</div>
                    <div className="text-sm text-muted-foreground mt-1">利用可能サービス</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center shadow-md">
                    <div className="text-3xl font-bold text-green-600">{formatPrice(statistics.cheapestPrice)}</div>
                    <div className="text-sm text-muted-foreground mt-1">最安料金</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center shadow-md">
                    <div className="text-3xl font-bold text-orange-600">{statistics.fastestDays}日</div>
                    <div className="text-sm text-muted-foreground mt-1">最速配送</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center shadow-md">
                    <div className="text-3xl font-bold text-purple-600">{formatPrice(statistics.avgPrice)}</div>
                    <div className="text-sm text-muted-foreground mt-1">平均料金</div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={exportToCSV}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    CSV出力
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="h-5 w-5" />
                    印刷
                  </button>
                </div>
              </div>
            )}

            {/* 計算結果 */}
            {results.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">計算結果（{results.length}件）</h2>
                {results.map((result, index) => (
                  <div
                    key={`${result.carrierCode}-${result.service}`}
                    className={`bg-card rounded-xl border-2 p-6 shadow-md transition-all hover:shadow-xl ${
                      !result.available
                        ? 'border-muted opacity-60'
                        : index === 0 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20 scale-102' 
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {!result.available ? (
                      <div>
                        <h3 className="text-lg font-bold text-muted-foreground mb-2">
                          {result.carrier} - {result.service}
                        </h3>
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{result.reason}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          対応: {result.marketplace}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold">
                                {result.carrier} - {result.service}
                              </h3>
                              {index === 0 && (
                                <span className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-full flex items-center gap-2 animate-pulse">
                                  <TrendingDown className="h-4 w-4" />
                                  最安値！
                                </span>
                              )}
                              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                                {result.serviceType === 'express' ? '⚡ エクスプレス' : '💰 エコノミー'}
                              </span>
                              <span className="px-2 py-1 bg-muted text-xs font-medium rounded">
                                {result.serviceUnit}単位
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-orange-600" />
                                {result.days}営業日
                              </span>
                              <span className="text-xs text-muted-foreground">({result.marketplace})</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold text-green-600">
                              {formatPrice(result.total)}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">合計料金</div>
                          </div>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 border-2 border-muted">
                          <h4 className="text-sm font-bold mb-3">料金内訳</h4>
                          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">基本料金:</span>
                              <span className="font-semibold">{formatPrice(result.basePrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">燃料サーチャージ:</span>
                              <span className="font-semibold">{formatPrice(result.fuelSurcharge)}</span>
                            </div>
                            {result.oversizeFee > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>超過料金:</span>
                                <span className="font-semibold">{formatPrice(result.oversizeFee)}</span>
                              </div>
                            )}
                            {result.insuranceFee > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">保険料:</span>
                                <span className="font-semibold">{formatPrice(result.insuranceFee)}</span>
                              </div>
                            )}
                            {result.signatureFee > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">サイン料金:</span>
                                <span className="font-semibold">{formatPrice(result.signatureFee)}</span>
                              </div>
                            )}
                            <div className="col-span-2 flex justify-between pt-3 border-t-2 font-bold text-base">
                              <span>合計:</span>
                              <span className="text-green-600 text-xl">{formatPrice(result.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 料金マトリックスタブ */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            {/* フィルター */}
            <div className="bg-card rounded-xl border-2 p-6 shadow-md">
              <h2 className="text-2xl font-bold mb-4">表示条件設定</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">配送業者</label>
                  <select
                    value={matrixCarrier}
                    onChange={(e) => {
                      setMatrixCarrier(e.target.value)
                      setMatrixService(SERVICES[e.target.value][0].code)
                    }}
                    className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                  >
                    {CARRIERS.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">配送サービス</label>
                  <select
                    value={matrixService}
                    onChange={(e) => setMatrixService(e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                  >
                    {SERVICES[matrixCarrier]?.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.type === 'express' ? 'kg' : 'g'}単位)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">配送先国</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg font-medium"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* マトリックステーブル */}
            <div className="bg-card rounded-xl border-2 p-6 shadow-md">
              <h2 className="text-3xl font-bold mb-4">
                料金マトリックス - {CARRIERS.find(c => c.code === matrixCarrier)?.name} / {SERVICES[matrixCarrier]?.find(s => s.code === matrixService)?.name}
              </h2>
              
              {getMatrixData().length === 0 ? (
                <div className="text-center py-12">
                  <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    選択された条件の料金データがありません
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-primary/20 to-blue-600/20">
                        <th className="px-4 py-3 text-left font-bold border-2">重量</th>
                        <th className="px-4 py-3 text-right font-bold border-2">基本料金</th>
                        <th className="px-4 py-3 text-right font-bold border-2">燃料代</th>
                        <th className="px-4 py-3 text-right font-bold border-2">合計</th>
                        <th className="px-4 py-3 text-center font-bold border-2">配送日数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMatrixData().map((row: any, index: number) => {
                        const service = SERVICES[matrixCarrier]?.find(s => s.code === matrixService)
                        const isKg = service?.unit === 'kg'
                        
                        return (
                          <tr
                            key={index}
                            className={`hover:bg-muted/50 transition-colors ${
                              index % 2 === 0 ? 'bg-muted/10' : ''
                            }`}
                          >
                            <td className="px-4 py-3 border-2 font-bold">
                              {isKg ? `${row.weight_kg}kg` : `${row.weight_g}g`}
                            </td>
                            <td className="px-4 py-3 border-2 text-right font-semibold">
                              ¥{row.base.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-2 text-right font-semibold text-orange-600">
                              ¥{row.fuel.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-2 text-right text-xl font-bold text-primary">
                              ¥{row.total.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-2 text-center font-medium">
                              {row.days}営業日
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <p className="mt-4 text-sm text-muted-foreground">
                ※ 料金はサンプルデータです<br />
                ※ エコノミーサービスはg単位（100g～2,000g）、エクスプレスサービスはkg単位（0.5kg～30kg）
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}