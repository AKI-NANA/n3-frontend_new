// Qoo10Mapper.js: Qoo10 API向けデータマッピング関数 (T23)

/**
 * eBay形式のマスターデータをQoo10 APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ（価格確定済み）
 * @returns {object} Qoo10 APIへの送信ペイロード
 */
function mapToQoo10Payload(masterListing) {
  // T23: プロモーションと価格設定
  const isPromotionActive =
    masterListing.qoo10_sale_price &&
    masterListing.qoo10_sale_price < masterListing.final_price;

  // Qoo10は日本円（JPY）または各国通貨を基本とする
  const finalSellingPrice =
    masterListing.final_price_jpy || masterListing.final_price;

  const payload = {
    // 基本情報
    ItemTitle: masterListing.title,
    ItemDescription: masterListing.description_html,
    Quantity: masterListing.inventory_count,

    // 価格設定
    Currency: "JPY", // Qoo10 Japanを想定
    SellerBasicPrice: finalSellingPrice.toFixed(0),

    // T23: プロモーション設定
    DiscountRate: isPromotionActive
      ? (
          (1 - masterListing.qoo10_sale_price / finalSellingPrice) *
          100
        ).toFixed(1)
      : "0",
    PromotionType: isPromotionActive ? "TIMESALE" : "NONE", // セール価格があればタイムセールを適用

    // 画像URL
    ImageUrls: masterListing.image_urls.join("|"), // Qoo10はパイプ区切りを要求する場合がある

    // 配送情報（HSコード連携）
    ShipFromCountry: masterListing.origin_country,
    // DDP対応の配送設定IDをマスターデータから取得し適用
    ShippingCustomsID:
      masterListing.qoo10_shipping_profile_id || "GLOBAL_DDP_STANDARD",
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Qoo10 マッピングのポイント
// - 'final_price_jpy'を使い、日本円を基本とします。
// - マスターデータ内のセール価格の有無で、プロモーションタイプを自動設定（T23）。
// - 画像URLはAPI仕様に合わせて '|' 区切りで結合しています。
// ----------------------------------------------------
