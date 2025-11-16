/**
 * useScoreData - スコアデータ管理フック
 */

import { useState, useEffect, useCallback } from 'react';
import { ProductMaster, ScoreResult } from '@/lib/scoring/types';

interface UseScoreDataReturn {
  products: ProductMaster[];
  loading: boolean;
  error: string | null;
  recalculateAll: () => Promise<void>;
  recalculateSelected: (productIds: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useScoreData(): UseScoreDataReturn {
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 商品データを読み込む
   */
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Supabaseから商品データを取得
      const response = await fetch('/api/products?limit=1000&offset=0');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.products) {
        // listing_scoreでソート（降順）
        const sortedProducts = data.products.sort(
          (a: ProductMaster, b: ProductMaster) =>
            (b.listing_score || 0) - (a.listing_score || 0)
        );
        setProducts(sortedProducts);
      } else {
        throw new Error(data.message || 'データ取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(errorMessage);
      console.error('Product load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 全商品のスコアを再計算
   */
  const recalculateAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/score/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // productIds未指定 = 全商品
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'スコア計算に失敗しました');
      }

      console.log(`✅ ${data.updated}件のスコアを更新しました`);
      
      // データを再読み込み
      await loadProducts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(errorMessage);
      console.error('Score calculation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProducts]);

  /**
   * 選択商品のスコアを再計算
   */
  const recalculateSelected = useCallback(
    async (productIds: string[]) => {
      if (productIds.length === 0) {
        console.warn('商品が選択されていません');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/score/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'スコア計算に失敗しました');
        }

        console.log(`✅ ${data.updated}件のスコアを更新しました`);
        
        // データを再読み込み
        await loadProducts();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラー';
        setError(errorMessage);
        console.error('Score calculation error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadProducts]
  );

  /**
   * データを再読み込み
   */
  const refreshData = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  // 初回読み込み
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    recalculateAll,
    recalculateSelected,
    refreshData,
  };
}
