/**
 * 実行ステータスバッジ
 * バッチ出品の実行結果を色分けして表示
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { ExecutionStatus } from '@/types/product';
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2, Ban } from 'lucide-react';

interface ExecutionStatusBadgeProps {
  status?: ExecutionStatus | null;
}

const STATUS_CONFIG: Record<
  ExecutionStatus,
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  pending: {
    label: '実行待ち',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: Clock,
  },
  processing: {
    label: '実行中',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Loader2,
  },
  listed: {
    label: '出品成功',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle,
  },
  api_retry_pending: {
    label: 'リトライ待ち',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: AlertCircle,
  },
  listing_failed: {
    label: '出品失敗',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
  },
  skipped: {
    label: 'スキップ',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: Ban,
  },
};

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  if (!status) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const config = STATUS_CONFIG[status];
  if (!config) {
    return <span className="text-sm text-muted-foreground">{status}</span>;
  }

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} font-medium px-3 py-1`}>
      <Icon className={`mr-1.5 h-3.5 w-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}
