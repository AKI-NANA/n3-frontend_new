'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Code,
  Database,
  Key
} from 'lucide-react'

export default function GovernanceTab() {
  const [violations, setViolations] = useState<any[]>([])
  const [checkingViolations, setCheckingViolations] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditResult, setAuditResult] = useState<any>(null)

  // ページロード時にルール違反をチェック
  useEffect(() => {
    checkViolations()
  }, [])

  const checkViolations = async () => {
    setCheckingViolations(true)
    try {
      const response = await fetch('/api/governance/check-violations')
      const data = await response.json()
      if (data.success) {
        setViolations(data.violations)
      }
    } catch (error) {
      console.error('Violation check failed:', error)
    } finally {
      setCheckingViolations(false)
    }
  }

  const handleAudit = async () => {
    setAuditLoading(true)
    setAuditResult(null)

    try {
      const response = await fetch('/api/governance/audit-code', { method: 'POST' })
      const data = await response.json()

      setAuditResult(data)

      // 監査後に違反を再チェック
      await checkViolations()
    } catch (error) {
      console.error('Audit failed:', error)
      setAuditResult({
        success: false,
        message: 'コード監査に失敗しました'
      })
    } finally {
      setAuditLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ルール違反警告ダッシュボード */}
      {violations.length > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            <strong className="text-lg">⚠️ {violations.length}件のルール違反を検出:</strong>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {violations.map((v, idx) => (
                <div key={idx} className="bg-red-50 dark:bg-red-900/20 p-3 rounded border">
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive">ルール{v.rule}</Badge>
                    <div className="flex-1">
                      <div className="font-mono text-sm text-red-700 dark:text-red-300">
                        {v.file}:{v.line}:{v.column}
                      </div>
                      <div className="text-sm mt-1">{v.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {violations.length === 0 && !checkingViolations && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription>
            ✅ <strong>コードは健全です！</strong> ルール違反は検出されませんでした。
          </AlertDescription>
        </Alert>
      )}

      {/* 3要素連動同期パネル */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            🛡️ ガバナンス同期パネル
          </CardTitle>
          <CardDescription>
            コード・環境変数・データベースの3要素を連動チェック＆デプロイ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* ボタン1: コード監査＆デプロイ */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <div className="flex items-center gap-3 mb-3">
              <Code className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-lg">1️⃣ コード監査＆デプロイ</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ESLint、Prettier、カスタムルール（A, B, C）をチェックし、問題なければデプロイを許可します。
            </p>

            <Button
              onClick={handleAudit}
              disabled={auditLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {auditLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  監査中...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  コード監査を実行
                </>
              )}
            </Button>

            {auditResult && (
              <Alert
                variant={auditResult.success ? 'default' : 'destructive'}
                className="mt-4"
              >
                {auditResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  {auditResult.message}
                  {auditResult.logs && (
                    <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
                      {auditResult.logs.map((log: string, idx: number) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* ボタン2: 環境変数シンク */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10">
            <div className="flex items-center gap-3 mb-3">
              <Key className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-lg">2️⃣ 環境変数シンク</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ローカルの .env とVPSの環境変数の差分を確認し、安全に同期します。
            </p>

            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm">
                💡 環境変数の同期は既存の機能を使用してください。<br/>
                「デプロイ」タブで環境変数の確認と同期が可能です。
              </AlertDescription>
            </Alert>
          </div>

          {/* ボタン3: スキーママイグレーション */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-lg">3️⃣ スキーママイグレーション</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              未適用のDBマイグレーションファイルを確認し、コード監査成功後に適用します。
            </p>

            <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
              <Database className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-sm">
                💡 マイグレーション管理は「データベース」タブで利用可能です。
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* ルール説明カード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📖 開発ルール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Badge>A</Badge>
            <div>
              <strong>DB操作の抽象化:</strong> Supabaseへの直接SQL記述禁止。
              lib/supabase/*.ts の抽象化層を経由すること。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Badge>B</Badge>
            <div>
              <strong>マスタテーブル経由:</strong> データ書き込みは必ずマスタテーブル
              （例: products_master）を経由し、APIエンドポイントのみに限定。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Badge>C</Badge>
            <div>
              <strong>環境変数:</strong> 機密情報（APIキー等）は必ず環境変数（.env）に格納し、
              コードに直接ハードコーディング禁止。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
