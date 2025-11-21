/**
 * 出品承認ページ（Phase 5）
 * /tools/listing-approval
 *
 * 編集完了の商品を承認・却下
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApprovalTable } from '@/components/approval/ApprovalTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

export default function ListingApprovalPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ListingApprovalContent />
    </QueryClientProvider>
  );
}

function ListingApprovalContent() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-[1600px]">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <CheckCircle className="h-8 w-8 text-green-500" />
          出品承認管理
        </h1>
        <p className="text-muted-foreground">
          データ編集が完了した商品を最終確認し、自動出品キューに投入します
        </p>
      </div>

      {/* 説明カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              承認の効果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              承認された商品は「出品スケジュール待ち」ステータスになり、次回のバッチ出品処理で自動的に各プラットフォームに出品されます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              却下の効果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              却下された商品は「戦略キャンセル」ステータスになり、自動出品の対象から除外されます。再編集後に再度承認を行うことができます。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ワークフロー図 */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium">ワークフロー:</span>
            <span className="text-sm">戦略決定済</span>
            <span>→</span>
            <span className="text-sm font-medium text-blue-600">編集完了（現在）</span>
            <span>→</span>
            <span className="text-sm">承認</span>
            <span>→</span>
            <span className="text-sm font-medium text-green-600">出品スケジュール待ち</span>
            <span>→</span>
            <span className="text-sm">バッチ出品実行</span>
            <span>→</span>
            <span className="text-sm font-medium text-purple-600">出品中</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* メインテーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>承認対象商品</CardTitle>
              <CardDescription>
                ステータス「編集完了」の商品のみ表示されます
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">承認</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">却下</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ApprovalTable />
        </CardContent>
      </Card>

      {/* フッター情報 */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          ヒント: 複数の商品を選択して一括承認・一括却下が可能です。推奨出品先はグリーンリングで強調表示されます。
        </p>
      </div>
    </div>
  );
}
