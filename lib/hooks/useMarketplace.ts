'use client';

/**
 * マーケットプレイス管理フック
 */

import { useState, useCallback } from 'react';
import type { MarketplaceType } from '@/types/marketplace';
import type { MarketplaceFieldData } from '@/types/fullModal';

export function useMarketplace(initialMarketplace: MarketplaceType = 'ebay') {
  const [currentMarketplace, setCurrentMarketplace] = useState<MarketplaceType>(initialMarketplace);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceFieldData>({});

  /**
   * マーケットプレイス切り替え
   */
  const switchMarketplace = useCallback((marketplace: MarketplaceType) => {
    setCurrentMarketplace(marketplace);
  }, []);

  /**
   * マーケットプレイス別データ更新
   */
  const updateMarketplaceData = useCallback(
    (marketplace: MarketplaceType, data: any) => {
      setMarketplaceData((prev) => ({
        ...prev,
        [marketplace]: {
          ...prev[marketplace],
          ...data,
        },
      }));
    },
    []
  );

  /**
   * マーケットプレイス別最大画像数取得
   */
  const getMaxImages = useCallback((marketplace: MarketplaceType) => {
    const limits: Record<MarketplaceType, number> = {
      'ebay': 12,
      'shopee': 10,
      'amazon-global': 9,
      'amazon-jp': 9,
      'coupang': 20,
      'shopify': 25,
      'mercari': 10,
      'rakuma': 10,
      'yahoo': 10,
      'amazon': 9,
    };
    return limits[marketplace] || 12;
  }, []);

  /**
   * マーケットプレイス表示名取得
   */
  const getMarketplaceName = useCallback((marketplace: MarketplaceType) => {
    const names: Record<MarketplaceType, string> = {
      'ebay': 'eBay',
      'shopee': 'Shopee',
      'amazon-global': 'Amazon海外',
      'amazon-jp': 'Amazon日本',
      'coupang': 'Coupang',
      'shopify': 'Shopify',
      'mercari': 'メルカリ',
      'rakuma': 'ラクマ',
      'yahoo': 'Yahoo!オークション',
      'amazon': 'Amazon',
    };
    return names[marketplace] || marketplace;
  }, []);

  return {
    currentMarketplace,
    marketplaceData,
    switchMarketplace,
    updateMarketplaceData,
    getMaxImages,
    getMarketplaceName,
  };
}
