/**
 * 戦略設定UI - メインページ
 * /tools/strategy-settings
 *
 * StrategyRulesの管理とブースト乗数の調整
 */

'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import { StrategyRuleForm } from '@/components/strategy/StrategyRuleForm';
import { StrategyRulesList } from '@/components/strategy/StrategyRulesList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, TrendingUp, Target } from 'lucide-react';
import { StrategyRule } from '@/types/strategy';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

export default function StrategySettingsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <StrategySettingsContent />
    </QueryClientProvider>
  );
}

function StrategySettingsContent() {
  const [selectedRule, setSelectedRule] = useState<StrategyRule | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const queryClient = useQueryClient();

  // 保存ミューテーション
  const saveMutation = useMutation({
    mutationFn: async (ruleData: Partial<StrategyRule>) => {
      const url = selectedRule
        ? `/api/strategy/rules/${selectedRule.rule_id}`
        : '/api/strategy/rules';
      const method = selectedRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) throw new Error('Failed to save rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-rules'] });
      setSelectedRule(null);
      setIsCreatingNew(false);
    },
  });

  const handleSave = async (ruleData: Partial<StrategyRule>) => {
    await saveMutation.mutateAsync(ruleData);
  };

  const handleEdit = (rule: StrategyRule) => {
    setSelectedRule(rule);
    setIsCreatingNew(false);
  };

  const handleCreateNew = () => {
    setSelectedRule(null);
    setIsCreatingNew(true);
  };

  const handleCancel = () => {
    setSelectedRule(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-[1400px]">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-8 w-8 text-blue-500" />
          戦略設定 - 出品先決定ルール管理
        </h1>
        <p className="text-muted-foreground">
          商品、モール、アカウントの制約と戦略的スコアに基づき、最適な出品先を自動決定するルールを管理します
        </p>
      </div>

      {/* 説明カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Layer 1: システム制約
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• アカウント重複禁止</li>
              <li>• モール規約チェック</li>
              <li>• 在庫・スコアチェック</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-green-500" />
              Layer 2: ユーザー戦略
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• カテゴリー・モール限定</li>
              <li>• アカウント別専門化</li>
              <li>• 価格帯による制限</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Layer 3: スコア評価
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 実績ブースト (M_performance)</li>
              <li>• 競合ブースト (M_competition)</li>
              <li>• カテゴリー適合 (M_category_fit)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* タブ */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">戦略ルール管理</TabsTrigger>
          <TabsTrigger value="boost">ブースト乗数調整</TabsTrigger>
        </TabsList>

        {/* ルール管理タブ */}
        <TabsContent value="rules" className="space-y-6">
          {/* ルール作成・編集フォーム */}
          {(isCreatingNew || selectedRule) && (
            <StrategyRuleForm
              rule={selectedRule}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}

          {/* ルール一覧 */}
          <StrategyRulesList onEdit={handleEdit} onCreateNew={handleCreateNew} />
        </TabsContent>

        {/* ブースト乗数調整タブ */}
        <TabsContent value="boost" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ブースト乗数のグローバル調整</CardTitle>
              <CardDescription>
                各モールの実績、競合状況、カテゴリー適合度に基づくブースト乗数を調整します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-center py-8">
                ブースト乗数調整UIは開発中です
                <br />
                現在は各ルールのM_factorフィールドで個別に調整できます
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* フッター情報 */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          💡 ヒント: ルールは上から順に適用されます。優先度の高いルールを上位に配置してください
        </p>
      </div>
    </div>
  );
}
