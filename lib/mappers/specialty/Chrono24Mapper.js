// Chrono24Mapper.js: Chrono24 API向けデータマッピング関数 (T30)

/**
 * eBay形式のマスターデータをChrono24 APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Chrono24 APIへの送信ペイロード
 */
function mapToChrono24Payload(masterListing) {
  const finalPriceUSD = masterListing.final_price_usd; // DDP込みのUSD価格

  // T30: マスターデータ内の特化型属性をチェック
  if (
    !masterListing.watch_attributes ||
    !masterListing.watch_attributes.condition_code
  ) {
    throw new Error(
      "Chrono24 requires specific watch attributes (condition_code)."
    );
  }

  const attributes = masterListing.watch_attributes;

  const payload = {
    // 基本情報
    product_title: masterListing.title,
    description: masterListing.description_html,

    // 価格設定
    currency: "USD",
    price: finalPriceUSD.toFixed(0),

    // T30: 時計専門属性
    watch_type: attributes.watch_type || "WRISTWATCH",
    brand_name: attributes.brand_name,
    reference_number: attributes.reference_number, // リファレンスナンバーは必須

    // 状態と鑑定
    condition: attributes.condition_code, // A_EXCELLENT, A_GOODなどのコード
    is_warranty_card_included: attributes.has_warranty_card || false,
    is_original_box_included: attributes.has_original_box || false,

    // DDP/HSコード
    customs_tariff_number: masterListing.hs_code_final,
    country_of_origin: masterListing.origin_country,

    // 在庫
    stock_quantity: masterListing.inventory_count,
    images: masterListing.image_urls,
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Chrono24 マッピングのポイント
// - T30に基づき、リファレンスナンバー、ブランド名、コンディションコードなどの専門属性の**正確な入力**を前提とします。
// - DDPコストを含むUSD価格を使用し、高級時計のグローバル販売を支援します。
// ----------------------------------------------------
