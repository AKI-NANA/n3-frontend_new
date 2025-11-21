/**
 * プラットフォームバッジコンポーネント
 * 推奨プラットフォームを色分けして表示
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Platform } from '@/types/strategy';
import { Store, Package, ShoppingBag, TrendingUp, Globe, Zap } from 'lucide-react';

interface PlatformBadgeProps {
  platform: Platform;
  isRecommended?: boolean;
  score?: number | null;
  accountId?: number | null;
}

const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }
> = {
  amazon: {
    label: 'Amazon',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 hover:bg-orange-200 border-orange-300',
    icon: Package,
  },
  ebay: {
    label: 'eBay',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
    icon: ShoppingBag,
  },
  mercari: {
    label: 'メルカリ',
    color: 'text-red-700',
    bgColor: 'bg-red-100 hover:bg-red-200 border-red-300',
    icon: Store,
  },
  yahoo: {
    label: 'Yahoo',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
    icon: TrendingUp,
  },
  rakuten: {
    label: '楽天',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100 hover:bg-pink-200 border-pink-300',
    icon: Store,
  },
  shopee: {
    label: 'Shopee',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    icon: Zap,
  },
  walmart: {
    label: 'Walmart',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    icon: Globe,
  },
};

export function PlatformBadge({ platform, isRecommended, score, accountId }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`${config.bgColor} ${config.color} font-medium px-3 py-1 ${
          isRecommended ? 'ring-2 ring-green-500 ring-offset-1' : ''
        }`}
      >
        <Icon className="mr-1.5 h-3.5 w-3.5" />
        {config.label}
        {accountId && (
          <span className="ml-1.5 text-xs opacity-70">#{accountId}</span>
        )}
      </Badge>
      {isRecommended && score && (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
          スコア: {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
