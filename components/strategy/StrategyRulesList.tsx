/**
 * 戦略ルール一覧表示
 * 既存のStrategyRulesを表示・編集・削除
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';
import { StrategyRule } from '@/types/strategy';

interface StrategyRulesListProps {
  onEdit: (rule: StrategyRule) => void;
  onCreateNew: () => void;
}

export function StrategyRulesList({ onEdit, onCreateNew }: StrategyRulesListProps) {
  const queryClient = useQueryClient();

  // データ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategy-rules'],
    queryFn: async () => {
      const response = await fetch('/api/strategy/rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      return response.json();
    },
  });

  // 削除ミューテーション
  const deleteMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      const response = await fetch(`/api/strategy/rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-rules'] });
    },
  });

  const handleDelete = async (ruleId: number) => {
    if (confirm('このルールを削除してもよろしいですか？')) {
      await deleteMutation.mutateAsync(ruleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">ルールを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">エラーが発生しました</p>
      </div>
    );
  }

  const rules = data?.rules || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">登録済みルール ({rules.length}件)</h3>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          新規ルール作成
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ルール名</TableHead>
              <TableHead>タイプ</TableHead>
              <TableHead>プラットフォーム</TableHead>
              <TableHead>カテゴリー</TableHead>
              <TableHead>価格範囲</TableHead>
              <TableHead>ブースト</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  ルールが登録されていません
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule: StrategyRule) => (
                <TableRow key={rule.rule_id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rule.rule_type === 'BLACKLIST'
                          ? 'destructive'
                          : rule.rule_type === 'WHITELIST'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {rule.rule_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rule.platform_key ? (
                      <span className="capitalize">{rule.platform_key}</span>
                    ) : (
                      <span className="text-muted-foreground">すべて</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.target_category || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.min_price_jpy || rule.max_price_jpy ? (
                      <span>
                        ¥{rule.min_price_jpy?.toLocaleString() || '0'} 〜
                        ¥{rule.max_price_jpy?.toLocaleString() || '∞'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rule.M_factor > 1.2
                          ? 'default'
                          : rule.M_factor > 1.0
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      × {rule.M_factor.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.rule_id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
