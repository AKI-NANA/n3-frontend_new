// FashionRemainingMapper.js: Zalando, ASOS, Otto, La Redoute, Not On The High Street向け

function mapToFashionRemainingPayload(masterListing, targetMarket) {
  const finalPriceEUR = masterListing.final_price_eur;
  let payload = {
    title: masterListing.title,
    price: finalPriceEUR.toFixed(2),
    currency: "EUR",
    sku: masterListing.master_id,
    ean_code: masterListing.ean_code,
    images: masterListing.image_urls,
    country_of_origin: masterListing.origin_country,
  };

  switch (targetMarket) {
    case "Zalando":
    case "ASOS":
      // 在庫同期と配送オプションの厳格な設定
      payload.inventory_type = "FULFILLMENT_BY_SELLER_DDP";
      payload.return_policy_id = masterListing.return_policy_id;
      break;
    case "Otto":
    case "La Redoute":
      // カタログECは詳細な説明とEANを重視
      payload.detailed_description = masterListing.description_html;
      break;
    case "Not On The High Street":
      // ストーリー性とギフト属性
      payload.product_story = masterListing.product_story;
      payload.is_gift_wrappable = true;
      break;
  }
  return payload;
}
