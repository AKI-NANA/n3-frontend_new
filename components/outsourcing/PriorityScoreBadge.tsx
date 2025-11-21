/**
 * 優先度スコア表示バッジ
 * スコアに応じて色分けして表示
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PriorityScoreBadgeProps {
  score: number;
  className?: string;
}

export function PriorityScoreBadge({ score, className }: PriorityScoreBadgeProps) {
  // スコアに応じた色を決定
  const getScoreColor = (score: number) => {
    if (score >= 800) return 'bg-red-500 text-white border-red-600';
    if (score >= 600) return 'bg-orange-500 text-white border-orange-600';
    if (score >= 400) return 'bg-yellow-500 text-black border-yellow-600';
    if (score >= 200) return 'bg-blue-500 text-white border-blue-600';
    return 'bg-gray-500 text-white border-gray-600';
  };

  // スコアに応じたラベル
  const getScoreLabel = (score: number) => {
    if (score >= 800) return '最優先';
    if (score >= 600) return '高優先';
    if (score >= 400) return '中優先';
    if (score >= 200) return '低優先';
    return '要検討';
  };

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <Badge
        className={cn(
          'text-lg font-bold px-4 py-2 min-w-[80px] justify-center',
          getScoreColor(score)
        )}
      >
        {score}
      </Badge>
      <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
    </div>
  );
}
