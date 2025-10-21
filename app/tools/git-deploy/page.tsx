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
  Eye
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
        <Card>
          <CardHeader>
            <CardTitle>デプロイメントガイド</CardTitle>
            <CardDescription>Claude Codeとの並行開発に対応</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                安全なワークフロー（Claude Code併用）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>ローカルまたはClaude Codeでコード修正</li>
                <li>動作確認（npm run dev）</li>
                <li><strong>Git状態を確認</strong>（変更ファイル一覧）</li>
                <li><strong>コミットメッセージを入力</strong>（具体的に）</li>
                <li><strong>Git Push実行</strong>（自動でpull→push）</li>
                <li>競合があれば通知される → 手動で解決</li>
                <li>VPSにデプロイ</li>
                <li>本番環境で動作確認</li>
              </ol>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 text-yellow-600 dark:text-yellow-400">
                ⚠️ 重要: Claude Codeとの競合回避
              </h3>
              <div className="space-y-2 text-sm">
                <p>このツールは自動的に <code className="bg-slate-100 dark:bg-slate-800 px-1">git pull</code> を実行します。</p>
                <p className="text-muted-foreground">
                  Claude Code on the Webが変更をプッシュした後でも、
                  その変更を自動的に取り込んでからプッシュするため安全です。
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded mt-2">
                  <p className="font-medium text-blue-900 dark:text-blue-100">推奨:</p>
                  <ul className="list-disc list-inside mt-1 text-blue-800 dark:text-blue-200 space-y-1">
                    <li>Claude Codeには特定のフォルダのみ変更させる</li>
                    <li>ローカルでは別のフォルダを編集する</li>
                    <li>共通ファイルは順番に編集する</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">環境情報</h3>
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
