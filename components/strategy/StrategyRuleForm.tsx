/**
 * 戦略ルール作成・編集フォーム
 * StrategyRulesテーブルのCRUD操作
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Platform, RuleType, StrategyRule } from '@/types/strategy';
import { X, Plus } from 'lucide-react';

interface StrategyRuleFormProps {
  rule?: StrategyRule | null;
  onSave: (rule: Partial<StrategyRule>) => Promise<void>;
  onCancel: () => void;
}

const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: 'WHITELIST', label: 'ホワイトリスト', description: '指定したモール/カテゴリーのみ許可' },
  { value: 'BLACKLIST', label: 'ブラックリスト', description: '指定したモール/カテゴリーを禁止' },
  { value: 'PRICE_MIN', label: '最低価格制限', description: '指定価格以上の商品のみ出品' },
  { value: 'PRICE_MAX', label: '最高価格制限', description: '指定価格以下の商品のみ出品' },
  { value: 'CATEGORY_ACCOUNT_SPECIFIC', label: 'カテゴリー専門化', description: '特定カテゴリーを特定アカウントに紐付け' },
];

const PLATFORMS: Platform[] = ['amazon', 'ebay', 'mercari', 'yahoo', 'rakuten', 'shopee', 'walmart'];

export function StrategyRuleForm({ rule, onSave, onCancel }: StrategyRuleFormProps) {
  const [formData, setFormData] = useState<Partial<StrategyRule>>({
    rule_name: '',
    rule_type: 'BLACKLIST',
    platform_key: null,
    account_id: null,
    target_category: null,
    min_price_jpy: null,
    max_price_jpy: null,
    M_factor: 1.0,
    ...rule,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof StrategyRule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{rule ? 'ルールを編集' : '新規ルールを作成'}</CardTitle>
        <CardDescription>
          出品戦略ルールを設定して、最適な出品先を自動決定します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ルール名 */}
          <div className="space-y-2">
            <Label htmlFor="rule_name">ルール名 *</Label>
            <Input
              id="rule_name"
              value={formData.rule_name}
              onChange={(e) => updateField('rule_name', e.target.value)}
              placeholder="例: eBayフィギュア専門化"
              required
            />
          </div>

          {/* ルールタイプ */}
          <div className="space-y-2">
            <Label htmlFor="rule_type">ルールタイプ *</Label>
            <select
              id="rule_type"
              value={formData.rule_type}
              onChange={(e) => updateField('rule_type', e.target.value as RuleType)}
              className="w-full border rounded-md p-2"
              required
            >
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* プラットフォーム */}
          <div className="space-y-2">
            <Label htmlFor="platform_key">対象プラットフォーム</Label>
            <select
              id="platform_key"
              value={formData.platform_key || ''}
              onChange={(e) => updateField('platform_key', e.target.value || null)}
              className="w-full border rounded-md p-2"
            >
              <option value="">すべて</option>
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          {/* アカウントID */}
          <div className="space-y-2">
            <Label htmlFor="account_id">アカウントID（オプション）</Label>
            <Input
              id="account_id"
              type="number"
              value={formData.account_id || ''}
              onChange={(e) => updateField('account_id', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="特定アカウントに限定する場合"
            />
          </div>

          {/* ターゲットカテゴリー */}
          <div className="space-y-2">
            <Label htmlFor="target_category">ターゲットカテゴリー（オプション）</Label>
            <Input
              id="target_category"
              value={formData.target_category || ''}
              onChange={(e) => updateField('target_category', e.target.value || null)}
              placeholder="例: フィギュア、電化製品"
            />
          </div>

          {/* 価格範囲 */}
          {(formData.rule_type === 'PRICE_MIN' || formData.rule_type === 'PRICE_MAX') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_price_jpy">最低価格（円）</Label>
                <Input
                  id="min_price_jpy"
                  type="number"
                  value={formData.min_price_jpy || ''}
                  onChange={(e) => updateField('min_price_jpy', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_price_jpy">最高価格（円）</Label>
                <Input
                  id="max_price_jpy"
                  type="number"
                  value={formData.max_price_jpy || ''}
                  onChange={(e) => updateField('max_price_jpy', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="999999"
                />
              </div>
            </div>
          )}

          {/* ブースト乗数 */}
          <div className="space-y-2">
            <Label htmlFor="M_factor">
              ブースト乗数（M_factor）
              <span className="text-sm text-muted-foreground ml-2">1.00 = 通常、1.50 = 50%ブースト</span>
            </Label>
            <div className="flex items-center gap-4">
              <input
                id="M_factor"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={formData.M_factor}
                onChange={(e) => updateField('M_factor', parseFloat(e.target.value))}
                className="flex-1"
              />
              <Input
                type="number"
                value={formData.M_factor}
                onChange={(e) => updateField('M_factor', parseFloat(e.target.value))}
                className="w-20"
                step="0.05"
                min="0.5"
                max="2.0"
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? '保存中...' : rule ? '更新' : '作成'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
