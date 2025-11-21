// CoupangMapper.js: Coupang API向けデータマッピング関数 (T35-T38)

// Coupangのカテゴリ別手数料構造（主要カテゴリ）
const COUPANG_CATEGORY_FEE_STRUCTURE = {
  FASHION: { categoryId: "C001001", feeRate: 0.15, minFee: 500 }, // ファッション: 15%
  ELECTRONICS: { categoryId: "C002001", feeRate: 0.08, minFee: 1000 }, // 家電: 8%
  BEAUTY: { categoryId: "C003001", feeRate: 0.12, minFee: 300 }, // 美容: 12%
  SPORTS: { categoryId: "C004001", feeRate: 0.10, minFee: 500 }, // スポーツ: 10%
  TOYS: { categoryId: "C005001", feeRate: 0.13, minFee: 400 }, // おもちゃ: 13%
  COLLECTIBLES: { categoryId: "C006001", feeRate: 0.12, minFee: 500 }, // コレクティブル: 12%
  HOME: { categoryId: "C007001", feeRate: 0.11, minFee: 600 }, // ホーム: 11%
  BOOKS: { categoryId: "C008001", feeRate: 0.07, minFee: 200 }, // 書籍: 7%
  DEFAULT: { categoryId: "C000000", feeRate: 0.12, minFee: 500 }, // デフォルト: 12%
};

// ロケット配送（Rocket Delivery）資格要件
const ROCKET_DELIVERY_REQUIREMENTS = {
  // 最低在庫数
  minimumInventory: 5,
  // 対応カテゴリ（一部カテゴリのみロケット配送対応）
  eligibleCategories: ["FASHION", "ELECTRONICS", "BEAUTY", "SPORTS", "HOME"],
  // 最低商品価格（KRW）
  minimumPriceKRW: 5000,
  // 最大商品価格（KRW）- ロケット配送は高額商品には適用されない場合がある
  maximumPriceKRW: 500000,
};

// 画像要件（Coupang品質基準）
const IMAGE_REQUIREMENTS = {
  minimumWidth: 500,
  minimumHeight: 500,
  minimumImageCount: 1,
  recommendedImageCount: 5,
  maximumImageCount: 10,
};

/**
 * T36: Coupang手数料を計算します。
 * @param {number} priceKRW - KRW建ての販売価格
 * @param {string} categoryKey - カテゴリキー（FASHION, ELECTRONICS等）
 * @returns {number} 手数料額（KRW）
 */
function calculateCoupangFee(priceKRW, categoryKey = "DEFAULT") {
  const categoryFee =
    COUPANG_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    COUPANG_CATEGORY_FEE_STRUCTURE.DEFAULT;

  const calculatedFee = priceKRW * categoryFee.feeRate;
  return Math.max(calculatedFee, categoryFee.minFee);
}

/**
 * T37: ロケット配送資格があるかチェックします。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} categoryKey - カテゴリキー
 * @param {number} priceKRW - KRW建ての販売価格
 * @returns {boolean} ロケット配送対応可否
 */
function isEligibleForRocketDelivery(masterListing, categoryKey, priceKRW) {
  // 在庫数チェック
  if (
    masterListing.inventory_count < ROCKET_DELIVERY_REQUIREMENTS.minimumInventory
  ) {
    return false;
  }

  // カテゴリチェック
  if (!ROCKET_DELIVERY_REQUIREMENTS.eligibleCategories.includes(categoryKey)) {
    return false;
  }

  // 価格範囲チェック
  if (
    priceKRW < ROCKET_DELIVERY_REQUIREMENTS.minimumPriceKRW ||
    priceKRW > ROCKET_DELIVERY_REQUIREMENTS.maximumPriceKRW
  ) {
    return false;
  }

  // 原産国チェック（ロケット配送は韓国国内倉庫が前提）
  // グローバル商品の場合は「ROCKET_SHIPMENT_GLOBAL」を使用
  return true;
}

/**
 * T38: 画像が品質要件を満たしているかチェックします。
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
 * T38: 品質要件を満たす画像のみをフィルタリングします。
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
      `Coupang requires at least ${IMAGE_REQUIREMENTS.minimumImageCount} image (${IMAGE_REQUIREMENTS.minimumWidth}x${IMAGE_REQUIREMENTS.minimumHeight}+). No images meet this requirement.`
    );
  }

  return filteredImages;
}

/**
 * T35: 現地通貨への換算と手数料を考慮した最終販売価格を計算します。
 * @param {number} basePriceUSD - 基準価格（USD）
 * @param {object} fxRates - 為替レートマップ { KRW: 1300, ... }
 * @param {string} categoryKey - カテゴリキー
 * @returns {object} { priceKRW, feeAmount, netProfit }
 */
function calculateFinalPriceWithFees(basePriceUSD, fxRates, categoryKey) {
  // USD → KRWに換算
  const rate = fxRates.KRW;
  if (!rate) {
    throw new Error("Exchange rate for KRW not found.");
  }

  const priceKRW = basePriceUSD * rate;

  // T36: 手数料を計算
  const feeAmount = calculateCoupangFee(priceKRW, categoryKey);
  const netProfitKRW = priceKRW - feeAmount;

  return {
    priceKRW: Math.round(priceKRW), // KRWは整数が基本
    feeAmount: Math.round(feeAmount),
    netProfit: Math.round(netProfitKRW),
  };
}

/**
 * T35: 韓国語タイトルと説明を生成または検証します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} { titleKR, descriptionKR }
 */
function prepareKoreanContent(masterListing) {
  // 韓国語タイトルが既に存在する場合はそれを使用
  let titleKR = masterListing.title_kr || masterListing.title;
  let descriptionKR =
    masterListing.description_html_kr || masterListing.description_html;

  // タイトルの長さ制限（Coupang要件: 100文字以内）
  if (titleKR.length > 100) {
    titleKR = titleKR.substring(0, 97) + "...";
  }

  return {
    titleKR,
    descriptionKR,
  };
}

/**
 * eBay形式のマスターデータをCoupang APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} categoryKey - カテゴリキー（FASHION, ELECTRONICS等、デフォルト: DEFAULT）
 * @returns {object} Coupang APIへの送信ペイロード
 */
function mapToCoupangPayload(masterListing, categoryKey = "DEFAULT") {
  // T35: 必須属性の検証
  if (!masterListing.final_price_usd) {
    throw new Error("Coupang requires final_price_usd in master data.");
  }

  // 為替レート取得
  const fxRates = masterListing.fx_rates || { KRW: 1300 };

  // T35: 価格設定（手数料考慮）
  const pricing = calculateFinalPriceWithFees(
    masterListing.final_price_usd,
    fxRates,
    categoryKey
  );

  // T37: ロケット配送資格判定
  const isRocketEligible = isEligibleForRocketDelivery(
    masterListing,
    categoryKey,
    pricing.priceKRW
  );

  // T38: 品質画像のフィルタリング
  const imageDimensionsMap = masterListing.image_dimensions || {};
  const qualityImages = filterQualityImages(
    masterListing.image_urls,
    imageDimensionsMap
  );

  // T35: 韓国語コンテンツ準備
  const koreanContent = prepareKoreanContent(masterListing);

  // カテゴリ情報取得
  const categoryInfo =
    COUPANG_CATEGORY_FEE_STRUCTURE[categoryKey] ||
    COUPANG_CATEGORY_FEE_STRUCTURE.DEFAULT;

  // ペイロード構築
  const payload = {
    // 基本情報（韓国語）
    vendorItemName: koreanContent.titleKR,
    detailContent: koreanContent.descriptionKR,

    // 在庫・数量
    quantity: masterListing.inventory_count,

    // 価格設定
    currency: "KRW",
    sellingPrice: pricing.priceKRW,

    // メタデータ（APIには送信しないが、内部利用）
    _pricing_breakdown: {
      base_price_usd: masterListing.final_price_usd,
      exchange_rate_krw: fxRates.KRW,
      platform_fee: pricing.feeAmount,
      net_profit: pricing.netProfit,
    },

    // T37: 配送方法（ロケット配送資格に基づく）
    deliveryMethod: isRocketEligible
      ? "ROCKET_SHIPMENT_GLOBAL"
      : "STANDARD_GLOBAL",
    isRocketDeliveryEligible: isRocketEligible,

    // 税関・原産国情報
    customsClearanceCode: masterListing.hs_code_final,
    originCountryCode: masterListing.origin_country,

    // カテゴリ情報
    categoryId: categoryInfo.categoryId,
    categoryFeeRate: categoryInfo.feeRate,

    // T38: 品質画像のみ
    images: qualityImages,

    // 追加属性
    brand: masterListing.brand_name || "NO_BRAND",
    manufacturer: masterListing.manufacturer || "GENERIC",
    modelName: masterListing.model_name || "",

    // 配送プロファイル
    shippingProfileId:
      masterListing.coupang_shipping_profile_id || "DEFAULT_GLOBAL",
  };

  return payload;
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mapToCoupangPayload,
    calculateCoupangFee,
    isEligibleForRocketDelivery,
    filterQualityImages,
    calculateFinalPriceWithFees,
    prepareKoreanContent,
    COUPANG_CATEGORY_FEE_STRUCTURE,
    ROCKET_DELIVERY_REQUIREMENTS,
    IMAGE_REQUIREMENTS,
  };
}

// ----------------------------------------------------
// 💡 Coupang マッピングのポイント (T35-T38)
//
// T35: 韓国市場特有の要件対応
// - 韓国語タイトル・説明の準備と検証
// - USD → KRW自動換算（為替レート使用）
// - タイトル長さ制限（100文字）の自動調整
//
// T36: カテゴリ別手数料構造
// - 8カテゴリの詳細な手数料率（7%-15%）
// - 最低手数料の設定（200-1000 KRW）
// - 透明な利益計算（_pricing_breakdown）
//
// T37: ロケット配送（Rocket Delivery）資格判定
// - 在庫数要件（最低5個）
// - カテゴリ適格性チェック
// - 価格範囲検証（5,000-500,000 KRW）
// - 自動配送方法選択（ROCKET vs STANDARD）
//
// T38: 画像品質要件
// - 500x500ピクセル以上の画像のみ選別
// - 最大10枚、推奨5枚の制限
// - 最低1枚の品質画像必須
//
// 追加機能:
// - ブランド・製造元情報のサポート
// - 配送プロファイルのカスタマイズ
// - エラーハンドリング強化
// - KRW価格の整数化（韓国通貨の慣習）
// ----------------------------------------------------
