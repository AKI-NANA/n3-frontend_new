/**
 * 除外理由ツールチップコンポーネント
 * strategy_decision_dataから除外理由を表示
 */

'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { ListingCandidate, Platform } from '@/types/strategy';

interface ExclusionReasonTooltipProps {
  strategyDecisionData: any; // JSONB data from strategy_decision_data
}

export function ExclusionReasonTooltip({ strategyDecisionData }: ExclusionReasonTooltipProps) {
  if (!strategyDecisionData?.all_candidates) {
    return null;
  }

  const candidates: ListingCandidate[] = strategyDecisionData.all_candidates;
  const excludedCandidates = candidates.filter((c) => c.is_excluded);
  const includedCandidates = candidates.filter((c) => !c.is_excluded);

  if (excludedCandidates.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="cursor-help bg-green-50 text-green-700 border-green-300">
              <CheckCircle className="mr-1 h-3 w-3" />
              全候補可能
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-md">
            <div className="space-y-2">
              <p className="font-semibold text-green-600">全てのプラットフォームが出品可能です</p>
              <div className="text-xs space-y-1">
                {includedCandidates.map((candidate, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="capitalize">{candidate.platform}</span>
                    {candidate.account_id && <span className="text-muted-foreground">#{candidate.account_id}</span>}
                    {candidate.strategy_score && (
                      <span className="ml-auto text-muted-foreground">
                        スコア: {candidate.strategy_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-help bg-yellow-50 text-yellow-700 border-yellow-300">
            <AlertCircle className="mr-1 h-3 w-3" />
            {excludedCandidates.length}件除外
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <div className="space-y-3">
            {/* 除外されたプラットフォーム */}
            <div>
              <p className="font-semibold text-red-600 mb-2">除外されたプラットフォーム:</p>
              <div className="text-xs space-y-1.5">
                {excludedCandidates.map((candidate, idx) => (
                  <div key={idx} className="bg-red-50 p-2 rounded border border-red-200">
                    <div className="flex items-center gap-1 mb-1">
                      <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                      <span className="font-medium capitalize">{candidate.platform}</span>
                      {candidate.account_id && (
                        <span className="text-muted-foreground">#{candidate.account_id}</span>
                      )}
                    </div>
                    <p className="text-red-700 ml-4">{candidate.exclusion_reason || '理由不明'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 出品可能なプラットフォーム */}
            {includedCandidates.length > 0 && (
              <div>
                <p className="font-semibold text-green-600 mb-2">出品可能なプラットフォーム:</p>
                <div className="text-xs space-y-1">
                  {includedCandidates.map((candidate, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="capitalize">{candidate.platform}</span>
                      {candidate.account_id && <span className="text-muted-foreground">#{candidate.account_id}</span>}
                      {candidate.strategy_score && (
                        <span className="ml-auto text-muted-foreground">
                          スコア: {candidate.strategy_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
