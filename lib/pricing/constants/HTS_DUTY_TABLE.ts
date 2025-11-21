/**
 * HSコード別 関税率テーブル
 * DDP (Delivery Duty Paid) コストのうち、関税部分を計算するためのマッピング
 */

export interface DutyTableEntry {
  description?: string; // HSコードの説明（参考用）
  rate: number; // 関税率（0.05 = 5%）
}

export const HTS_DUTY_TABLE: {
  [country: string]: {
    [htsCode: string]: DutyTableEntry | number;
  };
} = {
  // アメリカ向け関税率
  US: {
    // トレーディングカード・ボードゲーム類
    '9504.40': { rate: 0.00, description: 'Playing cards' },
    '9504.90': { rate: 0.00, description: 'Other games, operated by coins, banknotes' },
    '9504.50': { rate: 0.00, description: 'Video game consoles and machines' },

    // フィギュア・おもちゃ
    '9503.00': { rate: 0.00, description: 'Toys, scale models and puzzles' },
    '9503.41': { rate: 0.00, description: 'Stuffed toys' },
    '9503.70': { rate: 0.00, description: 'Other toys, put up in sets or outfits' },

    // アパレル（綿製品）
    '6104.42': { rate: 0.163, description: "Women's cotton trousers" },
    '6104.62': { rate: 0.163, description: "Women's cotton trousers (not knitted)" },
    '6203.42': { rate: 0.163, description: "Men's cotton trousers" },
    '6109.10': { rate: 0.165, description: 'Cotton T-shirts, singlets' },

    // アパレル（合成繊維）
    '6104.63': { rate: 0.282, description: "Women's synthetic fiber trousers" },
    '6203.43': { rate: 0.277, description: "Men's synthetic fiber trousers" },

    // 腕時計
    '9101.21': { rate: 0.038, description: 'Automatic winding wristwatches' },
    '9101.29': { rate: 0.038, description: 'Other wristwatches with mechanical movement' },
    '9102.21': { rate: 0.038, description: 'Automatic winding wristwatches (non-precious metal)' },

    // 電子機器・スマートフォン
    '8517.12': { rate: 0.00, description: 'Telephones for cellular networks (smartphones)' },
    '8517.62': { rate: 0.00, description: 'Machines for reception, conversion and transmission' },
    '8471.30': { rate: 0.00, description: 'Portable automatic data processing machines (laptops)' },

    // カメラ・光学機器
    '9006.30': { rate: 0.00, description: 'Cameras specially designed for underwater use' },
    '9006.40': { rate: 0.00, description: 'Instant print cameras' },
    '9006.53': { rate: 0.00, description: 'Other cameras (for roll film)' },

    // 書籍・印刷物
    '4901.10': { rate: 0.00, description: 'Printed books, brochures, leaflets' },
    '4901.99': { rate: 0.00, description: 'Other printed books' },

    // 家具
    '9403.60': { rate: 0.00, description: 'Other wooden furniture' },
    '9403.70': { rate: 0.00, description: 'Furniture of plastics' },

    // 靴
    '6403.20': { rate: 0.09, description: 'Footwear with outer soles of leather' },
    '6404.11': { rate: 0.09, description: 'Sports footwear; tennis shoes, basketball shoes' },

    // バッグ・革製品
    '4202.11': { rate: 0.08, description: 'Trunks, suit-cases with outer surface of leather' },
    '4202.12': { rate: 0.175, description: 'Trunks, suit-cases with outer surface of plastics' },
    '4202.22': { rate: 0.175, description: 'Handbags with outer surface of plastic sheeting' },

    // 化粧品・香水
    '3304.99': { rate: 0.00, description: 'Other beauty or make-up preparations' },
    '3303.00': { rate: 0.00, description: 'Perfumes and toilet waters' },

    // 宝飾品
    '7113.11': { rate: 0.055, description: 'Articles of jewelry of silver' },
    '7113.19': { rate: 0.055, description: 'Articles of jewelry of other precious metal' },
    '7117.19': { rate: 0.11, description: 'Other imitation jewelry' },

    // スポーツ用品
    '9506.40': { rate: 0.042, description: 'Table-tennis equipment' },
    '9506.62': { rate: 0.042, description: 'Inflatable balls' },
    '9506.91': { rate: 0.042, description: 'Exercise equipment' },

    // 楽器
    '9207.10': { rate: 0.055, description: 'Keyboard instruments other than accordions' },
    '9207.90': { rate: 0.055, description: 'Musical instruments (guitars, etc.)' },

    DEFAULT: { rate: 0.03, description: 'Default duty rate for unmatched HTS codes' },
  },

  // オーストラリア向け関税率（多くの品目で関税免除だが一部例外あり）
  AU: {
    // トレーディングカード・ゲーム
    '9504.40': { rate: 0.05, description: 'Playing cards' },
    '9504.50': { rate: 0.00, description: 'Video game consoles' },

    // アパレル
    '6104.42': { rate: 0.05, description: "Women's cotton trousers" },
    '6203.42': { rate: 0.05, description: "Men's cotton trousers" },
    '6109.10': { rate: 0.05, description: 'Cotton T-shirts' },

    // 靴
    '6403.20': { rate: 0.05, description: 'Footwear with outer soles of leather' },
    '6404.11': { rate: 0.05, description: 'Sports footwear' },

    // 電子機器
    '8517.12': { rate: 0.00, description: 'Smartphones' },
    '8471.30': { rate: 0.00, description: 'Laptops' },

    // 書籍
    '4901.10': { rate: 0.00, description: 'Printed books' },

    DEFAULT: { rate: 0.00, description: 'Default - most items duty-free under FTA' },
  },

  // 日本向け関税率（国内販売なので基本的に不要だが、参考用）
  JP: {
    DEFAULT: { rate: 0.00, description: 'Domestic market - no duty' },
  },

  // カナダ向け関税率
  CA: {
    // アパレル
    '6104.42': { rate: 0.17, description: "Women's cotton trousers" },
    '6203.42': { rate: 0.175, description: "Men's cotton trousers" },
    '6109.10': { rate: 0.18, description: 'Cotton T-shirts' },

    // 電子機器
    '8517.12': { rate: 0.00, description: 'Smartphones' },
    '8471.30': { rate: 0.00, description: 'Laptops' },

    // おもちゃ
    '9503.00': { rate: 0.00, description: 'Toys' },

    DEFAULT: { rate: 0.065, description: 'Default duty rate' },
  },

  // イギリス向け関税率
  GB: {
    // アパレル
    '6104.42': { rate: 0.12, description: "Women's cotton trousers" },
    '6203.42': { rate: 0.12, description: "Men's cotton trousers" },
    '6109.10': { rate: 0.12, description: 'Cotton T-shirts' },

    // 電子機器
    '8517.12': { rate: 0.00, description: 'Smartphones' },
    '8471.30': { rate: 0.00, description: 'Laptops' },

    // 靴
    '6403.20': { rate: 0.08, description: 'Leather footwear' },

    DEFAULT: { rate: 0.025, description: 'Default duty rate' },
  },

  // 韓国向け関税率
  KR: {
    // アパレル
    '6104.42': { rate: 0.13, description: "Women's cotton trousers" },
    '6203.42': { rate: 0.13, description: "Men's cotton trousers" },
    '6109.10': { rate: 0.13, description: 'Cotton T-shirts' },

    // 電子機器
    '8517.12': { rate: 0.00, description: 'Smartphones' },
    '8471.30': { rate: 0.00, description: 'Laptops' },

    // 化粧品
    '3304.99': { rate: 0.065, description: 'Beauty products' },

    DEFAULT: { rate: 0.08, description: 'Default duty rate' },
  },

  // シンガポール向け関税率（ほぼ関税フリー）
  SG: {
    // アルコール類以外はほぼ無税
    DEFAULT: { rate: 0.00, description: 'Singapore - mostly duty-free' },
  },
};

/**
 * HSコードと国に基づき関税率を取得
 * @param htsCode - HSコード（例: "9504.40"）
 * @param targetCountry - ターゲット国コード（例: "US", "AU"）
 * @returns 関税率（0.05 = 5%）
 */
export function getDutyRate(htsCode: string, targetCountry: string): number {
  const countryTable = HTS_DUTY_TABLE[targetCountry];

  if (!countryTable) {
    console.warn(
      `[HTS_DUTY_TABLE] 国コード ${targetCountry} のテーブルが見つかりません。デフォルト関税率を使用します。`
    );
    return 0.03; // 3%
  }

  // 完全一致を試みる
  let entry = countryTable[htsCode];

  if (!entry) {
    // 6桁に切り詰めて再試行（例: "9504.40.0000" → "9504.40"）
    const shortCode = htsCode.substring(0, 7); // "9504.40"
    entry = countryTable[shortCode];
  }

  if (!entry) {
    // デフォルトを使用
    entry = countryTable['DEFAULT'];
  }

  if (typeof entry === 'number') {
    return entry;
  }

  return entry ? entry.rate : 0.03;
}

/**
 * HSコードの説明を取得（デバッグ用）
 */
export function getDutyDescription(htsCode: string, targetCountry: string): string {
  const countryTable = HTS_DUTY_TABLE[targetCountry];

  if (!countryTable) {
    return 'Unknown country';
  }

  const entry = countryTable[htsCode] || countryTable['DEFAULT'];

  if (typeof entry === 'number') {
    return 'No description';
  }

  return entry ? entry.description || 'No description' : 'No description';
}
