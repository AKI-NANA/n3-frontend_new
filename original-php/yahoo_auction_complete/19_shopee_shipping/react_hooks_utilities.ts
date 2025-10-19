// React カスタムフック & ユーティリティ（Shopee 7ヶ国完全対応）
// APIクライアントと完全連携した実用的なHooks

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShopeeApiClientImpl, 
  Product, 
  ProductCreate, 
  ProductUpdate,
  CountryCode,
  ShippingCalculateRequest,
  ShippingCost,
  ComplianceCheckRequest,
  ComplianceResult,
  ProfitAnalysis,
  ApiResponse
} from './types';

// ==================== API Client Hook ====================

export function useShopeeApiClient(baseUrl: string, apiKey?: string) {
  const apiClient = useMemo(() => {
    return new ShopeeApiClientImpl(baseUrl, apiKey);
  }, [baseUrl, apiKey]);

  return apiClient;
}

// ==================== 商品管理フック ====================

export interface UseProductsOptions {
  country: CountryCode;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useProducts(options: UseProductsOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const apiClient = useShopeeApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!);

  const loadProducts = useCallback(async (
    reset: boolean = false,
    customPage?: number,
    customPageSize?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const currentPage = customPage ?? page;
      const currentPageSize = customPageSize ?? pageSize;
      const skip = currentPage * currentPageSize;

      const response = await apiClient.getProducts(
        options.country,
        skip,
        currentPageSize
      );

      if (response.status === 'success' && response.data) {
        if (reset || currentPage === 0) {
          setProducts(response.data.products);
        } else {
          setProducts(prev => [...prev, ...response.data!.products]);
        }
        setTotalCount(response.data.total);
      } else {
        setError(response.message || '商品の取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [apiClient, options.country, page, pageSize]);

  const createProduct = useCallback(async (productData: ProductCreate): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createProduct(options.country, productData);
      
      if (response.status === 'success' && response.data) {
        setProducts(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        setError(response.message || '商品の作成に失敗しました');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '商品作成エラー');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiClient, options.country]);

  const updateProduct = useCallback(async (
    productId: string, 
    updateData: ProductUpdate
  ): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.updateProduct(options.country, productId, updateData);
      
      if (response.status === 'success' && response.data) {
        setProducts(prev => 
          prev.map(p => p.id === productId ? response.data! : p)
        );
        return response.data;
      } else {
        setError(response.message || '商品の更新に失敗しました');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '商品更新エラー');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiClient, options.country]);

  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.deleteProduct(options.country, productId);
      
      if (response.status === 'success') {
        setProducts(prev => prev.filter(p => p.id !== productId));
        return true;
      } else {
        setError(response.message || '商品の削除に失敗しました');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '商品削除エラー');
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiClient, options.country]);

  const nextPage = useCallback(() => {
    const newPage = page + 1;
    if (newPage * pageSize < totalCount) {
      setPage(newPage);
    }
  }, [page, pageSize, totalCount]);

  const prevPage = useCallback(() => {
    if (page > 0) {
      setPage(page - 1);
    }
  }, [page]);

  const resetPage = useCallback(() => {
    setPage(0);
    loadProducts(true, 0);
  }, [loadProducts]);

  // 自動更新
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(() => {
        loadProducts(true);
      }, options.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval, loadProducts]);

  // 初期ロード
  useEffect(() => {
    loadProducts(true);
  }, [options.country, page, pageSize]);

  return {
    products,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    hasNextPage: (page + 1) * pageSize < totalCount,
    hasPrevPage: page > 0,
    createProduct,
    updateProduct,
    deleteProduct,
    loadProducts,
    nextPage,
    prevPage,
    resetPage,
    setPageSize,
    refresh: () => loadProducts(true)
  };
}

// ==================== 送料計算フック ====================

export function useShippingCalculator() {
  const [shippingCosts, setShippingCosts] = useState<ShippingCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = useShopeeApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!);

  const calculateShipping = useCallback(async (request: ShippingCalculateRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.calculateShipping(request);
      
      if (response.status === 'success' && response.data) {
        setShippingCosts(response.data.shippingCosts);
      } else {
        setError(response.message || '送料計算に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '送料計算エラー');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const clearResults = useCallback(() => {
    setShippingCosts([]);
    setError(null);
  }, []);

  return {
    shippingCosts,
    loading,
    error,
    calculateShipping,
    clearResults
  };
}

// ==================== コンプライアンスチェックフック ====================

export function useComplianceChecker() {
  const [complianceResults, setComplianceResults] = useState<Record<CountryCode, ComplianceResult>>({} as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = useShopeeApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!);

  const checkCompliance = useCallback(async (request: ComplianceCheckRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.checkCompliance(request);
      
      if (response.status === 'success' && response.data) {
        setComplianceResults(response.data.complianceResults);
      } else {
        setError(response.message || 'コンプライアンスチェックに失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コンプライアンスチェックエラー');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const clearResults = useCallback(() => {
    setComplianceResults({} as any);
    setError(null);
  }, []);

  const hasWarnings = useMemo(() => {
    return Object.values(complianceResults).some(result => 
      result.status === 'warnings' && result.warnings.length > 0
    );
  }, [complianceResults]);

  const hasBlockingIssues = useMemo(() => {
    return Object.values(complianceResults).some(result =>
      result.warnings.some(warning => warning.restrictionLevel === 'BANNED')
    );
  }, [complianceResults]);

  return {
    complianceResults,
    loading,
    error,
    hasWarnings,
    hasBlockingIssues,
    checkCompliance,
    clearResults
  };
}

// ==================== 一括操作フック ====================

export function useBulkOperations() {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Array<{ success: boolean; data?: any; error?: string }>>([]);
  const [currentOperation, setCurrentOperation] = useState<string>('');

  const apiClient = useShopeeApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!);

  const bulkCreateProducts = useCallback(async (
    products: ProductCreate[],
    onProgress?: (progress: number, current: number, total: number) => void
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setCurrentOperation('商品作成中...');

    try {
      const response = await apiClient.bulkCreateProducts({
        products,
        autoCalculatePricing: true
      });

      if (response.status === 'success' && response.data) {
        setResults([{ success: true, data: response.data }]);
        setProgress(100);
      } else {
        setResults([{ success: false, error: response.message }]);
      }
    } catch (err) {
      setResults([{ success: false, error: err instanceof Error ? err.message : '一括作成エラー' }]);
    } finally {
      setIsProcessing(false);
      setCurrentOperation('');
    }
  }, [apiClient]);

  const bulkUpdateStock = useCallback(async (
    updates: Array<{ sku: string; newStock: number }>,
    onProgress?: (progress: number, current: number, total: number) => void
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setCurrentOperation('在庫更新中...');

    const newResults: Array<{ success: boolean; data?: any; error?: string }> = [];

    for (let i = 0; i < updates.length; i++) {
      const { sku, newStock } = updates[i];
      
      try {
        const response = await apiClient.syncInventoryAllCountries(sku, newStock);
        
        if (response.status === 'success') {
          newResults.push({ success: true, data: response.data });
        } else {
          newResults.push({ success: false, error: response.message });
        }
      } catch (err) {
        newResults.push({ 
          success: false, 
          error: err instanceof Error ? err.message : '在庫更新エラー' 
        });
      }

      const progressPercent = ((i + 1) / updates.length) * 100;
      setProgress(progressPercent);
      onProgress?.(progressPercent, i + 1, updates.length);

      // API制限対応
      if (i < updates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setResults(newResults);
    setIsProcessing(false);
    setCurrentOperation('');
  }, [apiClient]);

  const reset = useCallback(() => {
    setProgress(0);
    setIsProcessing(false);
    setResults([]);
    setCurrentOperation('');
  }, []);

  return {
    progress,
    isProcessing,
    results,
    currentOperation,
    bulkCreateProducts,
    bulkUpdateStock,
    reset
  };
}

// ==================== WebSocket通信フック ====================

export function useRealTimeUpdates(country: CountryCode) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_BASE_URL}/ws/products/${country}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error('WebSocketメッセージ解析エラー:', err);
      }
    };

    ws.onerror = (error) => {
      setConnectionError('WebSocket接続エラー');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [country]);

  return {
    isConnected,
    lastMessage,
    connectionError
  };
}

// ==================== ユーティリティ関数 ====================

// 価格フォーマット
export function formatPrice(price: number, currency: string): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    SGD: new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }),
    MYR: new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }),
    THB: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }),
    PHP: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }),
    IDR: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }),
    VND: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
    TWD: new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }),
    JPY: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
  };

  const formatter = formatters[currency] || formatters.SGD;
  return formatter.format(price);
}

// 利益率の色分け
export function getProfitMarginColor(margin: number): string {
  if (margin >= 30) return 'text-green-600';
  if (margin >= 20) return 'text-blue-600';
  if (margin >= 10) return 'text-yellow-600';
  return 'text-red-600';
}

// 在庫状況の判定
export function getStockStatus(stock: number, reserved: number = 0): {
  status: 'high' | 'medium' | 'low' | 'out';
  label: string;
  color: string;
} {
  const available = stock - reserved;
  
  if (available <= 0) {
    return { status: 'out', label: '在庫切れ', color: 'text-red-600' };
  } else if (available <= 5) {
    return { status: 'low', label: '残りわずか', color: 'text-orange-600' };
  } else if (available <= 20) {
    return { status: 'medium', label: '在庫あり', color: 'text-yellow-600' };
  } else {
    return { status: 'high', label: '十分な在庫', color: 'text-green-600' };
  }
}

// 国名・通貨の変換
export function getCountryInfo(countryCode: CountryCode) {
  const countryInfo = {
    SG: { name: 'シンガポール', currency: 'SGD', flag: '🇸🇬' },
    MY: { name: 'マレーシア', currency: 'MYR', flag: '🇲🇾' },
    TH: { name: 'タイ', currency: 'THB', flag: '🇹🇭' },
    PH: { name: 'フィリピン', currency: 'PHP', flag: '🇵🇭' },
    ID: { name: 'インドネシア', currency: 'IDR', flag: '🇮🇩' },
    VN: { name: 'ベトナム', currency: 'VND', flag: '🇻🇳' },
    TW: { name: '台湾', currency: 'TWD', flag: '🇹🇼' },
  };

  return countryInfo[countryCode];
}

// CSV解析ユーティリティ
export function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return rows;
}

// 商品データバリデーション
export function validateProductData(data: Partial<ProductCreate>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.sku?.trim()) {
    errors.sku = 'SKUは必須です';
  }

  if (!data.productNameJa?.trim()) {
    errors.productNameJa = '商品名（日本語）は必須です';
  }

  if (!data.productNameEn?.trim()) {
    errors.productNameEn = '商品名（英語）は必須です';
  }

  if (!data.priceJpy || data.priceJpy <= 0) {
    errors.priceJpy = '価格は0より大きい値である必要があります';
  }

  if (!data.weightG || data.weightG <= 0) {
    errors.weightG = '重量は0より大きい値である必要があります';
  }

  if (!data.categoryId) {
    errors.categoryId = 'カテゴリーIDは必須です';
  }

  if (!data.stockQuantity || data.stockQuantity < 0) {
    errors.stockQuantity = '在庫数は0以上である必要があります';
  }

  if (!data.countryCode) {
    errors.countryCode = '対象国は必須です';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// 重量の単位変換
export function convertWeight(weightG: number, targetUnit: 'g' | 'kg' | 'lb'): number {
  switch (targetUnit) {
    case 'g':
      return weightG;
    case 'kg':
      return weightG / 1000;
    case 'lb':
      return weightG / 453.592;
    default:
      return weightG;
  }
}

// 画像URL検証
export function validateImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// デバウンス関数
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ローカルストレージフック
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('LocalStorage保存エラー:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

// ==================== 完了 ====================

export {
  // Hooks
  useProducts,
  useShippingCalculator,
  useComplianceChecker,
  useBulkOperations,
  useRealTimeUpdates,
  useDebounce,
  useLocalStorage,
  
  // Utilities
  formatPrice,
  getProfitMarginColor,
  getStockStatus,
  getCountryInfo,
  parseCSV,
  validateProductData,
  convertWeight,
  validateImageUrl
};