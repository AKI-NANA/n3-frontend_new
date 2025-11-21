/**
 * 外注UI: AI投入キュー画面
 * /outsourcing/ai-queue
 *
 * B-2の結果に基づき、未処理の商品を高スコア順で表示し、
 * 外注作業者によるAI処理のトリガーを行う。
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIPriorityTable } from '@/components/outsourcing/AIPriorityTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Target } from 'lucide-react';
import { useState } from 'react';

// QueryClientの初期化
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1分
      refetchOnWindowFocus: false,
    },
  },
});

export default function AIQueuePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AIQueuePageContent />
    </QueryClientProvider>
  );
}

function AIQueuePageContent() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-[1600px]">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          AI投入キュー - 優先度順商品リスト
        </h1>
        <p className="text-muted-foreground">
          B-2ロジックで算出された優先度スコアに基づき、最も価値の高い商品から順番にAI処理を実行できます。
        </p>
      </div>

      {/* 統計情報カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              スコアリング基準
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Sold数: 最大 +400点</li>
              <li>• 新製品（30日以内）: +200点</li>
              <li>• ランキング: 最大 +150点</li>
              <li>• 競合優位性: 最大 +100点</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              優先度レベル
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 800点以上: <span className="text-red-500 font-semibold">最優先</span></li>
              <li>• 600-799点: <span className="text-orange-500 font-semibold">高優先</span></li>
              <li>• 400-599点: <span className="text-yellow-600 font-semibold">中優先</span></li>
              <li>• 200-399点: <span className="text-blue-500 font-semibold">低優先</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI処理の流れ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>1. 優先度決定済 → AI処理中</li>
              <li>2. Gemini APIで商品データ補完</li>
              <li>3. AI処理中 → 外注処理完了</li>
              <li>4. リストから自動で削除</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* メインテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>処理待ち商品一覧</CardTitle>
          <CardDescription>
            優先度スコアが高い商品から順番に表示されます。「AI (Gemini) 投入」ボタンをクリックして処理を開始してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIPriorityTable statusFilter="優先度決定済" />
        </CardContent>
      </Card>

      {/* フッター情報 */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          💡 ヒント: 優先度スコアにカーソルを合わせると、スコア算出の詳細が表示されます
        </p>
      </div>
    </div>
  );
}
