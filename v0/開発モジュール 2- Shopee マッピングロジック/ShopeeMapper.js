// ShopeeMapper.js: Shopee API向けデータマッピング関数 (T25, T26)

// T25: Shopeeの各国市場定義と配送オプション
const SHOPEE_MARKET_SETTINGS = {
  SG: { currency: "SGD", shipping_id: "SHP_SG_DDP_1" }, // シンガポールドル
  PH: { currency: "PHP", shipping_id: "SHP_PH_DDP_2" }, // フィリピンペソ
  TW: { currency: "TWD", shipping_id: "SHP_TW_DDP_3" }, // 台湾ドル
};

/**
 * eBay形式のマスターデータをShopee APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarketCode - 出品対象の市場コード (例: 'SG', 'PH')
 * @returns {object} Shopee APIへの送信ペイロード
 */
function mapToShopeePayload(masterListing, targetMarketCode) {
  const marketSetting = SHOPEE_MARKET_SETTINGS[targetMarketCode];
  if (!marketSetting) {
    throw new Error(`Invalid Shopee market code: ${targetMarketCode}`);
  }

  // 価格はUSDを基本とし、現地通貨に換算（換算ロジックは別途PriceCalculatorで処理）
  const finalPriceUSD = masterListing.final_price_usd;

  const payload = {
    // 基本情報
    item_title: masterListing.title,
    item_description: masterListing.description_html,
    quantity: masterListing.inventory_count,

    // 価格と通貨設定
    currency: marketSetting.currency, // T25: ターゲット市場の通貨を適用
    price: (
      finalPriceUSD * masterListing.fx_rates[marketSetting.currency]
    ).toFixed(2), // 換算後の価格

    // T26: モバイル最適化された画像リストを強制
    image_list: masterListing.image_urls.map((url) => ({
      url,
      // 縦長 (3:4) または正方形 (1:1) 画像の利用を強制
      aspect_ratio_enforced:
        masterListing.image_dimensions[url] === "3:4" ? "3:4" : "1:1",
    })),

    // 配送情報
    country_of_origin: masterListing.origin_country,
    // T25: 市場ごとのDDP配送プロファイルを適用
    shipping_channel_id: marketSetting.shipping_id,

    // DDP/HSコードをカスタムフィールドに埋め込み（Shopee API仕様に依存）
    customs_tariff_code: masterListing.hs_code_final,
  };

  return payload;
}

// ----------------------------------------------------
// 💡 Shopee マッピングのポイント
// - ターゲット市場（SG, PH, TW）ごとに設定を動的に切り替える仕組み（T25）。
// - モバイルでの視認性向上のため、画像比率に関するメタデータをペイロードに含めています（T26）。
// - `final_price_usd`と為替レート（`fx_rates`）を使って現地通貨に変換します。
// ----------------------------------------------------
