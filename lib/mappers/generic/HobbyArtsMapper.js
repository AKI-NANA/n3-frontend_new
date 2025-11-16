// HobbyArtsMapper.js: Discogs, Reverb, Saatchi Art, Fanaticsなど向け

function mapToHobbyArtsPayload(masterListing, targetMarket) {
  const finalPriceUSD = masterListing.final_price_usd;
  const finalPriceEUR = masterListing.final_price_eur;
  let payload = {
    title: masterListing.title,
    quantity: masterListing.inventory_count,
    description: masterListing.description_html,
    images: masterListing.image_urls,
  };

  if (["Discogs", "Reverb"].includes(targetMarket)) {
    payload.currency = targetMarket === "Discogs" ? "EUR" : "USD";
    payload.price = (
      targetMarket === "Discogs" ? finalPriceEUR : finalPriceUSD
    ).toFixed(2);

    // T30: 専門属性
    payload.condition_media = masterListing.condition_media; // レコード盤の状態
    payload.condition_sleeve = masterListing.condition_sleeve; // ジャケットの状態
    payload.serial_number = masterListing.serial_number; // 楽器のシリアル
  } else if (["Saatchi Art", "1stDibs"].includes(targetMarket)) {
    payload.currency = "USD";
    payload.price = finalPriceUSD.toFixed(0);

    // T30: 美術品属性
    payload.artist_name = masterListing.artist_name;
    payload.year_of_creation = masterListing.year_of_creation;
    payload.authentication_cert = masterListing.authentication_cert; // 真贋証明
  } else if (targetMarket === "Fanatics") {
    payload.currency = "USD";
    payload.price = finalPriceUSD.toFixed(2);
    payload.team_id = masterListing.team_id;
    payload.player_id = masterListing.player_id;
  }
  return payload;
}
