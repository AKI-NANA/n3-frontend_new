'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, Loader2, Download, ChevronLeft, ChevronRight,
  TrendingDown, Package, Zap, Search
} from 'lucide-react'

interface MatrixCell {
  carrier_name: string
  service_code: string
  price_usd: number
  base_rate_jpy: number
  country_code: string
  weight_kg: number
}

interface MatrixRow {
  country_code: string
  country_name_en: string
  country_name_ja: string
  weights: {
    [key: string]: MatrixCell | null
  }
}

interface MatrixData {
  success: boolean
  service_type: string
  weights: number[]
  countries_count: number
  matrix: MatrixRow[]
}

const CARRIER_COLORS: { [key: string]: string } = {
  'UPS': 'bg-amber-100 border-amber-300 text-amber-900',
  'FedEx (C-PASS)': 'bg-purple-100 border-purple-300 text-purple-900',
  'FedEx (Eloji)': 'bg-purple-50 border-purple-200 text-purple-800',
  'DHL (C-PASS)': 'bg-red-100 border-red-300 text-red-900',
  'DHL (Eloji)': 'bg-red-50 border-red-200 text-red-800',
  'eBay SpeedPAK': 'bg-blue-100 border-blue-300 text-blue-900',
  '日本郵便': 'bg-green-100 border-green-300 text-green-900'
}

const ROWS_PER_PAGE = 50

export function ShippingMatrixViewPaginated() {
  const [activeServiceType, setActiveServiceType] = useState<'Economy' | 'Standard' | 'Express'>('Express')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MatrixData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const weights = [
    0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0,
    5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0,
    10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0,
    15.5, 16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0
  ]

  const loadMatrix = async (serviceType: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        service_type: serviceType,
        weights: weights.join(',')
      })

      const response = await fetch(`/api/shipping/matrix?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'データの取得に失敗しました')
      }

      setData(result)
      setCurrentPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      console.error('Matrix load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatrix(activeServiceType)
  }, [activeServiceType])

  const filteredMatrix = useMemo(() => {
    if (!data) return []
    if (!searchTerm) return data.matrix

    const term = searchTerm.toLowerCase()
    return data.matrix.filter(row =>
      row.country_code.toLowerCase().includes(term) ||
      row.country_name_en.toLowerCase().includes(term) ||
      row.country_name_ja.includes(term)
    )
  }, [data, searchTerm])

  const paginatedMatrix = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE
    return filteredMatrix.slice(startIndex, startIndex + ROWS_PER_PAGE)
  }, [filteredMatrix, currentPage])

  const totalPages = Math.ceil(filteredMatrix.length / ROWS_PER_PAGE)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const getCellColor = (carrierName: string) => {
    return CARRIER_COLORS[carrierName] || 'bg-gray-100 border-gray-300 text-gray-900'
  }

  const exportToCSV = () => {
    if (!data) return

    let csv = '国コード,国名（英）,国名（日）,'
    csv += weights.map(w => `${w}kg_キャリア,${w}kg_料金(USD)`).join(',')
    csv += '\n'

    filteredMatrix.forEach(row => {
      csv += `${row.country_code},${row.country_name_en},${row.country_name_ja},`
      
      weights.forEach(weight => {
        const cell = row.weights[weight.toString()]
        if (cell) {
          csv += `${cell.carrier_name},${cell.price_usd},`
        } else {
          csv += ',,'
        }
      })
      
      csv += '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `shipping_matrix_${activeServiceType}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Table className="h-6 w-6" />
              配送料金マトリックス（ページネーション版）
            </span>
            <Button
              onClick={exportToCSV}
              disabled={!data || loading}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV出力
            </Button>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            全231カ国 × 40重量帯（0.5kg刻み）の最安キャリアと料金 | ページネーション対応
          </p>
        </CardHeader>

        <CardContent>
          <Tabs value={activeServiceType} onValueChange={(v) => setActiveServiceType(v as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="Economy" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Economy
              </TabsTrigger>
              <TabsTrigger value="Standard" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Standard
              </TabsTrigger>
              <TabsTrigger value="Express" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Express
              </TabsTrigger>
            </TabsList>

            {['Economy', 'Standard', 'Express'].map(serviceType => (
              <TabsContent key={serviceType} value={serviceType} className="space-y-4">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-lg">データ読み込み中...</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-800">
                    エラー: {error}
                  </div>
                )}

                {data && !loading && (
                  <>
                    {/* 検索バー */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="国コードまたは国名で検索..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                          className="pl-10"
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        {filteredMatrix.length}カ国 / {data.countries_count}カ国
                      </div>
                    </div>

                    {/* 統計情報 */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">表示中</div>
                          <div className="text-2xl font-bold">{paginatedMatrix.length}カ国</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">総国数</div>
                          <div className="text-2xl font-bold">{filteredMatrix.length}カ国</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">重量帯</div>
                          <div className="text-2xl font-bold">{weights.length}段階</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">ページ</div>
                          <div className="text-2xl font-bold">{currentPage} / {totalPages}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* ページネーション（上部） */}
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        前へ
                      </Button>
                      <div className="text-sm text-gray-600">
                        {(currentPage - 1) * ROWS_PER_PAGE + 1} - {Math.min(currentPage * ROWS_PER_PAGE, filteredMatrix.length)} 
                        {' '}/ {filteredMatrix.length}カ国
                      </div>
                      <Button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        次へ
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* キャリア凡例 */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="text-sm font-semibold mb-2">キャリア凡例</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(CARRIER_COLORS).map(([carrier, colorClass]) => (
                          <Badge 
                            key={carrier}
                            className={`${colorClass} border-2`}
                          >
                            {carrier}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* マトリックステーブル */}
                    <div className="overflow-x-auto border rounded-lg">
                      <div className="text-sm text-gray-600 mb-2 px-4 py-2 bg-yellow-50 border-b">
                        ⚠️ 横スクロールで{weights.length}個の重量帯を表示 | Shift+マウスホイールで横スクロール可能
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 py-3 text-left font-semibold border-r sticky left-0 bg-gray-100 dark:bg-gray-800 z-20 min-w-[80px]">
                              国コード
                            </th>
                            <th className="px-2 py-3 text-left font-semibold border-r sticky left-[80px] bg-gray-100 dark:bg-gray-800 z-20 min-w-[150px]">
                              国名
                            </th>
                            {weights.map(weight => (
                              <th 
                                key={weight}
                                className="px-2 py-3 text-center font-semibold border-r min-w-[120px]"
                              >
                                {weight}kg
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMatrix.map((row, idx) => (
                            <tr 
                              key={row.country_code}
                              className={idx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}
                            >
                              <td className="px-2 py-2 font-mono text-xs border-r sticky left-0 bg-inherit z-10">
                                {row.country_code}
                              </td>
                              <td className="px-2 py-2 border-r sticky left-[80px] bg-inherit z-10">
                                <div className="font-semibold text-xs">{row.country_name_en}</div>
                                <div className="text-xs text-gray-500">{row.country_name_ja}</div>
                              </td>
                              {weights.map(weight => {
                                const cell = row.weights[weight.toString()]
                                
                                if (!cell) {
                                  return (
                                    <td 
                                      key={weight}
                                      className="px-1 py-2 text-center border-r bg-gray-200 dark:bg-gray-800"
                                    >
                                      <span className="text-xs text-gray-400">N/A</span>
                                    </td>
                                  )
                                }

                                return (
                                  <td 
                                    key={weight}
                                    className={`px-1 py-2 border-r ${getCellColor(cell.carrier_name)}`}
                                  >
                                    <div className="text-center">
                                      <div className="font-bold text-xs">
                                        {formatPrice(cell.price_usd)}
                                      </div>
                                      <div className="text-xs font-semibold mt-0.5 truncate" title={cell.carrier_name}>
                                        {cell.carrier_name.replace(' (C-PASS)', '').replace(' (Eloji)', '')}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        ¥{cell.base_rate_jpy.toLocaleString()}
                                      </div>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ページネーション（下部） */}
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        前のページ
                      </Button>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                      >
                        次のページ
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                      全{filteredMatrix.length}カ国を{totalPages}ページで表示中（1ページ{ROWS_PER_PAGE}カ国）
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
