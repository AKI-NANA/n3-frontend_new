// AmazonGlobalMapper.js: Amazon 全グローバルリージョン API向けデータマッピング関数 (T39-T42)
// T27のロジックを拡張し、複数リージョンに対応

// Amazonの主要リージョンとその通貨の定義（DDP価格計算の基盤）
const AMAZON_REGIONS = {
  US: {
    currency: "USD",
    endpoint: "na-api-endpoint",
    marketplaceId: "ATVPDKIKX0DER",
  },
  CA: {
    currency: "CAD",
    endpoint: "na-api-endpoint",
    marketplaceId: "A2EUQ1WTGCTBG2",
  },
  UK: {
    currency: "GBP",
    endpoint: "eu-api-endpoint",
    marketplaceId: "A1F83G8C2ARO7P",
  },
  DE: {
    currency: "EUR",
    endpoint: "eu-api-endpoint",
    marketplaceId: "A1PA6795UKMFR9",
  },
  JP: {
    currency: "JPY",
    endpoint: "jp-api-endpoint",
    marketplaceId: "A1VC38T7YXB528",
  },
  AU: {
    currency: "AUD",
    endpoint: "au-api-endpoint",
    marketplaceId: "A39IBJ37TRP1C6",
  },
  SA: {
    currency: "SAR",
    endpoint: "me-api-endpoint",
    marketplaceId: "A17E79C6D8DWNP",
  },
};

// T40: Amazonカテゴリ別手数料構造（主要カテゴリ）
const AMAZON_CATEGORY_FEE_STRUCTURE = {
  ELECTRONICS: { categoryId: "172282", referralFee: 0.08, closingFee: 0 }, // 家電: 8%
  COMPUTERS: { categoryId: "541966", referralFee: 0.06, closingFee: 0 }, // コンピュータ: 6%
  FASHION: { categoryId: "7141123011", referralFee: 0.17, closingFee: 0 }, // ファッション: 17%
  JEWELRY: { categoryId: "3367581", referralFee: 0.20, closingFee: 0 }, // ジュエリー: 20%
  WATCHES: { categoryId: "377110011", referralFee: 0.16, closingFee: 0 }, // 時計: 16%
  COLLECTIBLES: { categoryId: "4991425011", referralFee: 0.15, closingFee: 0 }, // コレクティブル: 15%
  TOYS: { categoryId: "165793011", referralFee: 0.15, closingFee: 0 }, // おもちゃ: 15%
  BOOKS: { categoryId: "283155", referralFee: 0.15, closingFee: 1.80 }, // 書籍: 15% + $1.80
  BEAUTY: { categoryId: "3760911", referralFee: 0.15, closingFee: 0 }, // 美容: 15%
  SPORTS: { categoryId: "3375251", referralFee: 0.15, closingFee: 0 }, // スポーツ: 15%
  HOME: { categoryId: "1055398", referralFee: 0.15, closingFee: 0 }, // ホーム: 15%
  DEFAULT: { categoryId: "0", referralFee: 0.15, closingFee: 0 }, // デフォルト: 15%
};

// T41: FBA資格要件
const FBA_REQUIREMENTS = {
  // 最低在庫数（FBAは大量在庫が有利）
  minimumInventory: 10,
  // 最低商品価格（USD換算）
  minimumPriceUSD: 10,
  // 最大重量（ポンド）- 標準サイズFBA制限
  maximumWeightLbs: 20,
  // 最大寸法合計（インチ）- 標準サイズFBA制限
  maximumDimensionSum: 108,
};

// T42: 画像要件（Amazon品質基準）
const IMAGE_REQUIREMENTS = {
  minimumWidth: 1000,
  minimumHeight: 1000,
  minimumImageCount: 1,
  recommendedImageCount: 7,
  maximumImageCount: 9,
  // メイン画像の背景は白推奨
  mainImageBackgroundColor: "WHITE",
};

/**
 * T40: Amazon手数料を計算します。
 * @param {number} priceLocal - 現地通貨での販売価格
 * @param {string} categoryKey - カテゴリキー（ELECTRONICS, FASHION等）
 * @returns {object} { referralFee, closingFee, totalFee }
 */
function calculateAmazonFee(priceLocal, categoryKey = "DEFAULT") {
  const categoryFee =
    AMAZON_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    AMAZON_CATEGORY_FEE_STRUCTURE.DEFAULT;

  const referralFee = priceLocal * categoryFee.referralFee;
  const closingFee = categoryFee.closingFee;
  const totalFee = referralFee + closingFee;

  return {
    referralFee: parseFloat(referralFee.toFixed(2)),
    closingFee: parseFloat(closingFee.toFixed(2)),
    totalFee: parseFloat(totalFee.toFixed(2)),
  };
}

/**
 * T41: FBA（Fulfillment by Amazon）資格があるかチェックします。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {number} priceUSD - USD建ての販売価格
 * @returns {boolean} FBA対応可否
 */
function isEligibleForFBA(masterListing, priceUSD) {
  // 在庫数チェック
  if (masterListing.inventory_count < FBA_REQUIREMENTS.minimumInventory) {
    return false;
  }

  // 価格チェック
  if (priceUSD < FBA_REQUIREMENTS.minimumPriceUSD) {
    return false;
  }

  // 重量チェック（オプション）
  if (
    masterListing.weight_lbs &&
    masterListing.weight_lbs > FBA_REQUIREMENTS.maximumWeightLbs
  ) {
    return false;
  }

  // 寸法チェック（オプション）
  if (masterListing.dimensions) {
    const dimensionSum =
      (masterListing.dimensions.length || 0) +
      (masterListing.dimensions.width || 0) +
      (masterListing.dimensions.height || 0);
    if (dimensionSum > FBA_REQUIREMENTS.maximumDimensionSum) {
      return false;
    }
  }

  return true;
}

/**
 * T42: 画像が品質要件を満たしているかチェックします。
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
 * T42: 品質要件を満たす画像のみをフィルタリングします。
 * @param {Array} imageUrls - 画像URLの配列
 * @param {object} imageDimensionsMap - URLをキーとした寸法マップ
 * @returns {object} { mainImage, otherImages }
 */
function filterQualityImages(imageUrls, imageDimensionsMap) {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new Error("Amazon requires at least one product image.");
  }

  const filteredImages = imageUrls.filter((url) => {
    const dimension = imageDimensionsMap[url];
    return meetsImageRequirement(dimension);
  });

  // 最低1枚の画像が必要
  if (filteredImages.length < IMAGE_REQUIREMENTS.minimumImageCount) {
    throw new Error(
      `Amazon requires at least ${IMAGE_REQUIREMENTS.minimumImageCount} image (${IMAGE_REQUIREMENTS.minimumWidth}x${IMAGE_REQUIREMENTS.minimumHeight}+). No images meet this requirement.`
    );
  }

  // メイン画像とその他の画像に分割
  const mainImage = filteredImages[0];
  const otherImages = filteredImages
    .slice(1)
    .slice(0, IMAGE_REQUIREMENTS.maximumImageCount - 1);

  return {
    mainImage,
    otherImages,
  };
}

/**
 * T39: 現地通貨への換算と手数料を考慮した最終販売価格を計算します。
 * @param {number} basePriceUSD - 基準価格（USD）
 * @param {object} fxRates - 為替レートマップ
 * @param {string} targetCurrency - ターゲット通貨
 * @param {string} categoryKey - カテゴリキー
 * @returns {object} { priceLocal, currency, fees, netProfit }
 */
function calculateFinalPriceWithFees(
  basePriceUSD,
  fxRates,
  targetCurrency,
  categoryKey
) {
  // USD → 現地通貨に換算
  let priceLocal = basePriceUSD;
  if (targetCurrency !== "USD") {
    const rate = fxRates[targetCurrency];
    if (!rate) {
      throw new Error(`Exchange rate for ${targetCurrency} not found.`);
    }
    priceLocal = basePriceUSD * rate;
  }

  // T40: 手数料を計算
  const fees = calculateAmazonFee(priceLocal, categoryKey);
  const netProfitLocal = priceLocal - fees.totalFee;

  return {
    priceLocal: parseFloat(priceLocal.toFixed(2)),
    currency: targetCurrency,
    fees: fees,
    netProfit: parseFloat(netProfitLocal.toFixed(2)),
  };
}

/**
 * T39: リージョン別の特別要件をチェックします。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetRegion - ターゲットリージョンコード
 * @returns {object} { warnings, requirements }
 */
function checkRegionalRequirements(masterListing, targetRegion) {
  const warnings = [];
  const requirements = [];

  // 欧州の場合：CE認証が推奨
  if (["UK", "DE"].includes(targetRegion)) {
    if (!masterListing.certifications?.includes("CE")) {
      warnings.push("EU market recommends CE certification for this product.");
    }
    requirements.push("VAT_NUMBER_REQUIRED");
  }

  // 日本の場合：PSEマークが必要な電気製品
  if (targetRegion === "JP") {
    if (
      masterListing.category_key === "ELECTRONICS" &&
      !masterListing.certifications?.includes("PSE")
    ) {
      warnings.push("Japanese market requires PSE mark for electrical products.");
    }
    requirements.push("JCT_TAX_HANDLING");
  }

  // 米国の場合：FCC認証が推奨
  if (targetRegion === "US") {
    if (
      masterListing.category_key === "ELECTRONICS" &&
      !masterListing.certifications?.includes("FCC")
    ) {
      warnings.push("US market recommends FCC certification for electronics.");
    }
  }

  return { warnings, requirements };
}

/**
 * eBay形式のマスターデータをAmazon Selling Partner APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetRegion - ターゲットAmazonリージョンコード (例: 'US', 'DE', 'JP')
 * @param {string} categoryKey - カテゴリキー（ELECTRONICS, FASHION等、デフォルト: DEFAULT）
 * @returns {object} Amazon APIへの送信ペイロード
 */
function mapToAmazonGlobalPayload(
  masterListing,
  targetRegion,
  categoryKey = "DEFAULT"
) {
  // リージョン検証
  const region = AMAZON_REGIONS[targetRegion];
  if (!region) {
    throw new Error(`Unsupported Amazon region code: ${targetRegion}`);
  }

  // T39: 必須属性の検証
  if (!masterListing.final_price_usd) {
    throw new Error("Amazon requires final_price_usd in master data.");
  }

  // 為替レート取得
  const fxRates = masterListing.fx_rates || {
    USD: 1,
    CAD: 1.35,
    GBP: 0.79,
    EUR: 0.92,
    JPY: 150,
    AUD: 1.52,
    SAR: 3.75,
  };

  // T39: 価格設定（手数料考慮）
  const pricing = calculateFinalPriceWithFees(
    masterListing.final_price_usd,
    fxRates,
    region.currency,
    categoryKey
  );

  // T41: FBA資格判定
  const isFBAEligible = isEligibleForFBA(
    masterListing,
    masterListing.final_price_usd
  );

  // T42: 品質画像のフィルタリング
  const imageDimensionsMap = masterListing.image_dimensions || {};
  const images = filterQualityImages(masterListing.image_urls, imageDimensionsMap);

  // T39: リージョン別要件チェック
  const regionalCheck = checkRegionalRequirements(masterListing, targetRegion);

  // カテゴリ情報取得
  const categoryInfo =
    AMAZON_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    AMAZON_CATEGORY_FEE_STRUCTURE.DEFAULT;

  // ペイロード構築
  const payload = {
    // T27: Product Objectの基本情報
    sku: masterListing.master_id || `SKU-${Date.now()}`,
    title: masterListing.title,
    description: masterListing.description_html,

    // リージョン・マーケットプレイス情報
    marketplaceId: region.marketplaceId,
    regionCode: targetRegion,

    // 価格設定
    currency: pricing.currency,
    standardPrice: pricing.priceLocal,

    // メタデータ（APIには送信しないが、内部利用）
    _pricing_breakdown: {
      base_price_usd: masterListing.final_price_usd,
      exchange_rate: fxRates[region.currency] || 1,
      referral_fee: pricing.fees.referralFee,
      closing_fee: pricing.fees.closingFee,
      total_platform_fee: pricing.fees.totalFee,
      net_profit: pricing.netProfit,
    },

    // T41: 在庫・フルフィルメント（FBA/FBM自動選択）
    quantity: masterListing.inventory_count,
    fulfillmentType: isFBAEligible
      ? "AFN" // Amazon Fulfillment Network (FBA)
      : "MFN_DDP", // Merchant Fulfillment Network (FBM) with DDP
    isFBAEligible: isFBAEligible,

    // T27: DDP/HSコードと税務情報
    productTaxCode: masterListing.hs_code_final,
    countryOfOrigin: masterListing.origin_country,

    // T42: 画像（品質要件満たす画像のみ）
    mainImageUrl: images.mainImage,
    otherImageUrls: images.otherImages,

    // カテゴリ情報
    categoryId: categoryInfo.categoryId,
    referralFeeRate: categoryInfo.referralFee,

    // 追加属性
    brand: masterListing.brand_name || "Generic",
    manufacturer: masterListing.manufacturer || "Unknown",
    modelNumber: masterListing.model_name || "",

    // T39: リージョン別要件
    regionalRequirements: regionalCheck.requirements,
    complianceWarnings: regionalCheck.warnings,

    // APIエンドポイント (APIハブが利用するメタデータ)
    api_endpoint_key: region.endpoint,
  };

  return payload;
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mapToAmazonGlobalPayload,
    calculateAmazonFee,
    isEligibleForFBA,
    filterQualityImages,
    calculateFinalPriceWithFees,
    checkRegionalRequirements,
    AMAZON_REGIONS,
    AMAZON_CATEGORY_FEE_STRUCTURE,
    FBA_REQUIREMENTS,
    IMAGE_REQUIREMENTS,
  };
}

// ----------------------------------------------------
// 💡 Amazon Global マッピングのポイント (T39-T42)
//
// T39: リージョン別対応と特別要件
// - 7つの主要リージョン対応（US, CA, UK, DE, JP, AU, SA）
// - 現地通貨への自動換算（USD/CAD/GBP/EUR/JPY/AUD/SAR）
// - リージョン別認証要件チェック（CE, PSE, FCC等）
// - VAT/JCT税務要件の識別
//
// T40: カテゴリ別手数料構造
// - 11カテゴリの詳細な手数料率（6%-20%）
// - Referral Fee（紹介料）とClosing Fee（成約料）の区別
// - 透明な利益計算（_pricing_breakdown）
//
// T41: FBA資格判定と自動選択
// - 在庫数要件（最低10個）チェック
// - 価格要件（最低$10）検証
// - 重量・寸法制限の検証
// - FBA vs FBM の自動選択（AFN vs MFN_DDP）
//
// T42: 画像品質要件
// - 1000x1000ピクセル以上の画像のみ選別
// - メイン画像とその他画像の自動分類
// - 最大9枚の制限
// - 最低1枚の品質画像必須
//
// 追加機能:
// - マーケットプレイスID自動設定
// - ブランド・製造元情報のサポート
// - コンプライアンス警告システム
// - エラーハンドリング強化
// - SKU自動生成（未設定時）
// ----------------------------------------------------
