// Phase 8: アジア主要モール出品モジュール (AsiaPublisher.js)
// Next.js/Node.js環境でのバックエンドロジックを想定

// --- 外部APIクライアント (シミュレーション) ---
const apiClientsAsia = {
  qoo10: {
    post: async (endpoint, payload) => ({
      status: 201,
      data: { item_no: `Q10-${Math.floor(Math.random() * 1000)}` },
    }),
  },
  shopee: {
    post: async (endpoint, payload) => ({
      status: 200,
      data: { item_id: `SHOP-${Math.floor(Math.random() * 1000)}` },
    }),
  },
  coupang: {
    post: async (endpoint, payload) => ({
      status: 200,
      data: { vendor_item_id: `CPNG-${Math.floor(Math.random() * 1000)}` },
    }),
  },
  amazon: {
    post: async (endpoint, payload) => ({
      status: 200,
      data: { asin: `ASIN-${Math.floor(Math.random() * 1000)}` },
    }),
  },
};

// ----------------------------------------------------
// Step 1: マスターリスティングデータ（アジア向け設定追加）
// ----------------------------------------------------
const mockMasterListingAsia = {
  master_id: "LST-002B",
  title: "PSA 10 Charizard (Japanese Edition)",
  description_html: "Mint condition Japanese TCG.",
  base_price_jpy: 850000, // 日本円での基準価格
  inventory_count: 5,
  image_urls: [
    "https://example.com/img_sq.jpg",
    "https://example.com/img_tall.jpg",
  ],
  hs_code_final: "9504.40",
  origin_country: "Japan",
  qoo10_sale_price_jpy: 820000, // T23: セール時の価格（許容範囲内）
  coupang_category_fee: 0.15, // T24: クーパンのカテゴリ手数料率 (15%と仮定)
};

// ----------------------------------------------------
// Step 2: アジアモール向けデータマッピング (T23 - T27)
// ----------------------------------------------------

/**
 * @param {object} master_data
 * @param {string} marketplace
 * @returns {object} APIに送信するためのJSONペイロード
 */
function mapDataToAsiaApiPayload(master_data, marketplace) {
  const commonPayload = {
    item_title: master_data.title,
    item_description: master_data.description_html,
    quantity: master_data.inventory_count,
    images: master_data.image_urls,
    country_of_origin: master_data.origin_country,
  };

  switch (marketplace) {
    case "qoo10":
      // T23: Qoo10のプロモーションと価格設定を反映
      return {
        ...commonPayload,
        currency: "JPY",
        original_price: master_data.base_price_jpy,
        // セール価格（共同購入やタイムセール用）
        sale_price: master_data.qoo10_sale_price_jpy,
        promotion_type: "TIME_SALE",
      };

    case "shopee":
      // T25/T26: Shopeeのローカライズとモバイル最適化を反映
      const usdPrice = master_data.base_price_jpy / 155; // 為替換算 (例として1ドル=155円)
      return {
        ...commonPayload,
        currency: "USD",
        price: usdPrice.toFixed(2),
        // T26: モバイル最適化（トリミング後の縦長画像を優先）
        images: master_data.image_urls.map((url) => ({ url, ratio: "3:4" })),
        target_markets: ["SG", "TW", "PH"], // T25: 複数市場セグメント
        shipping_provider: "JAPAN_POST_DDP", // DDP対応の配送サービス
      };

    case "coupang":
      // T24: Coupangの複雑な手数料計算とロケット配送設定を反映
      const finalCoupangPrice =
        master_data.base_price_jpy / (1 - master_data.coupang_category_fee);
      return {
        ...commonPayload,
        currency: "KRW", // 韓国ウォンに換算が必要 (ここではJPYを仮定)
        vendor_price: Math.round(finalCoupangPrice),
        category_fee_rate: master_data.coupang_category_fee,
        delivery_type: "ROCKET_SHIPMENT_GLOBAL",
      };

    case "amazon":
      // T27: AmazonのDDP/HSコード統合とFBA/FBM切り替え
      return {
        ...commonPayload,
        listing_currency: "USD",
        standard_price: commonPayload.price_usd,
        // HSコードをAmazonのカスタムフィールドにマッピング
        item_customs_code: master_data.hs_code_final,
        fulfillment_type: "FBM_DDP", // FBM（自社配送）だがDDP（関税元払い）として処理
      };

    default:
      throw new Error(`Unsupported marketplace: ${marketplace}`);
  }
}

// ----------------------------------------------------
// Step 3: 出品実行と利益保証チェック (T24: 利益保証)
// ----------------------------------------------------

async function executeAsiaPublishing(master_data) {
  const marketplaces = ["qoo10", "shopee", "coupang", "amazon"];
  const results = {};
  const MIN_PROFIT_MARGIN_JAPAN = 0.1; // 利益保証ライン (10%)

  for (const market of marketplaces) {
    try {
      const payload = mapDataToAsiaApiPayload(master_data, market);

      // T24: 利益保証チェック (Coupangの価格が最低マージンを保証しているか確認)
      if (market === "coupang") {
        // 価格計算の逆算チェックをシミュレーション
        const assumedCost = master_data.base_price_jpy * 0.5; // 原価を50%と仮定
        const profitAfterFee =
          payload.vendor_price * (1 - master_data.coupang_category_fee) -
          assumedCost;
        if (profitAfterFee / assumedCost < MIN_PROFIT_MARGIN_JAPAN) {
          throw new Error(
            `[T24 FAILED] Coupang price (${payload.vendor_price}) violates minimum profit margin.`
          );
        }
      }

      // APIコール実行 (T21と同様)
      const apiClient = apiClientsAsia[market];
      const response = await apiClient.post("/listings", payload);

      results[market] = {
        status: "SUCCESS",
        id:
          response.data.item_no || response.data.item_id || response.data.asin,
      };
    } catch (error) {
      results[market] = { status: "FAILED", message: error.message };
      console.error(
        `\n❌ FAILED to publish to ${market.toUpperCase()}: ${error.message}`
      );
    }
  }

  console.log("\n--- アジア主要モール出品実行結果 ---", results);
  return { global_status: "COMPLETED", results };
}

// executeAsiaPublishing(mockMasterListingAsia); // 開発環境で実行
