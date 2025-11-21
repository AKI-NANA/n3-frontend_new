/**
 * バッチ出品実行コンポーネント
 * 戦略決定済み商品を一括で各プラットフォームに出品
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Platform } from '@/types/strategy';

interface BatchExecutionResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<{
    sku: string;
    platform: Platform;
    status: 'success' | 'failed' | 'skipped';
    listing_id?: string;
    error?: string;
  }>;
}

export function BatchListingExecutor() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [result, setResult] = useState<BatchExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * バッチ出品を実行
   */
  const executeBatchListing = async (dryRun: boolean = false) => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/batch-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 50,
          dryRun,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'バッチ出品に失敗しました');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * リトライ処理を実行
   */
  const executeRetry = async () => {
    setIsRetrying(true);
    setError(null);

    try {
      const response = await fetch('/api/batch-listing/retry');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'リトライ処理に失敗しました');
      }

      alert(`✅ ${data.retried}件の商品をリトライしました`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-green-500" />
          バッチ出品実行
        </CardTitle>
        <CardDescription>
          戦略決定済み商品を各プラットフォームのAPIに自動出品します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 実行ボタン */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => executeBatchListing(false)}
            disabled={isExecuting}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                出品処理中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                バッチ出品を開始
              </>
            )}
          </Button>

          <Button
            onClick={() => executeBatchListing(true)}
            disabled={isExecuting}
            variant="outline"
            size="lg"
          >
            テスト実行（Dry Run）
          </Button>

          <Button
            onClick={executeRetry}
            disabled={isRetrying}
            variant="outline"
            size="lg"
          >
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                リトライ中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                失敗分をリトライ
              </>
            )}
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 実行結果サマリー */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{result.processed}</p>
                    <p className="text-xs text-muted-foreground">処理件数</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{result.succeeded}</p>
                    <p className="text-xs text-muted-foreground">成功</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                    <p className="text-xs text-muted-foreground">失敗</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                    <p className="text-xs text-muted-foreground">スキップ</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 詳細結果 */}
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <h4 className="font-semibold mb-3">実行結果詳細</h4>
              <div className="space-y-2">
                {result.results.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {item.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      {item.status === 'skipped' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="font-mono text-sm">{item.sku}</span>
                      <Badge variant="outline">{item.platform}</Badge>
                    </div>
                    <div className="text-sm">
                      {item.status === 'success' && item.listing_id && (
                        <span className="text-green-600">ID: {item.listing_id}</span>
                      )}
                      {item.status === 'failed' && item.error && (
                        <span className="text-red-600">{item.error}</span>
                      )}
                      {item.status === 'skipped' && item.error && (
                        <span className="text-yellow-600">{item.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 注意事項 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>注意:</strong> バッチ出品は戦略決定済みの商品を対象に自動実行されます。
            実行前に認証情報が正しく設定されていることを確認してください。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
