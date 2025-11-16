/**
 * ScoreRanking - スコアランキング表示コンポーネント
 */

'use client';

import React, { useState } from 'react';
import { ProductMaster } from '@/lib/scoring/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScoreDetailsModal } from './ScoreDetailsModal';

interface ScoreRankingProps {
  products: ProductMaster[];
}

export function ScoreRanking({ products }: ScoreRankingProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // スコア降順でソート
  const sortedProducts = [...products].sort(
    (a, b) => (b.listing_score || 0) - (a.listing_score || 0)
  );

  const handleShowDetails = (product: ProductMaster) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <p>表示するデータがありません</p>
          <p className="text-sm mt-2">
            「全商品再計算」ボタンでスコアを計算してください
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sortedProducts.map((product, index) => (
          <Card
            key={product.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleShowDetails(product)}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                {/* ランク */}
                <div className="flex-shrink-0 w-16 text-center">
                  <div
                    className={`text-2xl font-bold ${
                      index === 0
                        ? 'text-yellow-500'
                        : index === 1
                        ? 'text-gray-400'
                        : index === 2
                        ? 'text-amber-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                </div>

                {/* スコア */}
                <div className="flex-shrink-0 w-32">
                  <div className="text-3xl font-bold text-blue-600">
                    {product.listing_score?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-gray-500">スコア</div>
                </div>

                {/* 商品情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={product.condition === 'new' ? 'default' : 'secondary'}>
                      {product.condition === 'new' ? '新品' : '中古'}
                    </Badge>
                    <span className="text-xs text-gray-500">{product.sku}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 truncate mb-1">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>¥{product.price_jpy?.toLocaleString() || 0}</span>
                    {product.purchase_price_jpy && (
                      <span className="text-green-600">
                        利益: ¥
                        {(
                          (product.price_jpy || 0) -
                          product.purchase_price_jpy
                        ).toLocaleString()}
                      </span>
                    )}
                    {product.sm_competitor_count !== null && (
                      <span>競合: {product.sm_competitor_count}件</span>
                    )}
                  </div>
                </div>

                {/* スコア詳細ボタン */}
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowDetails(product);
                    }}
                  >
                    詳細
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* スコア詳細モーダル */}
      {selectedProduct && (
        <ScoreDetailsModal
          product={selectedProduct}
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
}
