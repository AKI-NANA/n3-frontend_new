"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw, 
  Database, Globe, Package, ShoppingCart, TrendingUp,
  Zap, FileText, DollarSign, Target, Truck
} from "lucide-react"

interface HealthCheck {
  name: string
  description: string
  status: "success" | "error" | "warning" | "checking"
  message?: string
  lastChecked?: Date
  responseTime?: number
  icon: any
  endpoint?: string
}

export default function SystemHealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)

  const healthChecks: Omit<HealthCheck, "status" | "lastChecked">[] = [
    {
      name: "Supabase接続",
      description: "データベース接続テスト",
      icon: Database,
      endpoint: "/api/health/supabase"
    },
    {
      name: "在庫監視システム",
      description: "在庫・価格監視APIの動作確認",
      icon: Package,
      endpoint: "/api/inventory-monitoring/stats"
    },
    {
      name: "価格計算エンジン",
      description: "価格戦略・計算ロジックの確認",
      icon: DollarSign,
      endpoint: "/api/profit-calculator"
    },
    {
      name: "スコアリングシステム",
      description: "商品スコアリングの動作確認",
      icon: Target,
      endpoint: "/api/research/analyze-lowest-price"
    },
    {
      name: "eBay API",
      description: "eBay Trading/Browse API接続",
      icon: Globe,
      endpoint: "/api/ebay/check-token"
    },
    {
      name: "SellerMirror連携",
      description: "競合分析API接続",
      icon: TrendingUp,
      endpoint: "/api/sellermirror/analyze"
    },
    {
      name: "配送計算",
      description: "配送料・関税計算エンジン",
      icon: Truck,
      endpoint: "/api/shipping/calculate"
    },
    {
      name: "HTMLテンプレート",
      description: "テンプレートエンジンの動作",
      icon: FileText,
      endpoint: "/api/html-templates"
    },
    {
      name: "フィルターシステム",
      description: "商品フィルター機能",
      icon: Zap,
      endpoint: "/api/filters"
    },
    {
      name: "バッチ処理",
      description: "一括リスティング機能",
      icon: ShoppingCart,
      endpoint: "/api/listing/execute"
    },
  ]

  const runHealthChecks = async () => {
    setIsChecking(true)
    setLastCheckTime(new Date())

    const initialChecks: HealthCheck[] = healthChecks.map(check => ({
      ...check,
      status: "checking" as const,
      lastChecked: new Date()
    }))
    setChecks(initialChecks)

    const results = await Promise.all(
      healthChecks.map(async (check) => {
        const startTime = Date.now()
        try {
          const response = await fetch(check.endpoint!)
          const responseTime = Date.now() - startTime
          const data = await response.json()

          if (response.ok && (data.success !== false)) {
            return {
              ...check,
              status: "success" as const,
              message: "正常に動作しています",
              responseTime,
              lastChecked: new Date()
            }
          } else {
            return {
              ...check,
              status: "warning" as const,
              message: data.error || "警告: 一部機能に問題があります",
              responseTime,
              lastChecked: new Date()
            }
          }
        } catch (error: any) {
          const responseTime = Date.now() - startTime
          return {
            ...check,
            status: "error" as const,
            message: `エラー: ${error.message}`,
            responseTime,
            lastChecked: new Date()
          }
        }
      })
    )

    setChecks(results)
    setIsChecking(false)
  }

  useEffect(() => {
    runHealthChecks()
  }, [])

  const getStatusIcon = (status: HealthCheck["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case "checking":
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: HealthCheck["status"]) => {
    const variants: Record<HealthCheck["status"], { label: string; className: string }> = {
      success: { label: "正常", className: "bg-green-100 text-green-800 border-green-300" },
      error: { label: "エラー", className: "bg-red-100 text-red-800 border-red-300" },
      warning: { label: "警告", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      checking: { label: "確認中", className: "bg-blue-100 text-blue-800 border-blue-300" }
    }

    const variant = variants[status]
    return (
      <Badge className={`${variant.className} border`}>
        {variant.label}
      </Badge>
    )
  }

  const successCount = checks.filter(c => c.status === "success").length
  const errorCount = checks.filter(c => c.status === "error").length
  const warningCount = checks.filter(c => c.status === "warning").length
  const totalChecks = checks.length

  const overallStatus = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success"

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">システムヘルスチェック</h1>
            <p className="text-slate-600 mt-2">
              全機能の動作状況をリアルタイムで監視
            </p>
          </div>
          <Button
            onClick={runHealthChecks}
            disabled={isChecking}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            再チェック
          </Button>
        </div>

        {/* サマリーカード */}
        <Card className={`border-l-4 ${
          overallStatus === "success" ? "border-l-green-500" :
          overallStatus === "warning" ? "border-l-yellow-500" :
          "border-l-red-500"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <span>システムステータス</span>
            </CardTitle>
            <CardDescription>
              {lastCheckTime && `最終チェック: ${lastCheckTime.toLocaleString("ja-JP")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">{totalChecks}</div>
                <div className="text-sm text-slate-600">総チェック数</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-slate-600">正常</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
                <div className="text-sm text-slate-600">警告</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-slate-600">エラー</div>
              </div>
            </div>

            {/* プログレスバー */}
            <div className="mt-6">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(successCount / totalChecks) * 100}%` }}
                />
              </div>
              <div className="text-sm text-slate-600 mt-2 text-center">
                {totalChecks > 0 ? `${Math.round((successCount / totalChecks) * 100)}% 正常` : "チェック中..."}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 詳細チェックリスト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map((check, index) => {
            const Icon = check.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Icon className="w-5 h-5 text-slate-700" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{check.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {check.description}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusIcon(check.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {getStatusBadge(check.status)}
                      {check.message && (
                        <p className="text-xs text-slate-600 mt-2">{check.message}</p>
                      )}
                    </div>
                    {check.responseTime !== undefined && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500">応答時間</div>
                        <div className="text-sm font-mono font-semibold text-slate-700">
                          {check.responseTime}ms
                        </div>
                      </div>
                    )}
                  </div>
                  {check.endpoint && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <code className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                        {check.endpoint}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 推奨アクション */}
        {(errorCount > 0 || warningCount > 0) && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                推奨アクション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-yellow-900">
                {errorCount > 0 && (
                  <li>• エラーが検出されました。該当機能のログを確認してください。</li>
                )}
                {warningCount > 0 && (
                  <li>• 警告が出ています。データベース接続や環境変数を確認してください。</li>
                )}
                <li>• 問題が解決しない場合は、アプリを再起動してください。</li>
                <li>• 詳細なログは <code className="bg-yellow-100 px-1 rounded">pm2 logs</code> で確認できます。</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
