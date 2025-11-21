'use client'

/**
 * eBay ブロックバイヤーリスト管理ページ
 * N3参加者向けの統合管理画面
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportBuyerForm } from '@/components/ebay-blocklist/report-buyer-form'
import { PendingReportsList } from '@/components/ebay-blocklist/pending-reports-list'
import { BlocklistStats } from '@/components/ebay-blocklist/blocklist-stats'
import { SyncButton } from '@/components/ebay-blocklist/sync-button'

export default function EbayBlocklistPage() {
  // デモ用: 実際の実装では認証システムからユーザーIDを取得
  const [userId] = useState('demo-user-id')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">eBay ブロックバイヤーリスト管理</h1>
        <p className="text-gray-600">
          N3参加者間で共有するブロックバイヤーリストの管理ツール
        </p>
      </div>

      {/* 統計ダッシュボード */}
      <div>
        <h2 className="text-xl font-semibold mb-4">統計情報</h2>
        <BlocklistStats key={refreshKey} userId={userId} />
      </div>

      {/* 同期ボタン */}
      <Card>
        <CardHeader>
          <CardTitle>ブロックリスト同期</CardTitle>
          <CardDescription>
            承認済みの共有ブロックリストをあなたのeBayアカウントに同期します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncButton userId={userId} onSyncComplete={handleRefresh} />
        </CardContent>
      </Card>

      {/* タブ */}
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report">バイヤーを報告</TabsTrigger>
          <TabsTrigger value="manage">報告を管理</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>問題のあるバイヤーを報告</CardTitle>
              <CardDescription>
                取引で問題が発生したバイヤーを報告してください。
                承認後、N3参加者全員のブロックリストに追加されます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportBuyerForm userId={userId} onSuccess={handleRefresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>ペンディング中の報告</CardTitle>
              <CardDescription>
                他の参加者からの報告を確認し、承認または拒否します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingReportsList key={refreshKey} reviewerId={userId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 使用方法 */}
      <Card>
        <CardHeader>
          <CardTitle>使用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. バイヤーを報告</h3>
            <p className="text-sm text-gray-600">
              問題のあるバイヤーに遭遇した場合は、「バイヤーを報告」タブから報告してください。
              詳しい理由と証拠を提供することで、承認率が上がります。
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. 報告を確認・承認</h3>
            <p className="text-sm text-gray-600">
              「報告を管理」タブで他の参加者からの報告を確認できます。
              報告が適切であれば承認し、不適切であれば拒否してください。
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. eBayに同期</h3>
            <p className="text-sm text-gray-600">
              承認済みのバイヤーリストを「ブロックリスト同期」ボタンでeBayアカウントに反映できます。
              あなたの既存のブロックリストは保持され、共有リストと統合されます。
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-yellow-800">⚠️ 重要な注意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>
                eBayのブロックリストは最大5,000〜6,000件の制限があります
              </li>
              <li>
                同期を実行すると、既存のリストと共有リストが統合されます
              </li>
              <li>
                悪意のある報告は厳しく対処されます
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
