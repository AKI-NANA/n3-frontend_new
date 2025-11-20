'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Database,
  Key,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Copy,
  ExternalLink,
  GitBranch
} from 'lucide-react'
import Link from 'next/link'

export default function GovernanceRulesPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const claudePrompt = `【最重要ルール】

以下に続く開発指示を処理する前に、まずこの開発ガバナンス・ルールを完全に読み込み、全ての出力コードがこのルール（特に I.のルールA, B, C）を遵守することを厳格に保証すること。

I. 開発の最重要データガバナンス・ルール

ルールA (DB操作の抽象化):
Supabaseクライアントへの SQL直接記述は厳禁とする。すべてのDB操作は、抽象化されたデータ層（例: lib/supabase/products.ts）を経由すること。

ルールB (マスタテーブルの強制):
データの書き込みは必ずマスタテーブル（例: products_master）を経由し、特定のAPIエンドポイントのみに限定すること。

ルールC (環境変数の利用):
APIキーなどの機密情報は必ず環境変数（.env）に格納し、コードに直接ハードコーディングしないこと。`

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">開発ガバナンス・ルール＆指示書</h1>
        </div>
        <p className="text-muted-foreground">
          SDIM（Smart Development Integration Manager）仕様 - 今後の開発において必ず遵守すべき技術的制約
        </p>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/tools/git-deploy">
          <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold">Gitデプロイ・ガバナンス</div>
                  <div className="text-xs text-muted-foreground">コード監査＆デプロイ実行</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => copyToClipboard(claudePrompt, 'claude-prompt')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {copiedSection === 'claude-prompt' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-purple-600" />
              )}
              <div>
                <div className="font-semibold">Claude用プロンプトをコピー</div>
                <div className="text-xs text-muted-foreground">
                  {copiedSection === 'claude-prompt' ? 'コピーしました！' : '開発依頼時に貼り付け'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <a href="/DEV_GOVERNANCE_RULEBOOK.md" target="_blank" rel="noopener noreferrer">
          <Card className="cursor-pointer hover:bg-accent transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="font-semibold">Markdownファイルを開く</div>
                  <div className="text-xs text-muted-foreground">生のファイルを表示</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* I. 開発の最重要データガバナンス・ルール */}
      <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            I. 開発の最重要データガバナンス・ルール
          </CardTitle>
          <CardDescription>
            VPSへのデプロイ前に自動監査でチェックされ、違反時はデプロイが自動停止されます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* ルールA */}
          <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/10">
            <div className="flex items-start gap-3 mb-2">
              <Badge className="bg-blue-600">A</Badge>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">DB操作の抽象化</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Supabaseクライアントへの<strong>SQL直接記述は厳禁</strong>とする。
                  すべてのDB操作は、抽象化されたデータ層（例: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">lib/supabase/products.ts</code>）を経由すること。
                </p>
                <div className="bg-white dark:bg-slate-900 p-3 rounded border">
                  <div className="text-xs font-semibold mb-1">✅ 正しい例:</div>
                  <code className="text-xs text-green-600">
                    import &#123; fetchProducts &#125; from '@/lib/supabase/products'<br />
                    const products = await fetchProducts()
                  </code>
                  <div className="text-xs font-semibold mb-1 mt-3">❌ 違反例:</div>
                  <code className="text-xs text-red-600">
                    const supabase = createClient()<br />
                    supabase.from('products').select('*')
                  </code>
                </div>
                <div className="mt-2 text-xs">
                  <strong>目的:</strong> コードの安全性と保守性の向上
                </div>
              </div>
            </div>
          </div>

          {/* ルールB */}
          <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 dark:bg-purple-900/10">
            <div className="flex items-start gap-3 mb-2">
              <Badge className="bg-purple-600">B</Badge>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">マスタテーブルの強制</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  データの書き込みは必ず<strong>マスタテーブル（例: products_master）</strong>を経由し、
                  特定のAPIエンドポイントのみに限定すること。
                </p>
                <div className="bg-white dark:bg-slate-900 p-3 rounded border">
                  <div className="text-xs font-semibold mb-1">✅ 正しい例:</div>
                  <code className="text-xs text-green-600">
                    // app/api/products/update/route.ts<br />
                    await supabase.from('products_master').update(&#123;...&#125;)
                  </code>
                  <div className="text-xs font-semibold mb-1 mt-3">❌ 違反例:</div>
                  <code className="text-xs text-red-600">
                    // components/ProductCard.tsx<br />
                    supabase.from('products_master').update(&#123;...&#125;)
                  </code>
                </div>
                <div className="mt-2 text-xs">
                  <strong>目的:</strong> データの整合性と信頼性の確保
                </div>
              </div>
            </div>
          </div>

          {/* ルールC */}
          <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50 dark:bg-orange-900/10">
            <div className="flex items-start gap-3 mb-2">
              <Badge className="bg-orange-600">C</Badge>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">環境変数の利用</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  APIキーなどの機密情報は必ず環境変数（<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env</code>）に格納し、
                  コードに直接ハードコーディングしないこと。
                </p>
                <div className="bg-white dark:bg-slate-900 p-3 rounded border">
                  <div className="text-xs font-semibold mb-1">✅ 正しい例:</div>
                  <code className="text-xs text-green-600">
                    const apiKey = process.env.STRIPE_SECRET_KEY
                  </code>
                  <div className="text-xs font-semibold mb-1 mt-3">❌ 違反例:</div>
                  <code className="text-xs text-red-600">
                    const apiKey = "sk_test_51abc123..."
                  </code>
                </div>
                <div className="mt-2 text-xs">
                  <strong>目的:</strong> セキュリティの確保
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* II. ツール開発時にクロードが参照すべき情報 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            II. ツール開発時にクロードが参照すべき情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-1">📊 Supabase構造</div>
              <p className="text-sm text-muted-foreground">
                各ツールの開発前に、使用するテーブル名、カラム名、そして各ツールとの関係をUIで一覧表示し、それを参照すること。
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-1">🔌 API構造</div>
              <p className="text-sm text-muted-foreground">
                開発する機能が呼び出すAPIエンドポイントのリストと、その役割を常に確認し、定義されたAPIを経由してDB操作を行うこと。
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-1">✅ コードの整合性</div>
              <p className="text-sm text-muted-foreground">
                構文チェック（ESLintなど）だけでなく、技術的なルール（上記 I のA, B, C）に反していないかを自己査定すること。
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-1">🚀 VPSデプロイ</div>
              <p className="text-sm text-muted-foreground">
                作成したデータやコードが、VPS環境の最新技術設定に合致しているか、デプロイ時にエラーが出ないかを自動チェックする機構を意識すること。
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-semibold mb-1">🔄 データの流れ</div>
              <p className="text-sm text-muted-foreground">
                どのデータがどこに入るのか（例: スクレイピングデータ → 一時テーブル → マスタテーブル）を常に理解し、データの流れを自動で整理整頓するようにコードを書くこと。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* III. 統合管理ツールの機能要件 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            III. 統合管理ツールの機能要件
          </CardTitle>
          <CardDescription>
            既存のデプロイツール（/tools/git-deploy）を拡張し、以下の機能を統合
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🔗 3要素の連動同期パネル</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>コード監査＆デプロイ（ルール違反がないかチェック）</li>
                <li>環境変数シンク（ローカルとVPSのENVの同期）</li>
                <li>スキーママイグレーション（DB構造変更の自動反映）</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">💾 自動バックアップ＆リカバリパネル</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>最終バックアップ日時表示</li>
                <li>特定の時点にコードとDBをワンクリックで戻せるリカバリ機能</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">⚠️ ルール違反警告ダッシュボード</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>コード内のルール違反（A, B, C）をリアルタイムで警告表示</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* クロードに自動で読み込ませる方法 */}
      <Card className="mb-6 border-2 border-green-200 dark:border-green-800">
        <CardHeader className="bg-green-50 dark:bg-green-900/20">
          <CardTitle className="flex items-center gap-2">
            🤖 クロードに自動で読み込ませる方法
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              大規模言語モデル（LLM）は、一度チャットを閉じると過去の会話内容を自動で「システム設定」として記憶し続けるわけではありません。
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>1</Badge>
                新規開発時の「システムプロンプト」化（最も確実）
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                新しい開発タスクを依頼する際、必ずこの指示書をプロンプトの冒頭にコピー＆ペースト
              </p>
              <Button
                onClick={() => copyToClipboard(claudePrompt, 'system-prompt')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {copiedSection === 'system-prompt' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    コピーしました！
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Claude用プロンプトをコピー
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>2</Badge>
                ファイルとしての参照を強制
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                この指示書をプロジェクト内のファイル（<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">DEV_GOVERNANCE_RULEBOOK.md</code>）として保存し、
                Claudeに「常にこのファイルを読み込み、そのルールに基づいてコードを生成すること」と指示
              </p>
              <div className="bg-slate-900 text-green-400 p-3 rounded text-xs font-mono mt-2">
                $ cat DEV_GOVERNANCE_RULEBOOK.md
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>3</Badge>
                サイドバーでの参照の仕組み
              </h4>
              <p className="text-sm text-muted-foreground">
                開発ツール（SDIM）のUI上に「開発ガバナンス・ルールへのリンク」を設置し、
                人間が常に意識し、AIにプロンプトを投げる際にも参照しやすい環境を整える（このページ）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* チェックリスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            📋 ルール違反チェックリスト
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div className="text-sm">
                <strong>ルールA:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">lib/supabase/</code> 以外で <code>createClient()</code> や <code>.from().insert/update/delete</code> を使用していないか？
              </div>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div className="text-sm">
                <strong>ルールB:</strong> マスタテーブルへの書き込みがAPIエンドポイント経由になっているか？
              </div>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div className="text-sm">
                <strong>ルールC:</strong> APIキー、パスワード、トークンが環境変数（<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env</code>）に格納されているか？
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <strong>自動チェック:</strong> 「Gitデプロイ・ガバナンス」タブの「コード監査を実行」ボタンで、
                これらのルール違反を自動検出できます。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>最終更新日: 2025-11-20 | バージョン: 1.0</p>
      </div>
    </div>
  )
}
