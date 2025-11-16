// AutoNicheMapper.js: BAT, Ricardo, Kaufland.de向け

function mapToAutoNichePayload(masterListing, targetMarket) {
  const finalPriceUSD = masterListing.final_price_usd;
  let payload = {
    title: masterListing.title,
    description: masterListing.description_html,
    quantity: masterListing.inventory_count,
  };

  if (targetMarket === "Bring a Trailer") {
    // 自動車専門属性
    payload.currency = "USD";
    payload.starting_bid = finalPriceUSD * 0.8;
    payload.vin_code = masterListing.vin_code;
    payload.vehicle_history_report = masterListing.vehicle_history_report;
  } else if (targetMarket === "Ricardo") {
    // スイス市場：CHF換算
    payload.currency = "CHF";
    payload.price = (finalPriceUSD * masterListing.fx_rates["CHF"]).toFixed(2);
    payload.listing_language = "DE"; // ドイツ語を優先
  } else if (targetMarket === "Kaufland.de") {
    // ドイツ市場
    payload.currency = "EUR";
    payload.price = masterListing.final_price_eur.toFixed(2);
    payload.ean_code = masterListing.ean_code;
    payload.gtin = masterListing.gtin;
  }
  return payload;
}
