// EmergingMarketsMapper.js: 南米・中東・インド API向けデータマッピング関数

/**
 * eBay形式のマスターデータを新興市場APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲットモール ('MercadoLibre', 'Noon', 'Flipkart')
 * @returns {object} APIへの送信ペイロード
 */
function mapToEmergingMarketsPayload(masterListing, targetMarket) {
  const finalPriceUSD = masterListing.final_price_usd; // DDP込みのUSD価格
  let payload = {
    listing_title: masterListing.title,
    listing_description: masterListing.description_html,
    quantity: masterListing.inventory_count,
    images: masterListing.image_urls,
    // DDP/HSコードは共通で必要
    customs_harmonization_code: masterListing.hs_code_final,
    origin_country: masterListing.origin_country,
  };

  switch (targetMarket) {
    case "MercadoLibre":
      // 南米：現地通貨（MXN, BRLなど）と、配送設定の厳格化
      const finalPriceMXN = finalPriceUSD * masterListing.fx_rates["MXN"]; // メキシコペソへ換算を想定
      payload.currency = "MXN";
      payload.price = finalPriceMXN.toFixed(2);
      payload.listing_type = "buy_it_now";
      // 関税と輸入税を価格に含むことを明記
      payload.shipping_policy = "Global_Shipping_DDP_Included";
      break;

    case "Noon":
      // 中東：UAEディルハム (AED)が主要通貨。配送と返品ポリシーが厳格
      const finalPriceAED = finalPriceUSD * masterListing.fx_rates["AED"];
      payload.currency = "AED";
      payload.price = finalPriceAED.toFixed(2);
      payload.seller_sku = masterListing.master_id;
      payload.is_international_seller = true;
      break;

    case "Flipkart":
      // インド：インドルピー (INR)。GST (商品サービス税)の管理が必須
      const finalPriceINR = finalPriceUSD * masterListing.fx_rates["INR"];
      payload.currency = "INR";
      payload.price = finalPriceINR.toFixed(0);
      payload.product_id = masterListing.master_id;
      // T30: インドのGSTIN (納税者番号) と HSN (HSコードに相当) を厳格にマッピング
      payload.gst_tax_code = masterListing.flipkart_gstin;
      payload.hsn_code = masterListing.hs_code_final;
      break;

    default:
      throw new Error(`Unsupported emerging market: ${targetMarket}`);
  }

  return payload;
}
