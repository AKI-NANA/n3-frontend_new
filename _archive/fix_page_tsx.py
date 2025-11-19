#!/usr/bin/env python3
"""
Mac上のpage.tsxファイルを直接編集
"""

input_file = '/Users/aritahiroaki/n3-frontend_new/app/tools/git-deploy/page.tsx.backup'
output_file = '/Users/aritahiroaki/n3-frontend_new/app/tools/git-deploy/page.tsx'

try:
    # バックアップファイルを読み込み
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f'📖 読み込み: {len(lines)}行')
    
    # 820行目の後に挿入
    insert_at = 820
    
    insert_code = '''
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

'''
    
    # 挿入
    new_lines = lines[:insert_at] + [insert_code] + lines[insert_at:]
    
    # 書き込み
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f'✅ 完全クリーンデプロイカードを{insert_at}行目の後に挿入しました')
    print(f'📄 出力: {output_file}')
    print(f'📊 元: {len(lines)}行 → 新: {len(new_lines)}行')
    print('')
    print('🔄 ブラウザをリロードして確認してください！')
    
except FileNotFoundError as e:
    print(f'❌ ファイルが見つかりません: {e}')
    print('')
    print('🔧 バックアップファイルが必要です。')
except Exception as e:
    print(f'❌ エラー: {e}')
