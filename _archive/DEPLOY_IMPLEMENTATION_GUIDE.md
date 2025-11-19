# 差分デプロイ vs 完全クリーンデプロイ 実装完了レポート

## 実装内容

### 1. API実装 ✅

#### `/app/api/deploy/clean-vps/route.ts`
VPSの完全クリーンアップ（.env保持）
- プロジェクトディレクトリを完全削除
- .envファイルは一時ディレクトリに退避して保持
- ディレクトリ再作成後に.envを復元

#### `/app/api/deploy/clean-deploy/route.ts`
GitHubから完全再クローン＋デプロイ
- 自動バックアップ作成
- 既存ディレクトリ削除
- GitHubから完全クローン
- .env復元
- npm install
- npm run build
- PM2再起動
- エラー時の自動ロールバック

### 2. UI実装（手動で追加が必要）

#### CleanupTab（削除タブ）
以下のコードを追加してください：

```tsx
// VPS完全クリーンアップ用の状態（既存の状態定義の下に追加）
const [vpsCleanLoading, setVpsCleanLoading] = useState(false)
const [vpsCleanResult, setVpsCleanResult] = useState<any>(null)
const [showVpsCleanConfirm, setShowVpsCleanConfirm] = useState(false)

// VPS完全クリーンアップ関数
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

// JSX（既存のCard要素の下に追加）
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
        • 削除後は「入れる」タブでデプロイが必要です
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
```

#### page.tsx（デプロイタブ - 入れる）
既存の「VPSデプロイ実行」ボタンの下に以下を追加：

```tsx
// 完全クリーンデプロイ用の状態（既存の状態定義の下に追加）
const [cleanDeployLoading, setCleanDeployLoading] = useState(false)
const [cleanDeployResult, setCleanDeployResult] = useState<any>(null)
const [showCleanDeployConfirm, setShowCleanDeployConfirm] = useState(false)
const [cleanDeployWithBackup, setCleanDeployWithBackup] = useState(true)

// 完全クリーンデプロイ関数
const handleCleanDeploy = async () => {
  if (!showCleanDeployConfirm) {
    setShowCleanDeployConfirm(true)
    return
  }

  setCleanDeployLoading(true)
  setCleanDeployResult(null)

  try {
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
    setCleanDeployResult({
      success: response.ok,
      message: data.message,
      results: data.results,
      backupPath: data.backupPath
    })
  } catch (error) {
    setCleanDeployResult({
      success: false,
      message: '完全クリーンデプロイに失敗しました'
    })
  } finally {
    setCleanDeployLoading(false)
    setShowCleanDeployConfirm(false)
  }
}

// JSX（既存のVPSデプロイカードの下に追加）
<Card className="border-4 border-gradient-to-r from-orange-500 to-red-500 shadow-xl">
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

    {cleanDeployResult && (
      <Alert variant={cleanDeployResult.success ? 'default' : 'destructive'}>
        {cleanDeployResult.success ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        <AlertDescription>
          {cleanDeployResult.message}
          {cleanDeployResult.results && (
            <div className="mt-2 space-y-1 text-xs">
              {cleanDeployResult.results.map((r: any, idx: number) => (
                <div key={idx}>
                  {r.success ? '✅' : '❌'} {r.phase}: {r.stdout || r.error}
                </div>
              ))}
            </div>
          )}
          {cleanDeployResult.backupPath && (
            <div className="mt-2 text-xs">
              💾 バックアップ: {cleanDeployResult.backupPath}
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
```

## 使い分けガイド

### 差分デプロイ（日常使用）
- **タイミング**: 毎日〜週1回
- **用途**: 小規模な修正、機能追加
- **メリット**: 速い（1-2分）
- **デメリット**: 古いファイルが残る可能性

### 完全クリーンデプロイ（大規模変更後）
- **タイミング**: 月1回、またはリファクタリング後
- **用途**: フォルダ整理、大規模な構造変更
- **メリット**: 確実にGitHubと一致
- **デメリット**: 遅い（5-10分）

## VPS設定情報

```bash
SSH Host: tk2-236-27682.vs.sakura.ne.jp
SSH User: ubuntu
Project Path: ~/n3-frontend_new
GitHub Repo: https://github.com/AKI-NANA/n3-frontend_new.git
```

## 次のステップ

1. CleanupTab.tsxに「VPSクリーンアップ」コードを追加
2. page.tsxに「完全クリーンデプロイ」コードを追加
3. 動作確認（まずはローカルで npm run dev）
4. Git commit & push
5. 実際のVPSで完全クリーンデプロイをテスト

## 注意事項

- 必ずGit commitしてからデプロイすること
- 完全クリーンデプロイは時間がかかるので余裕がある時に
- エラーが発生した場合はバックアップから復元可能
- .envファイルは自動で保持されるが、念のため手動バックアップ推奨
