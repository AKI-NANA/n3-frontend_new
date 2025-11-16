// RakutenGlobalMapper.js: Rakuten Taiwan/Malaysia API向けデータマッピング関数

/**
 * eBay形式のマスターデータを楽天海外モール APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲット市場 ('TW' or 'MY')
 * @returns {object} Rakuten Global APIへの送信ペイロード
 */
function mapToRakutenGlobalPayload(masterListing, targetMarket) {
  let targetCurrency = targetMarket === "TW" ? "TWD" : "MYR"; // 台湾ドル or マレーシアリンギット
  let finalPriceLocal =
    masterListing.final_price_usd * masterListing.fx_rates[targetCurrency]; // 現地通貨へ換算

  const payload = {
    // 基本情報
    product_name: masterListing.title,
    product_description: masterListing.description_html,

    // 価格・税金
    currency: targetCurrency,
    price: finalPriceLocal.toFixed(2),
    // 現地の消費税（VAT/GST）を自動計算に含めるフラグ
    taxable: true,

    // 在庫・SKU
    inventory_count: masterListing.inventory_count,
    sku_id: masterListing.master_id,

    // 画像
    image_list: masterListing.image_urls,

    // DDP/HSコード
    customs_harmonized_code: masterListing.hs_code_final,
    delivery_country_origin: masterListing.origin_country,

    // 楽天特有のカテゴリ・属性
    category_id: masterListing.rakuten_global_category_id,
  };

  return payload;
}
