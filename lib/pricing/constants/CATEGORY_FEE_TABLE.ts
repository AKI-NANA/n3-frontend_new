/**
 * モール・カテゴリ別 販売手数料テーブル
 * 各プラットフォームの公式手数料率に基づく
 */

export interface FeeTableEntry {
  rate: number; // 手数料率（0.15 = 15%）
  fixedFee?: number; // 固定手数料（ドル/円など、通貨による）
  description?: string; // 説明（参考用）
}

export const CATEGORY_FEE_TABLE: {
  [platform: string]: {
    [country: string]: {
      [category: string]: FeeTableEntry | number;
    };
  };
} = {
  // Amazon手数料
  Amazon: {
    US: {
      // 公式カテゴリに基づく手数料率
      'Trading Cards': { rate: 0.15, description: 'Collectible trading cards' },
      Collectibles: { rate: 0.15, description: 'Collectibles' },
      'Sports Collectibles': { rate: 0.15, description: 'Sports collectibles' },

      Apparel: { rate: 0.17, description: 'Clothing & accessories' },
      'Shoes, Handbags & Sunglasses': {
        rate: 0.15,
        description: 'Shoes, handbags, sunglasses',
      },

      Electronics: { rate: 0.08, description: 'Consumer electronics' },
      'Computers & Accessories': { rate: 0.08, description: 'Computers' },
      'Camera & Photo': { rate: 0.08, description: 'Cameras' },

      Books: { rate: 0.15, description: 'Books (physical & digital)' },
      'Music & DVD': { rate: 0.15, description: 'Music, DVDs' },

      'Toys & Games': { rate: 0.15, description: 'Toys and games' },
      'Video Games': { rate: 0.15, description: 'Video games' },

      Jewelry: { rate: 0.20, description: 'Jewelry (20% referral fee)' },
      'Fine Art': { rate: 0.20, description: 'Fine art' },
      'Luxury Beauty': { rate: 0.08, description: 'Luxury beauty (invitation only)' },

      'Home & Kitchen': { rate: 0.15, description: 'Home and kitchen' },
      Furniture: { rate: 0.15, description: 'Furniture' },
      'Patio, Lawn & Garden': { rate: 0.15, description: 'Outdoor items' },

      'Sports & Outdoors': { rate: 0.15, description: 'Sports equipment' },
      Automotive: { rate: 0.12, description: 'Automotive parts' },

      'Health & Personal Care': { rate: 0.15, description: 'Health products' },
      Beauty: { rate: 0.15, description: 'Beauty & personal care' },

      'Office Products': { rate: 0.15, description: 'Office supplies' },
      'Industrial & Scientific': { rate: 0.12, description: 'Industrial products' },

      DEFAULT: { rate: 0.15, description: 'Default Amazon US referral fee' },
    },

    AU: {
      // オーストラリアも米国と同様の手数料構造
      'Trading Cards': { rate: 0.15 },
      Collectibles: { rate: 0.15 },
      Apparel: { rate: 0.17 },
      Electronics: { rate: 0.08 },
      Books: { rate: 0.15 },
      'Toys & Games': { rate: 0.15 },
      Jewelry: { rate: 0.20 },
      DEFAULT: { rate: 0.15 },
    },

    JP: {
      // 日本のカテゴリ別手数料
      'トレーディングカード': { rate: 0.15, description: 'トレーディングカード' },
      コレクタブル: { rate: 0.15 },
      ファッション: { rate: 0.17, description: 'アパレル' },
      エレクトロニクス: { rate: 0.08, description: '家電・カメラ' },
      本: { rate: 0.15 },
      'ゲーム': { rate: 0.15, description: 'ゲーム・おもちゃ' },
      ジュエリー: { rate: 0.20 },
      DEFAULT: { rate: 0.15 },
    },
  },

  // eBay手数料
  eBay: {
    US: {
      // eBayの手数料は販売手数料 + PayPalなどの決済手数料
      Collectibles: { rate: 0.129, fixedFee: 0.3, description: '12.9% + $0.30' },
      'Trading Cards': { rate: 0.129, fixedFee: 0.3, description: '12.9% + $0.30' },
      'Sports Cards': { rate: 0.129, fixedFee: 0.3 },

      'Luxury Watches': { rate: 0.10, description: '10% (first $7,500)' },
      Jewelry: { rate: 0.129, fixedFee: 0.3 },

      Electronics: { rate: 0.1325, fixedFee: 0.3, description: '13.25% + $0.30' },
      Computers: { rate: 0.1325, fixedFee: 0.3 },

      'Fashion & Apparel': { rate: 0.1325, fixedFee: 0.3 },
      Shoes: { rate: 0.1325, fixedFee: 0.3 },

      'Toys & Hobbies': { rate: 0.1325, fixedFee: 0.3 },
      'Home & Garden': { rate: 0.1325, fixedFee: 0.3 },

      Books: { rate: 0.1495, fixedFee: 0.3, description: '14.95% + $0.30' },
      'Music & Movies': { rate: 0.1495, fixedFee: 0.3 },

      DEFAULT: { rate: 0.1325, fixedFee: 0.3, description: 'Default eBay fee' },
    },

    AU: {
      // オーストラリアのeBay手数料
      Collectibles: { rate: 0.129, fixedFee: 0.3 },
      Electronics: { rate: 0.1325, fixedFee: 0.3 },
      Fashion: { rate: 0.1325, fixedFee: 0.3 },
      DEFAULT: { rate: 0.1325, fixedFee: 0.3 },
    },

    JP: {
      // 日本のeBay（あまり使われないが参考用）
      DEFAULT: { rate: 0.10, description: '日本のeBay手数料' },
    },
  },

  // Coupang手数料（韓国）
  Coupang: {
    KR: {
      // クーパンのカテゴリ別手数料
      패션: { rate: 0.15, description: 'ファッション' },
      뷰티: { rate: 0.12, description: '美容・化粧品' },
      가전: { rate: 0.08, description: '家電' },
      스포츠: { rate: 0.11, description: 'スポーツ・レジャー' },
      식품: { rate: 0.10, description: '食品' },
      생활용품: { rate: 0.11, description: '生活用品' },
      완구: { rate: 0.11, description: 'おもちゃ' },

      // 英語カテゴリも一部サポート
      Fashion: { rate: 0.15 },
      Beauty: { rate: 0.12 },
      Electronics: { rate: 0.08 },

      DEFAULT: { rate: 0.11, description: 'デフォルトクーパン手数料' },
    },
  },

  // Qoo10手数料（シンガポール・日本など）
  Qoo10: {
    SG: {
      // Qoo10シンガポール
      Fashion: { rate: 0.10, description: 'Fashion & accessories' },
      Electronics: { rate: 0.10 },
      'Beauty & Health': { rate: 0.10 },
      'Sports & Leisure': { rate: 0.10 },
      'Home & Living': { rate: 0.10 },
      DEFAULT: { rate: 0.10, description: 'Qoo10基本手数料 10%' },
    },

    JP: {
      // Qoo10日本
      ファッション: { rate: 0.10 },
      家電: { rate: 0.10 },
      美容: { rate: 0.10 },
      DEFAULT: { rate: 0.10 },
    },
  },

  // Shopee手数料
  Shopee: {
    SG: {
      // Shopeeシンガポール
      Fashion: { rate: 0.05, description: 'ファッション 5%' },
      Electronics: { rate: 0.05 },
      'Home & Living': { rate: 0.05 },
      'Health & Beauty': { rate: 0.05 },
      'Sports & Travel': { rate: 0.05 },
      DEFAULT: { rate: 0.05, description: 'Shopee基本手数料 5%' },
    },

    MY: {
      // マレーシア
      DEFAULT: { rate: 0.05 },
    },

    TH: {
      // タイ
      DEFAULT: { rate: 0.05 },
    },
  },

  // Shopify手数料（決済手数料のみ、月額料金は別）
  Shopify: {
    US: {
      // Shopify Paymentsを使用する場合
      DEFAULT: { rate: 0.029, fixedFee: 0.3, description: '2.9% + $0.30 (Basic plan)' },
    },

    JP: {
      DEFAULT: { rate: 0.034, description: '3.4% (ベーシックプラン)' },
    },
  },

  // メルカリ手数料（日本）
  Mercari: {
    JP: {
      // メルカリは全カテゴリ一律10%
      DEFAULT: { rate: 0.10, description: 'メルカリ販売手数料 10%' },
    },
  },
};

/**
 * プラットフォーム、国、カテゴリに基づき手数料情報を取得
 * @param platform - プラットフォーム名（例: "Amazon", "eBay"）
 * @param country - 国コード（例: "US", "JP"）
 * @param category - カテゴリ名（例: "Trading Cards", "Electronics"）
 * @returns 手数料情報
 */
export function getFeeInfo(
  platform: string,
  country: string,
  category: string
): FeeTableEntry {
  const platformTable = CATEGORY_FEE_TABLE[platform];

  if (!platformTable) {
    console.warn(
      `[CATEGORY_FEE_TABLE] プラットフォーム ${platform} のテーブルが見つかりません。`
    );
    return { rate: 0.15, description: 'Unknown platform - using 15% default' };
  }

  const countryTable = platformTable[country];

  if (!countryTable) {
    console.warn(
      `[CATEGORY_FEE_TABLE] ${platform} の国 ${country} のテーブルが見つかりません。`
    );
    return { rate: 0.15, description: 'Unknown country - using 15% default' };
  }

  // カテゴリで検索
  let entry = countryTable[category];

  // カテゴリが見つからない場合、部分一致を試みる
  if (!entry) {
    const lowerCategory = category.toLowerCase();
    for (const key in countryTable) {
      if (key.toLowerCase().includes(lowerCategory) || lowerCategory.includes(key.toLowerCase())) {
        entry = countryTable[key];
        break;
      }
    }
  }

  // それでも見つからない場合、デフォルトを使用
  if (!entry) {
    entry = countryTable['DEFAULT'];
  }

  if (typeof entry === 'number') {
    return { rate: entry };
  }

  return entry || { rate: 0.15, description: 'Fallback default fee' };
}

/**
 * 手数料を計算（パーセンテージ + 固定費）
 * @param feeInfo - 手数料情報
 * @param price - 販売価格
 * @returns 手数料（同じ通貨単位）
 */
export function calculateFee(feeInfo: FeeTableEntry, price: number): number {
  const percentageFee = price * feeInfo.rate;
  const fixedFee = feeInfo.fixedFee || 0;
  return percentageFee + fixedFee;
}
