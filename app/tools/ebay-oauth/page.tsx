"use client"

import { useState } from 'react'
import { Shield, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Copy, FileText } from 'lucide-react'

export default function EbayOAuthPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleTestToken = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ebay/auth/test-token')
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'テストに失敗しました'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartAuth = () => {
    window.location.href = '/api/ebay/auth/authorize'
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              eBay OAuth認証管理
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            eBay APIのリフレッシュトークンを管理・更新します
          </p>
        </div>

        {/* アクションカード */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* トークンテスト */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                トークン動作確認
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              現在のリフレッシュトークンが正常に動作するか確認します
            </p>
            <button
              onClick={handleTestToken}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  テスト中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  トークンをテスト
                </>
              )}
            </button>

            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                    }`}>
                      {testResult.message || (testResult.success ? '✅ 正常に動作しています' : '❌ エラーが発生しました')}
                    </p>
                    {testResult.environment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        環境: {testResult.environment}
                      </p>
                    )}
                    {testResult.expires_in_hours && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        アクセストークン有効期限: {testResult.expires_in_hours}時間
                      </p>
                    )}
                    {testResult.error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        エラー: {testResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 認証開始 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                トークン更新
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              リフレッシュトークンの有効期限が切れた場合、または新しいトークンが必要な場合に使用します
            </p>
            <button
              onClick={handleStartAuth}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              認証を開始
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              ※ eBayにログインして、アプリケーションを許可する必要があります
            </p>
          </div>
        </div>

        {/* マニュアルセクション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              使用方法
            </h2>
          </div>

          {/* トークン更新手順 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              リフレッシュトークンの更新手順
            </h3>
            <div className="space-y-3 pl-8">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-semibold">①</span>
                <p className="text-gray-700 dark:text-gray-300">
                  「認証を開始」ボタンをクリック
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-semibold">②</span>
                <p className="text-gray-700 dark:text-gray-300">
                  eBayにログインし、アプリケーションを許可
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-semibold">③</span>
                <p className="text-gray-700 dark:text-gray-300">
                  画面に表示されるリフレッシュトークンをコピー
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-semibold">④</span>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    VPSで <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">ecosystem.config.js</code> を更新:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`nano ecosystem.config.js
# EBAY_REFRESH_TOKENの値を新しいトークンに置き換え`}
                  </pre>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-semibold">⑤</span>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    PM2を再起動:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`pm2 restart n3-frontend`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* トークンの種類 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              トークンの種類と有効期限
            </h3>
            <div className="grid md:grid-cols-2 gap-4 pl-8">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  リフレッシュトークン
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>• 有効期限: <strong>18ヶ月</strong></li>
                  <li>• 用途: アクセストークンの取得</li>
                  <li>• 次回更新: 2026年4月頃</li>
                </ul>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  アクセストークン
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>• 有効期限: <strong>2時間</strong></li>
                  <li>• 用途: eBay API呼び出し</li>
                  <li>• 自動更新: 必要時に再取得</li>
                </ul>
              </div>
            </div>
          </div>

          {/* トラブルシューティング */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
              トラブルシューティング
            </h3>
            <div className="space-y-4 pl-8">
              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  エラー: "invalid_grant"
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  原因: リフレッシュトークンが無効または期限切れ
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  解決策: 「認証を開始」から新しいトークンを取得してください
                </p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  エラー: "unauthorized_client"
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  原因: App IDまたはRedirect URIの不一致
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  解決策: eBay Developer Portalで設定を確認してください
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 関連リンク */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            関連リンク
          </h3>
          <div className="space-y-2">
            <a
              href="https://developer.ebay.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ExternalLink className="w-4 h-4" />
              eBay Developer Portal
            </a>
            <a
              href="https://developer.ebay.com/api-docs/static/oauth-tokens.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ExternalLink className="w-4 h-4" />
              eBay OAuth Documentation
            </a>
            <a
              href="https://github.com/AKI-NANA/n3-frontend_new/blob/main/docs/EBAY_OAUTH_SETUP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <FileText className="w-4 h-4" />
              完全なドキュメント (GitHub)
            </a>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>最終更新: 2025年10月23日</p>
          <p className="mt-1">次回トークン更新予定: 2026年4月頃</p>
        </div>
      </div>
    </div>
  )
}
