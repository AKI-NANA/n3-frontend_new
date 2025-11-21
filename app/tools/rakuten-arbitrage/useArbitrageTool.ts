// app/tools/rakuten-arbitrage/useArbitrageTool.ts
// React Hooks版 - 楽天せどり高度選定ツール

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';

// --- データ構造定義 ---

export interface Product {
  asin: string;
  productName: string;
  rakutenPrice: number;
  amazonNetRevenue: number;
  currentBSR: number;
  // ロジックから算出される値
  effectiveRakutenPrice: number;
  netProfit: number;
  profitRate: number;
  isEligible: boolean; // 出品可否
  purchaseStatus: 'pending' | 'bought' | 'skipped';
}

export interface Settings {
  spuMultiplier: number; // SPU倍率 (例: 10 -> 10%)
  minProfitRate: number; // 最低利益率 (例: 0.10 -> 10%)
  maxBSR: number; // 最大BSR (例: 20000)
}

export interface TrackedRoute {
  id: string;
  name: string;
  url: string;
}

export interface SalesRecord {
  asin: string;
  productName: string;
  netProfit: number;
  purchaseDate: string; // ISO string
}

// 既知の制限ASINリスト
const knownRestrictedAsins = ['B001ABC', 'B002XYZ', 'B003EFG'];

// --- カスタムフック ---

export function useArbitrageTool(userId?: string) {
  // State Management
  const [settings, setSettings] = useState<Settings>({
    spuMultiplier: 12,
    minProfitRate: 0.15,
    maxBSR: 20000,
  });

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [trackedRoutes, setTrackedRoutes] = useState<TrackedRoute[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 初期データロード ---

  useEffect(() => {
    loadInitialData();
  }, [userId]);

  async function loadInitialData() {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSettings(),
        loadProducts(),
        loadTrackedRoutes(),
        loadSalesRecords(),
      ]);
    } catch (error) {
      console.error('初期データロードエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSettings() {
    if (!userId) {
      // デフォルト設定を使用
      return;
    }

    try {
      const { data, error } = await supabase
        .from('arbitrage_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = データが見つからない
        console.error('設定ロードエラー:', error);
        return;
      }

      if (data) {
        setSettings({
          spuMultiplier: data.spu_multiplier,
          minProfitRate: data.min_profit_rate,
          maxBSR: data.max_bsr,
        });
      }
    } catch (error) {
      console.error('設定ロードエラー:', error);
    }
  }

  async function loadProducts() {
    // モックデータ（実際にはSupabaseから取得）
    const mockProducts: Product[] = [
      {
        asin: 'X001A',
        productName: 'Camera Lens',
        rakutenPrice: 10000,
        amazonNetRevenue: 13000,
        currentBSR: 5000,
        purchaseStatus: 'pending',
        effectiveRakutenPrice: 0,
        netProfit: 0,
        profitRate: 0,
        isEligible: true,
      },
      {
        asin: 'B001ABC',
        productName: 'Restricted Item',
        rakutenPrice: 5000,
        amazonNetRevenue: 9000,
        currentBSR: 1000,
        purchaseStatus: 'pending',
        effectiveRakutenPrice: 0,
        netProfit: 0,
        profitRate: 0,
        isEligible: false,
      },
      {
        asin: 'X003C',
        productName: 'High Profit',
        rakutenPrice: 20000,
        amazonNetRevenue: 25500,
        currentBSR: 8000,
        purchaseStatus: 'pending',
        effectiveRakutenPrice: 0,
        netProfit: 0,
        profitRate: 0,
        isEligible: true,
      },
    ];

    setAllProducts(mockProducts);
  }

  async function loadTrackedRoutes() {
    if (!userId) {
      // デフォルトデータ
      setTrackedRoutes([
        { id: 'T001', name: 'Joshin WEB', url: 'https://www.joshin.co.jp/' },
        {
          id: 'T002',
          name: '楽天ブックス (ゲーム)',
          url: 'https://books.rakuten.co.jp/game/',
        },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('arbitrage_tracked_routes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('仕入れルートロードエラー:', error);
        return;
      }

      if (data) {
        setTrackedRoutes(
          data.map((route) => ({
            id: route.id,
            name: route.name,
            url: route.url,
          }))
        );
      }
    } catch (error) {
      console.error('仕入れルートロードエラー:', error);
    }
  }

  async function loadSalesRecords() {
    if (!userId) {
      // デフォルトデータ
      setSalesRecords([
        {
          asin: 'P900',
          productName: 'Past Sold Item',
          netProfit: 1500,
          purchaseDate: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('arbitrage_sales_records')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('販売実績ロードエラー:', error);
        return;
      }

      if (data) {
        setSalesRecords(
          data.map((record) => ({
            asin: record.asin,
            productName: record.product_name,
            netProfit: record.net_profit,
            purchaseDate: record.purchase_date,
          }))
        );
      }
    } catch (error) {
      console.error('販売実績ロードエラー:', error);
    }
  }

  // --- メトリクス計算 ---

  function calculateProductMetrics(product: Product): Product {
    // 実質仕入れ値
    product.effectiveRakutenPrice =
      product.rakutenPrice * (1 - settings.spuMultiplier / 100);
    // 純利益計算
    product.netProfit = Math.round(
      product.amazonNetRevenue - product.effectiveRakutenPrice
    );
    // 利益率
    product.profitRate = product.netProfit / product.amazonNetRevenue;

    return product;
  }

  // --- フィルタリング・ソート済み商品リスト ---

  const filteredProducts = useMemo(() => {
    const filtered = allProducts
      .map((p) => calculateProductMetrics({ ...p }))
      .filter(
        (p) =>
          p.purchaseStatus === 'pending' &&
          p.isEligible === true &&
          p.currentBSR <= settings.maxBSR &&
          p.profitRate >= settings.minProfitRate
      );

    // 3.3. 利益順ソート（純利益の高い順）
    return filtered.sort((a, b) => b.netProfit - a.netProfit);
  }, [allProducts, settings]);

  // --- 3.1. 仕入れルートトラッキング機能 ---

  async function addTrackedRoute(name: string, url: string) {
    if (!name || !url) return;

    const newRoute: TrackedRoute = {
      id: Date.now().toString(),
      name,
      url,
    };

    if (userId) {
      try {
        const { error } = await supabase.from('arbitrage_tracked_routes').insert({
          user_id: userId,
          name: newRoute.name,
          url: newRoute.url,
        });

        if (error) {
          console.error('仕入れルート追加エラー:', error);
          return;
        }
      } catch (error) {
        console.error('仕入れルート追加エラー:', error);
        return;
      }
    }

    setTrackedRoutes((prev) => [...prev, newRoute]);
  }

  async function removeTrackedRoute(routeId: string) {
    if (userId) {
      try {
        const { error } = await supabase
          .from('arbitrage_tracked_routes')
          .delete()
          .eq('id', routeId)
          .eq('user_id', userId);

        if (error) {
          console.error('仕入れルート削除エラー:', error);
          return;
        }
      } catch (error) {
        console.error('仕入れルート削除エラー:', error);
        return;
      }
    }

    setTrackedRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }

  // --- 3.2. 出品可否クイックチェック機能 ---

  function checkAsinEligibility(asin: string): boolean {
    const isRestricted = knownRestrictedAsins.includes(asin);

    if (isRestricted) {
      console.log(`ASIN ${asin} は既知の制限ASINです。`);
    }

    return !isRestricted;
  }

  // --- 3.4. 実績登録時のステータス管理 ---

  async function updateStatus(asin: string, newStatus: 'bought' | 'skipped') {
    const product = allProducts.find((p) => p.asin === asin);
    if (!product) return;

    if (newStatus === 'bought') {
      // 販売実績に登録
      const record: SalesRecord = {
        asin: product.asin,
        productName: product.productName,
        netProfit: product.netProfit,
        purchaseDate: new Date().toISOString(),
      };

      if (userId) {
        try {
          const { error } = await supabase.from('arbitrage_sales_records').insert({
            user_id: userId,
            asin: record.asin,
            product_name: record.productName,
            net_profit: record.netProfit,
            purchase_date: record.purchaseDate,
          });

          if (error) {
            console.error('販売実績登録エラー:', error);
          }
        } catch (error) {
          console.error('販売実績登録エラー:', error);
        }
      }

      setSalesRecords((prev) => [record, ...prev]);
      console.log(`[Status Update] 仕入れ実行: ${product.productName} を実績に登録しました。`);
    } else if (newStatus === 'skipped') {
      console.log(`[Status Update] ${product.productName} を見送りました。`);
    }

    // ステータス更新
    setAllProducts((prev) =>
      prev.map((p) => (p.asin === asin ? { ...p, purchaseStatus: newStatus } : p))
    );
  }

  // --- 設定更新 ---

  async function updateSettings(newSettings: Partial<Settings>) {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    if (userId) {
      try {
        const { error } = await supabase
          .from('arbitrage_settings')
          .upsert({
            user_id: userId,
            spu_multiplier: updatedSettings.spuMultiplier,
            min_profit_rate: updatedSettings.minProfitRate,
            max_bsr: updatedSettings.maxBSR,
          })
          .eq('user_id', userId);

        if (error) {
          console.error('設定保存エラー:', error);
        }
      } catch (error) {
        console.error('設定保存エラー:', error);
      }
    }
  }

  return {
    // State
    settings,
    allProducts,
    trackedRoutes,
    salesRecords,
    filteredProducts,
    isLoading,
    // Actions
    addTrackedRoute,
    removeTrackedRoute,
    checkAsinEligibility,
    updateStatus,
    updateSettings,
    loadInitialData,
  };
}
