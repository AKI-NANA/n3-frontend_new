"use client"

import { AlertCircle, CheckCircle, AlertTriangle, Activity } from 'lucide-react'

interface ApiStatusProps {
  apiStatus?: {
    callCount: number
    dailyLimit: number
    remaining: number
    percentage: number
    canCall: boolean
  }
}

export default function ApiStatusBanner({ apiStatus }: ApiStatusProps) {
  if (!apiStatus) return null

  const { callCount, dailyLimit, remaining, percentage, canCall } = apiStatus

  // 警告レベルを判定
  let level: 'safe' | 'warning' | 'danger' | 'critical' = 'safe'
  let bgColor = 'bg-green-50'
  let borderColor = 'border-green-300'
  let textColor = 'text-green-800'
  let icon = <CheckCircle className="w-5 h-5" />

  if (percentage >= 95) {
    level = 'critical'
    bgColor = 'bg-red-50'
    borderColor = 'border-red-400'
    textColor = 'text-red-900'
    icon = <AlertCircle className="w-5 h-5" />
  } else if (percentage >= 80) {
    level = 'danger'
    bgColor = 'bg-orange-50'
    borderColor = 'border-orange-300'
    textColor = 'text-orange-900'
    icon = <AlertTriangle className="w-5 h-5" />
  } else if (percentage >= 50) {
    level = 'warning'
    bgColor = 'bg-yellow-50'
    borderColor = 'border-yellow-300'
    textColor = 'text-yellow-900'
    icon = <AlertTriangle className="w-5 h-5" />
  }

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <div className={textColor}>{icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-bold ${textColor} flex items-center gap-2`}>
              <Activity className="w-4 h-4" />
              eBay API 使用状況
            </h3>
            <span className={`text-sm font-semibold ${textColor}`}>
              {callCount} / {dailyLimit} 回
            </span>
          </div>
          
          {/* プログレスバー */}
          <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-slate-200 mb-2">
            <div
              className={`h-full transition-all duration-500 ${
                level === 'critical' ? 'bg-red-600' :
                level === 'danger' ? 'bg-orange-500' :
                level === 'warning' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={textColor}>
              残り <strong>{remaining}</strong> 回の検索が可能
            </span>
            <span className={`text-xs ${textColor}`}>
              使用率: {percentage.toFixed(1)}%
            </span>
          </div>

          {/* 警告メッセージ */}
          {level === 'critical' && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">
                ⚠️ API呼び出し上限に近づいています！
              </p>
              <p className="text-xs text-red-800 mt-1">
                新しいキーワードの検索は、明日（日本時間0:00）以降に行ってください。
                既に検索したキーワードは、キャッシュから即座に取得できます。
              </p>
            </div>
          )}

          {level === 'danger' && (
            <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
              <p className="text-sm text-orange-900 font-semibold">
                ⚠️ API使用率が80%を超えています
              </p>
              <p className="text-xs text-orange-800 mt-1">
                新規キーワードの検索は慎重に行ってください。
                同じキーワードの再検索はAPI呼び出しを消費しません。
              </p>
            </div>
          )}

          {level === 'warning' && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-xs text-yellow-900">
                💡 ヒント: 同じキーワードは24時間キャッシュされ、API呼び出しを消費しません。
              </p>
            </div>
          )}

          {level === 'safe' && (
            <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
              <p className="text-xs text-green-900">
                ✅ 十分なAPI呼び出し回数が残っています。自由に検索できます。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
