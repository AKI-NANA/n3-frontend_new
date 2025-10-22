'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  GitBranch,
  Upload,
  RefreshCw,
  Terminal,
  BookOpen,
  CheckCircle,
  XCircle,
  Loader2,
  Server,
  Code,
  FileText,
  AlertCircle,
  Eye,
  Key,
  Database
} from 'lucide-react'

interface GitStatus {
  hasChanges: boolean
  files: string[]
  branch: string
}

export default function GitDeployPage() {
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'deploy' | 'commands' | 'guide'>('deploy')
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [diffInfo, setDiffInfo] = useState<any>(null)
  const [showingDiff, setShowingDiff] = useState(false)
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [checkingEnv, setCheckingEnv] = useState(false)
  const [syncingEnv, setSyncingEnv] = useState(false)
  const [showEnvContent, setShowEnvContent] = useState(false)
  const [envContent, setEnvContent] = useState('')

  // Git状態をチェック
  const checkGitStatus = async () => {
    setCheckingStatus(true)
    try {
      const response = await fetch('/api/git/status')
      const data = await response.json()
      setGitStatus(data)
    } catch (error) {
      console.error('Git status check failed:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  useEffect(() => {
    checkGitStatus()
  }, [])

  const handleGitPush = async () => {
    if (!commitMessage.trim()) {
      setResult({ 
        success: false, 
        message: 'コミットメッセージを入力してください' 
      })
      return
    }

    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/git/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: commitMessage }),
      })
      
      const data = await response.json()
      setResult({ 
        success: response.ok, 
        message: data.message || data.error 
      })
      
      if (response.ok) {
        setCommitMessage('')
        await checkGitStatus()
      }
    } catch (error) {
      setResult({ success: false, message: 'Git pushに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleVPSDeploy = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/deploy/vps', {
        method: 'POST',
      })
      
      const data = await response.json()
      setResult({ success: response.ok, message: data.message || data.error })
    } catch (error) {
      setResult({ success: false, message: 'VPSデプロイに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleGitPull = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/git/pull', { method: 'POST' })
      const data = await response.json()
      setResult({ success: response.ok, message: data.message || data.error })
      if (response.ok) {
        await checkGitStatus()
      }
    } catch (error) {
      setResult({ success: false, message: 'Git pullに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const checkDiff = async () => {
    setShowingDiff(true)
    try {
      const response = await fetch('/api/git/diff')
      const data = await response.json()
      setDiffInfo(data)
    } catch (error) {
      console.error('Diff check failed:', error)
    } finally {
      setShowingDiff(false)
    }
  }

  const checkEnvStatus = async () => {
    setCheckingEnv(true)
    try {
      const response = await fetch('/api/env/sync')
      const data = await response.json()
      setEnvInfo(data)
    } catch (error) {
      console.error('Env check failed:', error)
    } finally {
      setCheckingEnv(false)
    }
  }

  const loadEnvContent = async () => {
    try {
      const response = await fetch('/api/env/content')
      const data = await response.json()
      if (data.success) {
        setEnvContent(data.content)
        setShowEnvContent(true)
      }
    } catch (error) {
      console.error('Failed to load env content:', error)
    }
  }

  const copyEnvContent = () => {
    navigator.clipboard.writeText(envContent)
    setResult({
      success: true,
      message: '環境変数の内容をクリップボードにコピーしました！VPSで貼り付けてください。'
    })
  }

  useEffect(() => {
    checkEnvStatus()
  }, [])

  const commands = [
    {
      title: 'ローカル開発',
      commands: [
        { cmd: 'npm run dev', desc: '開発サーバー起動' },
        { cmd: 'npm run build', desc: '本番ビルド' },
        { cmd: 'npm run lint', desc: 'リント実行' },
      ]
    },
    {
      title: 'Git操作（推奨）',
      commands: [
        { cmd: 'git status', desc: '変更状況確認' },
        { cmd: 'git add .', desc: '全ファイルをステージング' },
        { cmd: 'git commit -m "message"', desc: 'コミット' },
        { cmd: 'git pull origin main', desc: '最新を取得（重要！）' },
        { cmd: 'git push origin main', desc: 'GitHubへプッシュ' },
      ]
    },
    {
      title: 'VPS操作',
      commands: [
        { cmd: 'ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp', desc: 'VPS接続' },
        { cmd: 'cd ~/n3-frontend_new', desc: 'プロジェクトディレクトリへ移動' },
        { cmd: 'git pull origin main', desc: '最新コード取得' },
        { cmd: 'npm install', desc: '依存関係インストール' },
        { cmd: 'npm run build', desc: 'ビルド実行' },
        { cmd: 'pm2 restart n3-frontend', desc: 'アプリ再起動' },
        { cmd: 'pm2 logs n3-frontend --lines 50', desc: 'ログ確認' },
      ]
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Git & デプロイ管理</h1>
        <p className="text-muted-foreground mt-2">
          安全なGitプッシュとVPSデプロイ
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'deploy'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="inline-block w-4 h-4 mr-2" />
          デプロイ
        </button>
        <button
          onClick={() => setActiveTab('commands')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'commands'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Terminal className="inline-block w-4 h-4 mr-2" />
          コマンド集
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'guide'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="inline-block w-4 h-4 mr-2" />
          ガイド
        </button>
      </div>

      {/* デプロイタブ */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          {/* Git状態表示 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Git 状態
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={checkGitStatus}
                  disabled={checkingStatus}
                >
                  {checkingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {gitStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {gitStatus.branch || 'main'} ブランチ
                    </Badge>
                    {gitStatus.hasChanges ? (
                      <Badge variant="default" className="bg-yellow-500">
                        {gitStatus.files.length} ファイル変更あり
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500">
                        変更なし
                      </Badge>
                    )}
                  </div>
                  
                  {gitStatus.hasChanges && gitStatus.files.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">変更されたファイル:</p>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded p-3 max-h-40 overflow-y-auto">
                        {gitStatus.files.map((file, idx) => (
                          <div key={idx} className="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Git Push */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Git Push
                </CardTitle>
                <CardDescription>
                  変更をGitHubにプッシュ（自動でpull実行）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 差分チェックとGit Pullボタン */}
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={checkDiff}
                    disabled={showingDiff}
                    className="flex-1"
                  >
                    {showingDiff ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    差分確認
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={handleGitPull}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Git Pull
                  </Button>
                </div>

                {/* 差分情報表示 */}
                {diffInfo && (
                  <Alert className={diffInfo.hasRemoteDiff ? "border-yellow-500" : "border-green-500"}>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="space-y-2">
                      {diffInfo.hasRemoteDiff ? (
                        <>
                          <p className="font-medium text-yellow-700">⚠️ GitHubに未取得の変更があります</p>
                          <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                            {diffInfo.remoteDiffStat}
                          </pre>
                          <p className="text-xs">先に「Git Pull」ボタンでGitHubの変更を取得してください</p>
                        </>
                      ) : (
                        <p className="text-green-700">✅ ローカルとGitHubは同期されています</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="commit-message">コミットメッセージ *</Label>
                  <Textarea
                    id="commit-message"
                    placeholder="例: feat: eBay画像アップロード機能を追加"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    rows={3}
                    disabled={!gitStatus?.hasChanges}
                  />
                  <p className="text-xs text-muted-foreground">
                    変更内容を具体的に記述してください
                  </p>
                </div>
                
                {/* Push不可理由の表示 */}
                {(!gitStatus?.hasChanges || !commitMessage.trim()) && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      {!gitStatus?.hasChanges && "⚠️ Pushできない理由: 変更されたファイルがありません"}
                      {gitStatus?.hasChanges && !commitMessage.trim() && "⚠️ Pushできない理由: コミットメッセージを入力してください"}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleGitPush} 
                  disabled={loading || !gitStatus?.hasChanges || !commitMessage.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      実行中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Git Push 実行
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">実行されるコマンド：</p>
                  <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    git pull origin main  # 最新を取得<br/>
                    git add .<br/>
                    git commit -m "メッセージ"<br/>
                    git push origin main
                  </code>
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    プッシュ前に自動的に git pull を実行します。
                    Claude Codeとの競合を自動検出します。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* VPS Deploy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  VPS デプロイ
                </CardTitle>
                <CardDescription>
                  VPSに最新コードをデプロイ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Badge variant="outline">https://n3.emverze.com</Badge>
                  <p className="text-sm text-muted-foreground">
                    VPSで git pull → build → 再起動を実行
                  </p>
                </div>
                
                <Button 
                  onClick={handleVPSDeploy} 
                  disabled={loading}
                  className="w-full"
                  variant="default"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      デプロイ中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      VPS デプロイ実行
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">実行されるコマンド：</p>
                  <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    git pull origin main<br/>
                    npm install<br/>
                    npm run build<br/>
                    pm2 restart n3-frontend
                  </code>
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    Git Pushが完了してから実行してください
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* 環境変数同期 */}
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader className="bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  環境変数同期 (.env.local)
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={checkEnvStatus}
                  disabled={checkingEnv}
                >
                  {checkingEnv ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                ローカルの環境変数をVPSに安全に同期
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {envInfo ? (
                <div className="space-y-3">
                  {envInfo.exists ? (
                    <>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-sm">ローカル環境変数ファイル検出</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">環境変数:</span> {envInfo.envVariables}個
                          </div>
                          <div>
                            <span className="font-medium">ファイルサイズ:</span> {envInfo.fileSize} bytes
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
                        <p className="text-xs font-medium mb-2">検出された環境変数キー:</p>
                        <div className="flex flex-wrap gap-1">
                          {envInfo.keys?.map((key: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {key}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        .env.local ファイルが見つかりません
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              )}

              <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>重要:</strong> .env.local ファイルはGitには含まれません。
                  手動でVPSにコピーする必要があります。
                </AlertDescription>
              </Alert>

              {!showEnvContent ? (
                <Button
                  onClick={loadEnvContent}
                  disabled={!envInfo?.exists}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  環境変数の内容を表示
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {envContent}
                    </pre>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={copyEnvContent}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      クリップボードにコピー
                    </Button>
                    <Button
                      onClick={() => setShowEnvContent(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      閉じる
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">VPSでの手順：</p>
                <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp<br/>
                  cd ~/n3-frontend_new<br/>
                  nano .env.local<br/>
                  # 上記でコピーした内容を貼り付け<br/>
                  # Ctrl+O → Enter → Ctrl+X<br/>
                  pm2 restart n3-frontend
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* コマンド集タブ */}
      {activeTab === 'commands' && (
        <div className="space-y-6">
          {commands.map((section, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.commands.map((item, cmdIdx) => (
                    <div key={cmdIdx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded">
                      <Terminal className="w-4 h-4 mt-1 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                          {item.cmd}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.desc}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(item.cmd)}
                      >
                        <Code className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ガイドタブ */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* コミットメッセージ規約 */}
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                <FileText className="w-5 h-5" />
                📝 コミットメッセージ規約（重要）
              </CardTitle>
              <CardDescription>必ず以下の規約に従ってください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded">
                <p className="font-medium mb-2">基本フォーマット：</p>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded">
                  &lt;type&gt;: &lt;subject&gt;
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  例: feat: eBayリサーチツール完全版実装 - 全5タブ対応
                </p>
              </div>

              <div>
                <p className="font-medium mb-3">タイプ一覧：</p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <code className="bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-green-700 dark:text-green-300 font-semibold text-sm">feat</code>
                    <span className="text-sm">新機能追加</span>
                    <span className="text-xs text-muted-foreground ml-auto">例: feat: eBayリサーチツール追加</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded text-red-700 dark:text-red-300 font-semibold text-sm">fix</code>
                    <span className="text-sm">バグ修正</span>
                    <span className="text-xs text-muted-foreground ml-auto">例: fix: ログインエラーを修正</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-blue-700 dark:text-blue-300 font-semibold text-sm">docs</code>
                    <span className="text-sm">ドキュメント</span>
                    <span className="text-xs text-muted-foreground ml-auto">例: docs: READMEを更新</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <code className="bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded text-purple-700 dark:text-purple-300 font-semibold text-sm">style</code>
                    <span className="text-sm">スタイル変更</span>
                    <span className="text-xs text-muted-foreground ml-auto">例: style: CSSを調整</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <code className="bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 rounded text-yellow-700 dark:text-yellow-300 font-semibold text-sm">refactor</code>
                    <span className="text-sm">リファクタリング</span>
                    <span className="text-xs text-muted-foreground ml-auto">例: refactor: コードを整理</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-1 text-sm">
                    <CheckCircle className="w-4 h-4" /> 良い例
                  </p>
                  <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                    <code className="block">feat: 全5タブ実装完了</code>
                    <code className="block">fix: サイドバーリンク修正</code>
                    <code className="block">docs: デプロイ手順更新</code>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <p className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-1 text-sm">
                    <XCircle className="w-4 h-4" /> 悪い例
                  </p>
                  <div className="space-y-1 text-xs text-red-700 dark:text-red-300">
                    <code className="block">修正</code>
                    <code className="block">update</code>
                    <code className="block">WIP</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* デプロイ手順 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                🔄 デプロイ手順（詳細版）
              </CardTitle>
              <CardDescription>Claude Codeとの並行開発に対応</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                  <div>
                    <p className="font-medium">コード修正</p>
                    <p className="text-xs text-muted-foreground mt-1">ローカルまたはClaude Codeでコード修正</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                  <div>
                    <p className="font-medium">動作確認</p>
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">npm run dev</code>
                    <p className="text-xs text-muted-foreground mt-1">ブラウザで動作確認</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                  <div>
                    <p className="font-medium">Git状態を確認</p>
                    <p className="text-xs text-muted-foreground mt-1">「デプロイ」タブで変更ファイル一覧を確認</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">4.</span>
                  <div>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">【重要】差分確認（推奨）</p>
                    <p className="text-xs text-muted-foreground mt-1">「差分確認」ボタンでGitHubとローカルの差分をチェック</p>
                    <p className="text-xs text-yellow-600 mt-1">⚠️ GitHubに未取得の変更があれば警告が表示される</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">5.</span>
                  <div>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Git Pull（必要に応じて）</p>
                    <p className="text-xs text-muted-foreground mt-1">差分があれば「Git Pull」ボタンでGitHubの変更を取り込む</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-purple-600 dark:text-purple-400">6.</span>
                  <div>
                    <p className="font-medium text-purple-600 dark:text-purple-400">コミットメッセージ入力</p>
                    <p className="text-xs text-muted-foreground mt-1">上記の規約に従って入力</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 dark:text-green-400">7.</span>
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">Git Push実行</p>
                    <p className="text-xs text-muted-foreground mt-1">「Git Push 実行」ボタンをクリック</p>
                    <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1">
                      自動実行: git pull → add → commit → push
                    </code>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 dark:text-green-400">8.</span>
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">VPSデプロイ</p>
                    <p className="text-xs text-muted-foreground mt-1">「VPSデプロイ実行」ボタンをクリック</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 dark:text-green-400">9.</span>
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">本番確認</p>
                    <a href="https://n3.emverze.com" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:underline">
                      https://n3.emverze.com で動作確認
                    </a>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* コンフリクト対処法 */}
          <Card className="border-2 border-red-200 dark:border-red-800">
            <CardHeader className="bg-red-50 dark:bg-red-900/20">
              <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                <AlertCircle className="w-5 h-5" />
                ⚠️ コンフリクト発生時の対処法
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="font-medium mb-2">コンフリクトとは？</p>
                <p className="text-sm text-muted-foreground">
                  GitHubとローカルで<strong>同じファイルの同じ箇所</strong>を編集した時に発生します。
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                <p className="font-medium text-sm mb-2">表示例：</p>
                <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  ❌ Git pullに失敗しました<br/>
                  CONFLICT (content): Merge conflict in app/page.tsx
                </code>
              </div>

              <div>
                <p className="font-medium mb-2">解決手順：</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>コンフリクトファイルを開く</li>
                  <li>&lt;&lt;&lt;&lt;&lt;&lt;&lt;、=======、&gt;&gt;&gt;&gt;&gt;&gt;&gt; のマーカーを見つける</li>
                  <li>どちらの変更を残すか決定</li>
                  <li>マーカーを削除</li>
                  <li>ターミナルで以下を実行：
                    <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1">
                      git add .<br/>
                      git commit -m "fix: コンフリクト解決"<br/>
                      git push origin main
                    </code>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Claude Code競合回避 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-400">
                ⚠️ 重要: Claude Codeとの競合回避
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">このツールは自動的に <code className="bg-slate-100 dark:bg-slate-800 px-1">git pull</code> を実行します。</p>
              <p className="text-sm text-muted-foreground">
                Claude Code on the Webが変更をプッシュした後でも、
                その変更を自動的に取り込んでからプッシュするため安全です。
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">推奨：</p>
                <ul className="list-disc list-inside mt-2 text-blue-800 dark:text-blue-200 space-y-1 text-sm">
                  <li>Claude Codeには特定のフォルダのみ変更させる</li>
                  <li>ローカルでは別のフォルダを編集する</li>
                  <li>共通ファイルは順番に編集する</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 環境情報 */}
          <Card>
            <CardHeader>
              <CardTitle>環境情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">本番URL</div>
                  <a href="https://n3.emverze.com" target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline">
                    https://n3.emverze.com
                  </a>
                </div>
                <div>
                  <div className="font-medium">VPSサーバー</div>
                  <div className="text-muted-foreground">tk2-236-27682.vs.sakura.ne.jp</div>
                </div>
                <div>
                  <div className="font-medium">GitHubリポジトリ</div>
                  <a href="https://github.com/AKI-NANA/n3-frontend_new" target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline">
                    AKI-NANA/n3-frontend_new
                  </a>
                </div>
                <div>
                  <div className="font-medium">デプロイ方式</div>
                  <div className="text-muted-foreground">GitHub Actions + PM2</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
