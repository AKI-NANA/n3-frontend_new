// B2BMapper.js: Exapro, Machinio, B&H Photo向け

function mapToB2BPayload(masterListing, targetMarket) {
  const finalPriceUSD = masterListing.final_price_usd;
  let payload = {
    title: masterListing.title,
    price: finalPriceUSD.toFixed(0),
    currency: "USD",
    images: masterListing.image_urls,
  };

  if (["Exapro", "Machinio"].includes(targetMarket)) {
    // T30: 産業機器属性
    payload.machine_type = masterListing.machine_type;
    payload.manufacture_year = masterListing.manufacture_year;
    payload.location_city = masterListing.location_city; // 設置場所
    payload.technical_specs = masterListing.technical_specs;
  } else if (targetMarket === "B&H Photo") {
    // カメラ機器属性
    payload.model_number = masterListing.model_number;
    payload.condition_code = masterListing.condition_code; // NEW/USED/REFURBISHED
    payload.warranty_info = masterListing.warranty_info;
  }
  return payload;
}
