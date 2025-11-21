/**
 * 統合出品管理ダッシュボード
 * /tools/listing-management
 *
 * 全モールの出品戦略を統合管理するメインダッシュボード
 */

'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ListingManagementTable } from '@/components/listing/ListingManagementTable';
import { BatchListingExecutor } from '@/components/listing/BatchListingExecutor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Target, TrendingUp, RefreshCw } from 'lucide-react';
import { Platform } from '@/types/strategy';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

const PLATFORMS: { key: Platform | 'all'; label: string }[] = [
  { key: 'all', label: '全プラットフォーム' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'ebay', label: 'eBay' },
  { key: 'mercari', label: 'メルカリ' },
  { key: 'yahoo', label: 'Yahoo' },
  { key: 'rakuten', label: '楽天' },
  { key: 'shopee', label: 'Shopee' },
  { key: 'walmart', label: 'Walmart' },
];

export default function ListingManagementPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ListingManagementContent />
    </QueryClientProvider>
  );
}

function ListingManagementContent() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  const handlePlatformChange = (platformKey: string) => {
    if (platformKey === 'all') {
      setSelectedPlatform(null);
    } else {
      setSelectedPlatform(platformKey as Platform);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-[1600px]">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-purple-500" />
          統合出品管理ダッシュボード
        </h1>
        <p className="text-muted-foreground">
          戦略エンジンによって決定された最適な出品先を一元管理します
        </p>
      </div>

      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              出品決定済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              戦略エンジンによる自動決定
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              平均戦略スコア
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              全商品の平均スコア
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-500" />
              最終更新
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              戦略エンジン実行日時
            </p>
          </CardContent>
        </Card>
      </div>

      {/* バッチ出品実行 */}
      <BatchListingExecutor />

      {/* プラットフォーム選択タブ */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>プラットフォーム別フィルタ</CardTitle>
          <CardDescription>
            特定のプラットフォームに絞り込んで表示します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <Button
                key={platform.key}
                variant={
                  (platform.key === 'all' && !selectedPlatform) ||
                  platform.key === selectedPlatform
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => handlePlatformChange(platform.key)}
              >
                {platform.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* メインテーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>出品管理テーブル</CardTitle>
              <CardDescription>
                戦略決定済み商品の一覧と推奨出品先
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <Target className="mr-1 h-3 w-3" />
                推奨: ハイライト表示
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                除外理由: ツールチップで表示
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ListingManagementTable
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
          />
        </CardContent>
      </Card>

      {/* フッター情報 */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          ヒント: 推奨プラットフォームはグリーンリングで強調表示されます。除外理由は「除外状況」バッジをホバーして確認できます。
        </p>
      </div>
    </div>
  );
}
