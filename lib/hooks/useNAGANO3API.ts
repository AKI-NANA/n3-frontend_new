'use client';

/**
 * NAGANO-3 API カスタムフック
 * 既存PHP APIとの通信を管理
 */

import { useState, useCallback } from 'react';
import { nagano3API, NAGANO3APIError } from '@/lib/api/NAGANO3API';
import type {
  Product,
  GetProductRequest,
  UpdateProductRequest,
  SaveImagesRequest,
} from '@/types/product';

/**
 * APIステータス型
 */
interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * useNAGANO3API フック
 */
export function useNAGANO3API() {
  const [productState, setProductState] = useState<APIState<Product>>({
    data: null,
    loading: false,
    error: null,
  });

  /**
   * 商品データ取得
   */
  const getProduct = useCallback(async (params: GetProductRequest) => {
    setProductState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await nagano3API.getProduct(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch product');
      }

      setProductState({
        data: response.data || null,
        loading: false,
        error: null,
      });

      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof NAGANO3APIError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Unknown error';

      setProductState({
        data: null,
        loading: false,
        error: errorMessage,
      });

      throw error;
    }
  }, []);

  /**
   * 商品データ更新
   */
  const updateProduct = useCallback(
    async (params: UpdateProductRequest) => {
      setProductState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await nagano3API.updateProduct(params);

        if (!response.success) {
          throw new Error(response.error || 'Failed to update product');
        }

        setProductState({
          data: response.data || null,
          loading: false,
          error: null,
        });

        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof NAGANO3APIError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Unknown error';

        setProductState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },
    []
  );

  /**
   * 画像選択保存
   */
  const saveImages = useCallback(async (params: SaveImagesRequest) => {
    try {
      const response = await nagano3API.saveImages(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to save images');
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof NAGANO3APIError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Unknown error';

      throw new Error(errorMessage);
    }
  }, []);

  /**
   * カテゴリ判定
   */
  const detectCategory = useCallback(
    async (params: {
      productId: string;
      title?: string;
      description?: string;
    }) => {
      try {
        const response = await nagano3API.detectCategory(params);

        if (!response.success) {
          throw new Error(response.error || 'Failed to detect category');
        }

        return response.category;
      } catch (error) {
        const errorMessage =
          error instanceof NAGANO3APIError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Unknown error';

        throw new Error(errorMessage);
      }
    },
    []
  );

  /**
   * 利益計算
   */
  const calculateProfit = useCallback(
    async (params: {
      productId: string;
      price: number;
      cost: number;
      marketplace?: string;
    }) => {
      try {
        const response = await nagano3API.calculateProfit(params);

        if (!response.success) {
          throw new Error(response.error || 'Failed to calculate profit');
        }

        return response.profit;
      } catch (error) {
        const errorMessage =
          error instanceof NAGANO3APIError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Unknown error';

        throw new Error(errorMessage);
      }
    },
    []
  );

  /**
   * エラーリセット
   */
  const resetError = useCallback(() => {
    setProductState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * 状態リセット
   */
  const reset = useCallback(() => {
    setProductState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    // 状態
    product: productState.data,
    loading: productState.loading,
    error: productState.error,

    // メソッド
    getProduct,
    updateProduct,
    saveImages,
    detectCategory,
    calculateProfit,
    resetError,
    reset,
  };
}

/**
 * 商品データ管理フック（より高レベル）
 */
export function useProduct(productId?: string) {
  const api = useNAGANO3API();
  const [isDirty, setIsDirty] = useState(false);

  /**
   * 初期ロード
   */
  const load = useCallback(
    async (id: string) => {
      try {
        await api.getProduct({ id });
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to load product:', error);
      }
    },
    [api]
  );

  /**
   * フィールド更新
   */
  const updateField = useCallback(
    (field: keyof Product, value: any) => {
      if (!api.product) return;

      const updatedProduct = {
        ...api.product,
        [field]: value,
      };

      // ローカル状態を更新（API呼び出しはsave時）
      // TODO: 状態管理の改善が必要
      setIsDirty(true);
    },
    [api.product]
  );

  /**
   * 保存
   */
  const save = useCallback(async () => {
    if (!api.product || !productId) return;

    try {
      await api.updateProduct({
        id: productId,
        updates: api.product,
      });
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      throw error;
    }
  }, [api, productId]);

  return {
    ...api,
    isDirty,
    load,
    updateField,
    save,
  };
}
