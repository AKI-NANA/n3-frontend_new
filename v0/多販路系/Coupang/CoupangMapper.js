// CoupangMapper.js: Coupang API向けデータマッピング関数 (T24)

/**
 * eBay形式のマスターデータをCoupang APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Coupang APIへの送信ペイロード
 */
function mapToCoupangPayload(masterListing) {
  // 価格はKRWに換算される前提。ここでは計算済みの最終価格を使用。
  const finalPriceKRW = masterListing.final_price_krw; // PriceCalculatorで計算済みと仮定

  // T24: 最低利益保証のためのメタデータをペイロードに含める（チェックは実行時に行われる）
  const COUPANG_CATEGORY_ID = "C001002003"; // 例: トレーディングカードのカテゴリID
  const COUPANG_FEE_RATE = 0.12; // 例: カテゴリ手数料12%

  if (!finalPriceKRW) {
    throw new Error(
      "Coupang requires final_price_krw to be set by the PriceCalculator."
    );
  }

  const payload = {
    // 基本情報
    vendorItemName: masterListing.title,
    detailContent: masterListing.description_html,
    quantity: masterListing.inventory_count,

    // 価格・手数料設定
    currency: "KRW",
    sellingPrice: finalPriceKRW.toFixed(0),

    // T24: 利益保証チェックのためのメタデータ
    categoryFeeRate: COUPANG_FEE_RATE,

    // 配送情報
    deliveryMethod: "ROCKET_SHIPMENT_GLOBAL", // グローバルロケット配送を想定
    // HSコードと原産国は韓国税関の要件に合わせて別途マッピングが必要
    customsClearanceCode: masterListing.hs_code_final,
    originCountryCode: masterListing.origin_country,

    // カテゴリ
    categoryId: COUPANG_CATEGORY_ID,
    images: masterListing.image_urls,
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Coupang マッピングのポイント
// - KRW建ての価格がPriceCalculatorで事前に計算されていることが前提です。
// - 利益保証のためのカテゴリ手数料率（T24）は、出品時にエラーチェックされるようペイロードに含めます。
// - グローバルロケット配送を設定し、韓国国内の迅速な配送ニーズに対応します。
// ----------------------------------------------------
