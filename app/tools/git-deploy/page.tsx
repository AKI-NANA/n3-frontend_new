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
  Database,
  Trash2,
  Shield
} from 'lucide-react'
import CleanupTab from './CleanupTab'
import GovernanceTab from './GovernanceTab'
import DatabaseTab from './DatabaseTab'

interface GitStatus {
  hasChanges: boolean
  files: string[]
  branch: string
}

export default function GitDeployPage() {
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'deploy' | 'commands' | 'guide' | 'cleanup' | 'governance' | 'database'>('deploy')
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [diffInfo, setDiffInfo] = useState<any>(null)
  const [showingDiff, setShowingDiff] = useState(false)
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [checkingEnv, setCheckingEnv] = useState(false)
  const [syncingEnv, setSyncingEnv] = useState(false)
  const [showEnvContent, setShowEnvContent] = useState(false)
  const [envContent, setEnvContent] = useState('')
  const [syncMode, setSyncMode] = useState<'safe' | 'force'>('safe')
  const [syncSteps, setSyncSteps] = useState<string[]>([])
  const [syncing, setSyncing] = useState(false)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [macCommandCopied, setMacCommandCopied] = useState(false)
  const [macFullSyncCopied, setMacFullSyncCopied] = useState(false)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [currentHost, setCurrentHost] = useState("")
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [checkingSyncStatus, setCheckingSyncStatus] = useState(false)
  const [remoteDiff, setRemoteDiff] = useState<any>(null)
  const [checkingRemoteDiff, setCheckingRemoteDiff] = useState(false)

  // ワンクリック完全同期用の状態
  const [fullSyncRunning, setFullSyncRunning] = useState(false)
  const [fullSyncLogs, setFullSyncLogs] = useState<string[]>([])
  const [fullSyncWithBackup, setFullSyncWithBackup] = useState(true)
  const [showFullSyncConfirm, setShowFullSyncConfirm] = useState(false)

  // 完全クリーンデプロイ用の状態
  const [cleanDeployLoading, setCleanDeployLoading] = useState(false)
  const [cleanDeployResult, setCleanDeployResult] = useState<any>(null)
  const [showCleanDeployConfirm, setShowCleanDeployConfirm] = useState(false)
  const [cleanDeployLogs, setCleanDeployLogs] = useState<string[]>([])

  // クリーンアップタブ用の状態
  const [cleanupData, setCleanupData] = useState<any>(null)
  const [loadingCleanup, setLoadingCleanup] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [updateGitignore, setUpdateGitignore] = useState(true)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)

  // ヘルパー関数: コミット済みの変更があるかチェック
  const hasLocalCommits = () => {
    return gitStatus?.branch && 
           (gitStatus as any)?.debug?.longStatus?.includes('Your branch is ahead')
  }

  // Git状態をチェック
  useEffect(() => {
    const hostname = window.location.hostname
    setCurrentHost(hostname)
    setIsLocalhost(hostname === "localhost" || hostname === "127.0.0.1")
  }, [])


  const checkGitStatus = async () => {
    setCheckingStatus(true)
    setResult(null)
    try {
      console.log('Fetching git status...')
      const response = await fetch('/api/git/status')
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Git status API error:', errorData)
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Git status data:', data)
      
      if (data.error) {
        console.error('Git status error:', data.error)
        setResult({ success: false, message: `Git状態の取得に失敗: ${data.error}` })
        setGitStatus(null)
      } else {
        console.log('Setting git status:', {
          hasChanges: data.hasChanges,
          filesCount: data.files?.length || 0,
          branch: data.branch
        })
        setGitStatus(data)
        
        // デバッグ用のメッセージ
        if (!data.hasChanges && data.files?.length > 0) {
          console.warn('Warning: files exist but hasChanges is false')
        }
      }
    } catch (error) {
      console.error('Git status check failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Git状態の取得に失敗しました'
      setResult({ success: false, message: errorMessage })
      setGitStatus(null)
    } finally {
      setCheckingStatus(false)
    }
  }

  useEffect(() => {
    checkGitStatus()
  }, [])

  const handleGitPush = async () => {
    // コミット済みの変更があるか確認
    const localCommits = hasLocalCommits()

    if (!localCommits && !commitMessage.trim() && !gitStatus?.hasChanges) {
      setResult({ 
        success: false, 
        message: 'プッシュする変更がありません' 
      })
      return
    }

    // コミット済みの変更があればメッセージなしでもOK
    if (!localCommits && gitStatus?.hasChanges && !commitMessage.trim()) {
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

      // 手動デプロイの案内を表示
      if (data.commands) {
        const fullMessage = `${data.message}\n\n以下のコマンドを実行してください：\n\n${data.commands}`
        setResult({ success: false, message: fullMessage })
      } else {
        setResult({ success: response.ok, message: data.message || data.error })
      }
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

  const handleSyncFromGit = async () => {
    if (!showSyncConfirm) {
      setShowSyncConfirm(true)
      return
    }

    setSyncing(true)
    setSyncSteps([])
    setResult(null)

    try {
      const response = await fetch('/api/git/sync-from-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: syncMode })
      })

      const data = await response.json()

      if (response.ok) {
        setSyncSteps(data.steps || [])
        setResult({ success: true, message: data.message })
        await checkGitStatus()
      } else {
        setResult({ success: false, message: data.error || 'Git同期に失敗しました' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Git同期に失敗しました' })
    } finally {
      setSyncing(false)
      setShowSyncConfirm(false)
    }
  }

  const copyMacSyncCommand = () => {
    const currentBranch = gitStatus?.branch || 'main'
    const commands = `cd ~/n3-frontend_new && ./sync-mac.sh`

    navigator.clipboard.writeText(commands)
    setMacCommandCopied(true)
    setResult({
      success: true,
      message: 'Mac同期コマンドをコピーしました！Macのターミナルで貼り付けて実行してください。'
    })

    setTimeout(() => setMacCommandCopied(false), 3000)
  }

  const copyMacFullSyncCommand = () => {
    const command = `cd ~ && mv n3-frontend_new n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S) && git clone https://github.com/AKI-NANA/n3-frontend_new.git && cd n3-frontend_new && git checkout claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG && npm install && echo "✅ 完全同期完了！npm run dev を実行してください"`
    navigator.clipboard.writeText(command)
    setMacFullSyncCopied(true)
    setResult({ success: true, message: "完全同期コマンドをコピーしました！" })
    setTimeout(() => setMacFullSyncCopied(false), 3000)
  }

  const checkSyncStatus = async () => {
    setCheckingSyncStatus(true)
    try {
      const response = await fetch('/api/git/sync-status')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.error) {
        setSyncStatus({ error: data.error })
      } else {
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Sync status check failed:', error)
      const errorMessage = error instanceof Error ? error.message : '同期状態の確認に失敗しました'
      setSyncStatus({ error: `同期状態の確認に失敗しました: ${errorMessage}` })
    } finally {
      setCheckingSyncStatus(false)
    }
  }

  const checkRemoteDiff = async () => {
    setCheckingRemoteDiff(true)
    try {
      const response = await fetch('/api/git/remote-diff')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.error) {
        setRemoteDiff({ error: data.error })
      } else {
        setRemoteDiff(data)
      }
    } catch (error) {
      console.error('Remote diff check failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'リモート差分の確認に失敗しました'
      setRemoteDiff({ error: `リモート差分の確認に失敗しました: ${errorMessage}` })
    } finally {
      setCheckingRemoteDiff(false)
    }
  }

  useEffect(() => {
    checkEnvStatus()
  }, [])

  // ワンクリック完全同期関数
  const handleFullSync = async () => {
    if (!showFullSyncConfirm) {
      setShowFullSyncConfirm(true)
      return
    }

    setFullSyncRunning(true)
    setFullSyncLogs([])
    setResult(null)

    const addLog = (message: string) => {
      setFullSyncLogs(prev => [...prev, message])
    }

    try {
      addLog('🚀 完全同期を開始します...')

      // ステップ1: ローカルの変更をチェック
      addLog('🔍 ステップ1: ローカルの変更をチェック中...')
      const statusResponse = await fetch('/api/git/status')
      const statusData = await statusResponse.json()

      if (statusData.hasChanges) {
        addLog(`✅ ${statusData.files.length}ファイルの変更を検出`)
        
        // コミットメッセージが必要
        if (!commitMessage.trim()) {
          throw new Error('コミットメッセージが必要です。入力してから再実行してください。')
        }

        addLog('💾 ステップ2: ローカル変更をGitにコミット&プッシュ中...')
        const pushResponse = await fetch('/api/git/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: commitMessage })
        })
        
        if (!pushResponse.ok) {
          const errorData = await pushResponse.json()
          throw new Error(`Gitプッシュ失敗: ${errorData.error}`)
        }
        
        addLog('✅ GitHubにプッシュ完了')
        setCommitMessage('') // メッセージをクリア
      } else {
        addLog('✅ ローカルに未コミットの変更なし')
      }

      // ステップ3: Gitから最新を取得
      addLog('🔄 ステップ3: GitHubから最新データを取得中...')
      const pullResponse = await fetch('/api/git/pull', { method: 'POST' })
      if (!pullResponse.ok) {
        const errorData = await pullResponse.json()
        throw new Error(`Git Pull失敗: ${errorData.error}`)
      }
      addLog('✅ ローカルを最新状態に更新')

      // ステップ4: VPSにデプロイ
      addLog('🚀 ステップ4: VPSにデプロイ中...')
      const deployResponse = await fetch('/api/deploy/full-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          createBackup: fullSyncWithBackup,
          branch: statusData.branch || 'main'
        })
      })

      const deployData = await deployResponse.json()
      
      if (!deployResponse.ok) {
        // APIが存在しない場合は手動手順を表示
        if (deployResponse.status === 404) {
          addLog('⚠️ VPS自動デプロイAPIが未実装です')
          addLog('📝 VPSで以下のコマンドを実行してください:')
          addLog('ssh ubuntu@n3.emverze.com')
          addLog('cd ~/n3-frontend_new')
          if (fullSyncWithBackup) {
            addLog(`cp -r ~/n3-frontend_new ~/n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)`)
          }
          addLog(`git pull origin ${statusData.branch || 'main'}`)
          addLog('npm install')
          addLog('npm run build')
          addLog('pm2 restart n3-frontend')
          setResult({ 
            success: false, 
            message: 'VPS自動デプロイは未対応です。上記コマンドをVPSで実行してください。' 
          })
        } else {
          throw new Error(deployData.error || 'VPSデプロイ失敗')
        }
      } else {
        // デプロイログを追加
        if (deployData.logs) {
          deployData.logs.forEach((log: string) => addLog(log))
        }
        addLog('✅ VPSデプロイ完了')
      }

      // 最終確認
      addLog('🔄 最終確認中...')
      await checkGitStatus()
      
      addLog('')
      addLog('🎉 完全同期が完了しました！')
      addLog('✅ Mac ↔ GitHub ↔ VPS すべて同期済み')
      
      setResult({ 
        success: true, 
        message: '完全同期が成功しました！Mac、GitHub、VPSすべてが同じ状態になりました。' 
      })

    } catch (error: any) {
      console.error('Full sync error:', error)
      addLog('')
      addLog(`❌ エラー: ${error.message}`)
      setResult({ 
        success: false, 
        message: `完全同期に失敗しました: ${error.message}` 
      })
    } finally {
      setFullSyncRunning(false)
      setShowFullSyncConfirm(false)
    }
  }

  // 完全クリーンデプロイ関数
  const handleCleanDeploy = async () => {
    if (!showCleanDeployConfirm) {
      setShowCleanDeployConfirm(true)
      return
    }

    setCleanDeployLoading(true)
    setCleanDeployResult(null)
    setCleanDeployLogs([])

    const addLog = (message: string) => {
      setCleanDeployLogs(prev => [...prev, message])
    }

    try {
      addLog('🧹 完全クリーンデプロイを開始します...')

      const response = await fetch('/api/deploy/clean-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sshHost: 'tk2-236-27682.vs.sakura.ne.jp',
          sshUser: 'ubuntu',
          projectPath: '~/n3-frontend_new',
          githubRepo: 'https://github.com/AKI-NANA/n3-frontend_new.git'
        })
      })

      const data = await response.json()
      
      // ログを追加
      if (data.results) {
        data.results.forEach((r: any) => {
          if (r.success) {
            addLog(`✅ ${r.phase}: ${r.stdout}`)
          } else {
            addLog(`❌ ${r.phase}: ${r.error}`)
          }
        })
      }

      if (response.ok) {
        addLog('🎉 完全クリーンデプロイが完了しました！')
      }

      setCleanDeployResult({
        success: response.ok,
        message: data.message,
        results: data.results,
        backupBranch: data.backupBranch,
        vpsBackupPath: data.vpsBackupPath
      })
    } catch (error) {
      addLog('❌ エラーが発生しました')
      setCleanDeployResult({
        success: false,
        message: '完全クリーンデプロイに失敗しました'
      })
    } finally {
      setCleanDeployLoading(false)
      setShowCleanDeployConfirm(false)
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
        <button
          onClick={() => setActiveTab('cleanup')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'cleanup'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trash2 className="inline-block w-4 h-4 mr-2" />
          不要ファイル削除
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'governance'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="inline-block w-4 h-4 mr-2" />
          ガバナンス
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'database'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database className="inline-block w-4 h-4 mr-2" />
          データベース
        </button>
      </div>

      {/* デプロイタブ */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          {/* ワンクリック完全同期カード */}
          <Card className="border-4 border-gradient-to-r from-blue-500 to-purple-500 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <RefreshCw className="w-7 h-7 text-blue-600" />
                🚀 ワンクリック完全同期
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Mac → GitHub → VPS を一括で同期。データは完全に保護されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <AlertDescription className="text-sm">
                  <strong className="text-blue-900">✨ この機能でできること:</strong><br/>
                  ✅ ローカルの変更を自動コミット&プッシュ<br/>
                  ✅ GitHubから最新を自動取得<br/>
                  ✅ VPSに自動デプロイ<br/>
                  ✅ 競合検出時は通知<br/>
                  ✅ すべての履歴をGitに保存（ロールバック可能）
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full-sync-commit" className="text-base font-semibold">
                    コミットメッセージ
                  </Label>
                  <Textarea
                    id="full-sync-commit"
                    placeholder="例: feat: 新機能追加とバグ修正"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    rows={2}
                    disabled={fullSyncRunning}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {gitStatus?.hasChanges ? 
                      `${gitStatus.files?.length || 0}個のファイルに変更があります` : 
                      'ローカルに未コミットの変更はありません'
                    }
                  </p>
                </div>

                <div className="flex items-center space-x-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                  <input
                    type="checkbox"
                    id="vps-backup"
                    checked={fullSyncWithBackup}
                    onChange={(e) => setFullSyncWithBackup(e.target.checked)}
                    disabled={fullSyncRunning}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="vps-backup" className="text-sm cursor-pointer">
                    💾 VPSバックアップを作成（安全モード、推奨）
                  </Label>
                </div>

                {!showFullSyncConfirm ? (
                  <Button
                    onClick={handleFullSync}
                    disabled={fullSyncRunning || (gitStatus?.hasChanges && !commitMessage.trim())}
                    className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  >
                    <RefreshCw className="w-6 h-6 mr-3" />
                    🚀 完全同期を実行
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Alert className="bg-yellow-50 border-yellow-300">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <AlertDescription className="text-sm">
                        <strong>⚠️ 確認:</strong><br/>
                        以下の処理を実行します:<br/>
                        1️⃣ ローカル変更をGitHubにプッシュ<br/>
                        2️⃣ GitHubから最新を取得<br/>
                        3️⃣ VPSにデプロイ{fullSyncWithBackup && '（バックアップ作成）'}<br/>
                        <br/>
                        <strong className="text-green-600">✅ データは完全に保護されます</strong>
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleFullSync}
                        disabled={fullSyncRunning}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                      >
                        {fullSyncRunning ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            実行中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            はい、実行します
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowFullSyncConfirm(false)}
                        disabled={fullSyncRunning}
                        variant="outline"
                        className="flex-1 h-12"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}

                {gitStatus?.hasChanges && !commitMessage.trim() && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      ⚠️ ローカルに変更があるため、コミットメッセージが必要です
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* 実行ログ */}
              {fullSyncLogs.length > 0 && (
                <div className="mt-6">
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    {fullSyncLogs.map((log, idx) => (
                      <div key={idx} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <strong>📚 データ保護の仕組み:</strong><br/>
                  ・ すべての変更はGitのコミット履歴に永久保存<br/>
                  ・ VPSバックアップを有効にすると、旧バージョンも保存<br/>
                  ・ 問題があれば <code className="bg-slate-100 px-1 rounded">git reset</code> で復元可能<br/>
                  ・ 競合検出時は自動で停止、手動解決を促す
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 完全クリーンデプロイ */}
          <Card className="border-4 border-orange-500 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <RefreshCw className="w-7 h-7 text-orange-600" />
                🧹 完全クリーンデプロイ（大規模変更後）
              </CardTitle>
              <CardDescription className="text-base mt-2">
                VPSを完全にクリーンにしてから、GitHubから全データを再取得してデプロイ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300">
                <CheckCircle className="w-5 h-5 text-orange-600" />
                <AlertDescription className="text-sm">
                  <strong className="text-orange-900">🎯 こんな時に使用:</strong><br/>
                  ✅ ファイル整理・リファクタリング後<br/>
                  ✅ 大規模なフォルダ構造変更後<br/>
                  ✅ VPSに古いファイルが残っている疑いがある時<br/>
                  ✅ 確実にGitHubと完全一致させたい時
                </AlertDescription>
              </Alert>

              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>✅ 安全機能:</strong><br/>
                  • 自動バックアップ作成<br/>
                  • .env ファイルは自動で保持<br/>
                  • エラー時の自動ロールバック<br/>
                  • すべてのフェーズでログ記録
                </AlertDescription>
              </Alert>

              {!showCleanDeployConfirm ? (
                <Button
                  onClick={handleCleanDeploy}
                  disabled={cleanDeployLoading}
                  className="w-full h-16 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg"
                >
                  <RefreshCw className="w-6 h-6 mr-3" />
                  🧹 完全クリーンデプロイを実行
                </Button>
              ) : (
                <div className="space-y-3">
                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <AlertDescription className="text-sm">
                      <strong>⚠️ 確認:</strong><br/>
                      以下の処理を実行します:<br/>
                      1️⃣ VPSディレクトリをバックアップ<br/>
                      2️⃣ 既存ディレクトリを完全削除<br/>
                      3️⃣ GitHubから完全クローン<br/>
                      4️⃣ .env を復元<br/>
                      5️⃣ npm install<br/>
                      6️⃣ npm run build<br/>
                      7️⃣ PM2再起動<br/>
                      <br/>
                      <strong className="text-green-600">✅ データは完全に保護されます</strong>
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCleanDeploy}
                      disabled={cleanDeployLoading}
                      className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
                    >
                      {cleanDeployLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          実行中...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          はい、実行します
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowCleanDeployConfirm(false)}
                      disabled={cleanDeployLoading}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}

              {cleanDeployLogs.length > 0 && (
                <div className="mt-6">
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    {cleanDeployLogs.map((log, idx) => (
                      <div key={idx} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cleanDeployResult && (
                <Alert variant={cleanDeployResult.success ? 'default' : 'destructive'}>
                  {cleanDeployResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>
                    {cleanDeployResult.message}
                    {cleanDeployResult.backupBranch && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-semibold text-green-700">
                          🔖 GitHubバックアップブランチ:
                        </div>
                        <code className="block text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                          {cleanDeployResult.backupBranch}
                        </code>
                        <div className="text-xs text-muted-foreground">
                          復元方法: git checkout {cleanDeployResult.backupBranch}
                        </div>
                      </div>
                    )}
                    {cleanDeployResult.vpsBackupPath && (
                      <div className="mt-2 text-xs">
                        💾 VPSバックアップ: {cleanDeployResult.vpsBackupPath}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <strong>📚 通常の差分デプロイとの違い:</strong><br/>
                  • 差分デプロイ: git pull（速い、日常使用）<br/>
                  • 完全クリーンデプロイ: 全削除→再クローン（確実、月1回推奨）
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>


          {/* 以下は既存の機能 */}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      {gitStatus.branch || 'main'} ブランチ
                    </Badge>
                    {gitStatus.hasChanges ? (
                      <Badge variant="default" className="bg-yellow-500">
                        {gitStatus.files?.length || 0} ファイル変更あり
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500">
                        変更なし
                      </Badge>
                    )}
                    {/* デバッグ情報 */}
                    <Badge variant="outline" className="text-xs">
                      hasChanges: {String(gitStatus.hasChanges)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      files: {gitStatus.files?.length || 0}
                    </Badge>
                  </div>
                  
                  {/* デバッグパネル */}
                  {(gitStatus as any).debug && (
                    <details className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs">
                      <summary className="cursor-pointer font-medium mb-2">🔍 デバッグ情報を表示</summary>
                      <div className="space-y-2 mt-2">
                        <div>
                          <strong>プロジェクトルート:</strong>
                          <code className="block bg-slate-200 dark:bg-slate-700 p-1 rounded mt-1">
                            {(gitStatus as any).debug.projectRoot}
                          </code>
                        </div>
                        <div>
                          <strong>git status 出力長:</strong> {(gitStatus as any).debug.statusOutputLength} 文字
                        </div>
                        <div>
                          <strong>trim後の長さ:</strong> {(gitStatus as any).debug.statusOutputTrimmedLength} 文字
                        </div>
                        <div>
                          <strong>検出ファイル数:</strong> {(gitStatus as any).debug.filesDetected}
                        </div>
                        <div>
                          <strong>git diff で検出:</strong> {(gitStatus as any).debug.diffFiles?.length || 0} ファイル
                        </div>
                        <div>
                          <strong>未追跡ファイル:</strong> {(gitStatus as any).debug.untrackedFiles?.length || 0} ファイル
                        </div>
                        {(gitStatus as any).debug.rawStatusOutput && (
                          <div>
                            <strong>git status --porcelain の生出力:</strong>
                            <pre className="block bg-slate-200 dark:bg-slate-700 p-2 rounded mt-1 overflow-x-auto">
                              {(gitStatus as any).debug.rawStatusOutput || '(空)'}
                            </pre>
                          </div>
                        )}
                        {(gitStatus as any).debug.longStatus && (
                          <div>
                            <strong>git status (詳細):</strong>
                            <pre className="block bg-slate-200 dark:bg-slate-700 p-2 rounded mt-1 overflow-x-auto text-xs">
                              {(gitStatus as any).debug.longStatus}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  
                  {gitStatus.files && gitStatus.files.length > 0 && (
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
                  
                  {/* 警告メッセージ */}
                  {!gitStatus.hasChanges && gitStatus.files && gitStatus.files.length > 0 && (
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <AlertDescription className="text-xs">
                        ⚠️ デバッグ: ファイルが検出されていますが hasChanges が false です。
                        開発サーバーを再起動してください。
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* コミット済みの変更がある場合 */}
                  {!gitStatus.hasChanges && hasLocalCommits() && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-xs">
                        🚀 ローカルにコミット済みの変更があります。<br/>
                        「Git Push 実行」ボタンでGitHubにプッシュできます（メッセージ不要）
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {!gitStatus.hasChanges && (!gitStatus.files || gitStatus.files.length === 0) && (gitStatus as any).debug && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-xs space-y-1">
                        <p>❌ Git が変更を検出していません</p>
                        <p className="font-medium">考えられる原因:</p>
                        <ul className="list-disc list-inside ml-2">
                          <li>すべての変更が既にコミット済み</li>
                          <li>git add が実行されていない（未ステージング）</li>
                          <li>.gitignore でファイルが除外されている</li>
                        </ul>
                        <p className="mt-2 font-medium">対処法:</p>
                        <p>ターミナルで以下を実行してください:</p>
                        <code className="block bg-slate-100 p-2 rounded mt-1">
                          cd /Users/aritahiroaki/n3-frontend_new<br/>
                          git status
                        </code>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              )}
            </CardContent>
          </Card>

          {/* 同期状態チェックカード */}
          <Card className="border-2 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-900/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-600" />
                  🔍 同期状態チェック
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={checkSyncStatus}
                  disabled={checkingSyncStatus}
                >
                  {checkingSyncStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Mac、Git、VPS の同期状態を確認
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {syncStatus ? (
                <>
                  {syncStatus.error ? (
                    <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription>{syncStatus.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm">
                            {syncStatus.branch} ブランチ
                          </Badge>
                          {syncStatus.status === 'synced' && (
                            <Badge className="bg-green-500">完全同期済み</Badge>
                          )}
                          {syncStatus.status === 'vps-outdated' && (
                            <Badge className="bg-yellow-500">VPSが古い</Badge>
                          )}
                          {syncStatus.status === 'uncommitted' && (
                            <Badge className="bg-orange-500">未コミット</Badge>
                          )}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border space-y-3">
                          <div className="text-sm">
                            <div className="font-medium mb-2">📊 環境別の状態:</div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2">環境</th>
                                  <th className="text-left py-2 px-2">コミット</th>
                                  <th className="text-left py-2 px-2">状態</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b">
                                  <td className="py-2 px-2">🐙 Git</td>
                                  <td className="py-2 px-2 font-mono">{syncStatus.environments.git.commit}</td>
                                  <td className="py-2 px-2">
                                    <Badge variant="outline" className="text-xs">基準</Badge>
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2 px-2">🖥️ VPS</td>
                                  <td className="py-2 px-2 font-mono">{syncStatus.environments.vps.commit}</td>
                                  <td className="py-2 px-2">
                                    {syncStatus.environments.vps.status === 'synced' ? (
                                      <Badge className="bg-green-500 text-xs">✅ 同期</Badge>
                                    ) : syncStatus.environments.vps.status === 'uncommitted' ? (
                                      <Badge className="bg-orange-500 text-xs">⚠️ 未コミット</Badge>
                                    ) : (
                                      <Badge className="bg-yellow-500 text-xs">❌ 古い</Badge>
                                    )}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-2">💻 Mac</td>
                                  <td className="py-2 px-2 font-mono text-slate-400">手動確認</td>
                                  <td className="py-2 px-2">
                                    <Badge variant="outline" className="text-xs">要確認</Badge>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {syncStatus.environments.vps.uncommitted && (
                            <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              <AlertDescription className="text-xs">
                                VPSに未コミットの変更が {syncStatus.environments.vps.uncommittedCount} ファイルあります
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium mb-1">最新コミット:</p>
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            {syncStatus.environments.git.message}
                          </div>
                        </div>

                        {syncStatus.nextAction && (
                          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-xs">
                              <strong>💡 推奨アクション:</strong><br />
                              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                {syncStatus.nextAction}
                              </code>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                        <p className="font-medium">💡 Mac の同期状態を確認するには:</p>
                        <code className="text-xs block bg-slate-100 dark:bg-slate-800 p-2 rounded">
                          cd ~/n3-frontend_new && ./check-sync-status.sh
                        </code>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    同期状態を確認するには右上の更新ボタンをクリック
                  </p>
                  <Button onClick={checkSyncStatus} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    同期状態を確認
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* リモート差分チェックカード */}
          <Card className="border-2 border-indigo-200 dark:border-indigo-800">
            <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  📂 GitHubにあってローカルにないファイル
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={checkRemoteDiff}
                  disabled={checkingRemoteDiff}
                >
                  {checkingRemoteDiff ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                GitHubにあるがローカルに存在しないファイルを確認<br/>
                {remoteDiff?.branch && remoteDiff?.remoteBranch && (
                  <Badge variant="outline" className="text-xs mt-1">
                    比較: {remoteDiff.branch} (local) ↔ {remoteDiff.remoteBranch}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {remoteDiff ? (
                <>
                  {remoteDiff.error ? (
                    <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription>{remoteDiff.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{remoteDiff.onlyInRemote?.length || 0}</div>
                          <div className="text-xs text-muted-foreground">GitHubのみ</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded border border-orange-200">
                          <div className="text-2xl font-bold text-orange-600">{remoteDiff.onlyInLocal?.length || 0}</div>
                          <div className="text-xs text-muted-foreground">ローカルのみ</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">{remoteDiff.modifiedFiles?.length || 0}</div>
                          <div className="text-xs text-muted-foreground">変更あり</div>
                        </div>
                      </div>

                      {remoteDiff.onlyInRemote && remoteDiff.onlyInRemote.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">🆕 GitHubにのみ存在するファイル ({remoteDiff.onlyInRemote.length}件):</p>
                            <Badge className="bg-blue-500">要取得</Badge>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 rounded p-3 max-h-60 overflow-y-auto border">
                            {remoteDiff.onlyInRemote.map((file: string, idx: number) => (
                              <div key={idx} className="text-xs font-mono text-blue-600 dark:text-blue-400 py-1">
                                + {file}
                              </div>
                            ))}
                          </div>
                          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-xs">
                              これらのファイルを取得するには「Git Pull」を実行してください
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}

                      {remoteDiff.onlyInLocal && remoteDiff.onlyInLocal.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">💻 ローカルにのみ存在するファイル ({remoteDiff.onlyInLocal.length}件):</p>
                            <Badge className="bg-orange-500">未プッシュ</Badge>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 rounded p-3 max-h-60 overflow-y-auto border">
                            {remoteDiff.onlyInLocal.map((file: string, idx: number) => (
                              <div key={idx} className="text-xs font-mono text-orange-600 dark:text-orange-400 py-1">
                                - {file}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {remoteDiff.modifiedFiles && remoteDiff.modifiedFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">✏️ 変更されたファイル ({remoteDiff.modifiedFiles.length}件):</p>
                            <Badge className="bg-purple-500">差分あり</Badge>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 rounded p-3 max-h-60 overflow-y-auto border">
                            {remoteDiff.modifiedFiles.map((file: string, idx: number) => (
                              <div key={idx} className="text-xs font-mono text-purple-600 dark:text-purple-400 py-1">
                                M {file}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!remoteDiff.onlyInRemote || remoteDiff.onlyInRemote.length === 0) &&
                       (!remoteDiff.onlyInLocal || remoteDiff.onlyInLocal.length === 0) &&
                       (!remoteDiff.modifiedFiles || remoteDiff.modifiedFiles.length === 0) && (
                        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription>
                            ✅ ローカルとGitHubは完全に同期されています
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="text-xs text-muted-foreground pt-4 border-t">
                        <p className="font-medium mb-1">統計情報:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>GitHub総ファイル数: {remoteDiff.totalRemoteFiles}</div>
                          <div>ローカル総ファイル数: {remoteDiff.totalLocalFiles}</div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    リモート差分を確認するには右上の更新ボタンをクリック
                  </p>
                  <Button onClick={checkRemoteDiff} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    差分を確認
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mac同期カード */}
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-600" />
                💻 Mac同期（ワンクリックコピー）
              </CardTitle>
              <CardDescription>
                Macのローカル環境にGitデータを同期するコマンドをコピー
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <AlertDescription className="text-sm">
                  <strong>📌 Mac同期の手順:</strong><br />
                  1️⃣ 下のボタンをクリック（コマンドがコピーされます）<br />
                  2️⃣ Macのターミナルを開く<br />
                  3️⃣ Cmd+V で貼り付けて Enter<br />
                  4️⃣ 自動的にGitの最新データがMacに反映されます
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border">
                <p className="text-sm font-medium mb-2">実行されるコマンド:</p>
                <code className="text-xs block bg-slate-100 dark:bg-slate-800 p-3 rounded">
                  cd ~/n3-frontend_new && ./sync-mac.sh
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  ※ 初回はMacで git clone が必要です（MAC_SETUP.md参照）
                </p>
              </div>

              <Button
                onClick={copyMacSyncCommand}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {macCommandCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    コピー完了！
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4 mr-2" />
                    Mac同期コマンドをコピー
                  </>
                )}
              </Button>

              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-xs">
                  <strong>⚠️ 初回セットアップが必要な場合:</strong><br />
                  Macでまだ git clone していない場合は、<br />
                  MAC_SETUP.md を参照して初回セットアップを実行してください。
                </AlertDescription>
              </Alert>

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Mac同期の仕組み:</p>
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  Mac (~/n3-frontend_new)<br />
                  ↓ sync-mac.sh 実行<br />
                  ↓ git push<br />
                  GitHub<br />
                  ↓ git pull<br />
                  VPS (本番環境)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mac完全同期カード */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-orange-600" />
                🔄 Mac完全同期（クリーンインストール）
              </CardTitle>
              <CardDescription>
                GitHubから全て取り直す（トラブル時用）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-sm">
                  <strong>⚠️ 完全同期が必要な時:</strong><br />
                  • CSSが効かない<br />
                  • 設定ファイルが足りない<br />
                  • 確実に最新にしたい
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 p-4 rounded border">
                <p className="text-sm font-medium mb-2">実行される処理:</p>
                <div className="text-xs space-y-1">
                  <p>1. 現在のフォルダをバックアップ</p>
                  <p>2. GitHubから全てクローン</p>
                  <p>3. npm install実行</p>
                  <p>4. 完了</p>
                </div>
              </div>

              <Button
                onClick={copyMacFullSyncCommand}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {macFullSyncCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    コピー完了！
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4 mr-2" />
                    完全同期コマンドをコピー
                  </>
                )}
              </Button>

              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-xs">
                  <strong>💾 安全:</strong> 現在のフォルダは自動バックアップ
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Git完全同期カード */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                🔄 Git完全同期（Git → ローカル）
              </CardTitle>
              <CardDescription>
                Gitの最新データをローカルに安全に取り込みます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <strong>📌 推奨ワークフロー:</strong><br />
                  1️⃣ この機能でGitの最新データをローカルに同期<br />
                  2️⃣ ローカルで完全に開発・テスト<br />
                  3️⃣ 一度だけGitにプッシュ<br />
                  4️⃣ VPSにデプロイ
                </AlertDescription>
              </Alert>

              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>✅ データ保護機能:</strong><br />
                  • ローカル変更は必ずGitに保存<br />
                  • Gitの既存データは損なわれない<br />
                  • すべての履歴はGitのコミット履歴に保存<br />
                  • 復元: git reflog で過去の状態を確認可能<br />
                  <strong>→ ローカルもGitも両方保護！損失ゼロ！</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label className="text-base font-semibold">同期モードを選択</Label>

                <div
                  onClick={() => setSyncMode('safe')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    syncMode === 'safe'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={syncMode === 'safe'}
                      onChange={() => setSyncMode('safe')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        安全モード（推奨）✅
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ローカル→Git保存 → Git→ローカル取得（通常のGitフロー）
                      </p>
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-2 inline-block">
                        git commit → git push → git pull
                      </code>
                      <p className="text-xs text-green-600 mt-1">
                        💾 データ保護: すべてGitのコミット履歴に保存
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setSyncMode('force')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    syncMode === 'force'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={syncMode === 'force'}
                      onChange={() => setSyncMode('force')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        上書きモード（危険）
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ローカル変更を破棄 → Gitと完全一致
                      </p>
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-2 inline-block">
                        git reset --hard → git pull
                      </code>
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ 警告: 未コミットの変更は失われます
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {!showSyncConfirm ? (
                <Button
                  onClick={handleSyncFromGit}
                  disabled={syncing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Gitからローカルに同期
                </Button>
              ) : (
                <div className="space-y-3">
                  <Alert variant={syncMode === 'safe' ? 'default' : 'destructive'}>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      {syncMode === 'safe' && (
                        <>
                          <strong>✅ 安全モード:</strong><br />
                          1. ローカル変更を自動コミット<br />
                          2. ローカルをGitにプッシュ<br />
                          3. Gitから最新データを取得<br />
                          <strong className="text-green-600">→ すべての変更はGitに保存されます</strong><br />
                          <span className="text-xs">復元方法: git reflog で履歴確認</span>
                        </>
                      )}
                      {syncMode === 'force' && (
                        <>
                          <strong>⚠️ 上書きモード:</strong><br />
                          1. ローカル変更を破棄<br />
                          2. Gitと完全一致させる<br />
                          <strong className="text-red-600">⚠️ 未コミットの変更は失われます！</strong><br />
                          <strong>本当に実行しますか？</strong>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSyncFromGit}
                      disabled={syncing}
                      variant={syncMode === 'force' ? 'destructive' : 'default'}
                      className="flex-1"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          同期中...
                        </>
                      ) : (
                        <>実行する</>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowSyncConfirm(false)}
                      variant="outline"
                      disabled={syncing}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}

              {syncSteps.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                  <p className="font-medium text-sm mb-2">実行ログ:</p>
                  <div className="space-y-1">
                    {syncSteps.map((step, idx) => (
                      <div key={idx} className="text-xs font-mono">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-xs">
                  <strong>💡 いつ使う？</strong><br />
                  • Claude Codeで変更した後、Macで開発を続けたい<br />
                  • 他のメンバーがプッシュした後、最新を取得したい<br />
                  • Mac開発を始める前に最新を取得したい<br /><br />
                  <strong>📚 復元方法:</strong><br />
                  git reflog → git reset --hard HEAD@&#123;n&#125;
                </AlertDescription>
              </Alert>
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
                    disabled={!gitStatus?.hasChanges && !hasLocalCommits()}
                  />
                  {(!gitStatus?.hasChanges && !hasLocalCommits()) ? (
                    <p className="text-xs text-green-600">
                      ✅ 変更がないため、メッセージは不要です
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      変更内容を具体的に記述してください
                    </p>
                  )}
                </div>
                
                {/* Push不可理由の表示 */}
                {!gitStatus?.hasChanges && !hasLocalCommits() && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-xs space-y-1">
                      <p>✅ すべての変更がGitHubにプッシュ済みです</p>
                      <p className="text-gray-600">
                        ローカルとGitHubは完全に同期されています。<br/>
                        新しい変更を行うと、再度プッシュできるようになります。
                      </p>
                      {(gitStatus as any)?.debug?.longStatus?.includes('up to date') && (
                        <p className="text-green-700 font-medium mt-2">
                          🎉 GitHubと完全同期: {gitStatus.branch}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {gitStatus?.hasChanges && !commitMessage.trim() && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      ⚠️ コミットメッセージを入力してください
                    </AlertDescription>
                  </Alert>
                )}

                {(!gitStatus?.hasChanges && !hasLocalCommits()) ? (
                  <Button 
                    disabled={true}
                    className="w-full bg-gray-400 cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    プッシュ済み（変更なし）
                  </Button>
                ) : (
                  <Button 
                    onClick={handleGitPush} 
                    disabled={loading}
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
                        {hasLocalCommits() && 
                          !gitStatus?.hasChanges && 
                          ' (コミット済みをプッシュ)'}
                      </>
                    )}
                  </Button>
                )}

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
                  VPS デプロイ（手動）
                </CardTitle>
                <CardDescription>
                  手動でVPSにSSH接続してデプロイ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Badge variant="outline">https://n3.emverze.com</Badge>
                  <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-xs">
                      自動デプロイは利用できません。<br />
                      このボタンでデプロイコマンドを表示します。
                    </AlertDescription>
                  </Alert>
                </div>

                <Button
                  onClick={handleVPSDeploy}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      確認中...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4 mr-2" />
                      デプロイコマンドを表示
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">VPSで実行するコマンド：</p>
                  <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    ssh ubuntu@n3.emverze.com<br/>
                    cd /home/ubuntu/n3-frontend_new<br/>
                    git pull origin main<br/>
                    npm install<br/>
                    npm run build<br/>
                    pm2 restart n3-frontend
                  </code>
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    Git Pushが完了してからVPSにデプロイしてください
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

      {/* クリーンアップタブ */}
      {activeTab === 'cleanup' && <CleanupTab />}

      {/* ガバナンスタブ */}
      {activeTab === 'governance' && <GovernanceTab />}

      {/* データベースタブ */}
      {activeTab === 'database' && <DatabaseTab />}
    </div>
  )
}
