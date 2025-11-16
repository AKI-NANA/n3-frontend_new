// WishMapper.js: Wish API向けデータマッピング関数

/**
 * eBay形式のマスターデータをWish APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Wish APIへの送信ペイロード
 */
function mapToWishPayload(masterListing) {
  const finalPriceUSD = masterListing.final_price_usd;

  const payload = {
    // 基本情報
    name: masterListing.title,
    description: masterListing.description_html,

    // 価格と在庫
    price: finalPriceUSD.toFixed(2), // 最終DDP価格を使用
    inventory: masterListing.inventory_count,

    // 配送情報
    shipping: finalPriceUSD > 100 ? 0.0 : 5.0, // 高額品は送料無料設定（ディスカウント戦略）
    shipping_country: masterListing.origin_country,

    // 画像
    main_image_url: masterListing.image_urls[0],
    extra_image_urls: masterListing.image_urls.slice(1).join("|"),

    // HSコード (WishのカスタムまたはタックスIDフィールドにマッピング)
    tax_id: masterListing.hs_code_final,
  };

  return payload;
}
