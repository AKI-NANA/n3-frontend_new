'use client'

import { AmazonProduct } from '@/types/amazon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts'

interface AmazonProfitChartProps {
  products: AmazonProduct[]
}

export function AmazonProfitChart({ products }: AmazonProfitChartProps) {
  // スコア分布データ
  const scoreDistribution = [
    { range: '0-20', count: products.filter(p => (p.profit_score || 0) >= 0 && (p.profit_score || 0) < 20).length },
    { range: '20-40', count: products.filter(p => (p.profit_score || 0) >= 20 && (p.profit_score || 0) < 40).length },
    { range: '40-60', count: products.filter(p => (p.profit_score || 0) >= 40 && (p.profit_score || 0) < 60).length },
    { range: '60-80', count: products.filter(p => (p.profit_score || 0) >= 60 && (p.profit_score || 0) < 80).length },
    { range: '80-100', count: products.filter(p => (p.profit_score || 0) >= 80 && (p.profit_score || 0) <= 100).length }
  ]

  // 価格と利益の散布図データ
  const profitScatterData = products
    .filter(p => p.current_price && p.profit_amount !== undefined)
    .map(p => ({
      price: p.current_price || 0,
      profit: p.profit_amount || 0,
      roi: p.roi_percentage || 0,
      name: p.title.substring(0, 30) + '...'
    }))

  // カテゴリ別平均利益
  const categoryData = products.reduce((acc, product) => {
    const category = product.product_group || 'その他'
    if (!acc[category]) {
      acc[category] = { category, totalProfit: 0, count: 0 }
    }
    acc[category].totalProfit += product.profit_amount || 0
    acc[category].count += 1
    return acc
  }, {} as Record<string, { category: string; totalProfit: number; count: number }>)

  const categoryChartData = Object.values(categoryData)
    .map(item => ({
      category: item.category,
      avgProfit: item.totalProfit / item.count
    }))
    .sort((a, b) => b.avgProfit - a.avgProfit)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>利益スコア分布</CardTitle>
          <CardDescription>
            商品の利益スコア範囲別の分布
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="商品数" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>価格と利益の関係</CardTitle>
          <CardDescription>
            商品価格と予想利益の散布図（円の大きさはROI）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="price" name="価格" unit="$" />
              <YAxis dataKey="profit" name="利益" unit="$" />
              <ZAxis dataKey="roi" range={[50, 500]} name="ROI" unit="%" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter
                name="商品"
                data={profitScatterData}
                fill="#10b981"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ別平均利益</CardTitle>
          <CardDescription>
            商品カテゴリごとの平均予想利益（上位10カテゴリ）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="$" />
              <YAxis dataKey="category" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgProfit" fill="#f59e0b" name="平均利益" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
