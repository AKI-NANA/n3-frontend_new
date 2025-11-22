'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  GitBranch,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Eye,
  Download,
  Upload,
  GitMerge,
  Copy,
  ExternalLink
} from 'lucide-react'

interface DiffFile {
  path: string
  status: 'local-only' | 'remote-only' | 'modified' | 'conflict'
  localHash?: string
  remoteHash?: string
}

interface SyncStatus {
  localBranch: string
  remoteBranch: string
  localCommits: number
  remoteCommits: number
  diverged: boolean
  files: DiffFile[]
}

export default function LocalSyncTab() {
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showInvestigationQuery, setShowInvestigationQuery] = useState(false)
  const [investigationQuery, setInvestigationQuery] = useState('')
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)

  // 差分をチェック
  const checkDiff = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/git/local-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-diff' })
      })
      const data = await res.json()
      if (data.success) {
        setSyncStatus(data.status)
        setLastCheckTime(new Date())
      } else {
        alert(`エラー: ${data.message}`)
      }
    } catch (error) {
      alert(`エラー: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // ファイル選択トグル
  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    )
  }

  // 全選択/全解除
  const toggleAllFiles = () => {
    if (!syncStatus) return
    if (selectedFiles.length === syncStatus.files.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(syncStatus.files.map(f => f.path))
    }
  }

  // 調査クエリ生成
  const generateInvestigationQuery = () => {
    if (!syncStatus) return

    const localOnlyFiles = syncStatus.files.filter(f => f.status === 'local-only')
    const modifiedFiles = syncStatus.files.filter(f => f.status === 'modified')
    const conflictFiles = syncStatus.files.filter(f => f.status === 'conflict')

    let query = `# ローカル環境調査クエリ (Generated: ${new Date().toLocaleString('ja-JP')})\n\n`
    query += `## 同期状況\n`
    query += `- ローカルブランチ: ${syncStatus.localBranch}\n`
    query += `- リモートブランチ: ${syncStatus.remoteBranch}\n`
    query += `- ローカルコミット: ${syncStatus.localCommits}件\n`
    query += `- リモートコミット: ${syncStatus.remoteCommits}件\n`
    query += `- 分岐状態: ${syncStatus.diverged ? 'あり（要注意）' : 'なし'}\n\n`

    if (localOnlyFiles.length > 0) {
      query += `## ローカルのみに存在するファイル (${localOnlyFiles.length}件)\n\n`
      query += `以下のファイルについて調査してください:\n\n`
      localOnlyFiles.forEach(f => {
        query += `### ${f.path}\n`
        query += `- [ ] ファイルの内容を確認\n`
        query += `- [ ] 使用状況を調査（importされているか、どこから参照されているか）\n`
        query += `- [ ] リモートに追加すべきか判断\n`
        query += `- [ ] 判断理由:\n\n`
      })
    }

    if (modifiedFiles.length > 0) {
      query += `\n## 両方で変更されているファイル (${modifiedFiles.length}件)\n\n`
      query += `以下のファイルの差分を確認してください:\n\n`
      modifiedFiles.forEach(f => {
        query += `### ${f.path}\n`
        query += `\`\`\`bash\n`
        query += `# ローカルで実行:\ngit diff origin/${syncStatus.remoteBranch} -- ${f.path}\n`
        query += `\`\`\`\n`
        query += `- [ ] 差分の内容を確認\n`
        query += `- [ ] ローカルの変更が重要か判断\n`
        query += `- [ ] リモートの変更と競合するか確認\n`
        query += `- [ ] 推奨される統合方法:\n\n`
      })
    }

    if (conflictFiles.length > 0) {
      query += `\n## コンフリクトファイル (${conflictFiles.length}件)\n\n`
      query += `⚠️ 以下のファイルは慎重な対応が必要です:\n\n`
      conflictFiles.forEach(f => {
        query += `### ${f.path}\n`
        query += `- [ ] 両方の変更内容を詳細に確認\n`
        query += `- [ ] マージ戦略を決定（手動マージ、一方を優先、など）\n`
        query += `- [ ] マージ後のテスト計画を立てる\n\n`
      })
    }

    query += `\n## 調査完了後の報告フォーマット\n\n`
    query += `調査が完了したら、以下の情報をWeb Claude に報告してください:\n\n`
    query += `1. **追加すべきファイル**: [ファイル名のリスト]\n`
    query += `2. **削除すべきファイル**: [ファイル名のリスト]\n`
    query += `3. **手動マージが必要なファイル**: [ファイル名と理由]\n`
    query += `4. **その他の推奨事項**: [自由記述]\n`

    setInvestigationQuery(query)
    setShowInvestigationQuery(true)
  }

  // クエリをクリップボードにコピー
  const copyQueryToClipboard = () => {
    navigator.clipboard.writeText(investigationQuery)
    alert('クエリをクリップボードにコピーしました')
  }

  // ポーリング開始/停止
  const togglePolling = () => {
    setPollingEnabled(!pollingEnabled)
    if (!pollingEnabled) {
      // ポーリング開始
      const interval = setInterval(() => {
        checkDiff()
      }, 10800000) // 3時間ごと
      ;(window as any).__syncPollingInterval = interval
    } else {
      // ポーリング停止
      clearInterval((window as any).__syncPollingInterval)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            ローカル同期管理
          </CardTitle>
          <CardDescription>
            ローカル環境（Claude Desktop）とVPS環境（Web Claude）の同期状態を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>使い方:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
                <li>「差分をチェック」ボタンで現在の同期状態を確認</li>
                <li>ファイルリストからローカルで調査が必要なファイルを選択</li>
                <li>「調査クエリを生成」でローカルClaude用の調査指示を作成</li>
                <li>ローカルClaudeからの調査結果をもとに安全に統合</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={checkDiff}
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  チェック中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  差分をチェック
                </>
              )}
            </Button>

            <Button
              onClick={togglePolling}
              variant={pollingEnabled ? 'destructive' : 'outline'}
            >
              {pollingEnabled ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  自動チェック停止
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  自動チェック開始 (3時間)
                </>
              )}
            </Button>

            {syncStatus && (
              <Button
                onClick={generateInvestigationQuery}
                variant="secondary"
              >
                <FileText className="w-4 h-4 mr-2" />
                調査クエリを生成
              </Button>
            )}
          </div>

          {lastCheckTime && (
            <p className="text-sm text-muted-foreground">
              最終チェック: {lastCheckTime.toLocaleString('ja-JP')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 同期状態サマリー */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle>同期状態</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">ローカルブランチ</p>
                <p className="text-lg flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  {syncStatus.localBranch}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">リモートブランチ</p>
                <p className="text-lg flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  {syncStatus.remoteBranch}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">ローカルコミット</p>
                <p className="text-lg">{syncStatus.localCommits}件</p>
              </div>
              <div>
                <p className="text-sm font-medium">リモートコミット</p>
                <p className="text-lg">{syncStatus.remoteCommits}件</p>
              </div>
            </div>

            {syncStatus.diverged && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>警告:</strong> ローカルとリモートが分岐しています。
                  両方で異なる変更が行われている可能性があります。
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">ファイル差分 ({syncStatus.files.length}件)</h3>
                <Button
                  onClick={toggleAllFiles}
                  variant="ghost"
                  size="sm"
                >
                  {selectedFiles.length === syncStatus.files.length ? '全解除' : '全選択'}
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {syncStatus.files.map((file, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFiles.includes(file.path)
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleFileSelection(file.path)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.path)}
                            onChange={() => toggleFileSelection(file.path)}
                            className="cursor-pointer"
                          />
                          <code className="text-sm break-all">{file.path}</code>
                        </div>
                      </div>
                      <Badge
                        variant={
                          file.status === 'conflict'
                            ? 'destructive'
                            : file.status === 'modified'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {file.status === 'local-only' && 'ローカルのみ'}
                        {file.status === 'remote-only' && 'リモートのみ'}
                        {file.status === 'modified' && '両方で変更'}
                        {file.status === 'conflict' && 'コンフリクト'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 調査クエリ表示 */}
      {showInvestigationQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ローカルClaude調査クエリ</span>
              <Button
                onClick={copyQueryToClipboard}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                コピー
              </Button>
            </CardTitle>
            <CardDescription>
              以下のクエリをローカルのClaude Desktop にコピー&amp;ペーストして調査を依頼してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-gray-100 rounded-lg overflow-x-auto text-sm max-h-[500px] overflow-y-auto">
              {investigationQuery}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 使用ガイド */}
      {!syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Local Sync の仕組み</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                環境の理解
              </h3>
              <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
                <li><strong>ローカル環境:</strong> あなたのPC上のGitリポジトリ（Claude Desktopが操作）</li>
                <li><strong>VPS環境:</strong> /home/user/n3-frontend_new/ のGitリポジトリ（Web Claudeが操作）</li>
                <li><strong>GitHub:</strong> 両環境の中心となるリモートリポジトリ</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                同期フロー
              </h3>
              <ol className="ml-6 list-decimal space-y-1 text-sm text-muted-foreground">
                <li>ローカルで開発 → git commit → git push (GitHub へ)</li>
                <li>VPSで「差分をチェック」→ リモートの変更を検出</li>
                <li>調査クエリを生成 → ローカルClaude に調査依頼</li>
                <li>調査結果をもとに安全に git pull または手動マージ</li>
                <li>VPSで開発 → git commit → git push (GitHub へ)</li>
                <li>ローカルで git pull → 最新状態に更新</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                注意事項
              </h3>
              <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
                <li>同じファイルを両方で同時に編集すると競合が発生します</li>
                <li>自動チェック機能を使うと、3時間ごとに差分を確認できます（システム監視も兼ねています）</li>
                <li>重要な変更の前には必ずバックアップを取ってください</li>
                <li>コンフリクトが発生した場合は、慎重に手動マージしてください</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
