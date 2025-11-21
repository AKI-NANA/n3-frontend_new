// Chrono24Mapper.js: Chrono24 API向けデータマッピング関数 (T31-T34)

// Chrono24の販売手数料設定（価格帯別）
const CHRONO24_FEE_STRUCTURE = {
  // 価格帯別の手数料率
  tiers: [
    { max: 5000, rate: 0.065 },      // 0-5000 USD: 6.5%
    { max: 10000, rate: 0.055 },     // 5001-10000 USD: 5.5%
    { max: 50000, rate: 0.045 },     // 10001-50000 USD: 4.5%
    { max: Infinity, rate: 0.035 },  // 50001+ USD: 3.5%
  ],
  // 最低手数料（USD）
  minimumFee: 30,
};

// コンディションコードのマッピング（eBay → Chrono24）
const CONDITION_CODE_MAPPING = {
  1000: "UNWORN",           // 新品未使用
  1500: "NEW_OLD_STOCK",    // デッドストック
  1750: "LIKE_NEW",         // 未使用に近い
  2000: "VERY_GOOD",        // 非常に良い
  2500: "GOOD",             // 良い
  3000: "FAIR",             // 普通
  4000: "INCOMPLETE",       // 欠品あり
  5000: "FOR_PARTS",        // パーツ取り
};

// 認証証明書タイプのマッピング
const CERTIFICATE_TYPE_MAPPING = {
  MANUFACTURER_WARRANTY: "MANUFACTURER_WARRANTY",     // メーカー保証書
  DEALER_WARRANTY: "DEALER_WARRANTY",                 // 販売店保証書
  CERTIFICATE_OF_AUTHENTICITY: "CERTIFICATE_AUTH",    // 鑑定書
  NONE: "NO_CERTIFICATE",                             // 証明書なし
};

/**
 * Chrono24手数料を計算します。
 * @param {number} priceUSD - USD建ての販売価格
 * @returns {number} 手数料額（USD）
 */
function calculateChrono24Fee(priceUSD) {
  for (const tier of CHRONO24_FEE_STRUCTURE.tiers) {
    if (priceUSD <= tier.max) {
      const calculatedFee = priceUSD * tier.rate;
      return Math.max(calculatedFee, CHRONO24_FEE_STRUCTURE.minimumFee);
    }
  }
  return priceUSD * 0.035; // フォールバック
}

/**
 * T34: 画像が高解像度要件を満たしているかチェックします。
 * @param {object} imageDimension - 画像の寸法情報 { width, height }
 * @returns {boolean} 要件を満たす場合true
 */
function meetsHighResolutionRequirement(imageDimension) {
  if (!imageDimension || !imageDimension.width || !imageDimension.height) {
    return false;
  }
  // Chrono24推奨: 最低1200x800ピクセル
  return imageDimension.width >= 1200 && imageDimension.height >= 800;
}

/**
 * T34: 高解像度画像のみをフィルタリングします。
 * @param {Array} imageUrls - 画像URLの配列
 * @param {object} imageDimensionsMap - URLをキーとした寸法マップ
 * @returns {Array} フィルタリングされた画像URLの配列
 */
function filterHighResolutionImages(imageUrls, imageDimensionsMap) {
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return [];
  }

  const filteredImages = imageUrls.filter((url) => {
    const dimension = imageDimensionsMap[url];
    return meetsHighResolutionRequirement(dimension);
  });

  // 最低1枚の画像が必要
  if (filteredImages.length === 0) {
    throw new Error(
      "Chrono24 requires at least one high-resolution image (1200x800+). No images meet this requirement."
    );
  }

  return filteredImages;
}

/**
 * T33: 現地通貨への換算と手数料を考慮した最終販売価格を計算します。
 * @param {number} basePriceUSD - 基準価格（USD）
 * @param {string} targetCurrency - ターゲット通貨（USD/EUR/JPY）
 * @param {object} fxRates - 為替レートマップ { EUR: 0.92, JPY: 150, ... }
 * @returns {object} { price, currency, feeAmount, netProfit }
 */
function calculateFinalPriceWithFees(basePriceUSD, targetCurrency, fxRates) {
  // T33: 手数料を計算
  const feeAmount = calculateChrono24Fee(basePriceUSD);
  const netProfitUSD = basePriceUSD - feeAmount;

  // 現地通貨に換算
  let finalPrice = basePriceUSD;
  let finalFee = feeAmount;
  let finalNetProfit = netProfitUSD;

  if (targetCurrency !== "USD") {
    const rate = fxRates[targetCurrency];
    if (!rate) {
      throw new Error(`Exchange rate for ${targetCurrency} not found.`);
    }
    finalPrice = basePriceUSD * rate;
    finalFee = feeAmount * rate;
    finalNetProfit = netProfitUSD * rate;
  }

  return {
    price: parseFloat(finalPrice.toFixed(2)),
    currency: targetCurrency,
    feeAmount: parseFloat(finalFee.toFixed(2)),
    netProfit: parseFloat(finalNetProfit.toFixed(2)),
  };
}

/**
 * eBay形式のマスターデータをChrono24 APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetCurrency - ターゲット通貨（USD/EUR/JPY、デフォルト: USD）
 * @returns {object} Chrono24 APIへの送信ペイロード
 */
function mapToChrono24Payload(masterListing, targetCurrency = "USD") {
  // T32: 必須属性の検証
  if (!masterListing.condition_code) {
    throw new Error("Chrono24 requires condition_code in master data.");
  }

  if (
    !masterListing.specifications ||
    !masterListing.specifications.lug_width
  ) {
    throw new Error(
      "Chrono24 requires lug_width in specifications (T32 requirement)."
    );
  }

  // T32: コンディションコードのマッピング
  const watchCondition = CONDITION_CODE_MAPPING[masterListing.condition_code];
  if (!watchCondition) {
    throw new Error(
      `Invalid condition_code: ${masterListing.condition_code}. Must be one of: ${Object.keys(CONDITION_CODE_MAPPING).join(", ")}`
    );
  }

  // T32: 認証証明書タイプのマッピング
  const certificateType =
    CERTIFICATE_TYPE_MAPPING[masterListing.authenticity_certificate_id] ||
    "NO_CERTIFICATE";

  // T32: ラグ幅（必須）
  const lugWidthMm = parseFloat(masterListing.specifications.lug_width);
  if (isNaN(lugWidthMm) || lugWidthMm <= 0) {
    throw new Error(`Invalid lug_width: ${masterListing.specifications.lug_width}`);
  }

  // T33: 価格設定（手数料考慮）
  const basePriceUSD = masterListing.final_price_usd;
  const fxRates = masterListing.fx_rates || { EUR: 0.92, JPY: 150 };
  const pricing = calculateFinalPriceWithFees(
    basePriceUSD,
    targetCurrency,
    fxRates
  );

  // T34: 高解像度画像のフィルタリング
  const imageDimensionsMap = masterListing.image_dimensions || {};
  const highResImages = filterHighResolutionImages(
    masterListing.image_urls,
    imageDimensionsMap
  );

  // ペイロード構築
  const payload = {
    // 基本情報
    product_title: masterListing.title,
    description: masterListing.description_html,

    // 時計専門属性
    watch_type: masterListing.watch_type || "WRISTWATCH",
    brand_name: masterListing.brand_name || "UNKNOWN",
    reference_number: masterListing.reference_number || "N/A",
    model_name: masterListing.model_name || "",

    // T32: 必須属性マッピング
    watch_condition: watchCondition,
    certificate_type: certificateType,
    lug_width_mm: lugWidthMm,

    // 追加の専門属性
    case_diameter_mm: masterListing.specifications.case_diameter || null,
    case_material: masterListing.specifications.case_material || null,
    movement_type: masterListing.specifications.movement_type || null,
    is_warranty_card_included:
      masterListing.authenticity_certificate_id !== "NONE" &&
      masterListing.authenticity_certificate_id !== undefined,
    is_original_box_included: masterListing.has_original_box || false,
    year_of_production: masterListing.year_of_production || null,

    // T33: 価格設定（手数料込み計算済み）
    currency: pricing.currency,
    price: pricing.price,
    // メタデータ（APIには送信しないが、内部利用）
    _pricing_breakdown: {
      base_price_usd: basePriceUSD,
      platform_fee: pricing.feeAmount,
      net_profit: pricing.netProfit,
    },

    // T34: 高解像度画像のみ
    images: highResImages,

    // 配送・税関情報
    customs_tariff_number: masterListing.hs_code_final,
    country_of_origin: masterListing.origin_country,
    shipping_profile_id: masterListing.chrono24_shipping_profile_id || "DEFAULT_DDP",

    // 在庫
    stock_quantity: masterListing.inventory_count,
  };

  return payload;
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mapToChrono24Payload,
    calculateChrono24Fee,
    filterHighResolutionImages,
    calculateFinalPriceWithFees,
    CONDITION_CODE_MAPPING,
    CERTIFICATE_TYPE_MAPPING,
  };
}

// ----------------------------------------------------
// 💡 Chrono24 マッピングのポイント (T31-T34)
//
// T31: 専門モール対応の基盤構築
// - /lib/mappers/specialty/ に配置し、他の高級品モールへの応用を容易化
//
// T32: 必須属性マッピング
// - watch_condition: condition_codeから厳密にマッピング（UNWORN, VERY_GOOD等）
// - certificate_type: authenticity_certificate_idから認証タイプを判定
// - lug_width_mm: specifications.lug_widthから取得（必須項目）
//
// T33: 価格設定ロジック
// - 現地通貨（USD/EUR/JPY）への自動換算
// - Chrono24の販売手数料（価格帯別: 3.5%-6.5%）を考慮
// - 確定利益（net_profit）を計算して透明性を確保
//
// T34: 画像最適化
// - 1200x800ピクセル以上の高解像度画像のみを選別
// - 要件を満たさない画像は自動的に除外
// - 最低1枚の高解像度画像が必須（なければエラー）
//
// 追加機能:
// - 時計専門属性（ケース径、素材、ムーブメントタイプ等）の包括的サポート
// - 価格内訳（_pricing_breakdown）でコスト透明性を提供
// - エラーハンドリングで出品前の検証を強化
// ----------------------------------------------------
