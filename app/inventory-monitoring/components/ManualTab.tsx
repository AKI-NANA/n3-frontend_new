'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Zap, Settings, Clock, BarChart3, Package, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'

export function ManualTab() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            在庫・価格監視システム マニュアル
          </CardTitle>
          <CardDescription>
            システムの機能と使い方を説明します
          </CardDescription>
        </CardHeader>
      </Card>

      {/* システム概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 システム概要</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            在庫・価格監視システムは、Yahoo!オークションなどの仕入れ元サイトの価格変動や在庫状況を自動監視し、
            eBayの出品価格を最適化するシステムです。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <Package className="h-8 w-8 mb-2 text-blue-600" />
              <h3 className="font-semibold mb-1">在庫監視</h3>
              <p className="text-xs text-muted-foreground">
                仕入れ元の在庫切れを自動検知し、eBayの在庫を0に設定
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Zap className="h-8 w-8 mb-2 text-green-600" />
              <h3 className="font-semibold mb-1">価格最適化</h3>
              <p className="text-xs text-muted-foreground">
                仕入れ価格変動時に利益を確保しつつeBay価格を再計算
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Clock className="h-8 w-8 mb-2 text-orange-600" />
              <h3 className="font-semibold mb-1">自動実行</h3>
              <p className="text-xs text-muted-foreground">
                1日1回自動で全商品をチェック（設定でカスタマイズ可能）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブ別機能説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📑 各タブの機能</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 統合変動管理 */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('changes')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['changes'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <BarChart3 className="h-4 w-4" />
                統合変動管理
              </div>
            </button>
            {openSections['changes'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  在庫変動と価格変動を一覧表示し、eBayへの適用を管理します。
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">主な機能</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <Badge variant="secondary">在庫変動</Badge> - 仕入れ元の在庫数変化を検知</li>
                    <li>• <Badge variant="secondary">価格変動</Badge> - 仕入れ価格の変更を検知</li>
                    <li>• <Badge variant="destructive">ページエラー</Badge> - 商品ページ削除・エラーを検知</li>
                    <li>• <CheckCircle2 className="inline h-3 w-3" /> 変動を選択してeBayに一括適用</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  <p className="text-sm font-semibold mb-1 text-blue-900">💡 使い方</p>
                  <ol className="text-xs text-blue-800 space-y-1 ml-4">
                    <li>1. フィルターで「保留中」の変動を表示</li>
                    <li>2. 適用したい変動にチェック</li>
                    <li>3. 「eBayに適用」ボタンをクリック</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* 価格自動更新 */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('automation')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['automation'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Zap className="h-4 w-4" />
                価格自動更新（価格ルール管理）
              </div>
            </button>
            {openSections['automation'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  各種価格調整ルールを個別または一括で実行できます。
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">実装済みルール</h4>
                  <div className="space-y-2 text-sm">
                    <div className="border-l-4 border-green-400 pl-3 py-1">
                      <p className="font-semibold">最安値追従（最低利益確保）</p>
                      <p className="text-xs text-muted-foreground">競合の最安値を追従しつつ、設定した最低利益を確保</p>
                    </div>
                    <div className="border-l-4 border-blue-400 pl-3 py-1">
                      <p className="font-semibold">SOLD数値上げ</p>
                      <p className="text-xs text-muted-foreground">販売実績に基づいて段階的に価格を上昇</p>
                    </div>
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-semibold">ウォッチャー連動値上げ</p>
                      <p className="text-xs text-muted-foreground">ウォッチャー数が多い商品の価格を上昇</p>
                    </div>
                    <div className="border-l-4 border-orange-400 pl-3 py-1">
                      <p className="font-semibold">季節・時期調整</p>
                      <p className="text-xs text-muted-foreground">カテゴリと時期に応じた価格調整</p>
                    </div>
                    <div className="border-l-4 border-gray-400 pl-3 py-1">
                      <p className="font-semibold">競合信頼度プレミアム</p>
                      <p className="text-xs text-muted-foreground">高評価セラーの商品に信頼度プレミアムを加算</p>
                      <Badge variant="outline" className="ml-2">次回実装</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* デフォルト設定 */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('defaults')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['defaults'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Settings className="h-4 w-4" />
                デフォルト設定
              </div>
            </button>
            {openSections['defaults'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  マーケットプレイスごとの価格戦略とルールのON/OFFを設定します。
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="border rounded p-3">
                    <p className="font-semibold mb-1">💰 価格戦略</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• 最安値追従（おすすめ）</li>
                      <li>• 基準価格からの差分維持</li>
                      <li>• 最低利益確保のみ</li>
                    </ul>
                  </div>
                  <div className="border rounded p-3">
                    <p className="font-semibold mb-1">📦 在庫切れ時の対応</p>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• 在庫を0に設定</li>
                      <li>• 出品を一時停止</li>
                      <li>• 通知のみ</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 運用フロー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔄 運用フロー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">初期設定</h4>
                <p className="text-sm text-muted-foreground">
                  デフォルト設定タブで価格戦略とパラメータを設定
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">自動監視</h4>
                <p className="text-sm text-muted-foreground">
                  設定した頻度で自動的に在庫・価格をチェック
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">変動確認</h4>
                <p className="text-sm text-muted-foreground">
                  統合変動管理タブで検知された変動を確認
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">eBayに適用</h4>
                <p className="text-sm text-muted-foreground">
                  変動を選択してeBayの在庫・価格を更新
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VPS自動監視設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🚀 VPS上での自動監視設定</CardTitle>
          <CardDescription>
            VPSにデプロイした場合の自動実行設定方法
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="text-sm font-semibold mb-1 text-yellow-900">⚠️ 重要</p>
            <p className="text-xs text-yellow-800 mb-2">
              VPS上では「今すぐ監視実行」ボタンを手動で押す代わりに、
              以下のいずれかの方法で自動実行を設定する必要があります。
            </p>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
            <p className="text-sm font-semibold mb-1 text-red-900">❌ 複数の方法を同時に使わない！</p>
            <p className="text-xs text-red-800 mb-2">
              VPSとVercelを<strong>両方同時に使うと、スクレイピング頻度が2倍になります</strong>。
            </p>
            <div className="bg-red-100 p-2 rounded text-xs text-red-900">
              <p className="font-semibold mb-1">例：</p>
              <p>VPS: 0時、12時に実行</p>
              <p>Vercel: 6時、18時に実行</p>
              <p className="mt-1 font-bold">→ 結果：6時間ごとのアクセス = ロボット検知のリスク大！</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm font-semibold mb-2 text-blue-900">🤔 どれを使えばいい？</p>
            <div className="space-y-2 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[120px]">Vercelにデプロイする場合:</span>
                <span>→ <strong>方法1: Vercel Cron</strong>を使う（最も簡単）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[120px]">自分のVPSへデプロイ:</span>
                <span>→ <strong>方法2: Linux Cron</strong>を使う（シンプル）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[120px]">VPSかつ複雑な制御:</span>
                <span>→ <strong>方法3: Node.js Scheduler</strong>を使う</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold min-w-[120px]">テスト環境:</span>
                <span>→ <strong>方法4: GitHub Actions</strong>を使う</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-100 rounded">
              <p className="text-xs text-blue-900">
                <strong>💡 初心者の方へ:</strong> Vercelは無料で簡単です。VPSとは別のサービスで、
                自分でVPSを管理する必要がないので、まずVercelを試すことをおすすめします。
              </p>
            </div>
          </div>

          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('vps-vercel')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['vps-vercel'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                🌟 方法1: Vercel Cron（推奨）
              </div>
              <Badge variant="secondary">最簡単</Badge>
            </button>
            {openSections['vps-vercel'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vercelにデプロイする場合、Vercel Cronが最も簡単で信頼性が高いです。
                </p>

                <div className="bg-green-50 border border-green-200 p-3 rounded">
                  <p className="text-sm font-semibold mb-1 text-green-900">✅ Vercelとは？</p>
                  <p className="text-xs text-green-800 mb-2">
                    VercelはNext.jsアプリを簡単にデプロイできるプラットフォームです。
                    <strong>VPSとは別のサービス</strong>で、サーバー管理が不要です。
                  </p>
                  <ul className="text-xs text-green-800 space-y-1 ml-4">
                    <li>• 無料プランで十分使える</li>
                    <li>• GitHubと連携して自動デプロイ</li>
                    <li>• SSL証明書も自動設定</li>
                    <li>• Cron機能が組み込み済み</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">設定手順</h4>
                  <ol className="text-xs space-y-2 ml-4">
                    <li>
                      <strong>1. vercel.jsonを作成</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-xs">
{`{
  "crons": [
    {
      "path": "/api/cron/inventory-monitoring",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/cron/price-optimization",
      "schedule": "0 8,20 * * *"
    }
  ]
}

// schedule説明：
// "0 */12 * * *" = 12時間ごと（推奨）
// "0 8,20 * * *" = 每日8時と20時に実行`}
                      </pre>
                    </li>
                    <li>
                      <strong>2. Cron APIエンドポイント作成</strong>
                      <p className="text-muted-foreground mt-1">
                        <code className="bg-gray-100 px-1 rounded">/app/api/cron/inventory-monitoring/route.ts</code> を作成
                      </p>
                    </li>
                    <li>
                      <strong>3. 環境変数設定</strong>
                      <p className="text-muted-foreground mt-1">
                        <code className="bg-gray-100 px-1 rounded">CRON_SECRET</code> をVercelダッシュボードで設定
                      </p>
                    </li>
                    <li>
                      <strong>4. デプロイ</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
vercel --prod
                      </pre>
                    </li>
                  </ol>
                </div>

                <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                  <p className="text-xs text-green-800">
                    ✅ 設定完了後、自動で定期実行されます！2時間ごとに在庫監視が実行されます。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('vps-cron')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['vps-cron'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                💻 方法2: Linux Cron
              </div>
            </button>
            {openSections['vps-cron'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  VPS上でLinuxのCronを使用して定期実行する方法です。
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">設定手順</h4>
                  <ol className="text-xs space-y-2 ml-4">
                    <li>
                      <strong>1. スクリプト作成</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-xs">
{`#!/bin/bash
curl -X POST https://your-domain.com/api/inventory-monitoring/execute \
  -H "Content-Type: application/json"`}
                      </pre>
                    </li>
                    <li>
                      <strong>2. 実行権限付与</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
chmod +x /path/to/script.sh
                      </pre>
                    </li>
                    <li>
                      <strong>3. Crontab設定</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
crontab -e

# 12時間ごとに実行（推奨）
0 */12 * * * /path/to/script.sh

# または1日1回
0 9 * * * /path/to/script.sh
                      </pre>
                    </li>
                    <li>
                      <strong>4. 確認</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
crontab -l  # 設定確認
                      </pre>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('vps-nodejs')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['vps-nodejs'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                ⚡ 方法3: Node.js Scheduler
              </div>
            </button>
            {openSections['vps-nodejs'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  アプリ内にスケジューラーを組み込む方法です。
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">設定手順</h4>
                  <ol className="text-xs space-y-2 ml-4">
                    <li>
                      <strong>1. node-cronインストール</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
npm install node-cron
                      </pre>
                    </li>
                    <li>
                      <strong>2. スケジューラー作成</strong>
                      <p className="text-muted-foreground mt-1">
                        <code className="bg-gray-100 px-1 rounded">/lib/scheduler.ts</code> を作成し、
                        サーバー起動時に実行
                      </p>
                    </li>
                    <li>
                      <strong>3. PM2で常駐化</strong>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
pm2 start npm --name "n3-frontend" -- start
pm2 save
pm2 startup
                      </pre>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('vps-github')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 font-semibold">
                {openSections['vps-github'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                🐱 方法4: GitHub Actions
              </div>
            </button>
            {openSections['vps-github'] && (
              <div className="p-4 pt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  GitHub Actionsを使用して外部からAPIを呼び出す方法です。
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">設定手順</h4>
                  <ol className="text-xs space-y-2 ml-4">
                    <li>
                      <strong>1. Workflowファイル作成</strong>
                      <p className="text-muted-foreground mt-1">
                        <code className="bg-gray-100 px-1 rounded">.github/workflows/scheduled-monitoring.yml</code>
                      </p>
                    </li>
                    <li>
                      <strong>2. GitHub Secrets設定</strong>
                      <p className="text-muted-foreground mt-1">
                        リポジトリ設定でAPI_BASE_URLとAPI_SECRETを追加
                      </p>
                    </li>
                    <li>
                      <strong>3. Pushして自動実行</strong>
                      <p className="text-muted-foreground mt-1">
                        設定したスケジュールで自動実行されます
                      </p>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-sm font-semibold mb-2 text-blue-900">🎯 推奨設定</p>
            <div className="space-y-1 text-xs text-blue-800">
              <p>• <strong>Vercelにデプロイ</strong>: Vercel Cron（最も簡単）</p>
              <p>• <strong>VPS単体</strong>: Linux Cron（シンプルで確実）</p>
              <p>• <strong>VPS + 複雑な処理</strong>: Node.js Scheduler（柔軟性高）</p>
              <p>• <strong>開発/テスト</strong>: GitHub Actions（無料で手軽）</p>
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
            <p className="text-sm font-semibold mb-2 text-orange-900">⚠️ スクレイピング頻度の注意</p>
            <div className="space-y-1 text-xs text-orange-800">
              <p>• <strong>推奨頻度</strong>: 12時間ごとまたは1日1回</p>
              <p>• <strong>避けるべき</strong>: 1-2時間ごとの頻繁なアクセス</p>
              <p>• <strong>理由</strong>: Yahooオークション等はロボット検知でIPブロックされるリスクがあります</p>
              <p>• <strong>ベストプラクティス</strong>: デフォルト設定タブで「12時間ごと」を選択</p>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
            <p className="text-sm font-semibold mb-1 text-green-900">✅ 確認方法</p>
            <p className="text-xs text-green-800">
              設定後、「実行履歴タブ」で自動実行が記録されているか確認できます。
              また、データベースの<code className="bg-green-100 px-1 rounded">inventory_monitoring_logs</code>テーブルで実行記録を確認できます。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
