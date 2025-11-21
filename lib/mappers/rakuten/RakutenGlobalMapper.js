// RakutenGlobalMapper.js: Rakuten Global (JP/TW/MY) API向けデータマッピング関数 (T47-T50)

// 楽天グローバル市場の定義
const RAKUTEN_MARKETS = {
  JP: {
    currency: "JPY",
    marketName: "楽天市場 (Japan)",
    marketCode: "JP",
    vatRate: 0.1, // 消費税10%
  },
  TW: {
    currency: "TWD",
    marketName: "樂天市場 (Taiwan)",
    marketCode: "TW",
    vatRate: 0.05, // VAT 5%
  },
  MY: {
    currency: "MYR",
    marketName: "Rakuten Malaysia",
    marketCode: "MY",
    vatRate: 0.06, // SST/GST 6%
  },
  SG: {
    currency: "SGD",
    marketName: "Rakuten Singapore",
    marketCode: "SG",
    vatRate: 0.08, // GST 8%
  },
};

// T48: 楽天カテゴリ別手数料構造（主要カテゴリ）
const RAKUTEN_CATEGORY_FEE_STRUCTURE = {
  ELECTRONICS: { categoryId: "RAK001", commissionRate: 0.08, monthlyFee: 5000 }, // 家電: 8%
  FASHION: { categoryId: "RAK002", commissionRate: 0.10, monthlyFee: 5000 }, // ファッション: 10%
  BEAUTY: { categoryId: "RAK003", commissionRate: 0.09, monthlyFee: 5000 }, // 美容: 9%
  FOOD: { categoryId: "RAK004", commissionRate: 0.12, monthlyFee: 5000 }, // 食品: 12%
  SPORTS: { categoryId: "RAK005", commissionRate: 0.08, monthlyFee: 5000 }, // スポーツ: 8%
  TOYS: { categoryId: "RAK006", commissionRate: 0.09, monthlyFee: 5000 }, // おもちゃ: 9%
  BOOKS: { categoryId: "RAK007", commissionRate: 0.07, monthlyFee: 3000 }, // 書籍: 7%
  HOME: { categoryId: "RAK008", commissionRate: 0.09, monthlyFee: 5000 }, // ホーム: 9%
  JEWELRY: { categoryId: "RAK009", commissionRate: 0.10, monthlyFee: 8000 }, // ジュエリー: 10%
  DEFAULT: { categoryId: "RAK000", commissionRate: 0.09, monthlyFee: 5000 }, // デフォルト: 9%
};

// T49: 楽天ポイントプログラム設定
const RAKUTEN_POINTS_STRUCTURE = {
  // 基本ポイント還元率
  basePointRate: 0.01, // 1%
  // カテゴリ別追加ポイント
  categoryBonus: {
    FASHION: 0.02, // ファッションは追加2%
    BEAUTY: 0.015, // 美容は追加1.5%
    ELECTRONICS: 0.01, // 家電は追加1%
    DEFAULT: 0.005, // その他は追加0.5%
  },
  // スーパーセール期間のポイント倍率
  superSaleMultiplier: 2.0, // 2倍
};

// T50: 画像要件（楽天品質基準）
const IMAGE_REQUIREMENTS = {
  minimumWidth: 700,
  minimumHeight: 700,
  minimumImageCount: 1,
  recommendedImageCount: 9,
  maximumImageCount: 20, // 楽天は最大20枚まで
  // 楽天は白背景推奨
  backgroundPreference: "WHITE",
};

/**
 * T48: 楽天手数料を計算します。
 * @param {number} priceLocal - 現地通貨での販売価格
 * @param {string} categoryKey - カテゴリキー（ELECTRONICS, FASHION等）
 * @param {boolean} includeMonthlyFee - 月額料金を含むかどうか
 * @returns {object} { commissionFee, monthlyFee, totalFee }
 */
function calculateRakutenFee(
  priceLocal,
  categoryKey = "DEFAULT",
  includeMonthlyFee = false
) {
  const categoryFee =
    RAKUTEN_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    RAKUTEN_CATEGORY_FEE_STRUCTURE.DEFAULT;

  const commissionFee = priceLocal * categoryFee.commissionRate;
  const monthlyFee = includeMonthlyFee ? categoryFee.monthlyFee : 0;
  const totalFee = commissionFee + monthlyFee;

  return {
    commissionFee: parseFloat(commissionFee.toFixed(2)),
    monthlyFee: monthlyFee,
    totalFee: parseFloat(totalFee.toFixed(2)),
  };
}

/**
 * T49: 楽天ポイント還元を計算します。
 * @param {number} priceLocal - 現地通貨での販売価格
 * @param {string} categoryKey - カテゴリキー
 * @param {boolean} isSuperSale - スーパーセール期間かどうか
 * @returns {object} { pointsEarned, pointRate }
 */
function calculateRakutenPoints(
  priceLocal,
  categoryKey = "DEFAULT",
  isSuperSale = false
) {
  // 基本ポイント
  let totalPointRate = RAKUTEN_POINTS_STRUCTURE.basePointRate;

  // カテゴリボーナス
  const categoryBonus =
    RAKUTEN_POINTS_STRUCTURE.categoryBonus[categoryKey] ||
    RAKUTEN_POINTS_STRUCTURE.categoryBonus.DEFAULT;
  totalPointRate += categoryBonus;

  // スーパーセール倍率
  if (isSuperSale) {
    totalPointRate *= RAKUTEN_POINTS_STRUCTURE.superSaleMultiplier;
  }

  const pointsEarned = Math.floor(priceLocal * totalPointRate);

  return {
    pointsEarned: pointsEarned,
    pointRate: totalPointRate,
    pointRatePercentage: (totalPointRate * 100).toFixed(2) + "%",
  };
}

/**
 * T50: 画像が品質要件を満たしているかチェックします。
 * @param {object} imageDimension - 画像の寸法情報 { width, height }
 * @returns {boolean} 要件を満たす場合true
 */
function meetsImageRequirement(imageDimension) {
  if (!imageDimension || !imageDimension.width || !imageDimension.height) {
    return false;
  }
  return (
    imageDimension.width >= IMAGE_REQUIREMENTS.minimumWidth &&
    imageDimension.height >= IMAGE_REQUIREMENTS.minimumHeight
  );
}

/**
 * T50: 品質要件を満たす画像のみをフィルタリングします。
 * @param {Array} imageUrls - 画像URLの配列
 * @param {object} imageDimensionsMap - URLをキーとした寸法マップ
 * @returns {Array} フィルタリングされた画像URLの配列
 */
function filterQualityImages(imageUrls, imageDimensionsMap) {
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return [];
  }

  const filteredImages = imageUrls
    .filter((url) => {
      const dimension = imageDimensionsMap[url];
      return meetsImageRequirement(dimension);
    })
    .slice(0, IMAGE_REQUIREMENTS.maximumImageCount); // 最大枚数制限

  // 最低1枚の画像が必要
  if (filteredImages.length < IMAGE_REQUIREMENTS.minimumImageCount) {
    throw new Error(
      `Rakuten requires at least ${IMAGE_REQUIREMENTS.minimumImageCount} image (${IMAGE_REQUIREMENTS.minimumWidth}x${IMAGE_REQUIREMENTS.minimumHeight}+). No images meet this requirement.`
    );
  }

  return filteredImages;
}

/**
 * T47: 現地通貨への換算と手数料を考慮した最終販売価格を計算します。
 * @param {number} basePriceUSD - 基準価格（USD）
 * @param {object} fxRates - 為替レートマップ
 * @param {string} targetMarket - ターゲット市場コード
 * @param {string} categoryKey - カテゴリキー
 * @returns {object} { priceLocal, currency, fees, points, netProfit }
 */
function calculateFinalPriceWithFees(
  basePriceUSD,
  fxRates,
  targetMarket,
  categoryKey
) {
  const market = RAKUTEN_MARKETS[targetMarket];
  if (!market) {
    throw new Error(`Invalid Rakuten market code: ${targetMarket}`);
  }

  // USD → 現地通貨に換算
  const rate = fxRates[market.currency];
  if (!rate) {
    throw new Error(`Exchange rate for ${market.currency} not found.`);
  }

  const priceLocal = basePriceUSD * rate;

  // T48: 手数料を計算（月額料金は除外、取引ごとの手数料のみ）
  const fees = calculateRakutenFee(priceLocal, categoryKey, false);

  // T49: 楽天ポイント計算
  const points = calculateRakutenPoints(priceLocal, categoryKey, false);

  // 純利益計算
  const netProfitLocal = priceLocal - fees.totalFee;

  return {
    priceLocal: parseFloat(priceLocal.toFixed(2)),
    currency: market.currency,
    fees: fees,
    points: points,
    netProfit: parseFloat(netProfitLocal.toFixed(2)),
  };
}

/**
 * T47: VAT/消費税を計算します。
 * @param {number} priceLocal - 現地通貨での販売価格
 * @param {string} targetMarket - ターゲット市場コード
 * @returns {object} { vatAmount, priceWithVat }
 */
function calculateVAT(priceLocal, targetMarket) {
  const market = RAKUTEN_MARKETS[targetMarket];
  if (!market) {
    throw new Error(`Invalid Rakuten market code: ${targetMarket}`);
  }

  const vatAmount = priceLocal * market.vatRate;
  const priceWithVat = priceLocal + vatAmount;

  return {
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    vatRate: market.vatRate,
    vatRatePercentage: (market.vatRate * 100).toFixed(1) + "%",
    priceWithVat: parseFloat(priceWithVat.toFixed(2)),
  };
}

/**
 * eBay形式のマスターデータを楽天グローバル APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲット市場コード ('JP', 'TW', 'MY', 'SG')
 * @param {string} categoryKey - カテゴリキー（ELECTRONICS, FASHION等、デフォルト: DEFAULT）
 * @returns {object} Rakuten Global APIへの送信ペイロード
 */
function mapToRakutenGlobalPayload(
  masterListing,
  targetMarket,
  categoryKey = "DEFAULT"
) {
  // T47: 必須属性の検証
  if (!masterListing.final_price_usd) {
    throw new Error("Rakuten requires final_price_usd in master data.");
  }

  // 市場検証
  const market = RAKUTEN_MARKETS[targetMarket];
  if (!market) {
    throw new Error(`Invalid Rakuten market code: ${targetMarket}`);
  }

  // 為替レート取得
  const fxRates = masterListing.fx_rates || {
    JPY: 150,
    TWD: 31,
    MYR: 4.7,
    SGD: 1.35,
  };

  // T47: 価格設定（手数料考慮）
  const pricing = calculateFinalPriceWithFees(
    masterListing.final_price_usd,
    fxRates,
    targetMarket,
    categoryKey
  );

  // T47: VAT/消費税計算
  const vat = calculateVAT(pricing.priceLocal, targetMarket);

  // T50: 品質画像のフィルタリング
  const imageDimensionsMap = masterListing.image_dimensions || {};
  const qualityImages = filterQualityImages(
    masterListing.image_urls,
    imageDimensionsMap
  );

  // カテゴリ情報取得
  const categoryInfo =
    RAKUTEN_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    RAKUTEN_CATEGORY_FEE_STRUCTURE.DEFAULT;

  // ペイロード構築
  const payload = {
    // 基本情報
    product_name: masterListing.title,
    product_description: masterListing.description_html,

    // 市場情報
    market_code: market.marketCode,
    market_name: market.marketName,

    // 価格設定
    currency: pricing.currency,
    price: pricing.priceLocal,

    // T47: VAT/消費税
    taxable: true,
    vat_rate: vat.vatRate,
    vat_amount: vat.vatAmount,
    price_with_tax: vat.priceWithVat,

    // メタデータ（APIには送信しないが、内部利用）
    _pricing_breakdown: {
      base_price_usd: masterListing.final_price_usd,
      exchange_rate: fxRates[market.currency],
      commission_fee: pricing.fees.commissionFee,
      monthly_fee: pricing.fees.monthlyFee,
      total_platform_fee: pricing.fees.totalFee,
      net_profit: pricing.netProfit,
    },

    // T49: 楽天ポイント情報
    rakuten_points_earned: pricing.points.pointsEarned,
    rakuten_point_rate: pricing.points.pointRatePercentage,

    // 在庫・SKU
    inventory_count: masterListing.inventory_count,
    sku_id: masterListing.master_id || `RAK-${Date.now()}`,

    // T50: 画像（品質要件満たす画像のみ）
    image_list: qualityImages,

    // DDP/HSコード
    customs_harmonized_code: masterListing.hs_code_final,
    delivery_country_origin: masterListing.origin_country,

    // カテゴリ情報
    category_id: categoryInfo.categoryId,
    commission_rate: categoryInfo.commissionRate,

    // 配送情報
    shipping_method: masterListing.rakuten_shipping_method || "STANDARD",
    shipping_days_min: masterListing.shipping_days_min || 7,
    shipping_days_max: masterListing.shipping_days_max || 21,
    free_shipping: masterListing.free_shipping || false,

    // ブランド・製造元
    brand: masterListing.brand_name || "No Brand",
    manufacturer: masterListing.manufacturer || "Generic",

    // コンプライアンス
    made_in: masterListing.origin_country,
    warranty_period: masterListing.warranty_period || "NONE",
  };

  return payload;
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mapToRakutenGlobalPayload,
    calculateRakutenFee,
    calculateRakutenPoints,
    calculateVAT,
    filterQualityImages,
    calculateFinalPriceWithFees,
    RAKUTEN_MARKETS,
    RAKUTEN_CATEGORY_FEE_STRUCTURE,
    RAKUTEN_POINTS_STRUCTURE,
    IMAGE_REQUIREMENTS,
  };
}

// ----------------------------------------------------
// 💡 Rakuten Global マッピングのポイント (T47-T50)
//
// T47: 市場別対応と税務処理
// - 4つの主要市場対応（JP, TW, MY, SG）
// - 現地通貨への自動換算（JPY/TWD/MYR/SGD）
// - VAT/消費税の自動計算（市場別税率: 5%-10%）
// - 税込み価格の明示
//
// T48: カテゴリ別手数料構造
// - 9カテゴリの詳細な手数料率（7%-12%）
// - Commission Fee（成約手数料）の計算
// - Monthly Fee（月額料金）の考慮（オプション）
// - 透明な利益計算（_pricing_breakdown）
//
// T49: 楽天ポイントプログラム
// - 基本ポイント還元率（1%）
// - カテゴリ別ボーナスポイント（0.5%-2%）
// - スーパーセール時の倍率（2倍）
// - 獲得ポイント数の自動計算
//
// T50: 画像品質要件
// - 700x700ピクセル以上の画像のみ選別
// - 最大20枚、推奨9枚の制限
// - 最低1枚の品質画像必須
// - 白背景推奨
//
// 追加機能:
// - 配送方法・日数の設定
// - 送料無料オプション
// - ブランド・製造元情報のサポート
// - 保証期間の記載
// - エラーハンドリング強化
// ----------------------------------------------------
