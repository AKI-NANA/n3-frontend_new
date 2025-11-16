// ShopifyMapper.js: Shopify API向けデータマッピング関数
// T30: 独自の自社ECサイトのデータハブとして機能

/**
 * eBay形式のマスターデータをShopify APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Shopify Admin APIへの送信ペイロード (Product Object)
 */
function mapToShopifyPayload(masterListing) {
  const finalPriceUSD = masterListing.final_price_usd; // DDPコスト込みのUSD価格

  const payload = {
    // Shopify Product オブジェクトの基本情報
    title: masterListing.title,
    body_html: masterListing.description_html,
    vendor: masterListing.origin_country || "Japan", // 販売元/原産国
    product_type: masterListing.shopify_product_type || "Collectibles",

    // 商品バリアント（SKU）と価格
    variants: [
      {
        sku: masterListing.master_id,
        price: finalPriceUSD.toFixed(2),
        inventory_quantity: masterListing.inventory_count,
        // 配送・関税情報
        requires_shipping: true,
        taxable: true,
        // T30: Shopifyの関税情報（HSコード）にマッピング
        country_of_origin: masterListing.origin_country,
        harmonized_system_code: masterListing.hs_code_final,
      },
    ],

    // 画像
    images: masterListing.image_urls.map((url) => ({ src: url })),

    // SEOメタデータ
    tags: masterListing.tags ? masterListing.tags.join(", ") : "",
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Shopify マッピングのポイント
// - ShopifyはSKUと価格をvariants（バリアント）配列内に持ちます。
// - T30に基づき、**関税情報（harmonized_system_code）**を正確にマッピングします。
// - Shopifyを出品システムの**在庫・価格のマスターハブ**としても利用できます。
// ----------------------------------------------------
