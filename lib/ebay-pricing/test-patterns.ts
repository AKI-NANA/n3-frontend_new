/**
 * テスト用パターンセット
 * 
 * 赤字・送料上限・正常パターンを網羅
 */

export const TEST_PATTERNS = {
  // 🔴 赤字パターン（USA出品不可）
  deficit: [
    {
      name: '中国製低価格繊維製品',
      costJPY: 3000,
      weight_kg: 0.5,
      targetMargin: 15,
      hsCode: '6307.90.98.94',  // Textile articles
      originCountry: 'CN',
      expectedResult: 'USA出品不可',
      reason: 'DDP 113.8%が高すぎる'
    },
    {
      name: '中国製アパレル',
      costJPY: 5000,
      weight_kg: 1.0,
      targetMargin: 20,
      hsCode: '6203.42.40.35',  // Men's trousers
      originCountry: 'CN',
      expectedResult: 'USA出品不可',
      reason: '高利益率 + DDP 113.8%'
    },
    {
      name: '中国製おもちゃ（重量大）',
      costJPY: 8000,
      weight_kg: 2.0,
      targetMargin: 10,
      hsCode: '9503.00.00.80',  // Toys
      originCountry: 'CN',
      expectedResult: 'USA出品不可',
      reason: '重量 + DDP 113.8%'
    },
    {
      name: '中国製家電',
      costJPY: 12000,
      weight_kg: 1.5,
      targetMargin: 15,
      hsCode: '8516.79.00.00',  // Electric appliances
      originCountry: 'CN',
      expectedResult: 'USA出品不可',
      reason: 'DDP 113.8% + 送料高'
    }
  ],

  // ⚠️ 送料上限パターン
  shippingLimit: [
    {
      name: '重い書籍',
      costJPY: 5000,
      weight_kg: 2.0,
      targetMargin: 15,
      hsCode: '4901.10.00.40',  // Printed books
      originCountry: 'JP',
      ebayCategory: '267',  // Books
      expectedResult: '送料上限調整',
      shippingLimit: 20.00
    },
    {
      name: 'DVD（正常）',
      costJPY: 3000,
      weight_kg: 0.3,
      targetMargin: 15,
      hsCode: '8523.49.40.00',  // DVDs
      originCountry: 'JP',
      ebayCategory: '617',  // DVDs & Blu-ray
      expectedResult: '送料上限内',
      shippingLimit: 20.00
    },
    {
      name: '複数枚CD',
      costJPY: 8000,
      weight_kg: 1.5,
      targetMargin: 15,
      hsCode: '8523.49.20.00',  // Audio CDs
      originCountry: 'JP',
      ebayCategory: '176985',  // Music CDs
      expectedResult: '送料上限調整',
      shippingLimit: 25.00
    },
    {
      name: 'ヴァイナルレコード',
      costJPY: 15000,
      weight_kg: 2.5,
      targetMargin: 15,
      hsCode: '8524.99.40.00',  // Vinyl records
      originCountry: 'JP',
      ebayCategory: '176984',  // Vinyl Records
      expectedResult: '送料上限調整',
      shippingLimit: 40.00
    }
  ],

  // ✅ 正常パターン
  normal: [
    {
      name: '日本製コレクタブル',
      costJPY: 10000,
      weight_kg: 1.0,
      targetMargin: 15,
      hsCode: '9620.00.20.00',  // Collectibles
      originCountry: 'JP',
      expectedResult: '正常出品可能',
      expectedMargin: 15.0
    },
    {
      name: 'USA製ゲーム機',
      costJPY: 8000,
      weight_kg: 0.8,
      targetMargin: 20,
      hsCode: '9504.50.00.00',  // Video game consoles
      originCountry: 'US',
      expectedResult: '正常出品可能',
      expectedMargin: 20.0
    },
    {
      name: '日本製カメラ',
      costJPY: 25000,
      weight_kg: 1.2,
      targetMargin: 15,
      hsCode: '9006.30.00.00',  // Cameras
      originCountry: 'JP',
      expectedResult: '正常出品可能',
      expectedMargin: 15.0
    }
  ]
}

// HTSコードの詳細情報
export const HTS_CODE_DETAILS = {
  '6307.90.98.94': {
    description: 'Textile articles NES',
    baseTariffRate: 0.07,  // 7%
    category: 'Textile'
  },
  '6203.42.40.35': {
    description: "Men's trousers of cotton",
    baseTariffRate: 0.165,  // 16.5%
    category: 'Apparel'
  },
  '9503.00.00.80': {
    description: 'Toys',
    baseTariffRate: 0.00,  // 0%
    category: 'Toys'
  },
  '8516.79.00.00': {
    description: 'Electric appliances',
    baseTariffRate: 0.025,  // 2.5%
    category: 'Electronics'
  },
  '4901.10.00.40': {
    description: 'Printed books',
    baseTariffRate: 0.00,  // 0% (books are duty-free)
    category: 'Books',
    shippingLimit: 20.00
  },
  '8523.49.40.00': {
    description: 'Optical discs for reproducing sound and image (DVDs)',
    baseTariffRate: 0.00,  // 0%
    category: 'Media',
    shippingLimit: 20.00
  },
  '8523.49.20.00': {
    description: 'Optical discs for reproducing sound only (CDs)',
    baseTariffRate: 0.00,  // 0%
    category: 'Media',
    shippingLimit: 25.00
  },
  '8524.99.40.00': {
    description: 'Phonograph records',
    baseTariffRate: 0.033,  // 3.3%
    category: 'Media',
    shippingLimit: 40.00
  },
  '9620.00.20.00': {
    description: 'Collectibles',
    baseTariffRate: 0.058,  // 5.8%
    category: 'Collectibles'
  },
  '9504.50.00.00': {
    description: 'Video game consoles',
    baseTariffRate: 0.00,  // 0%
    category: 'Electronics'
  },
  '9006.30.00.00': {
    description: 'Cameras',
    baseTariffRate: 0.00,  // 0%
    category: 'Electronics'
  }
}
