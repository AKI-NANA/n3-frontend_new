'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface SurchargePattern {
  no: number
  surcharge_usd: string
  pattern_count: number
  avg_likelihood: number
  categories: string
  countries: string
}

export default function DDPSurchargeMatrixPage() {
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState<SurchargePattern[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ebay/ddp-surcharge-matrix')
      const data = await response.json()
      if (data.success) {
        setPatterns(data.patterns)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatterns = patterns.filter(p => 
    p.surcharge_usd.includes(filter) ||
    p.categories.toLowerCase().includes(filter.toLowerCase()) ||
    p.countries.toLowerCase().includes(filter.toLowerCase())
  )

  const highLikelihood = filteredPatterns.filter(p => p.avg_likelihood >= 70)
  const totalPolicies = filteredPatterns.length * 60

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">DDP送料上乗せ額マトリックス</h1>
        <p className="text-muted-foreground mt-2">
          HTS × 原産国 × 価格帯から算出される送料上乗せ額の一覧
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{patterns.length}</div>
            <div className="text-sm text-muted-foreground">ユニークな上乗せ額</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{totalPolicies.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">生成配送ポリシー数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{highLikelihood.length}</div>
            <div className="text-sm text-muted-foreground">高可能性パターン (≥70%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {patterns[patterns.length - 1]?.surcharge_usd || '$0'}
            </div>
            <div className="text-sm text-muted-foreground">最大上乗せ額</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="金額、カテゴリ、原産国で検索..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>送料上乗せ額パターン ({filteredPatterns.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">上乗せ額</th>
                    <th className="p-2">可能性</th>
                    <th className="p-2">該当数</th>
                    <th className="p-2">カテゴリ</th>
                    <th className="p-2">原産国</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatterns.map((p, idx) => (
                    <tr key={p.no} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-2">#{p.no}</td>
                      <td className="p-2 font-bold text-blue-600">{p.surcharge_usd}</td>
                      <td className="p-2">
                        <Badge variant={p.avg_likelihood >= 70 ? 'default' : 'secondary'}>
                          {p.avg_likelihood}%
                        </Badge>
                      </td>
                      <td className="p-2">{p.pattern_count}</td>
                      <td className="p-2 text-xs">{p.categories}</td>
                      <td className="p-2 text-xs">{p.countries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
