// BUYMAMapper.js: BUYMA API向けデータマッピング関数 (T43-T46)
// パーソナルショッパー形式のファッション特化プラットフォーム

// T44: BUYMAカテゴリ別手数料構造（ファッションアイテム中心）
const BUYMA_CATEGORY_FEE_STRUCTURE = {
  BAGS: { categoryId: "BAG001", commissionRate: 0.077, fixedFee: 0 }, // バッグ: 7.7%
  SHOES: { categoryId: "SHO001", commissionRate: 0.077, fixedFee: 0 }, // 靴: 7.7%
  CLOTHING_WOMENS: { categoryId: "CLO001", commissionRate: 0.077, fixedFee: 0 }, // レディース服: 7.7%
  CLOTHING_MENS: { categoryId: "CLO002", commissionRate: 0.077, fixedFee: 0 }, // メンズ服: 7.7%
  ACCESSORIES: { categoryId: "ACC001", commissionRate: 0.077, fixedFee: 0 }, // アクセサリー: 7.7%
  WATCHES: { categoryId: "WAT001", commissionRate: 0.059, fixedFee: 0 }, // 時計: 5.9%
  JEWELRY: { categoryId: "JEW001", commissionRate: 0.077, fixedFee: 0 }, // ジュエリー: 7.7%
  BEAUTY: { categoryId: "BEA001", commissionRate: 0.077, fixedFee: 0 }, // 美容: 7.7%
  KIDS: { categoryId: "KID001", commissionRate: 0.077, fixedFee: 0 }, // キッズ: 7.7%
  DEFAULT: { categoryId: "DEF000", commissionRate: 0.077, fixedFee: 0 }, // デフォルト: 7.7%
};

// T45: ブランド認証レベル（真贋保証の厳格度）
const BRAND_AUTHENTICATION_LEVELS = {
  // ハイエンドブランド（真贋保証必須）
  HIGH_END: [
    "LOUIS VUITTON",
    "CHANEL",
    "HERMES",
    "GUCCI",
    "PRADA",
    "DIOR",
    "FENDI",
    "BALENCIAGA",
    "CELINE",
    "BOTTEGA VENETA",
  ],
  // ミドルレンジブランド（真贋保証推奨）
  MID_RANGE: [
    "COACH",
    "MICHAEL KORS",
    "KATE SPADE",
    "TORY BURCH",
    "MARC JACOBS",
    "FURLA",
    "LONGCHAMP",
  ],
  // スタンダードブランド（自己申告可）
  STANDARD: ["ZARA", "H&M", "UNIQLO", "GAP", "COS"],
};

// T46: 画像要件（ファッションアイテムの高品質基準）
const IMAGE_REQUIREMENTS = {
  minimumWidth: 800,
  minimumHeight: 800,
  minimumImageCount: 3, // 最低3枚（正面、側面、詳細など）
  recommendedImageCount: 8,
  maximumImageCount: 12,
  // ファッションアイテムは白背景または実際の着用写真が推奨
  backgroundPreference: "WHITE_OR_LIFESTYLE",
};

// 発送日数の最適化テーブル（買付地別）
const SHIPPING_DAYS_OPTIMIZATION = {
  US: { min: 10, max: 21, express: 7 }, // アメリカ
  EU: { min: 12, max: 25, express: 8 }, // 欧州
  UK: { min: 10, max: 21, express: 7 }, // イギリス
  CN: { min: 7, max: 14, express: 5 }, // 中国
  KR: { min: 5, max: 10, express: 3 }, // 韓国
  TW: { min: 7, max: 14, express: 5 }, // 台湾
  DEFAULT: { min: 14, max: 28, express: 10 },
};

/**
 * T44: BUYMA手数料を計算します。
 * @param {number} priceJPY - JPY建ての販売価格
 * @param {string} categoryKey - カテゴリキー（BAGS, SHOES等）
 * @returns {object} { commissionFee, fixedFee, totalFee }
 */
function calculateBUYMAFee(priceJPY, categoryKey = "DEFAULT") {
  const categoryFee =
    BUYMA_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    BUYMA_CATEGORY_FEE_STRUCTURE.DEFAULT;

  const commissionFee = priceJPY * categoryFee.commissionRate;
  const fixedFee = categoryFee.fixedFee;
  const totalFee = commissionFee + fixedFee;

  return {
    commissionFee: Math.round(commissionFee),
    fixedFee: Math.round(fixedFee),
    totalFee: Math.round(totalFee),
  };
}

/**
 * T45: ブランド認証レベルを判定します。
 * @param {string} brandName - ブランド名
 * @returns {object} { level, requiresAuthentication, description }
 */
function getBrandAuthenticationLevel(brandName) {
  const brandUpper = (brandName || "").toUpperCase();

  if (BRAND_AUTHENTICATION_LEVELS.HIGH_END.includes(brandUpper)) {
    return {
      level: "HIGH_END",
      requiresAuthentication: true,
      description:
        "High-end luxury brand - Authentication certificate required",
    };
  }

  if (BRAND_AUTHENTICATION_LEVELS.MID_RANGE.includes(brandUpper)) {
    return {
      level: "MID_RANGE",
      requiresAuthentication: true,
      description:
        "Mid-range brand - Authentication recommended for buyer confidence",
    };
  }

  if (BRAND_AUTHENTICATION_LEVELS.STANDARD.includes(brandUpper)) {
    return {
      level: "STANDARD",
      requiresAuthentication: false,
      description: "Standard brand - Self-declaration acceptable",
    };
  }

  // 不明なブランドはミドルレンジ扱い（安全側）
  return {
    level: "UNKNOWN_MID",
    requiresAuthentication: true,
    description:
      "Unknown brand - Authentication recommended as precautionary measure",
  };
}

/**
 * T46: 画像が品質要件を満たしているかチェックします。
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
 * T46: 品質要件を満たす画像のみをフィルタリングします。
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

  // 最低3枚の画像が必要（ファッションアイテムは多角度が重要）
  if (filteredImages.length < IMAGE_REQUIREMENTS.minimumImageCount) {
    throw new Error(
      `BUYMA requires at least ${IMAGE_REQUIREMENTS.minimumImageCount} images (${IMAGE_REQUIREMENTS.minimumWidth}x${IMAGE_REQUIREMENTS.minimumHeight}+) for fashion items. Found: ${filteredImages.length}`
    );
  }

  return filteredImages;
}

/**
 * T43: 現地通貨への換算と手数料を考慮した最終販売価格を計算します。
 * @param {number} basePriceUSD - 基準価格（USD）
 * @param {object} fxRates - 為替レートマップ
 * @param {string} categoryKey - カテゴリキー
 * @returns {object} { priceJPY, fees, netProfit }
 */
function calculateFinalPriceWithFees(basePriceUSD, fxRates, categoryKey) {
  // USD → JPYに換算
  const rate = fxRates.JPY;
  if (!rate) {
    throw new Error("Exchange rate for JPY not found.");
  }

  const priceJPY = basePriceUSD * rate;

  // T44: 手数料を計算
  const fees = calculateBUYMAFee(priceJPY, categoryKey);
  const netProfitJPY = priceJPY - fees.totalFee;

  return {
    priceJPY: Math.round(priceJPY), // JPYは整数が基本
    fees: fees,
    netProfit: Math.round(netProfitJPY),
  };
}

/**
 * T43: 発送日数を最適化します。
 * @param {string} sourceCountry - 買付地（原産国コード）
 * @param {boolean} isExpressShipping - エクスプレス配送かどうか
 * @returns {object} { minDays, maxDays }
 */
function optimizeShippingDays(sourceCountry, isExpressShipping = false) {
  const shippingInfo =
    SHIPPING_DAYS_OPTIMIZATION[sourceCountry] ||
    SHIPPING_DAYS_OPTIMIZATION.DEFAULT;

  if (isExpressShipping) {
    return {
      minDays: shippingInfo.express,
      maxDays: shippingInfo.express + 3,
    };
  }

  return {
    minDays: shippingInfo.min,
    maxDays: shippingInfo.max,
  };
}

/**
 * eBay形式のマスターデータをBUYMA APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} categoryKey - カテゴリキー（BAGS, SHOES等、デフォルト: DEFAULT）
 * @returns {object} BUYMA APIへの送信ペイロード
 */
function mapToBUYMAPayload(masterListing, categoryKey = "DEFAULT") {
  // T43: 必須属性の検証
  if (!masterListing.final_price_usd) {
    throw new Error("BUYMA requires final_price_usd in master data.");
  }

  if (!masterListing.brand_name) {
    throw new Error(
      "BUYMA requires brand_name for fashion items (brand identification is mandatory)."
    );
  }

  // 為替レート取得
  const fxRates = masterListing.fx_rates || { JPY: 150 };

  // T43: 価格設定（手数料考慮）
  const pricing = calculateFinalPriceWithFees(
    masterListing.final_price_usd,
    fxRates,
    categoryKey
  );

  // T45: ブランド認証レベル判定
  const authLevel = getBrandAuthenticationLevel(masterListing.brand_name);

  // T46: 品質画像のフィルタリング
  const imageDimensionsMap = masterListing.image_dimensions || {};
  const qualityImages = filterQualityImages(
    masterListing.image_urls,
    imageDimensionsMap
  );

  // T43: 発送日数の最適化
  const isExpress = masterListing.shipping_service?.includes("EXPRESS") || false;
  const shippingDays = optimizeShippingDays(
    masterListing.origin_country,
    isExpress
  );

  // カテゴリ情報取得
  const categoryInfo =
    BUYMA_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    BUYMA_CATEGORY_FEE_STRUCTURE.DEFAULT;

  // ペイロード構築
  const payload = {
    // 基本情報
    ItemId: masterListing.master_id || `BUYMA-${Date.now()}`,
    ItemName: masterListing.title,
    ItemDetail: masterListing.description_html,

    // ブランド情報（必須）
    BrandName: masterListing.brand_name,
    BrandId: masterListing.buyma_brand_id || null,

    // 価格設定
    SellingPrice: pricing.priceJPY,
    Currency: "JPY",

    // メタデータ（APIには送信しないが、内部利用）
    _pricing_breakdown: {
      base_price_usd: masterListing.final_price_usd,
      exchange_rate_jpy: fxRates.JPY,
      commission_fee: pricing.fees.commissionFee,
      fixed_fee: pricing.fees.fixedFee,
      total_platform_fee: pricing.fees.totalFee,
      net_profit: pricing.netProfit,
    },

    // 在庫・買付情報
    StockStatus: masterListing.inventory_count > 0 ? "IN_STOCK" : "SOLD_OUT",
    QuantityAvailable: masterListing.inventory_count,

    // T43: 買付地（原産国）を強調
    SourceCountry: masterListing.origin_country,
    SourceCountryName: getCountryName(masterListing.origin_country),

    // T46: 画像（品質要件満たす画像のみ）
    ImageUrlList: qualityImages,

    // カテゴリ情報
    CategoryId: categoryInfo.categoryId,
    CommissionRate: categoryInfo.commissionRate,

    // T45: 真贋保証情報
    AuthenticationLevel: authLevel.level,
    RequiresAuthentication: authLevel.requiresAuthentication,
    AuthenticationDescription: authLevel.description,
    HasAuthenticationCertificate:
      masterListing.authenticity_certificate_id &&
      masterListing.authenticity_certificate_id !== "NONE",

    // T43: 発送方法（DDP対応）と日数最適化
    ShippingMethod: isExpress
      ? "International Express - DDP Included"
      : "Standard International - DDP Included",
    DaysToShipMin: shippingDays.minDays,
    DaysToShipMax: shippingDays.maxDays,
    IsExpressShipping: isExpress,

    // サイズ・カラー情報（ファッションアイテム特有）
    Size: masterListing.size || "FREE",
    Color: masterListing.color || "MULTI",
    SizeVariations: masterListing.size_variations || [],
    ColorVariations: masterListing.color_variations || [],

    // 追加属性
    ModelNumber: masterListing.model_name || "",
    Season: masterListing.season || "ALL_SEASON",
    Material: masterListing.material || "See Description",
    MadeIn: masterListing.origin_country,

    // コンプライアンス
    TaxIncluded: true, // DDPなので税込み
    CustomsDutyHandling: "SELLER_PAYS", // 関税は出品者負担（DDP）
  };

  return payload;
}

/**
 * 国コードから国名を取得するヘルパー関数
 * @param {string} countryCode - 国コード（US, UK等）
 * @returns {string} 国名（日本語）
 */
function getCountryName(countryCode) {
  const countryNames = {
    US: "アメリカ",
    UK: "イギリス",
    EU: "ヨーロッパ",
    DE: "ドイツ",
    FR: "フランス",
    IT: "イタリア",
    CN: "中国",
    KR: "韓国",
    TW: "台湾",
    JP: "日本",
  };
  return countryNames[countryCode] || countryCode;
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mapToBUYMAPayload,
    calculateBUYMAFee,
    getBrandAuthenticationLevel,
    filterQualityImages,
    calculateFinalPriceWithFees,
    optimizeShippingDays,
    BUYMA_CATEGORY_FEE_STRUCTURE,
    BRAND_AUTHENTICATION_LEVELS,
    IMAGE_REQUIREMENTS,
    SHIPPING_DAYS_OPTIMIZATION,
  };
}

// ----------------------------------------------------
// 💡 BUYMA マッピングのポイント (T43-T46)
//
// T43: パーソナルショッパー最適化
// - USD → JPY自動換算（為替レート使用）
// - 買付地別の発送日数最適化（7リージョン対応）
// - エクスプレス配送の自動判定
// - 送料込み価格（DDP）の徹底
//
// T44: カテゴリ別手数料構造
// - 9カテゴリの詳細な手数料率（5.9%-7.7%）
// - Commission Fee（成約手数料）の透明な計算
// - 利益計算の可視化（_pricing_breakdown）
//
// T45: ブランド認証と真贋保証
// - 3段階の認証レベル（HIGH_END, MID_RANGE, STANDARD）
// - ハイエンドブランド（LOUIS VUITTON, CHANEL等）は認証必須
// - ミドルレンジブランドは認証推奨
// - 真贋保証証明書の有無チェック
//
// T46: ファッションアイテム画像品質要件
// - 800x800ピクセル以上の画像のみ選別
// - 最低3枚、推奨8枚、最大12枚
// - 多角度撮影（正面、側面、詳細）の重要性
//
// 追加機能:
// - サイズ・カラー展開のサポート
// - シーズン・素材情報の記載
// - 製造国（Made In）の明記
// - 税込み価格・関税負担の明示
// - エラーハンドリング強化
// ----------------------------------------------------
