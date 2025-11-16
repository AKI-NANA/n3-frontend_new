// EuropeMapper.js: Allegro / Bol.com API向けデータマッピング関数

/**
 * eBay形式のマスターデータをヨーロッパ主力モールAPIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲットモール ('Allegro' or 'BolCom')
 * @returns {object} ヨーロッパモール APIへの送信ペイロード
 */
function mapToEuropeSpecialtyPayload(masterListing, targetMarket) {
  const finalPriceEUR = masterListing.final_price_eur; // DDP込みのEUR価格を前提

  let payload = {
    // 共通属性
    product_name: masterListing.title,
    price: finalPriceEUR.toFixed(2),
    currency: "EUR", // ヨーロッパ共通通貨
    description: masterListing.description_html,
    stock_level: masterListing.inventory_count,

    // DDP/HSコードとVAT情報
    vat_rate: 0.2, // ヨーロッパの標準VAT率（国により異なるため、ここでは仮の値）
    harmonization_code: masterListing.hs_code_final,
    country_of_origin: masterListing.origin_country,
  };

  if (targetMarket === "Allegro") {
    // Allegro特有のオークション/購入オプション
    payload.listing_format = "BUY_NOW";
    payload.shipping_profile_id = "PL_DDP_PROFILE";
  } else if (targetMarket === "BolCom") {
    // Bol.comはSKUとEAN/GTINコードを厳格に要求
    payload.sku_code = masterListing.master_id;
    payload.ean_code = masterListing.ean_code;
  }

  return payload;
}
