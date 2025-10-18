/**
 * NAGANO-3 API モックデータ
 * 開発・テスト用
 */

import type { Product } from '@/types/product';

/**
 * モック商品データ
 */
export const mockProducts: Record<string, Product> = {
  '12345': {
    id: '12345',
    asin: 'B0EXAMPLE1',
    sku: 'SKU-SAMPLE-001',
    title: 'テスト商品 - ワイヤレスイヤホン',
    description: '高音質ワイヤレスイヤホン。Bluetooth 5.0対応、最大8時間連続再生可能。',
    price: 8980,
    cost: 4500,
    profit: 3200,
    
    images: [
      {
        id: 'img-1',
        url: 'https://picsum.photos/400/400?random=1',
        thumbnail: 'https://picsum.photos/100/100?random=1',
        isMain: true,
        order: 0,
        alt: 'メイン画像',
        selected: true,
      },
      {
        id: 'img-2',
        url: 'https://picsum.photos/400/400?random=2',
        thumbnail: 'https://picsum.photos/100/100?random=2',
        isMain: false,
        order: 1,
        alt: 'サブ画像1',
        selected: true,
      },
      {
        id: 'img-3',
        url: 'https://picsum.photos/400/400?random=3',
        thumbnail: 'https://picsum.photos/100/100?random=3',
        isMain: false,
        order: 2,
        alt: 'サブ画像2',
        selected: false,
      },
      {
        id: 'img-4',
        url: 'https://picsum.photos/400/400?random=4',
        thumbnail: 'https://picsum.photos/100/100?random=4',
        isMain: false,
        order: 3,
        alt: 'サブ画像3',
        selected: false,
      },
      {
        id: 'img-5',
        url: 'https://picsum.photos/400/400?random=5',
        thumbnail: 'https://picsum.photos/100/100?random=5',
        isMain: false,
        order: 4,
        alt: 'サブ画像4',
        selected: false,
      },
    ],
    selectedImages: ['img-1', 'img-2'],
    
    category: {
      id: 'cat-electronics-audio',
      name: 'オーディオ機器',
      path: ['家電', 'オーディオ', 'イヤホン'],
      confidence: 0.95,
      suggestedBy: 'ai',
    },
    
    stock: {
      available: 10,
      reserved: 2,
      incoming: 5,
      location: '倉庫A-12',
      lastUpdated: '2025-09-29T10:30:00Z',
    },
    
    marketplace: {
      id: 'ebay',
      name: 'eBay',
      listingId: 'EB123456789',
      status: 'active',
      listedPrice: 8980,
      fees: {
        commission: 898,
        shipping: 500,
        other: 100,
        total: 1498,
      },
    },
    
    createdAt: '2025-09-20T08:00:00Z',
    updatedAt: '2025-09-29T12:00:00Z',
    lastEditedBy: 'admin',
  },
  
  'B0EXAMPLE': {
    id: '67890',
    asin: 'B0EXAMPLE',
    sku: 'SKU-SAMPLE-002',
    title: 'テスト商品 - スマートウォッチ',
    description: '多機能スマートウォッチ。心拍数モニター、睡眠追跡、GPS搭載。',
    price: 15800,
    cost: 8900,
    profit: 5200,
    
    images: [
      {
        id: 'img-10',
        url: 'https://picsum.photos/400/400?random=10',
        thumbnail: 'https://picsum.photos/100/100?random=10',
        isMain: true,
        order: 0,
        alt: 'メイン画像',
        selected: true,
      },
      {
        id: 'img-11',
        url: 'https://picsum.photos/400/400?random=11',
        thumbnail: 'https://picsum.photos/100/100?random=11',
        isMain: false,
        order: 1,
        alt: 'サブ画像1',
        selected: true,
      },
      {
        id: 'img-12',
        url: 'https://picsum.photos/400/400?random=12',
        thumbnail: 'https://picsum.photos/100/100?random=12',
        isMain: false,
        order: 2,
        alt: 'サブ画像2',
        selected: true,
      },
    ],
    selectedImages: ['img-10', 'img-11', 'img-12'],
    
    category: {
      id: 'cat-electronics-wearable',
      name: 'ウェアラブルデバイス',
      path: ['家電', 'ウェアラブル', 'スマートウォッチ'],
      confidence: 0.92,
      suggestedBy: 'ai',
    },
    
    stock: {
      available: 5,
      reserved: 1,
      incoming: 10,
      location: '倉庫B-05',
      lastUpdated: '2025-09-29T11:00:00Z',
    },
    
    createdAt: '2025-09-15T09:00:00Z',
    updatedAt: '2025-09-29T11:30:00Z',
    lastEditedBy: 'admin',
  },
};

/**
 * モックAPIレスポンス生成
 */
export function getMockProduct(id: string): Product | null {
  return mockProducts[id] || null;
}

/**
 * モック遅延（実際のAPI呼び出しをシミュレート）
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
