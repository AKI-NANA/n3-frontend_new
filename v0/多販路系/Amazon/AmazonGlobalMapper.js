// AmazonGlobalMapper.js: Amazon 全グローバルリージョン API向けデータマッピング関数
// T27のロジックを拡張し、複数リージョンに対応

// Amazonの主要リージョンとその通貨の定義（DDP価格計算の基盤）
const AMAZON_REGIONS = {
  US: { currency: "USD", endpoint: "na-api-endpoint" },
  CA: { currency: "CAD", endpoint: "na-api-endpoint" }, // 北米 (カナダ)
  UK: { currency: "GBP", endpoint: "eu-api-endpoint" }, // 欧州 (イギリス)
  DE: { currency: "EUR", endpoint: "eu-api-endpoint" }, // 欧州 (ドイツ/共通)
  JP: { currency: "JPY", endpoint: "jp-api-endpoint" }, // アジア (日本)
  AU: { currency: "AUD", endpoint: "au-api-endpoint" }, // オセアニア (豪州)
  SA: { currency: "SAR", endpoint: "me-api-endpoint" }, // 中東 (サウジアラビア/共通)
};

/**
 * eBay形式のマスターデータをAmazon Selling Partner APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetRegion - ターゲットAmazonリージョンコード (例: 'US', 'DE', 'JP')
 * @returns {object} Amazon APIへの送信ペイロード
 */
function mapToAmazonGlobalPayload(masterListing, targetRegion) {
  const region = AMAZON_REGIONS[targetRegion];
  if (!region) {
    throw new Error(`Unsupported Amazon region code: ${targetRegion}`);
  }

  // 価格換算: マスターUSD価格を基準に、FXレートを使って現地通貨に換算
  const finalPriceUSD = masterListing.final_price_usd;
  const finalPriceLocal =
    finalPriceUSD * masterListing.fx_rates[region.currency]; // 現地通貨価格

  const payload = {
    // T27: Product Objectの基本情報
    sku: masterListing.master_id,
    title: masterListing.title,
    description: masterListing.description_html,

    // 価格設定
    marketplaceId: targetRegion,
    currency: region.currency,
    standardPrice: finalPriceLocal.toFixed(2),

    // 在庫・フルフィルメント（FBM/FBAの切り替え）
    quantity: masterListing.inventory_count,
    fulfillmentType: masterListing.amazon_fulfillment_type || "MFN_DDP", // MFN = FBM（自社配送）だがDDP（関税元払い）処理を適用

    // T27: DDP/HSコードと税務情報
    productTaxCode: masterListing.hs_code_final, // HSコードをTax Codeとしてマッピング
    countryOfOrigin: masterListing.origin_country,

    // 画像
    mainImageUrl: masterListing.image_urls[0],
    otherImageUrls: masterListing.image_urls.slice(1),

    // APIエンドポイント (APIハブが利用するメタデータ)
    api_endpoint_key: region.endpoint,
  };

  return payload;
}
