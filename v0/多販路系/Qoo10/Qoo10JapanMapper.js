// Qoo10JapanMapper.js: Qoo10 Japan API向けデータマッピング関数
// T23: 国内市場特有のロジックと価格設定

/**
 * eBay形式のマスターデータをQoo10 Japan APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Qoo10 Japan APIへの送信ペイロード
 */
function mapToQoo10JapanPayload(masterListing) {
  // 国内価格の計算：国内消費税(10%)と国内送料を加算
  const domesticPriceJPY =
    masterListing.final_price_jpy_domestic ||
    masterListing.base_price_jpy * 1.1 + masterListing.domestic_shipping_cost;

  // T23: 共同購入/タイムセール価格のチェック
  const isPromotionActive =
    masterListing.qoo10_sale_price_jpy_domestic &&
    masterListing.qoo10_sale_price_jpy_domestic < domesticPriceJPY;

  const payload = {
    // 基本情報
    ItemTitle: masterListing.title,
    ItemDescription: masterListing.description_html,
    Quantity: masterListing.inventory_count,

    // 価格設定 (国内販売)
    Currency: "JPY",
    SellerBasicPrice: domesticPriceJPY.toFixed(0), // 最終国内価格

    // T23: プロモーション設定
    DiscountRate: isPromotionActive
      ? (
          (1 - masterListing.qoo10_sale_price_jpy_domestic / domesticPriceJPY) *
          100
        ).toFixed(1)
      : "0",
    PromotionType: isPromotionActive ? "TIMESALE" : "NONE",

    // 配送情報 (国内配送)
    ShipFromCountry: "JP", // 出荷地を日本国内に固定
    ShippingMethod: "Domestic_Standard",

    // HSコードは国内販売では必須ではないが、データ保持のためカスタムフィールドに含める
    CustomsInfo: { customs_code: masterListing.hs_code_final },

    ImageUrls: masterListing.image_urls.join("|"),
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Qoo10 Japan マッピングのポイント
// - 価格計算に**国内消費税(10%)**を含めます。
// - 出荷地を**日本国内(JP)**に固定し、国内配送ロジックを適用します。
// - プロモーション（T23）はグローバル版と共通のロジックで適用できます。
// ----------------------------------------------------
