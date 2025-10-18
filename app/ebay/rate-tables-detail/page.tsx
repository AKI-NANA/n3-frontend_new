'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, Download, Filter, Search, Database, AlertTriangle } from 'lucide-react'

interface RateTableEntry {
  weight_from_kg: number
  weight_to_kg: number
  country_code: string
  country_name: string
  recommended_price_usd: number
  additional_item_usd: number
}

// 主要国の定義と色
const MAJOR_COUNTRIES = {
  'US': { name: 'アメリカ', color: 'bg-red-100 border-red-300' },
  'GB': { name: 'イギリス', color: 'bg-blue-100 border-blue-300' },
  'DE': { name: 'ドイツ', color: 'bg-yellow-100 border-yellow-300' },
  'CA': { name: 'カナダ', color: 'bg-red-50 border-red-200' },
  'AU': { name: 'オーストラリア', color: 'bg-green-100 border-green-300' },
  'FR': { name: 'フランス', color: 'bg-blue-50 border-blue-200' },
  'ES': { name: 'スペイン', color: 'bg-orange-100 border-orange-300' },
  'IT': { name: 'イタリア', color: 'bg-green-50 border-green-200' },
  'IL': { name: 'イスラエル', color: 'bg-indigo-100 border-indigo-300' },
  'NL': { name: 'オランダ', color: 'bg-orange-50 border-orange-200' },
  'SE': { name: 'スウェーデン', color: 'bg-blue-50 border-blue-200' },
  'CH': { name: 'スイス', color: 'bg-red-50 border-red-200' },
  'JP': { name: '日本', color: 'bg-pink-100 border-pink-300' },
  'KR': { name: '韓国', color: 'bg-cyan-100 border-cyan-300' },
  'CN': { name: '中国', color: 'bg-red-50 border-red-200' },
  'SG': { name: 'シンガポール', color: 'bg-red-50 border-red-200' },
  'HK': { name: '香港', color: 'bg-red-50 border-red-200' },
  'TW': { name: '台湾', color: 'bg-blue-50 border-blue-200' }
}

// 国名の日本語変換
const COUNTRY_NAMES_JA: { [key: string]: string } = {
  'AD': 'アンドラ', 'AE': 'UAE', 'AF': 'アフガニスタン', 'AG': 'アンティグア',
  'AI': 'アンギラ', 'AL': 'アルバニア', 'AM': 'アルメニア', 'AO': 'アンゴラ',
  'AR': 'アルゼンチン', 'AS': 'サモア', 'AT': 'オーストリア', 'AU': 'オーストラリア',
  'AW': 'アルバ', 'AZ': 'アゼルバイジャン', 'BA': 'ボスニア', 'BB': 'バルバドス',
  'BD': 'バングラデシュ', 'BE': 'ベルギー', 'BF': 'ブルキナファソ', 'BG': 'ブルガリア',
  'BH': 'バーレーン', 'BI': 'ブルンジ', 'BJ': 'ベナン', 'BM': 'バミューダ',
  'BN': 'ブルネイ', 'BO': 'ボリビア', 'BR': 'ブラジル', 'BS': 'バハマ',
  'BT': 'ブータン', 'BW': 'ボツワナ', 'BY': 'ベラルーシ', 'BZ': 'ベリーズ',
  'CA': 'カナダ', 'CD': 'コンゴ民主', 'CF': '中央アフリカ', 'CG': 'コンゴ共和',
  'CH': 'スイス', 'CI': 'コートジボワール', 'CL': 'チリ', 'CM': 'カメルーン',
  'CN': '中国', 'CO': 'コロンビア', 'CR': 'コスタリカ', 'CU': 'キューバ',
  'CV': 'カーボベルデ', 'CY': 'キプロス', 'CZ': 'チェコ', 'DE': 'ドイツ',
  'DJ': 'ジブチ', 'DK': 'デンマーク', 'DM': 'ドミニカ国', 'DO': 'ドミニカ共和',
  'DZ': 'アルジェリア', 'EC': 'エクアドル', 'EE': 'エストニア', 'EG': 'エジプト',
  'ER': 'エリトリア', 'ES': 'スペイン', 'ET': 'エチオピア', 'FI': 'フィンランド',
  'FJ': 'フィジー', 'FK': 'フォークランド', 'FM': 'ミクロネシア', 'FO': 'フェロー',
  'FR': 'フランス', 'GA': 'ガボン', 'GB': 'イギリス', 'GD': 'グレナダ',
  'GE': 'ジョージア', 'GF': '仏領ギアナ', 'GH': 'ガーナ', 'GI': 'ジブラルタル',
  'GL': 'グリーンランド', 'GM': 'ガンビア', 'GN': 'ギニア', 'GQ': '赤道ギニア',
  'GR': 'ギリシャ', 'GT': 'グアテマラ', 'GU': 'グアム', 'GW': 'ギニアビサウ',
  'GY': 'ガイアナ', 'HK': '香港', 'HN': 'ホンジュラス', 'HR': 'クロアチア',
  'HT': 'ハイチ', 'HU': 'ハンガリー', 'ID': 'インドネシア', 'IE': 'アイルランド',
  'IL': 'イスラエル', 'IN': 'インド', 'IQ': 'イラク', 'IR': 'イラン',
  'IS': 'アイスランド', 'IT': 'イタリア', 'JM': 'ジャマイカ', 'JO': 'ヨルダン',
  'JP': '日本', 'KE': 'ケニア', 'KG': 'キルギス', 'KH': 'カンボジア',
  'KI': 'キリバス', 'KM': 'コモロ', 'KN': 'セントクリストファー', 'KP': '北朝鮮',
  'KR': '韓国', 'KW': 'クウェート', 'KY': 'ケイマン', 'KZ': 'カザフスタン',
  'LA': 'ラオス', 'LB': 'レバノン', 'LC': 'セントルシア', 'LI': 'リヒテンシュタイン',
  'LK': 'スリランカ', 'LR': 'リベリア', 'LS': 'レソト', 'LT': 'リトアニア',
  'LU': 'ルクセンブルク', 'LV': 'ラトビア', 'LY': 'リビア', 'MA': 'モロッコ',
  'MC': 'モナコ', 'MD': 'モルドバ', 'ME': 'モンテネグロ', 'MG': 'マダガスカル',
  'MH': 'マーシャル', 'MK': '北マケドニア', 'ML': 'マリ', 'MM': 'ミャンマー',
  'MN': 'モンゴル', 'MO': 'マカオ', 'MP': '北マリアナ', 'MR': 'モーリタニア',
  'MS': 'モントセラト', 'MT': 'マルタ', 'MU': 'モーリシャス', 'MV': 'モルディブ',
  'MW': 'マラウイ', 'MX': 'メキシコ', 'MY': 'マレーシア', 'MZ': 'モザンビーク',
  'NA': 'ナミビア', 'NC': 'ニューカレドニア', 'NE': 'ニジェール', 'NG': 'ナイジェリア',
  'NI': 'ニカラグア', 'NL': 'オランダ', 'NO': 'ノルウェー', 'NP': 'ネパール',
  'NR': 'ナウル', 'NU': 'ニウエ', 'NZ': 'ニュージーランド', 'OM': 'オマーン',
  'PA': 'パナマ', 'PE': 'ペルー', 'PF': '仏領ポリネシア', 'PG': 'パプアニューギニア',
  'PH': 'フィリピン', 'PK': 'パキスタン', 'PL': 'ポーランド', 'PM': 'サンピエール',
  'PN': 'ピトケアン', 'PR': 'プエルトリコ', 'PS': 'パレスチナ', 'PT': 'ポルトガル',
  'PW': 'パラオ', 'PY': 'パラグアイ', 'QA': 'カタール', 'RE': 'レユニオン',
  'RO': 'ルーマニア', 'RS': 'セルビア', 'RU': 'ロシア', 'RW': 'ルワンダ',
  'SA': 'サウジアラビア', 'SB': 'ソロモン', 'SC': 'セーシェル', 'SD': 'スーダン',
  'SE': 'スウェーデン', 'SG': 'シンガポール', 'SH': 'セントヘレナ', 'SI': 'スロベニア',
  'SK': 'スロバキア', 'SL': 'シエラレオネ', 'SM': 'サンマリノ', 'SN': 'セネガル',
  'SO': 'ソマリア', 'SR': 'スリナム', 'SS': '南スーダン', 'ST': 'サントメ',
  'SV': 'エルサルバドル', 'SY': 'シリア', 'SZ': 'エスワティニ', 'TC': 'タークス',
  'TD': 'チャド', 'TG': 'トーゴ', 'TH': 'タイ', 'TJ': 'タジキスタン',
  'TK': 'トケラウ', 'TL': '東ティモール', 'TM': 'トルクメニスタン', 'TN': 'チュニジア',
  'TO': 'トンガ', 'TR': 'トルコ', 'TT': 'トリニダード', 'TV': 'ツバル',
  'TW': '台湾', 'TZ': 'タンザニア', 'UA': 'ウクライナ', 'UG': 'ウガンダ',
  'US': 'アメリカ', 'UY': 'ウルグアイ', 'UZ': 'ウズベキスタン', 'VA': 'バチカン',
  'VC': 'セントビンセント', 'VE': 'ベネズエラ', 'VG': '英領バージン', 'VI': '米領バージン',
  'VN': 'ベトナム', 'VU': 'バヌアツ', 'WF': 'ウォリス', 'WS': 'サモア',
  'YE': 'イエメン', 'YT': 'マヨット', 'ZA': '南アフリカ', 'ZM': 'ザンビア',
  'ZW': 'ジンバブエ', 'AFRICA': 'アフリカ全体'
}

export default function RateTablesDetailPage() {
  const [loading, setLoading] = useState(false)
  const [serviceType, setServiceType] = useState<'Express' | 'Standard' | 'Economy'>('Express')
  const [countryFilter, setCountryFilter] = useState('')
  const [weightFilter, setWeightFilter] = useState('')
  const [allData, setAllData] = useState<RateTableEntry[]>([])
  const [stats, setStats] = useState<{
    totalEntries: number
    totalCountries: number
    totalWeightRanges: number
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [serviceType])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ebay/rate-tables/detail?service=${serviceType}`)
      const result = await response.json()

      if (result.success) {
        console.log('📊 取得データ:', {
          allData: result.allData.length,
          stats: result.stats
        })
        setAllData(result.allData)
        setStats(result.stats)
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 重量帯を取得（縦軸）
  const getWeightRanges = () => {
    const ranges = new Map<string, { from: number; to: number }>()
    allData.forEach(entry => {
      const key = `${entry.weight_from_kg}-${entry.weight_to_kg}`
      if (!ranges.has(key)) {
        ranges.set(key, { from: entry.weight_from_kg, to: entry.weight_to_kg })
      }
    })
    
    let result = Array.from(ranges.values()).sort((a, b) => a.from - b.from)
    
    if (weightFilter) {
      const query = weightFilter.toLowerCase()
      result = result.filter(r => 
        `${r.from}`.includes(query) || 
        `${r.to}`.includes(query) ||
        `${r.from}kg-${r.to}kg`.toLowerCase().includes(query)
      )
    }
    
    return result
  }

  // 国リストを取得（横軸）- 主要国を最初に
  const getCountries = () => {
    const countries = new Map<string, string>()
    allData.forEach(entry => {
      countries.set(entry.country_code, entry.country_name)
    })
    
    let countryList = Array.from(countries.entries()).map(([code, name]) => ({ 
      code, 
      name: COUNTRY_NAMES_JA[code] || name,
      isMajor: code in MAJOR_COUNTRIES,
      color: MAJOR_COUNTRIES[code as keyof typeof MAJOR_COUNTRIES]?.color || ''
    }))
    
    // フィルター適用
    if (countryFilter) {
      const query = countryFilter.toLowerCase()
      countryList = countryList.filter(c =>
        c.code.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
      )
    }
    
    // 主要国を最初に、その後アルファベット順
    return countryList.sort((a, b) => {
      if (a.isMajor && !b.isMajor) return -1
      if (!a.isMajor && b.isMajor) return 1
      return a.code.localeCompare(b.code)
    })
  }

  const getPrice = (weightFrom: number, weightTo: number, countryCode: string) => {
    const entry = allData.find(
      e => e.weight_from_kg === weightFrom && 
           e.weight_to_kg === weightTo && 
           e.country_code === countryCode
    )
    return entry
  }

  const weightRanges = getWeightRanges()
  const countries = getCountries()
  const isIncomplete = stats && (stats.totalEntries < 5000 || stats.totalCountries < 100 || stats.totalWeightRanges !== 60)

  const exportToCSV = () => {
    if (allData.length === 0) return

    const headers = ['重量FROM', '重量TO', ...countries.map(c => `${c.code}(${c.name})`)]
    const rows = weightRanges.map(range => {
      const row = [range.from, range.to]
      countries.forEach(country => {
        const entry = getPrice(range.from, range.to, country.code)
        row.push(entry ? entry.recommended_price_usd.toFixed(2) : '-')
      })
      return row
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rate_table_${serviceType}_full_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">Rate Table 完全マトリックス</h1>
        <p className="text-muted-foreground mt-2">
          <Database className="inline h-4 w-4 mr-1" />
          縦軸: 全60重量帯 × 横軸: 全176カ国（主要国は色付き）
        </p>
      </div>

      {/* 統計情報 */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">テーブル名</div>
              <div className="text-xl font-bold">RT_{serviceType}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">総データ数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{weightRanges.length} / 60</div>
              <div className="text-sm text-muted-foreground">表示中の重量帯</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{countries.length} / 176</div>
              <div className="text-sm text-muted-foreground">表示中の国数</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* データ不完全の警告 */}
      {isIncomplete && (
        <Card className="bg-red-50 border-red-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-red-900 text-lg mb-2">⚠️ データが不完全です</div>
                <div className="text-sm text-red-800">
                  現在: {stats?.totalEntries}件、{stats?.totalCountries}カ国、{stats?.totalWeightRanges}重量帯 / 期待: 11,580件、176カ国、60重量帯
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">サービスタイプ</label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Express">Express（速達）</SelectItem>
                  <SelectItem value="Standard">Standard（標準）</SelectItem>
                  <SelectItem value="Economy">Economy（エコノミー）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">重量帯</label>
              <Input placeholder="例: 5, 10-15" value={weightFilter} onChange={(e) => setWeightFilter(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">国</label>
              <Input placeholder="国コード/日本語名" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium opacity-0">Action</label>
              <Button onClick={exportToCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />CSV出力
              </Button>
            </div>
          </div>
          {(countryFilter || weightFilter) && (
            <div className="mt-3 flex gap-2">
              <Button onClick={() => { setCountryFilter(''); setWeightFilter(''); }} variant="outline" size="sm">
                フィルタークリア
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* マトリックステーブル */}
      {loading ? (
        <Card><CardContent className="py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>完全マトリックス: {weightRanges.length}重量帯 × {countries.length}カ国</span>
              <div className="flex gap-2">
                <Badge variant={weightRanges.length === 60 ? 'default' : 'secondary'}>
                  {weightRanges.length === 60 ? '✓ 全60重量帯' : `${weightRanges.length}重量帯`}
                </Badge>
                <Badge variant={countries.length === 176 ? 'default' : 'secondary'}>
                  {countries.length === 176 ? '✓ 全176カ国' : `${countries.length}カ国`}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">データがありません</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="font-semibold mb-2">📊 凡例</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                      <span>USA / カナダ</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>UK / EU主要国</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                      <span>オセアニア</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                      <span>ドイツ</span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-auto border rounded-lg" style={{ maxHeight: '70vh' }}>
                  <table className="text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                      <tr>
                        <th className="p-2 border-r-2 border-gray-300 bg-gray-200 sticky left-0 z-20 min-w-[100px]">
                          <div className="font-bold">重量帯</div>
                        </th>
                        {countries.map(country => (
                          <th key={country.code} className={`p-2 border-r border-gray-200 min-w-[90px] ${country.color || 'bg-gray-100'}`}>
                            <div className="font-bold">{country.code}</div>
                            <div className="text-xs font-normal text-gray-700">{country.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weightRanges.map((range, idx) => (
                        <tr key={`${range.from}-${range.to}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border-r-2 border-gray-300 font-semibold sticky left-0 z-10 bg-inherit">
                            <div className="text-xs text-gray-600">#{idx + 1}</div>
                            <div className="text-sm font-semibold">{range.from}-{range.to}</div>
                          </td>
                          {countries.map(country => {
                            const entry = getPrice(range.from, range.to, country.code)
                            return (
                              <td key={country.code} className={`p-1.5 border-r border-gray-200 text-center ${country.color || ''}`}>
                                {entry ? (
                                  <div>
                                    <div className="font-semibold text-blue-600 text-xs">
                                      ${entry.recommended_price_usd.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      +${entry.additional_item_usd.toFixed(2)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
