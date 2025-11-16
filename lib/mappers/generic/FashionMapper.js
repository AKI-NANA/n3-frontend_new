// FashionMapper.js: ユーズドファッションモール向けデータマッピング関数 (T30)

/**
 * eBay形式のマスターデータをファッション系専門モールAPIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲットモール ('Depop', 'Poshmark', 'Vinted', 'Vestiaire')
 * @returns {object} 専門モール APIへの送信ペイロード
 */
function mapToFashionSpecialtyPayload(masterListing, targetMarket) {
  // T30: ファッション・コンディション専門属性（マスターデータに存在することを前提）
  const fashionAttributes = masterListing.fashion_attributes;
  if (!fashionAttributes || !fashionAttributes.item_condition) {
    throw new Error(
      `Fashion marketplaces require detailed condition and size.`
    );
  }

  const finalPriceUSD = masterListing.final_price_usd;

  let payload = {
    // 共通属性
    listing_title: masterListing.title,
    price_usd: finalPriceUSD.toFixed(2),
    description: masterListing.description_html,
    quantity: masterListing.inventory_count,

    // T30: 専門属性
    brand: fashionAttributes.brand_name || "Unbranded",
    category: fashionAttributes.category_code, // 例: WOMEN_TOPS_SHIRTS
    size: fashionAttributes.size_code, // 例: US_M, JP_L
    condition: fashionAttributes.item_condition, // 例: NEW_WITH_TAGS, GENTLY_USED

    // DDP/HSコード
    country_of_origin: masterListing.origin_country,
    customs_code: masterListing.hs_code_final,
  };

  switch (targetMarket) {
    case "Depop":
      // ストリート系に特化したタグ
      payload.style_tags = fashionAttributes.style_tags.join(",");
      payload.ships_internationally = true;
      break;
    case "Poshmark":
      // オファー対応と売上税処理
      payload.accepts_offers = true;
      payload.tax_code = masterListing.hs_code_final; // HSコードを税コードとして利用
      break;
    case "Vinted":
      // ヨーロッパ向けモール。明確な取引方法を要求
      payload.swap_allowed = false;
      payload.shipping_method = "DDP_GLOBAL";
      break;
    case "Vestiaire Collective":
      // 高級品の鑑定サービス連携を前提
      payload.authentication_service = true;
      payload.has_receipt = fashionAttributes.has_original_receipt || false;
      break;
  }

  return payload;
}
