"use client"

import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts'

interface ScoredProduct {
  totalScore: number
  profitCalculation?: {
    isBlackInk: boolean
    profitRate: number
  }
  riskLevel: 'low' | 'medium' | 'high'
  category?: string
}

interface ResearchChartsProps {
  results: ScoredProduct[]
}

export default function ResearchCharts({ results }: ResearchChartsProps) {
  // スコア分布データ
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: '0-20', min: 0, max: 20, count: 0, color: '#ef4444' },
      { range: '21-40', min: 21, max: 40, count: 0, color: '#f97316' },
      { range: '41-60', min: 41, max: 60, count: 0, color: '#eab308' },
      { range: '61-80', min: 61, max: 80, count: 0, color: '#3b82f6' },
      { range: '81-100', min: 81, max: 100, count: 0, color: '#22c55e' }
    ]
    
    results.forEach(r => {
      const range = ranges.find(rg => (r.totalScore || 0) >= rg.min && (r.totalScore || 0) <= rg.max)
      if (range) range.count++
    })
    
    return ranges
  }, [results])

  // 利益率分布データ
  const profitDistribution = useMemo(() => {
    const profitable = results.filter(r => r.profitCalculation?.isBlackInk).length
    const unprofitable = results.filter(r => r.profitCalculation && !r.profitCalculation.isBlackInk).length
    const noData = results.length - profitable - unprofitable
    
    return [
      { name: '黒字', value: profitable, color: '#22c55e' },
      { name: '赤字', value: unprofitable, color: '#ef4444' },
      { name: '未計算', value: noData, color: '#94a3b8' }
    ]
  }, [results])

  // リスク分布データ
  const riskDistribution = useMemo(() => {
    return [
      { name: '低リスク', count: results.filter(r => r.riskLevel === 'low').length, color: '#22c55e' },
      { name: '中リスク', count: results.filter(r => r.riskLevel === 'medium').length, color: '#eab308' },
      { name: '高リスク', count: results.filter(r => r.riskLevel === 'high').length, color: '#ef4444' }
    ]
  }, [results])

  // カテゴリ別分布データ
  const categoryDistribution = useMemo(() => {
    const categories = new Map<string, number>()
    results.forEach(r => {
      const cat = r.category || 'その他'
      categories.set(cat, (categories.get(cat) || 0) + 1)
    })
    
    return Array.from(categories.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [results])

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        分析グラフ
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* スコア分布 */}
        <div>
          <h4 className="text-lg font-semibold mb-3 text-slate-700">スコア分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="商品数">
                {scoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 利益率分布（円グラフ） */}
        <div>
          <h4 className="text-lg font-semibold mb-3 text-slate-700">利益率分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={profitDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {profitDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* リスク分布 */}
        <div>
          <h4 className="text-lg font-semibold mb-3 text-slate-700">リスク分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="商品数">
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* カテゴリ別トップ5 */}
        <div>
          <h4 className="text-lg font-semibold mb-3 text-slate-700">カテゴリ別トップ5</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" name="商品数" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
