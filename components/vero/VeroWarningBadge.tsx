/**
 * VEROリスク警告バッジ
 * ブランド名に基づいてVEROリスクを表示
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { VeroCheckResult } from '@/app/api/vero/brand-check/route';

interface VeroWarningBadgeProps {
  brandName?: string | null;
  className?: string;
}

export function VeroWarningBadge({ brandName, className }: VeroWarningBadgeProps) {
  // ブランド名がない場合は何も表示しない
  if (!brandName || brandName.trim() === '') {
    return null;
  }

  // VEROチェックAPI呼び出し
  const { data: veroCheck, isLoading } = useQuery<VeroCheckResult>({
    queryKey: ['vero-check', brandName],
    queryFn: async () => {
      const response = await fetch(`/api/vero/brand-check?brand=${encodeURIComponent(brandName)}`);
      if (!response.ok) {
        throw new Error('VERO check failed');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1時間キャッシュ
    enabled: !!brandName,
  });

  // ローディング中
  if (isLoading) {
    return (
      <Badge variant="outline" className={`bg-gray-50 text-gray-600 border-gray-300 ${className}`}>
        チェック中...
      </Badge>
    );
  }

  // データがない、またはセーフ
  if (!veroCheck || !veroCheck.is_vero) {
    return (
      <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-300 ${className}`}>
        <ShieldCheck className="mr-1 h-3 w-3" />
        安全
      </Badge>
    );
  }

  // VEROリスクあり
  const { risk_level, warning_message, recommended_action } = veroCheck;

  // リスクレベル別のスタイル
  const riskStyles = {
    high: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300',
      icon: ShieldAlert,
      label: '高リスク',
    },
    medium: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
      icon: AlertTriangle,
      label: '中リスク',
    },
    low: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-300',
      icon: AlertTriangle,
      label: '低リスク',
    },
    safe: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-300',
      icon: ShieldCheck,
      label: '安全',
    },
  };

  const style = riskStyles[risk_level];
  const Icon = style.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`cursor-help ${style.bg} ${style.text} ${style.border} ${className}`}
          >
            <Icon className="mr-1 h-3 w-3" />
            VERO {style.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-md" side="bottom">
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-red-600">eBay VeRO警告</p>
              <p className="text-sm mt-1">{warning_message}</p>
            </div>
            {recommended_action && (
              <div className="pt-2 border-t">
                <p className="font-semibold text-yellow-600">推奨アクション</p>
                <p className="text-sm mt-1">{recommended_action}</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                ブランド: <strong>{brandName}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                VeRO (Verified Rights Owner) プログラムは、知的財産権を保護するためのeBayの制度です。
                登録ブランドの無許可出品は削除され、アカウント停止のリスクがあります。
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
