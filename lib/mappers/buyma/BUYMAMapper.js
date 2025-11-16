// BUYMAMapper.js: BUYMA API向けデータマッピング関数 (パーソナルショッパー)

/**
 * eBay形式のマスターデータをBUYMA APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} BUYMA APIへの送信ペイロード
 */
function mapToBUYMAPayload(masterListing) {
  const finalPriceJPY = masterListing.final_price_jpy; // DDPコスト込みの日本円価格

  const payload = {
    // 基本情報
    ItemId: masterListing.master_id,
    ItemName: masterListing.title,
    ItemDetail: masterListing.description_html,

    // T21: 価格と送料
    // BUYMAは送料込み価格が基本。DDPコストは最終価格に含まれている前提。
    SellingPrice: finalPriceJPY.toFixed(0),
    Currency: "JPY",

    // 在庫・買付情報
    StockStatus: masterListing.inventory_count > 0 ? "IN_STOCK" : "SOLD_OUT",
    // 買付地（原産国）を強調
    SourceCountry: masterListing.origin_country,

    // 画像
    ImageUrlList: masterListing.image_urls,

    // カテゴリ
    CategoryId: masterListing.buyma_category_id,

    // 発送方法（DDP対応）
    ShippingMethod: "International Express - DDP Included", // DDP対応を明記
    DaysToShip: masterListing.shipping_days_min,
  };

  return payload;
}

// ----------------------------------------------------
// 💡 BUYMA マッピングのポイント
// - **送料込みの日本円価格（DDP込み）**を必須とします。
// - パーソナルショッパー形式のため、**買付地（原産国）**や**発送までの日数**といった情報が重要です。
// ----------------------------------------------------
