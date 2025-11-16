// GmarketAuctionMapper.js: Gmarket/Auction API向けデータマッピング関数

/**
 * eBay形式のマスターデータをGmarket/Auction APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Gmarket/Auction APIへの送信ペイロード
 */
function mapToGmarketAuctionPayload(masterListing) {
  const finalPriceKRW = masterListing.final_price_krw; // Coupangと同様にKRW価格を使用

  const payload = {
    // 基本情報 (Gmarket Globalの形式に準拠)
    item_title: masterListing.title,
    item_description: masterListing.description_html,

    // 価格・通貨
    currency: "KRW",
    selling_price: finalPriceKRW.toFixed(0),

    // 在庫・SKU
    quantity: masterListing.inventory_count,
    item_sku: masterListing.master_id,

    // 配送情報
    shipping_type: "Global_Shipping_DDP", // DDP対応のグローバル配送
    origin_country: masterListing.origin_country,

    // HSコード
    customs_tariff_code: masterListing.hs_code_final,

    // プロモーション（別途T23と同様のロジックで適用可能）
  };

  return payload;
}
