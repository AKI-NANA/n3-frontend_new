// WalmartMapper.js: Walmart API向けデータマッピング関数
// T30: USA主要モール向けの専門属性に対応

/**
 * eBay形式のマスターデータをWalmart APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Walmart APIへの送信ペイロード
 */
function mapToWalmartPayload(masterListing) {
  const finalPriceUSD = masterListing.final_price_usd;

  const payload = {
    // T30: 基本的なProduct情報
    sku: masterListing.master_id,
    productName: masterListing.title,
    shortDescription: masterListing.description_html.substring(0, 500), // Walmartは文字数制限が厳しい

    // 価格設定
    pricing: {
      currentPrice: {
        currency: "USD",
        value: finalPriceUSD.toFixed(2),
      },
      priceType: "BASE",
    },

    // 配送とHSコード（関税情報）
    shipping: {
      shipMethod: "FREIGHT",
      // DDP/HSコードをWalmartのTax Codeフィールドにマッピング
      taxCode: masterListing.hs_code_final,
    },

    // 商品属性（Item Specifics）
    productAttributes: {
      brand: masterListing.brand_name || "Unbranded",
      countryOfOrigin: masterListing.origin_country,
      // ライフサイクルステータス（新品/中古）
      productSecondaryStatus: masterListing.is_vintage ? "Refurbished" : "New",
    },

    // 画像
    mainImageUrl: masterListing.image_urls[0],
    additionalImageUrls: masterListing.image_urls.slice(1),
  };

  return payload;
}
