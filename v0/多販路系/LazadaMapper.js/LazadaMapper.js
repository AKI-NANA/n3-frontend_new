// LazadaMapper.js: Lazada API向けデータマッピング関数
// T25: Shopeeと同様に東南アジア市場へのローカライズを強化

/**
 * eBay形式のマスターデータをLazada APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @returns {object} Lazada APIへの送信ペイロード
 */
function mapToLazadaPayload(masterListing) {
  const finalPriceUSD = masterListing.final_price_usd; // DDP込みのUSD価格
  const TARGET_CURRENCY = "SGD"; // シンガポールドルを基準と仮定

  // T25: 価格はUSDから現地通貨へ換算される前提
  const finalPriceLocal =
    finalPriceUSD * masterListing.fx_rates[TARGET_CURRENCY];

  const payload = {
    // 基本情報
    Name: masterListing.title,
    Description: masterListing.description_html,

    // 価格と通貨
    // Lazadaは国ごとの価格設定が必要なため、ここでは基本となる通貨を設定
    Price: finalPriceLocal.toFixed(2),
    Currency: TARGET_CURRENCY,

    // SKUと在庫
    // バリエーションがある場合、SKUリストとして展開する必要がある（ここでは基本SKUを想定）
    Skus: [
      {
        SellerSku: masterListing.master_id,
        Quantity: masterListing.inventory_count,
        PackageWeight: masterListing.weight_kg,
        Images: masterListing.image_urls,
      },
    ],

    // DDP/HSコード
    CustomsTariffCode: masterListing.hs_code_final,
    CountryOfOrigin: masterListing.origin_country,

    // その他必須属性
    PrimaryCategory: masterListing.lazada_category_id,
    ProductWarranty: "1 year international warranty",
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Lazada マッピングのポイント
// - 価格は現地通貨に換算し、販売国に合わせて設定します（T25）。
// - SKU（Stock Keeping Unit）を必須の配列形式で渡す構造を準備しています。
// ----------------------------------------------------
