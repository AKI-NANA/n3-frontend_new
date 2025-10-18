"use client"

import { useMemo } from 'react'
import { Search, Award, TrendingUp, Target, DollarSign, Wallet, AlertCircle, BarChart3 } from 'lucide-react'

interface ScoredProduct {
  totalScore: number
  profitCalculation?: {
    isBlackInk: boolean
    profitRate: number
    netProfit: number
  }
  riskLevel: 'low' | 'medium' | 'high'
  category?: string
}

interface ResearchSummaryProps {
  results: ScoredProduct[]
}

export default function ResearchSummary({ results }: ResearchSummaryProps) {
  const stats = useMemo(() => {
    const totalCount = results.length
    const highScoreCount = results.filter(r => r.totalScore >= 80).length
    const profitableCount = results.filter(r => r.profitCalculation?.isBlackInk).length
    const avgScore = totalCount > 0 ? results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalCount : 0
    
    const profitableItems = results.filter(r => r.profitCalculation?.isBlackInk)
    const avgProfitRate = profitableItems.length > 0
      ? profitableItems.reduce((sum, r) => sum + (r.profitCalculation?.profitRate || 0), 0) / profitableItems.length
      : 0
    
    const totalProfit = profitableItems.reduce((sum, r) => sum + (r.profitCalculation?.netProfit || 0), 0)
    const highRiskCount = results.filter(r => r.riskLevel === 'high').length
    
    return {
      totalCount,
      highScoreCount,
      profitableCount,
      avgScore: avgScore.toFixed(1),
      avgProfitRate: avgProfitRate.toFixed(1),
      totalProfit: totalProfit.toFixed(0),
      highRiskCount
    }
  }, [results])

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        リサーチ結果サマリー
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard 
          label="総件数" 
          value={stats.totalCount} 
          icon={<Search className="w-5 h-5" />}
          color="bg-blue-500"
        />
        <StatCard 
          label="高スコア" 
          value={stats.highScoreCount} 
          icon={<Award className="w-5 h-5" />}
          color="bg-yellow-500"
          subtitle="80点以上"
        />
        <StatCard 
          label="黒字商品" 
          value={stats.profitableCount} 
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-green-500"
        />
        <StatCard 
          label="平均スコア" 
          value={stats.avgScore} 
          icon={<Target className="w-5 h-5" />}
          color="bg-purple-500"
        />
        <StatCard 
          label="平均利益率" 
          value={`${stats.avgProfitRate}%`} 
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-emerald-500"
        />
        <StatCard 
          label="総利益" 
          value={`$${stats.totalProfit}`} 
          icon={<Wallet className="w-5 h-5" />}
          color="bg-green-600"
        />
        <StatCard 
          label="リスク高" 
          value={stats.highRiskCount} 
          icon={<AlertCircle className="w-5 h-5" />}
          color="bg-red-500"
        />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  subtitle?: string
}

function StatCard({ label, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
      <div className={`${color} w-10 h-10 rounded-full flex items-center justify-center text-white mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  )
}
