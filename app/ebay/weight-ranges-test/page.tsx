'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function WeightRangesTest() {
  // 標準60重量帯の定義
  const STANDARD_WEIGHT_RANGES = [
    // 0-10kg: 0.25kg刻み (40段階)
    ...Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      from: i * 0.25,
      to: (i + 1) * 0.25
    })),
    // 10-20kg: 0.5kg刻み (20段階)
    ...Array.from({ length: 20 }, (_, i) => ({
      id: 40 + i + 1,
      from: 10 + i * 0.5,
      to: 10 + (i + 1) * 0.5
    }))
  ].slice(0, 60)

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">60種類の重量帯定義 - 確認画面</h1>
        <p className="text-muted-foreground mt-2">
          これから作成する60個のRate Tableの重量帯
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            重量帯一覧（全{STANDARD_WEIGHT_RANGES.length}種類）
            <Badge className="ml-3" variant="secondary">
              0-10kg: 0.25kg刻み × 40 + 10-20kg: 0.5kg刻み × 20
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            {STANDARD_WEIGHT_RANGES.map(range => (
              <div 
                key={range.id} 
                className="p-3 border rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">#{range.id}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {(range.to - range.from).toFixed(2)}kg幅
                  </span>
                </div>
                <div className="font-semibold text-lg">
                  {range.from.toFixed(2)}kg
                </div>
                <div className="text-sm text-muted-foreground">
                  ↓ {range.to.toFixed(2)}kg
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-bold text-lg">📋 作成されるRate Table（180個）</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-white rounded-lg border">
                <div className="font-bold text-blue-600 mb-2">Express用（60個）</div>
                <div className="space-y-1 text-xs">
                  <div>RT_Express_1 (0.00-0.25kg)</div>
                  <div>RT_Express_2 (0.25-0.50kg)</div>
                  <div>RT_Express_3 (0.50-0.75kg)</div>
                  <div className="text-muted-foreground">...</div>
                  <div>RT_Express_60 (19.50-20.00kg)</div>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-lg border">
                <div className="font-bold text-green-600 mb-2">Standard用（60個）</div>
                <div className="space-y-1 text-xs">
                  <div>RT_Standard_1 (0.00-0.25kg)</div>
                  <div>RT_Standard_2 (0.25-0.50kg)</div>
                  <div>RT_Standard_3 (0.50-0.75kg)</div>
                  <div className="text-muted-foreground">...</div>
                  <div>RT_Standard_60 (19.50-20.00kg)</div>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-lg border">
                <div className="font-bold text-orange-600 mb-2">Economy用（60個）</div>
                <div className="space-y-1 text-xs">
                  <div>RT_Economy_1 (0.00-0.25kg)</div>
                  <div>RT_Economy_2 (0.25-0.50kg)</div>
                  <div>RT_Economy_3 (0.50-0.75kg)</div>
                  <div className="text-muted-foreground">...</div>
                  <div>RT_Economy_60 (19.50-20.00kg)</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-bold text-lg">✅ 各Rate Tableの構造</h3>
            <div className="text-sm space-y-3 bg-white p-4 rounded-lg border">
              <div>
                <strong>例:</strong> <code className="bg-gray-100 px-2 py-1 rounded">RT_Express_1</code>
              </div>
              <div className="ml-4 space-y-2">
                <div>📦 <strong>重量帯:</strong> 0.00kg - 0.25kg（固定）</div>
                <div>🌍 <strong>対応国:</strong> 全ての国（約177カ国 + AFRICA）</div>
                <div>💰 <strong>内容:</strong> 各国の料金データ</div>
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">国コード</th>
                      <th className="text-right p-2">料金</th>
                      <th className="text-right p-2">追加</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">AD</td>
                      <td className="text-right p-2">$15.50</td>
                      <td className="text-right p-2">$5.00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">AE</td>
                      <td className="text-right p-2">$18.30</td>
                      <td className="text-right p-2">$6.00</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-muted-foreground">...</td>
                      <td className="text-right p-2 text-muted-foreground">...</td>
                      <td className="text-right p-2 text-muted-foreground">...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
