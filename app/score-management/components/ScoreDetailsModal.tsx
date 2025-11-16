/**
 * ScoreDetailsModal - スコア詳細モーダル
 */

'use client';

import React from 'react';
import { ProductMaster } from '@/lib/scoring/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ScoreDetailsModalProps {
  product: ProductMaster;
  open: boolean;
  onClose: () => void;
}

export function ScoreDetailsModal({
  product,
  open,
  onClose,
}: ScoreDetailsModalProps) {
  const details = product.score_details;

  if (!details) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スコア詳細</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-gray-500">
            スコア詳細情報がありません
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>スコア詳細分析</DialogTitle>
        </DialogHeader>

        {/* 商品基本情報 */}
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={product.condition === 'new' ? 'default' : 'secondary'}>
              {product.condition === 'new' ? '新品' : '中古'}
            </Badge>
            <span className="text-sm text-gray-500">{product.sku}</span>
          </div>
          <h3 className="font-medium text-lg mb-2">{product.title}</h3>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>価格: ¥{product.price_jpy?.toLocaleString() || 0}</span>
            {product.purchase_price_jpy && (
              <span>
                仕入: ¥{product.purchase_price_jpy.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* 最終スコア */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600 mb-2">
              {product.listing_score?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-600">最終スコア</div>
          </div>
        </div>

        {/* カテゴリ別スコア */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900">カテゴリ別スコア</h4>

          <ScoreItem
            icon="💰"
            label="利益スコア (P)"
            value={details.profit_score}
            color="text-green-600"
          />

          <ScoreItem
            icon="🏪"
            label="競合スコア (C)"
            value={details.competition_score}
            color="text-orange-600"
          />

          {details.min_price_bonus > 0 && (
            <ScoreItem
              icon="⭐"
              label="最安値ボーナス (C5)"
              value={details.min_price_bonus}
              color="text-yellow-600"
            />
          )}

          <ScoreItem
            icon="📈"
            label="トレンドスコア (T)"
            value={details.trend_score}
            color="text-blue-600"
          />

          <ScoreItem
            icon="💎"
            label="希少性スコア (S)"
            value={details.scarcity_score}
            color="text-purple-600"
          />

          <ScoreItem
            icon="✅"
            label="実績スコア (R)"
            value={details.reliability_score}
            color="text-indigo-600"
          />
        </div>

        {/* 計算過程 */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-gray-900">計算過程</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600 mb-1">重み付け合計</div>
              <div className="text-xl font-bold text-gray-900">
                {details.weighted_sum.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600 mb-1">利益乗数</div>
              <div className="text-xl font-bold text-green-600">
                ×{details.profit_multiplier.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600 mb-1">ペナルティ乗数</div>
              <div className="text-xl font-bold text-orange-600">
                ×{details.penalty_multiplier.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600 mb-1">乱数値</div>
              <div className="text-xl font-bold text-gray-600">
                +{details.random_value.toFixed(5)}
              </div>
            </div>
          </div>

          {/* 計算式 */}
          <div className="bg-blue-50 p-4 rounded text-sm font-mono">
            <div className="text-center text-gray-700">
              最終スコア = ({details.weighted_sum.toFixed(2)} ×{' '}
              {details.profit_multiplier.toFixed(2)} ×{' '}
              {details.penalty_multiplier.toFixed(2)}) +{' '}
              {details.random_value.toFixed(5)}
            </div>
            <div className="text-center text-blue-600 font-bold mt-2">
              = {details.final_score.toFixed(2)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// スコア項目コンポーネント
function ScoreItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>
        {value > 0 ? '+' : ''}
        {value.toFixed(0)}
      </div>
    </div>
  );
}
