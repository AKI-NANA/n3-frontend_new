// TCGSpecialtyMapper.js: Card Market / TCGplayer API向けデータマッピング関数 (T30)

/**
 * eBay形式のマスターデータをトレカ専門モールAPIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲット市場 ('CardMarket' or 'TCGplayer')
 * @returns {object} 専門モール APIへの送信ペイロード
 */
function mapToTCGSpecialtyPayload(masterListing, targetMarket) {
  // TCG専門属性（マスターデータに存在することを前提）
  const cardAttributes = masterListing.tcg_attributes;
  if (!cardAttributes || !cardAttributes.card_condition) {
    throw new Error(
      `TCG specialty marketplaces require detailed condition code.`
    );
  }

  // 価格設定
  const finalPriceUSD = masterListing.final_price_usd;

  const payload = {
    // 共通属性
    itemName: masterListing.title,
    price: finalPriceUSD.toFixed(2),
    quantity: masterListing.inventory_count,

    // T30: 専門属性
    gameName: cardAttributes.game_name || "Pokemon",
    cardName: cardAttributes.card_name,
    cardCondition: cardAttributes.card_condition, // NEAR_MINT, LIGHTLY_PLAYEDなど
  };

  if (targetMarket === "CardMarket") {
    // Card Market特有の属性（主にヨーロッパ向け）
    payload.language = cardAttributes.card_language || "Japanese";
    payload.is_foil = cardAttributes.is_foil || false;
    payload.edition = cardAttributes.edition_name;
  } else if (targetMarket === "TCGplayer") {
    // TCGplayer特有の属性（主に北米向け）
    payload.rarityCode = cardAttributes.rarity_code;
    payload.marketPriceCode = masterListing.hs_code_final; // HSコードをカスタムフィールドに利用
  }

  return payload;
}
