'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileX,
  Save,
  Database
} from 'lucide-react'

export default function CleanupTab() {
  const [cleanupData, setCleanupData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [updateGitignore, setUpdateGitignore] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  
  // バックアップ関連の状態
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupResult, setBackupResult] = useState<any>(null)
  const [backupList, setBackupList] = useState<any>(null)
  const [loadingBackupList, setLoadingBackupList] = useState(false)
  const [githubBackupCreated, setGithubBackupCreated] = useState(false)
  const [cleanLoading, setCleanLoading] = useState(false)
  const [cleanResult, setCleanResult] = useState<any>(null)
  // リセット関連の状態
  const [resetLoading, setResetLoading] = useState(false)
  const [resetResult, setResetResult] = useState<any>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  
  // VPS完全クリーンアップ用の状態
  const [vpsCleanLoading, setVpsCleanLoading] = useState(false)
  const [vpsCleanResult, setVpsCleanResult] = useState<any>(null)
  const [showVpsCleanConfirm, setShowVpsCleanConfirm] = useState(false)

  // バックアップ一覧を取得
  useEffect(() => {
    loadBackupList()
  }, [])

  const loadBackupList = async () => {
    setLoadingBackupList(true)
    try {
      const response = await fetch('/api/git/backup')
      const data = await response.json()
      if (data.success) {
        setBackupList(data.data)
      }
    } catch (error) {
      console.error('Failed to load backup list:', error)
    } finally {
      setLoadingBackupList(false)
    }
  }

  const handleLocalBackup = async () => {
    setBackupLoading(true)
    setBackupResult(null)
    try {
      const response = await fetch('/api/git/backup', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setBackupResult({
          success: true,
          message: data.data.message,
          data: data.data
        })
        await loadBackupList()
      } else {
        setBackupResult({
          success: false,
          message: data.error
        })
      }
    } catch (error) {
      console.error('Local backup failed:', error)
      setBackupResult({
        success: false,
        message: 'ローカルバックアップに失敗しました'
      })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleGitHubBackup = async () => {
    console.log('🐙 GitHubバックアップ開始...')
    setBackupLoading(true)
    setBackupResult(null)
    setGithubBackupCreated(false)
    try {
      console.log('API呼び出し: /api/git/backup-github')
      const response = await fetch('/api/git/backup-github', { method: 'POST' })
      console.log('APIレスポンス:', response.status)
      const data = await response.json()
      console.log('APIデータ:', data)
      
      if (data.success && data.data.verified) {
        console.log('✅ GitHubバックアップが検証されました')
        setBackupResult({
          success: true,
          message: data.data.message,
          data: data.data
        })
        setGithubBackupCreated(true)
      } else {
        console.error('❌ GitHubバックアップの検証に失敗:', data.error || '検証フラグがfalse')
        setBackupResult({
          success: false,
          message: data.error || 'GitHubバックアップの検証に失敗しました'
        })
      }
    } catch (error) {
      console.error('❌ GitHubバックアップ例外:', error)
      setBackupResult({
        success: false,
        message: 'GitHubバックアップに失敗しました'
      })
    } finally {
      setBackupLoading(false)
      console.log('🐙 GitHubバックアップ終了')
    }
  }

  const handleCleanRepository = async () => {
    setCleanLoading(true)
    setCleanResult(null)
    try {
      const response = await fetch('/api/git/clean-repository', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setCleanResult({
          success: true,
          message: 'リポジトリクリーンアップ完了！',
          data: data.data
        })
      } else {
        setCleanResult({
          success: false,
          message: data.error
        })
      }
    } catch (error) {
      console.error('Clean repository failed:', error)
      setCleanResult({
        success: false,
        message: 'クリーンアップに失敗しました'
      })
    } finally {
      setCleanLoading(false)
    }
  }

  const handleResetMain = async () => {
    if (!backupResult?.data?.branchName) {
      setResetResult({
        success: false,
        message: 'バックアップブランチ名が見つかりません'
      })
      return
    }

    if (!confirm('⚠️ 警告: mainブランチを完全リセットします。\n\nこの操作は元に戻せません。\n\n本当に実行しますか？')) {
      return
    }

    setResetLoading(true)
    setResetResult(null)
    try {
      const response = await fetch('/api/git/reset-main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupBranchName: backupResult.data.branchName
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setResetResult({
          success: true,
          message: data.data.message,
          data: data.data
        })
      } else {
        setResetResult({
          success: false,
          message: data.error
        })
      }
    } catch (error) {
      console.error('Reset main failed:', error)
      setResetResult({
        success: false,
        message: 'mainブランチのリセットに失敗しました'
      })
    } finally {
      setResetLoading(false)
    }
  }

  const handleVerifyBackup = async () => {
    if (!backupResult?.data?.branchName) {
      setVerifyResult({
        success: false,
        message: 'バックアップブランチ名が見つかりません'
      })
      return
    }

    setVerifyLoading(true)
    setVerifyResult(null)
    try {
      const response = await fetch('/api/git/verify-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: backupResult.data.branchName
        })
      })
      const data = await response.json()
      
      if (data.success && data.exists) {
        setVerifyResult({
          success: true,
          exists: true,
          verified: data.verified,
          message: data.data.message,
          data: data.data
        })
      } else {
        setVerifyResult({
          success: false,
          exists: data.exists || false,
          message: data.message || data.error
        })
      }
    } catch (error) {
      console.error('Verify backup failed:', error)
      setVerifyResult({
        success: false,
        message: 'バックアップの確認に失敗しました'
      })
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleVpsClean = async () => {
    if (!showVpsCleanConfirm) {
      setShowVpsCleanConfirm(true)
      return
    }

    setVpsCleanLoading(true)
    setVpsCleanResult(null)
    
    try {
      const response = await fetch('/api/deploy/clean-vps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sshHost: 'tk2-236-27682.vs.sakura.ne.jp',
          sshUser: 'ubuntu',
          projectPath: '~/n3-frontend_new'
        })
      })

      const data = await response.json()
      setVpsCleanResult({
        success: response.ok,
        message: data.message,
        results: data.results
      })
    } catch (error) {
      setVpsCleanResult({
        success: false,
        message: 'VPSクリーンアップに失敗しました'
      })
    } finally {
      setVpsCleanLoading(false)
      setShowVpsCleanConfirm(false)
    }
  }

  const checkUnnecessaryFiles = async () => {
    setLoading(true)
    setCleanupResult(null)
    try {
      const response = await fetch('/api/git/cleanup')
      const data = await response.json()
      
      if (data.success) {
        setCleanupData(data.data)
        // デフォルトで全カテゴリを選択
        setSelectedCategories(data.data.categories.map((c: any) => c.name))
      } else {
        setCleanupResult({ success: false, message: data.error })
      }
    } catch (error) {
      console.error('Cleanup check failed:', error)
      setCleanupResult({ 
        success: false, 
        message: 'ファイルチェックに失敗しました' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    setCleanupResult(null)

    try {
      const categoriesToDelete = cleanupData.categories.filter((c: any) => 
        selectedCategories.includes(c.name)
      )

      const response = await fetch('/api/git/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categoriesToDelete,
          updateGitignore
        })
      })

      const data = await response.json()

      if (data.success) {
        setCleanupResult({
          success: true,
          message: `削除成功: ${data.data.deleted.length}カテゴリ`,
          data: data.data
        })
        // 再チェック
        await checkUnnecessaryFiles()
      } else {
        setCleanupResult({
          success: false,
          message: data.error || '削除に失敗しました'
        })
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
      setCleanupResult({
        success: false,
        message: 'クリーンアップに失敗しました'
      })
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(n => n !== categoryName)
        : [...prev, categoryName]
    )
  }

  return (
    <div className="space-y-6">
      {/* バックアップカード - 2種類のオプション */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" />
            💾 バックアップ作成
          </CardTitle>
          <CardDescription>
            作業前に必ずバックアップを作成してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <strong>💾 2種類のバックアップ:</strong><br/>
              1️⃣ <strong>GitHubバックアップ</strong>: GitHub上にバックアップブランチを作成（推奨・軽量）<br/>
              2️⃣ <strong>ローカルバックアップ</strong>: ローカルにフォルダをコピー（念のため）
            </AlertDescription>
          </Alert>

          {/* GitHubバックアップ */}
          <div className="border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">1️⃣ GitHubバックアップ（推奨）</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              GitHub上にバックアップブランチを作成。ディスク容量不要で最も安全。
            </p>
            
            <Button
              onClick={handleGitHubBackup}
              disabled={backupLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {backupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  GitHubにバックアップ作成中...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  🐙 GitHubバックアップを作成
                </>
              )}
            </Button>

            <div className="mt-3 text-xs text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded">
              <strong>💡 復元方法:</strong><br/>
              <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                git checkout backup-before-cleanup-YYYYMMDD
              </code>
            </div>
          </div>

          {/* ローカルバックアップ */}
          <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Save className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">2️⃣ ローカルバックアップ（念のため）</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ローカルに ~/n3-frontend_new をコピー。ディスク容量が必要。
            </p>

            {backupList && backupList.count > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-xs">📁 既存バックアップ</div>
                  <Badge variant="outline" className="text-xs">{backupList.count}個</Badge>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {backupList.backups.slice(0, 3).map((backup: any, idx: number) => (
                    <div key={idx} className="text-xs bg-white dark:bg-slate-800 p-2 rounded">
                      <div className="font-mono text-blue-600 dark:text-blue-400 truncate">{backup.name}</div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>📅 {backup.date}</span>
                        <span>📊 {backup.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              onClick={handleLocalBackup}
              disabled={backupLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {backupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ローカルバックアップ作成中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  💻 ローカルバックアップを作成
                </>
              )}
            </Button>

            <div className="mt-3 text-xs text-muted-foreground bg-white dark:bg-slate-800 p-3 rounded">
              <strong>💡 復元方法:</strong><br/>
              <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                mv バックアップ名 ~/n3-frontend_new
              </code>
            </div>
          </div>

          {/* 結果表示 */}
          {backupResult && (
            <Alert variant={backupResult.success ? 'default' : 'destructive'}>
              {backupResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <AlertDescription>
                {backupResult.message}
                {backupResult.data && backupResult.data.branchName && (
                  <div className="mt-2 text-xs space-y-1">
                    <div>🌿 ブランチ名: <code className="bg-slate-100 px-1 rounded">{backupResult.data.branchName}</code></div>
                    {backupResult.data.commitHash && (
                      <div>🔑 コミットハッシュ: <code className="bg-slate-100 px-1 rounded">{backupResult.data.commitHash.substring(0, 8)}</code></div>
                    )}
                    {backupResult.data.verified && (
                      <div className="text-green-600 font-semibold">✅ GitHub上で検証済み</div>
                    )}
                  </div>
                )}
                {backupResult.data && backupResult.data.backupPath && (
                  <div className="mt-2 text-xs space-y-1">
                    <div>📂 保存場所: {backupResult.data.backupPath}</div>
                    <div>📊 サイズ: {backupResult.data.size}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* GitHubバックアップ確認ボタン */}
          {backupResult && backupResult.success && backupResult.data.branchName && (
            <div className="space-y-3">
              <Button
                onClick={handleVerifyBackup}
                disabled={verifyLoading}
                variant="outline"
                className="w-full"
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    GitHubで確認中...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    🔍 GitHubでバックアップを確認
                  </>
                )}
              </Button>

              {verifyResult && (
                <Alert variant={verifyResult.success && verifyResult.verified ? 'default' : 'destructive'}>
                  {verifyResult.success && verifyResult.verified ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>
                    {verifyResult.message}
                    {verifyResult.data && (
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">🌿 ブランチ:</span>
                          <code className="bg-slate-100 px-2 py-1 rounded">{verifyResult.data.branchName}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">🔑 コミット:</span>
                          <code className="bg-slate-100 px-2 py-1 rounded">{verifyResult.data.commitHashShort}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">📅 日時:</span>
                          <span>{verifyResult.data.commitDate}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-semibold">📝 メッセージ:</span>
                          <span className="flex-1">{verifyResult.data.commitMessage}</span>
                        </div>
                        {verifyResult.data.githubUrl && (
                          <div className="pt-2">
                            <a 
                              href={verifyResult.data.githubUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              🔗 GitHubで見る
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-xs">
              <strong>✅ 推奨:</strong> まず「GitHubバックアップ」を作成してから作業を進めてください。<br/>
              これが最も安全で、ディスク容量も消費しません。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* リポジトリクリーンアップカード */}
      {githubBackupCreated && (
        <Card className="border-4 border-orange-500 dark:border-orange-700">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <RefreshCw className="w-6 h-6 text-orange-600" />
              🧹 リポジトリをクリーンにする
            </CardTitle>
            <CardDescription className="text-base">
              不要ファイルを削除してGit履歴をクリーンに
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Alert className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <AlertDescription className="text-sm">
                <strong className="text-orange-900">✨ この操作でできること:</strong><br/>
                ✅ 不要ファイル（.bak, *_old.*, *_backup.*, _archive/）を削除<br/>
                ✅ .gitignoreを自動更新<br/>
                ✅ Gitキャッシュをクリアして再追加<br/>
                ✅ 変更を自動コミット<br/>
                ✅ リポジトリサイズを最小化
              </AlertDescription>
            </Alert>

            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-300">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-sm">
                ✅ GitHubバックアップが作成済みです。安全に進めます！
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleCleanRepository}
              disabled={cleanLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {cleanLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  クリーンアップ中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  🧹 今すぐリポジトリをクリーンにする
                </>
              )}
            </Button>

            {cleanResult && (
              <Alert variant={cleanResult.success ? 'default' : 'destructive'}>
                {cleanResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  {cleanResult.message}
                  {cleanResult.data && cleanResult.data.logs && (
                    <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono max-h-64 overflow-y-auto">
                      {cleanResult.data.logs.map((log: string, idx: number) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {cleanResult && cleanResult.success && (
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-300">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <strong>🚀 次のステップ:</strong><br/>
                  1. 「デプロイ」タブを開く<br/>
                  2. 「Git Push」ボタンをクリック<br/>
                  3. GitHubにクリーンな状態がプッシュされます
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* タイトルカード */}
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-900/20">
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            🗑️ 不要ファイル検出・削除
          </CardTitle>
          <CardDescription>
            Git追跡されている不要なバックアップファイルを検出して削除
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm">
              <strong>🔍 検出対象:</strong><br />
              *.bak, *.original, *_old.tsx, *_old.ts, *_backup.*, _archive/ ディレクトリ
            </AlertDescription>
          </Alert>

          <Button
            onClick={checkUnnecessaryFiles}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                スキャン中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                不要ファイルをスキャン
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* スキャン結果 */}
      {cleanupData && (
        <>
          {/* サマリー */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 スキャン結果
                <Badge 
                  variant={cleanupData.total > 0 ? "destructive" : "outline"}
                  className="ml-auto"
                >
                  {cleanupData.total}件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cleanupData.total === 0 ? (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    ✅ クリーンな状態です！不要ファイルは見つかりませんでした。
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {cleanupData.categories.map((category: any) => (
                    category.count > 0 && (
                      <div key={category.name} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedCategories.includes(category.name)}
                              onCheckedChange={() => toggleCategory(category.name)}
                            />
                            <div>
                              <div className="font-medium">{category.description}</div>
                              <div className="text-xs text-muted-foreground">
                                パターン: {category.pattern}
                              </div>
                            </div>
                          </div>
                          <Badge variant="destructive">
                            {category.count}件
                          </Badge>
                        </div>

                        {category.files.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer font-medium mb-2">
                              ファイル一覧を表示 ({category.files.length}件
                              {category.hasMore && ' / 最大20件表示'})
                            </summary>
                            <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded max-h-40 overflow-y-auto">
                              {category.files.map((file: string, idx: number) => (
                                <div key={idx} className="font-mono text-red-600 dark:text-red-400">
                                  {file}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )
                  ))}

                  {/* .gitignore ステータス */}
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-sm">📝 .gitignore ステータス</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(cleanupData.gitignoreStatus).map(([pattern, exists]) => (
                        <div key={pattern} className="flex items-center gap-2 text-sm">
                          {exists ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          <code className="flex-1">{pattern}</code>
                          <Badge variant={exists ? "outline" : "destructive"} className="text-xs">
                            {exists ? '登録済み' : '未登録'}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* 推奨アクション */}
                  {cleanupData.recommendations.map((rec: any, idx: number) => (
                    <Alert 
                      key={idx}
                      className={
                        rec.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        rec.type === 'info' ? 'bg-blue-50 border-blue-200' :
                        'bg-green-50 border-green-200'
                      }
                    >
                      <AlertCircle className={`w-4 h-4 ${
                        rec.type === 'warning' ? 'text-yellow-600' :
                        rec.type === 'info' ? 'text-blue-600' :
                        'text-green-600'
                      }`} />
                      <AlertDescription className="text-sm">
                        {rec.message}
                      </AlertDescription>
                    </Alert>
                  ))}

                  {/* 削除アクション */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={updateGitignore}
                        onCheckedChange={(checked) => setUpdateGitignore(!!checked)}
                      />
                      <label className="text-sm cursor-pointer">
                        .gitignore を自動更新（不足しているパターンを追加）
                      </label>
                    </div>

                    {!showConfirm ? (
                      <Button
                        onClick={handleDelete}
                        disabled={loading || selectedCategories.length === 0}
                        className="w-full bg-red-600 hover:bg-red-700"
                        size="lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        選択したファイルを削除 ({selectedCategories.length}カテゴリ)
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Alert variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>⚠️ 最終確認</strong><br />
                            {selectedCategories.length}カテゴリのファイルを削除します。<br />
                            • Git追跡から削除<br />
                            • ローカルファイルシステムからも削除<br />
                            {updateGitignore && '• .gitignore を更新'}
                            <br /><br />
                            <strong>この操作は取り消せません。</strong>
                          </AlertDescription>
                        </Alert>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleDelete}
                            disabled={loading}
                            variant="destructive"
                            className="flex-1"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                削除中...
                              </>
                            ) : (
                              <>はい、削除します</>
                            )}
                          </Button>
                          <Button
                            onClick={() => setShowConfirm(false)}
                            variant="outline"
                            disabled={loading}
                            className="flex-1"
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 結果表示 */}
      {cleanupResult && (
        <Alert variant={cleanupResult.success ? 'default' : 'destructive'}>
          {cleanupResult.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <AlertDescription>
            {cleanupResult.message}
            {cleanupResult.data && (
              <div className="mt-2 space-y-1">
                {cleanupResult.data.deleted.map((item: any, idx: number) => (
                  <div key={idx} className="text-xs">
                    ✅ {item.description}
                  </div>
                ))}
                {cleanupResult.data.gitignoreUpdated && (
                  <div className="text-xs text-green-600">
                    ✅ .gitignore を更新しました
                  </div>
                )}
                {cleanupResult.data.failed.length > 0 && (
                  <div className="text-xs text-red-600">
                    ❌ 失敗: {cleanupResult.data.failed.length}カテゴリ
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* VPS完全クリーンアップ */}
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-900/20">
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            🗑️ VPS完全クリーンアップ（.env保持）
          </CardTitle>
          <CardDescription>
            VPSのプロジェクトディレクトリを完全削除（環境変数は保持）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm">
              <strong>⚠️ 重要:</strong><br/>
              • プロジェクトディレクトリを完全削除します<br/>
              • .env と .env.production は保持されます<br/>
              • 削除後は「デプロイ」タブでデプロイが必要です
            </AlertDescription>
          </Alert>

          {!showVpsCleanConfirm ? (
            <Button
              onClick={handleVpsClean}
              disabled={vpsCleanLoading}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              VPSを完全クリーンアップ
            </Button>
          ) : (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>⚠️ 確認:</strong><br/>
                  VPSのプロジェクトディレクトリを完全削除します。<br/>
                  .env ファイルは保持されます。<br/>
                  <br/>
                  本当に実行しますか？
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  onClick={handleVpsClean}
                  disabled={vpsCleanLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  {vpsCleanLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      削除中...
                    </>
                  ) : (
                    <>はい、削除します</>
                  )}
                </Button>
                <Button
                  onClick={() => setShowVpsCleanConfirm(false)}
                  variant="outline"
                  disabled={vpsCleanLoading}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {vpsCleanResult && (
            <Alert variant={vpsCleanResult.success ? 'default' : 'destructive'}>
              {vpsCleanResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <AlertDescription>
                {vpsCleanResult.message}
                {vpsCleanResult.results && (
                  <div className="mt-2 space-y-1 text-xs">
                    {vpsCleanResult.results.map((r: any, idx: number) => (
                      <div key={idx}>
                        {r.success ? '✅' : '❌'} {r.stdout || r.error}
                      </div>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 使い方ガイド */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📖 使い方</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>1. スキャン:</strong> 「不要ファイルをスキャン」ボタンでGit追跡されている不要ファイルを検出
          </div>
          <div>
            <strong>2. 選択:</strong> 削除したいカテゴリにチェックを入れる（デフォルトは全選択）
          </div>
          <div>
            <strong>3. 削除:</strong> 「選択したファイルを削除」ボタンで実行
          </div>
          <div>
            <strong>4. 確認:</strong> 削除後は自動的に再スキャンされます
          </div>
          
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 mt-4">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs">
              <strong>💡 ヒント:</strong><br />
              • この機能は`.bak`や`*_old.*`などのバックアップファイルのみ対象<br />
              • 実際のソースコードは削除されません<br />
              • `.gitignore`を更新すると、今後同じファイルが追跡されなくなります<br />
              • 削除後は必ず`git commit`と`git push`でGitHubに反映してください
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
