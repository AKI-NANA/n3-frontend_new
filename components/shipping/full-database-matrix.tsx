import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, FileSpreadsheet, Search, Filter, CheckCircle2, Info } from 'lucide-react'

/**
 * 実データベース全データ表示マトリックス V5
 * 
 * 改善点：
 * 1. Eloji DHL Express Worldwideに正しいデータ投入完了（0.5kg-30kg, Zone 1-9）
 * 2. CPassの「DHL Express Worldwide」を削除（古いデータ）
 * 3. ZONEは番号順、その他の国・地域はそのまま表示
 * 4. データが入っていない列のみ非表示
 */

// サービス選択オプション
const SERVICE_OPTIONS = [
  // 日本郵便（shipping_ratesテーブル）
  { value: 'EMS', label: 'EMS（国際スピード郵便）', group: '日本郵便', type: 'EXPRESS', weights: 42, icon: '🇯🇵' },
  { value: 'LETTER', label: '書状', group: '日本郵便', type: 'ECONOMY', weights: 7, icon: '✉️' },
  { value: 'LETTER_REG', label: '書状書留', group: '日本郵便', type: 'STANDARD', weights: 7, icon: '📨' },
  { value: 'SMALL_PACKET_REG', label: '小型包装物書留', group: '日本郵便', type: 'STANDARD', weights: 20, icon: '📦', registrationFee: 460 },
  { value: 'PARCEL', label: '国際小包', group: '日本郵便', type: 'STANDARD', weights: 7, icon: '📮' },
  
  // CPass SpeedPAK
  { value: 'SPEEDPAK_ECONOMY', label: 'eBay SpeedPAK Economy Japan', group: 'CPass', type: 'ECONOMY', weights: 66, icon: '📦' },
  { value: 'SPEEDPAK_EXPRESS_DHL', label: 'SpeedPAK Express via DHL', group: 'CPass', type: 'EXPRESS', weights: 59, icon: '⚡' },
  
  // CPass FedEx
  { value: 'FEDEX_INTL_PRIORITY', label: 'FedEx International Priority', group: 'CPass', type: 'EXPRESS', weights: 88, icon: '💜' },
  { value: 'FEDEX_INTL_CONNECT_PLUS', label: 'FedEx International Connect Plus', group: 'CPass', type: 'STANDARD', weights: 49, icon: '💙' },
  // FEDEX_INTL_ECONOMY は返送専用のため除外
  
  // Eloji UPS
  { value: 'UPS_EXPRESS_SAVER', label: 'UPS Express Saver', group: 'Eloji', type: 'EXPRESS', weights: 46, icon: '🤎' },
  
  // Eloji DHL
  { value: 'ELOJI_DHL_EXPRESS', label: 'Eloji DHL Express Worldwide', group: 'Eloji', type: 'EXPRESS', weights: 60, icon: '🔵' },
  
  // Eloji FedEx
  { value: 'ELOJI_FEDEX_ECONOMY', label: 'Eloji FedX Economy', group: 'Eloji', type: 'ECONOMY', weights: 45, icon: '🟢' },
  { value: 'ELOJI_FEDEX_ICP', label: 'Eloji FedEx International Connect Plus', group: 'Eloji', type: 'STANDARD', weights: 48, icon: '🔷' },
  
  // Direct FedEx（データなし、非アクティブ）
  // { value: 'FEDEX_IP', label: 'FedEx International Priority (Direct)', group: 'Direct', type: 'EXPRESS', weights: 11, icon: '💎' },
  // { value: 'FEDEX_IE', label: 'FedEx International Economy (Direct)', group: 'Direct', type: 'ECONOMY', weights: 11, icon: '🌿' },
  // { value: 'FEDEX_ICP', label: 'FedEx International Connect Plus (Direct)', group: 'Direct', type: 'STANDARD', weights: 11, icon: '🔹' },
]

const SERVICE_COLORS = {
  EXPRESS: 'bg-rose-600 text-white',
  ECONOMY: 'bg-emerald-600 text-white',
  STANDARD: 'bg-slate-600 text-white'
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ja-JP').format(price)
}

/**
 * 料金を計算する
 * @param baseRate データベースの料金（multiplierの場合は1kg単価）
 * @param weightRange 重量帯（例: "21-44kg"）
 * @param isMultiplier multiplierフラグ
 * @param registrationFee 書留料金
 * @returns 計算後の料金
 */
function calculateRate(
  baseRate: number,
  weightRange: string,
  isMultiplier: boolean,
  registrationFee: number = 0
): { finalRate: number; calculationNote?: string } {
  if (!baseRate || baseRate <= 0) {
    return { finalRate: 0 }
  }

  // multiplierの場合は重量範囲の中間値を使用
  if (isMultiplier) {
    const match = weightRange.match(/([\d.]+)-([\d.]+)kg/)
    if (match) {
      const fromKg = parseFloat(match[1])
      const toKg = parseFloat(match[2])
      const middleWeight = (fromKg + toKg) / 2
      const calculatedRate = baseRate * middleWeight
      return {
        finalRate: calculatedRate + registrationFee,
        calculationNote: `${middleWeight}kg × ¥${formatPrice(baseRate)}/kg`
      }
    }
  }

  // 通常料金の場合
  return { finalRate: baseRate + registrationFee }
}

// 個別サービスデータ取得
async function fetchServiceMatrix(serviceCode: string) {
  try {
    const response = await fetch(`/api/shipping/full-matrix?service=${serviceCode}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('API Error:', errorData)
      throw new Error(errorData.error || `API Error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`✅ Loaded full matrix for ${serviceCode}:`, data)
    return data
  } catch (error) {
    console.error('❌ Service matrix fetch error:', error)
    throw error
  }
}

export default function FullDatabaseMatrix() {
  const [selectedService, setSelectedService] = useState('ELOJI_DHL_EXPRESS')
  const [matrixData, setMatrixData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // フィルター設定
  const [weightFilter, setWeightFilter] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [showEmptyRates, setShowEmptyRates] = useState(false)
  const [maxDisplayWeights, setMaxDisplayWeights] = useState(999) // デフォルト全表示

  // データ取得
  const loadMatrixData = async (service: string) => {
    setLoading(true)
    setError(null)
    try {
      console.log(`🔄 Loading matrix data for ${service}...`)
      const data = await fetchServiceMatrix(service)
      console.log(`✅ Loaded ${data.weight_levels} weight levels`)
      setMatrixData(data)
    } catch (err: any) {
      const errorMessage = err.message || 'データ取得に失敗しました'
      setError(`❌ ${errorMessage}`)
      console.error('❌ Matrix data load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatrixData(selectedService)
  }, [selectedService])

  // フィルター適用
  const getFilteredData = () => {
    if (!matrixData) return null

    let filteredWeights = matrixData.weight_ranges || []
    let filteredZones = matrixData.zones || []

    // 重量フィルター
    if (weightFilter) {
      filteredWeights = filteredWeights.filter((w: string) => 
        w.includes(weightFilter)
      )
    }

    // ゾーンフィルター
    if (zoneFilter) {
      filteredZones = filteredZones.filter((z: any) => 
        z.name.includes(zoneFilter) || z.code.includes(zoneFilter)
      )
    }

    // 表示件数制限
    if (maxDisplayWeights < 999) {
      filteredWeights = filteredWeights.slice(0, maxDisplayWeights)
    }

    return {
      ...matrixData,
      weight_ranges: filteredWeights,
      zones: filteredZones
    }
  }

  const selectedServiceInfo = SERVICE_OPTIONS.find(s => s.value === selectedService)
  const filteredData = getFilteredData()

  return (
    <div className="space-y-6">
      {/* 制御パネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            配送サービス個別マトリックス（全重量帯表示）
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              Supabase直結
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* サービス選択 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">配送サービス</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['日本郵便', 'CPass', 'Eloji', 'Direct'].map(group => (
                      <React.Fragment key={group}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {group}
                        </div>
                        {SERVICE_OPTIONS.filter(s => s.group === group).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {option.weights}重量帯
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">表示設定</label>
                <Button onClick={() => loadMatrixData(selectedService)} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  再読み込み
                </Button>
              </div>
            </div>

            {/* 書留料金の注意書き */}
            {selectedService === 'SMALL_PACKET_REG' && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    📦 小型包装物書留について
                  </div>
                  <div className="text-blue-800 dark:text-blue-200">
                    表示料金には<strong>書留料金¥460が含まれています</strong>（基本料金 + ¥460）
                  </div>
                </div>
              </div>
            )}

            {/* フィルター */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  重量フィルター
                </label>
                <Input
                  placeholder="例: 1kg, 500g"
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  ゾーン検索
                </label>
                <Input
                  placeholder="例: Zone 1, アメリカ"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">最大表示数</label>
                <Select value={maxDisplayWeights.toString()} onValueChange={(v) => setMaxDisplayWeights(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20重量帯</SelectItem>
                    <SelectItem value="50">50重量帯</SelectItem>
                    <SelectItem value="999">全て表示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-empty"
                checked={showEmptyRates}
                onCheckedChange={setShowEmptyRates}
              />
              <label htmlFor="show-empty" className="text-sm">空の料金セルも表示</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* データ概要 */}
      {matrixData && selectedServiceInfo && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedServiceInfo.icon}</span>
              {matrixData.service_name}
              <Badge className={SERVICE_COLORS[selectedServiceInfo.type]}>
                {selectedServiceInfo.type}
              </Badge>
              {selectedServiceInfo.registrationFee && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300">
                  書留料込 +¥{selectedServiceInfo.registrationFee}
                </Badge>
              )}
              <Badge variant="outline" className="ml-auto">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                DB直結
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">データソース</div>
                <div className="text-lg font-bold">{matrixData.source_table}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">重量単位</div>
                <div className="text-lg font-bold">{matrixData.weight_unit}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">重量帯数</div>
                <div className="text-lg font-bold text-primary">{matrixData.weight_levels}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">最大重量</div>
                <div className="text-lg font-bold">{matrixData.max_weight}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">ゾーン数</div>
                <div className="text-lg font-bold">{matrixData.zones?.length || 0}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 text-muted-foreground">総レコード数</div>
                <div className="text-lg font-bold">{matrixData.total_records}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-red-600 dark:text-red-400">
              <div className="font-bold mb-2">データベースエラー</div>
              <div className="text-sm">{error}</div>
              <div className="mt-4 text-xs">
                <div>• Supabase接続を確認してください</div>
                <div>• 環境変数が設定されているか確認してください</div>
                <div>• サーバーログを確認してください</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メインマトリックス表示 */}
      <Card>
        <CardHeader>
          <CardTitle>
            料金マトリックス（全重量帯）
            {filteredData && (
              <Badge variant="outline" className="ml-2">
                表示中: {filteredData.weight_ranges?.length || 0} / {matrixData?.weight_levels || 0} 重量帯
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              データベースから読み込み中...
            </div>
          ) : filteredData ? (
            <ServiceMatrixTable
              serviceCode={selectedService}
              serviceName={filteredData.service_name}
              serviceType={selectedServiceInfo?.type || 'STANDARD'}
              registrationFee={selectedServiceInfo?.registrationFee || 0}
              zones={filteredData.zones || []}
              weightRanges={filteredData.weight_ranges || []}
              rates={filteredData.rates || {}}
              multiplierInfo={filteredData.multiplier_info}
              showEmptyRates={showEmptyRates}
              weightUnit={filteredData.weight_unit}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              サービスを選択してください
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// サービスマトリックステーブル表示
function ServiceMatrixTable({ 
  serviceCode,
  serviceName, 
  serviceType,
  registrationFee,
  zones, 
  weightRanges, 
  rates,
  multiplierInfo,
  showEmptyRates, 
  weightUnit 
}: {
  serviceCode: string
  serviceName: string
  serviceType: string
  registrationFee: number
  zones: any[]
  weightRanges: string[]
  rates: any
  multiplierInfo?: any
  showEmptyRates: boolean
  weightUnit: string
}) {
  // ZONEと通常の国・地域を分離してソート
  const sortedZones = [...zones].sort((a, b) => {
    const aIsZone = (a.code && (a.code.includes('ZONE_') || a.code.includes('_DHL_ZONE_'))) || (a.name && a.name.match(/Zone\s*\d+/i))
    const bIsZone = (b.code && (b.code.includes('ZONE_') || b.code.includes('_DHL_ZONE_'))) || (b.name && b.name.match(/Zone\s*\d+/i))
    
    // 両方ともZONEの場合は番号順
    if (aIsZone && bIsZone) {
      const getZoneNumber = (zoneObj: any) => {
        if (zoneObj.code) {
          const match = zoneObj.code.match(/ZONE_(\d+)/)
          if (match) return parseInt(match[1])
        }
        if (zoneObj.name) {
          const match = zoneObj.name.match(/Zone\s*(\d+)/i)
          if (match) return parseInt(match[1])
        }
        return 999
      }
      return getZoneNumber(a) - getZoneNumber(b)
    }
    
    // ZONEを先に表示
    if (aIsZone && !bIsZone) return -1
    if (!aIsZone && bIsZone) return 1
    
    // 通常の国・地域はそのままの順序
    return 0
  })

  // データが入っている列のみフィルタリング
  const zonesWithData = sortedZones.filter(zone => {
    // このゾーン/国に何らかの料金データがあるかチェック
    const hasData = weightRanges.some(weight => {
      // 複数のキーパターンを試す
      const possibleKeys = [
        zone.code,
        zone.name,
        `SPEEDPAK_DHL_${zone.code}`,
        `ELOJI_DHL_${zone.code}`,
        zone.code?.replace('SPEEDPAK_DHL_', ''),
        zone.code?.replace('ELOJI_DHL_', '')
      ]
      
      for (const key of possibleKeys) {
        if (key && rates[key] && rates[key][weight] && rates[key][weight] > 0) {
          return true
        }
      }
      return false
    })
    return hasData
  })

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-semibold min-w-32 sticky left-0 bg-muted z-10">
                重量 ({weightUnit})
              </th>
              {zonesWithData.map(zone => {
                // ZONEの場合は番号のみ表示、それ以外は名前を表示
                const isZone = (zone.code && (zone.code.includes('ZONE_') || zone.code.includes('_DHL_ZONE_'))) || (zone.name && zone.name.match(/Zone\s*\d+/i))
                
                let displayName = zone.name
                if (isZone) {
                  const zoneMatch = zone.code ? zone.code.match(/ZONE_(\d+)/) : zone.name?.match(/Zone\s*(\d+)/i)
                  const zoneNumber = zoneMatch ? zoneMatch[1] : zone.name
                  displayName = `Zone ${zoneNumber}`
                }
                
                return (
                  <th key={zone.code || zone.name} className="border border-border p-2 text-center font-semibold min-w-28">
                    <div className="space-y-1">
                      <div className="font-bold text-xs">{displayName}</div>
                      {!isZone && zone.countries && zone.countries.length > 0 && zone.countries[0] !== zone.name && (
                        <div className="text-xs text-muted-foreground">
                          {zone.countries.slice(0, 2).join('・')}
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {weightRanges.map((weight, weightIndex) => {
              const weightRates: any = {}
              zonesWithData.forEach(zone => {
                // 複数のキーパターンを試す
                const possibleKeys = [
                  zone.code,
                  zone.name,
                  `SPEEDPAK_DHL_${zone.code}`,
                  `ELOJI_DHL_${zone.code}`,
                  zone.code?.replace('SPEEDPAK_DHL_', ''),
                  zone.code?.replace('ELOJI_DHL_', '')
                ]
                
                for (const key of possibleKeys) {
                  if (key && rates[key] && rates[key][weight]) {
                    weightRates[zone.code || zone.name] = rates[key][weight]
                    break
                  }
                }
              })
              
              const hasAnyRate = Object.values(weightRates).some((price: any) => price > 0)
              if (!showEmptyRates && !hasAnyRate) return null

              return (
                <tr key={weight} className={`hover:bg-muted/50 ${weightIndex % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  <td className="border border-border p-3 font-bold sticky left-0 bg-background z-10">
                    {weight}
                  </td>
                  
                  {zonesWithData.map(zone => {
                    const basePrice = weightRates[zone.code || zone.name]
                    const zoneKey = zone.code || zone.name
                    
                    // multiplierかどうかチェック
                    const isMultiplier = multiplierInfo && multiplierInfo[zoneKey] && multiplierInfo[zoneKey][weight]
                    
                    // 料金を計算
                    const { finalRate, calculationNote } = calculateRate(
                      basePrice,
                      weight,
                      isMultiplier,
                      registrationFee
                    )
                    
                    return (
                      <td key={zone.code || zone.name} className="border border-border p-2 text-center">
                        {finalRate > 0 ? (
                          <div className="space-y-1">
                            <div className="font-bold text-sm">
                              {isMultiplier ? (
                                <span className="text-orange-600 dark:text-orange-400">
                                  ¥{formatPrice(finalRate)}
                                </span>
                              ) : (
                                <span>¥{formatPrice(finalRate)}</span>
                              )}
                            </div>
                            {registrationFee > 0 && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                (基本¥{formatPrice(basePrice)}+¥{registrationFee})
                              </div>
                            )}
                            {isMultiplier && calculationNote && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                                {calculationNote}
                              </div>
                            )}
                            {isMultiplier && (
                              <div className="text-xs text-orange-500 dark:text-orange-500 font-semibold">
                                ¥{formatPrice(basePrice)}/kg
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              ${(finalRate / 154.32).toFixed(0)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-muted-foreground">
        表示: {weightRanges.length}重量帯 × {zonesWithData.length}列 = {weightRanges.length * zonesWithData.length}セル
        {registrationFee > 0 && (
          <span className="ml-2 text-blue-600 dark:text-blue-400">
            ※ 全料金に書留料金¥{registrationFee}が加算されています
          </span>
        )}
      </div>
    </div>
  )
}
