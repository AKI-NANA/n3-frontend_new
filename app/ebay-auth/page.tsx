'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Key, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EbayAuthPage() {
  const handleAuthorize = () => {
    // OAuth認証フローを開始
    window.open('/api/ebay/auth/authorize', '_blank', 'width=800,height=600')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Key className="w-8 h-8" />
            eBay OAuth認証
          </h1>
          <p className="text-sm opacity-90">
            eBay APIアクセス用のRefresh Tokenを取得
          </p>
        </div>

        {/* 重要な注意事項 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-bold mb-2">📌 重要な手順</div>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>下記のボタンをクリックしてeBay認証ページを開く</li>
              <li>対象のeBay販売アカウント（MJT or green）でログイン</li>
              <li>アプリケーションを承認</li>
              <li>表示されたRefresh Tokenをコピー</li>
              <li>.env.localファイルに貼り付けて保存</li>
              <li>開発サーバーを再起動</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* 認証ボタン */}
        <Card>
          <CardHeader>
            <CardTitle>🔐 eBay認証を開始</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              このボタンをクリックすると、eBayの認証ページが新しいウィンドウで開きます。<br />
              MJTまたはgreenアカウントでログインして、アプリケーションを承認してください。
            </p>

            <Button
              onClick={handleAuthorize}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              eBay認証ページを開く
            </Button>

            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-semibold">認証後:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>MJTアカウントの場合: <code className="bg-gray-100 px-1">EBAY_REFRESH_TOKEN_MJT</code>に設定</li>
                <li>greenアカウントの場合: <code className="bg-gray-100 px-1">EBAY_REFRESH_TOKEN_GREEN</code>に設定</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 環境変数の設定方法 */}
        <Card>
          <CardHeader>
            <CardTitle>📝 .env.local設定方法</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-green-400 mb-2"># eBay API - 本番環境</div>
                <div>EBAY_CLIENT_ID_MJT=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce</div>
                <div>EBAY_CLIENT_SECRET_MJT=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4</div>
                <div className="text-yellow-400">EBAY_REFRESH_TOKEN_MJT=ここに取得したトークンを貼り付け</div>
                <div className="mt-3">EBAY_CLIENT_ID_GREEN=HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce</div>
                <div>EBAY_CLIENT_SECRET_GREEN=PRD-7fae13b2cf17-be72-4584-bdd6-4ea4</div>
                <div className="text-yellow-400">EBAY_REFRESH_TOKEN_GREEN=ここに取得したトークンを貼り付け</div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>⚠️ 注意:</strong> .env.localファイルを更新した後は、開発サーバーを再起動してください（Ctrl+Cで停止 → npm run dev）
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* トークンの有効期限 */}
        <Card>
          <CardHeader>
            <CardTitle>⏱️ トークン情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold">Access Token有効期限:</span>
                <span>2時間</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold">Refresh Token有効期限:</span>
                <span className="text-green-600 font-bold">18ヶ月</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※ Refresh Tokenは自動的にAccess Tokenを更新するため、18ヶ月間は再認証不要です
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
