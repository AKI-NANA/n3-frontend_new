'use client';

/**
 * ツール実行管理フック
 */

import { useState, useCallback } from 'react';
import type {
  ToolResults,
  CategoryToolResult,
  FilterToolResult,
  ProfitToolResult,
  SellerMirrorToolResult,
} from '@/types/fullModal';

export function useTools() {
  const [toolResults, setToolResults] = useState<ToolResults>({
    category: null,
    filter: null,
    profit: null,
    sellermirror: null,
  });

  const [runningTools, setRunningTools] = useState<Set<string>>(new Set());

  /**
   * カテゴリ判定ツール実行
   */
  const runCategoryTool = useCallback(
    async (productData: any): Promise<CategoryToolResult> => {
      setRunningTools((prev) => new Set(prev).add('category'));

      // シミュレーション: 実際はAPI呼び出し
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result: CategoryToolResult = {
        category_id: '183454',
        category_name: 'Trading Card Games > Pokémon > Individual Cards',
        confidence: 0.92,
        recommendations: ['Pokémon', 'Promo', 'Japanese'],
      };

      setToolResults((prev) => ({ ...prev, category: result }));
      setRunningTools((prev) => {
        const next = new Set(prev);
        next.delete('category');
        return next;
      });

      return result;
    },
    []
  );

  /**
   * フィルターツール実行
   */
  const runFilterTool = useCallback(
    async (productData: any): Promise<FilterToolResult> => {
      setRunningTools((prev) => new Set(prev).add('filter'));

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result: FilterToolResult = {
        status: 'warning',
        passed: 7,
        warnings: 2,
        errors: 0,
        details: [
          { type: 'pass', message: 'タイトル長さチェック: OK' },
          { type: 'pass', message: '禁止キーワードチェック: OK' },
          { type: 'warning', message: 'カテゴリー一致度: 85% (90%推奨)' },
          { type: 'warning', message: '画像品質: 一部低解像度' },
          { type: 'pass', message: 'ポリシー準拠: OK' },
        ],
      };

      setToolResults((prev) => ({ ...prev, filter: result }));
      setRunningTools((prev) => {
        const next = new Set(prev);
        next.delete('filter');
        return next;
      });

      return result;
    },
    []
  );

  /**
   * 利益計算ツール実行
   */
  const runProfitTool = useCallback(
    async (productData: any, price: number): Promise<ProfitToolResult> => {
      setRunningTools((prev) => new Set(prev).add('profit'));

      await new Promise((resolve) => setTimeout(resolve, 2500));

      const costData = {
        purchase_price: productData.price_jpy || 3500,
        domestic_shipping: 500,
        handling_fee: 200,
        total_cost: (productData.price_jpy || 3500) + 500 + 200,
      };

      const exchangeRate = 150.05;
      const sellingPriceJpy = Math.round(price * exchangeRate);
      const ebayFee = Math.round(price * 0.1325 * exchangeRate);
      const paypalFee = Math.round(price * 0.0349 * exchangeRate);
      const intlShipping = Math.round(12.99 * exchangeRate);

      const netProfit =
        sellingPriceJpy - costData.total_cost - ebayFee - paypalFee - intlShipping;
      const profitMargin = (netProfit / costData.total_cost) * 100;

      const result: ProfitToolResult = {
        cost: costData,
        revenue: {
          selling_price_usd: price,
          selling_price_jpy: sellingPriceJpy,
          ebay_fee: ebayFee,
          paypal_fee: paypalFee,
          international_shipping: intlShipping,
        },
        net_profit: netProfit,
        profit_margin: parseFloat(profitMargin.toFixed(1)),
        recommended_price: 34.99,
        exchange_rate: exchangeRate,
      };

      setToolResults((prev) => ({ ...prev, profit: result }));
      setRunningTools((prev) => {
        const next = new Set(prev);
        next.delete('profit');
        return next;
      });

      return result;
    },
    []
  );

  /**
   * SellerMirrorツール実行
   */
  const runSellerMirrorTool = useCallback(
    async (productData: any): Promise<SellerMirrorToolResult> => {
      setRunningTools((prev) => new Set(prev).add('sellermirror'));

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const result: SellerMirrorToolResult = {
        competitors_found: 12,
        price_range: { min: 28.99, max: 39.99, avg: 33.45 },
        top_competitors: [
          {
            seller: 'pokemon_cards_jp',
            price: 32.99,
            feedback: 99.2,
            sales: 156,
          },
          { seller: 'trading_world', price: 34.5, feedback: 98.8, sales: 89 },
          {
            seller: 'card_collector_pro',
            price: 29.99,
            feedback: 99.5,
            sales: 203,
          },
        ],
        recommended_price: 32.99,
        market_demand: 'high',
      };

      setToolResults((prev) => ({ ...prev, sellermirror: result }));
      setRunningTools((prev) => {
        const next = new Set(prev);
        next.delete('sellermirror');
        return next;
      });

      return result;
    },
    []
  );

  /**
   * 全ツール一括実行
   */
  const runAllTools = useCallback(
    async (productData: any, price: number = 32.99) => {
      // 順次実行
      await runCategoryTool(productData);
      await runFilterTool(productData);
      await runProfitTool(productData, price);
      await runSellerMirrorTool(productData);
    },
    [runCategoryTool, runFilterTool, runProfitTool, runSellerMirrorTool]
  );

  /**
   * ツールがアクティブかどうか
   */
  const isToolRunning = useCallback(
    (toolName: string) => {
      return runningTools.has(toolName);
    },
    [runningTools]
  );

  /**
   * いずれかのツールが実行中か
   */
  const isAnyToolRunning = useCallback(() => {
    return runningTools.size > 0;
  }, [runningTools]);

  return {
    toolResults,
    runCategoryTool,
    runFilterTool,
    runProfitTool,
    runSellerMirrorTool,
    runAllTools,
    isToolRunning,
    isAnyToolRunning,
  };
}
