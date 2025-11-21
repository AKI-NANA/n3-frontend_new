/**
 * 出品エラー詳細ツールチップ
 * listing_result_logs からエラー情報を取得して表示
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, XCircle } from 'lucide-react';

interface ListingErrorTooltipProps {
  sku: string;
  executionStatus?: string | null;
}

export function ListingErrorTooltip({ sku, executionStatus }: ListingErrorTooltipProps) {
  // エラーログの取得
  const { data: errorLogs, isLoading } = useQuery({
    queryKey: ['listing-error', sku],
    queryFn: async () => {
      const response = await fetch(`/api/listing/error-log?sku=${sku}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: executionStatus === 'listing_failed' || executionStatus === 'api_retry_pending',
  });

  if (executionStatus !== 'listing_failed' && executionStatus !== 'api_retry_pending') {
    return null;
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
        読込中...
      </Badge>
    );
  }

  if (!errorLogs || !errorLogs.error_code) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
        <XCircle className="mr-1 h-3 w-3" />
        エラー詳細なし
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`cursor-help ${
              executionStatus === 'listing_failed'
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-yellow-50 text-yellow-700 border-yellow-300'
            }`}
          >
            <AlertCircle className="mr-1 h-3 w-3" />
            エラー詳細
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-red-600">エラーコード</p>
              <p className="text-sm font-mono">{errorLogs.error_code}</p>
            </div>
            <div>
              <p className="font-semibold text-red-600">エラーメッセージ</p>
              <p className="text-sm">{errorLogs.error_message}</p>
            </div>
            {errorLogs.retry_count > 0 && (
              <div>
                <p className="font-semibold text-yellow-600">リトライ回数</p>
                <p className="text-sm">{errorLogs.retry_count}回</p>
              </div>
            )}
            {errorLogs.last_retry_at && (
              <div>
                <p className="font-semibold text-gray-600">最終リトライ日時</p>
                <p className="text-sm">{new Date(errorLogs.last_retry_at).toLocaleString('ja-JP')}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
