// Phase 8 拡張: アジア主要モール統合 (AsiaPublisher.js)
// Qoo10, Shopee, Coupang, Amazon へのロジック拡張

/**
 * AsiaPublisher - アジア主要モールへの最適化された出品ロジック
 *
 * 対応モール:
 * - Qoo10: 共同購入/タイムセール自動対応 (T23)
 * - Coupang: 複雑な手数料構造と利益保証 (T24)
 * - Shopee: 複数市場セグメントマッピング (T25) + モバイル最適化画像 (T26)
 * - Amazon: DDP/HSコード統合 (T27)
 */

// ==========================================
// T24: Coupang カテゴリー別手数料構造データベース
// ==========================================

const COUPANG_FEE_STRUCTURE = {
  // カテゴリーID: { 手数料率, 最低手数料, 配送手数料 }
  'C001': { commission: 0.08, minFee: 500, shipping: 2500 }, // 電子機器
  'C002': { commission: 0.12, minFee: 300, shipping: 2000 }, // ファッション
  'C003': { commission: 0.15, minFee: 200, shipping: 1500 }, // ホビー・コレクティブル
  'C004': { commission: 0.10, minFee: 400, shipping: 2200 }, // ホーム・リビング
  'C005': { commission: 0.13, minFee: 350, shipping: 1800 }, // ビューティー
  'DEFAULT': { commission: 0.12, minFee: 300, shipping: 2000 }, // デフォルト
};

// ==========================================
// T25: Shopee 市場別設定
// ==========================================

const SHOPEE_MARKET_CONFIG = {
  'SG': {
    currency: 'SGD',
    fxKey: 'SGD',
    shippingProfileId: 'SHP_SG_DDP_1',
    vatRate: 0.07, // シンガポールGST 7%
    preferredImageRatio: '1:1', // 正方形画像
  },
  'PH': {
    currency: 'PHP',
    fxKey: 'PHP',
    shippingProfileId: 'SHP_PH_DDP_2',
    vatRate: 0.12, // フィリピンVAT 12%
    preferredImageRatio: '3:4', // 縦長画像
  },
  'TW': {
    currency: 'TWD',
    fxKey: 'TWD',
    shippingProfileId: 'SHP_TW_DDP_3',
    vatRate: 0.05, // 台湾VAT 5%
    preferredImageRatio: '1:1', // 正方形画像
  },
  'MY': {
    currency: 'MYR',
    fxKey: 'MYR',
    shippingProfileId: 'SHP_MY_DDP_4',
    vatRate: 0.06, // マレーシアVAT 6%
    preferredImageRatio: '1:1', // 正方形画像
  },
  'TH': {
    currency: 'THB',
    fxKey: 'THB',
    shippingProfileId: 'SHP_TH_DDP_5',
    vatRate: 0.07, // タイVAT 7%
    preferredImageRatio: '3:4', // 縦長画像
  },
  'VN': {
    currency: 'VND',
    fxKey: 'VND',
    shippingProfileId: 'SHP_VN_DDP_6',
    vatRate: 0.10, // ベトナムVAT 10%
    preferredImageRatio: '1:1', // 正方形画像
  },
};

// ==========================================
// T23: Qoo10 プロモーション管理
// ==========================================

/**
 * Qoo10の共同購入/タイムセールへの自動登録機能
 * @param {object} masterListing - マスターリスティングデータ
 * @param {object} promotionConfig - プロモーション設定
 * @returns {object} Qoo10プロモーション設定オブジェクト
 */
function buildQoo10PromotionConfig(masterListing, promotionConfig = {}) {
  const {
    enableTimeSale = false,
    enableGroupBuy = false,
    salePrice = null,
    saleStartDate = null,
    saleEndDate = null,
    minProfitMargin = 0.05, // 最低利益率5%（赤字許容ライン）
  } = promotionConfig;

  const basePrice = masterListing.final_price_jpy || masterListing.final_price;

  // 利益率チェック: セール価格が最低利益を確保しているか
  const validateSalePrice = (price) => {
    const cost = masterListing.base_cost_jpy || masterListing.base_cost || basePrice * 0.7;
    const profit = price - cost;
    const profitMargin = profit / price;

    if (profitMargin < minProfitMargin) {
      console.warn(
        `⚠️ Qoo10: セール価格 ${price} JPYは最低利益率 ${minProfitMargin * 100}% を下回ります。` +
        `(現在の利益率: ${(profitMargin * 100).toFixed(2)}%)`
      );
      // 最低利益を確保する価格に自動調整
      return cost / (1 - minProfitMargin);
    }
    return price;
  };

  const config = {
    // 基本価格設定
    basePrice: basePrice.toFixed(0),

    // プロモーション設定
    promotionActive: enableTimeSale || enableGroupBuy,
    promotionType: enableTimeSale ? 'TIMESALE' : (enableGroupBuy ? 'GROUPBUY' : 'NONE'),
  };

  // タイムセール設定
  if (enableTimeSale && salePrice) {
    const validatedPrice = validateSalePrice(salePrice);
    config.salePrice = validatedPrice.toFixed(0);
    config.discountRate = ((1 - validatedPrice / basePrice) * 100).toFixed(1);
    config.saleStartDate = saleStartDate || new Date().toISOString();
    config.saleEndDate = saleEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  // 共同購入設定
  if (enableGroupBuy) {
    config.groupBuyMinQuantity = promotionConfig.minQuantity || 2;
    config.groupBuyMaxQuantity = promotionConfig.maxQuantity || 10;
    config.groupBuyDiscountRate = promotionConfig.groupDiscountRate || 10; // デフォルト10%割引
  }

  return config;
}

/**
 * Qoo10プロモーションの自動登録・解除
 * @param {string} listingId - Qoo10リスティングID
 * @param {object} promotionConfig - プロモーション設定
 * @param {string} action - 'register' または 'cancel'
 * @returns {Promise<object>} API応答
 */
async function manageQoo10Promotion(listingId, promotionConfig, action = 'register') {
  const apiEndpoint = action === 'register'
    ? '/api/qoo10/promotion/register'
    : '/api/qoo10/promotion/cancel';

  try {
    // APIコールのシミュレーション
    console.log(`🎯 Qoo10 Promotion ${action}: ${listingId}`);
    console.log('  プロモーション設定:', JSON.stringify(promotionConfig, null, 2));

    // 実際のAPI実装では以下のようなHTTPリクエストを送信
    // const response = await fetch(apiEndpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ listingId, ...promotionConfig }),
    // });

    // シミュレーション応答
    return {
      success: true,
      listingId,
      promotionId: `PROMO-${Math.floor(Math.random() * 99999)}`,
      message: `Promotion ${action} successful`,
    };
  } catch (error) {
    console.error(`❌ Qoo10 Promotion ${action} failed:`, error.message);
    throw error;
  }
}

// ==========================================
// T24: Coupang 利益保証機能
// ==========================================

/**
 * Coupangの複雑な手数料構造を考慮した最終価格計算
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} categoryId - Coupangカテゴリー ID
 * @param {number} minProfitMargin - 最低利益率 (デフォルト: 10%)
 * @returns {object} 価格計算結果
 */
function calculateCoupangPricing(masterListing, categoryId, minProfitMargin = 0.10) {
  // カテゴリー別手数料取得
  const feeStructure = COUPANG_FEE_STRUCTURE[categoryId] || COUPANG_FEE_STRUCTURE['DEFAULT'];

  const baseCost = masterListing.base_cost_krw || masterListing.base_cost || 10000; // KRW
  const targetPrice = masterListing.final_price_krw || baseCost * 1.5;

  // 手数料計算
  const commissionFee = Math.max(targetPrice * feeStructure.commission, feeStructure.minFee);
  const shippingFee = feeStructure.shipping;
  const totalFees = commissionFee + shippingFee;

  // 利益計算
  const netRevenue = targetPrice - totalFees;
  const profit = netRevenue - baseCost;
  const profitMargin = profit / targetPrice;

  // 利益保証チェック
  if (profitMargin < minProfitMargin) {
    console.warn(
      `⚠️ Coupang: カテゴリ ${categoryId} の現在価格 ${targetPrice} KRW では ` +
      `最低利益率 ${minProfitMargin * 100}% を確保できません。` +
      `(現在の利益率: ${(profitMargin * 100).toFixed(2)}%)`
    );

    // 最低利益を確保する価格に自動調整
    // 計算式: 必要価格 = (コスト + 配送料) / (1 - 手数料率 - 最低利益率)
    const requiredPrice = (baseCost + shippingFee) / (1 - feeStructure.commission - minProfitMargin);

    return {
      originalPrice: targetPrice,
      adjustedPrice: Math.ceil(requiredPrice),
      baseCost,
      fees: {
        commission: Math.max(requiredPrice * feeStructure.commission, feeStructure.minFee),
        shipping: shippingFee,
        total: Math.max(requiredPrice * feeStructure.commission, feeStructure.minFee) + shippingFee,
      },
      profit: requiredPrice - (baseCost + shippingFee + requiredPrice * feeStructure.commission),
      profitMargin: minProfitMargin,
      adjusted: true,
      warning: `価格を ${targetPrice} KRW から ${Math.ceil(requiredPrice)} KRW に調整しました`,
    };
  }

  return {
    originalPrice: targetPrice,
    adjustedPrice: targetPrice,
    baseCost,
    fees: {
      commission: commissionFee,
      shipping: shippingFee,
      total: totalFees,
    },
    profit,
    profitMargin,
    adjusted: false,
  };
}

// ==========================================
// T25: Shopee 複数市場セグメントマッピング
// ==========================================

/**
 * Shopee複数市場への同時出品ペイロード生成
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string[]} targetMarkets - ターゲット市場コード配列 (例: ['SG', 'PH', 'TW'])
 * @returns {object[]} 各市場向けペイロード配列
 */
function generateShopeeMultiMarketPayloads(masterListing, targetMarkets = ['SG', 'PH', 'TW']) {
  const payloads = [];

  for (const marketCode of targetMarkets) {
    const marketConfig = SHOPEE_MARKET_CONFIG[marketCode];

    if (!marketConfig) {
      console.warn(`⚠️ Shopee: 未サポートの市場コード ${marketCode} をスキップします`);
      continue;
    }

    // 為替レート取得（マスターデータから）
    const fxRate = masterListing.fx_rates?.[marketConfig.fxKey] || 1.0;
    const basePriceUSD = masterListing.final_price_usd || masterListing.final_price;
    const localPrice = basePriceUSD * fxRate;

    // VAT込み価格計算
    const priceWithVAT = localPrice * (1 + marketConfig.vatRate);

    const payload = {
      marketCode,
      currency: marketConfig.currency,

      // 基本情報
      item_title: masterListing.title,
      item_description: masterListing.description_html,
      quantity: masterListing.inventory_count,

      // 価格設定
      price: priceWithVAT.toFixed(2),
      original_price: localPrice.toFixed(2), // VAT抜き元価格を記録

      // 配送設定
      shipping_channel_id: marketConfig.shippingProfileId,
      country_of_origin: masterListing.origin_country,

      // DDP/HSコード
      customs_tariff_code: masterListing.hs_code_final,

      // T26: モバイル最適化画像設定（後で処理）
      image_urls: masterListing.image_urls,
      preferred_image_ratio: marketConfig.preferredImageRatio,

      // メタデータ
      marketplace: 'Shopee',
      created_at: new Date().toISOString(),
    };

    payloads.push(payload);
  }

  return payloads;
}

// ==========================================
// T26: モバイル最適化画像処理
// ==========================================

/**
 * Shopee用の画像を指定された比率に最適化
 * 注: 実際の画像処理にはSharpやCanvas APIなどを使用
 * ここでは処理ロジックの概念を示す
 *
 * @param {string[]} imageUrls - 元画像URL配列
 * @param {string} targetRatio - ターゲット比率 ('1:1', '3:4')
 * @returns {Promise<string[]>} 最適化された画像URL配列
 */
async function optimizeImagesForMobile(imageUrls, targetRatio = '1:1') {
  console.log(`📸 画像最適化開始: ${imageUrls.length} 枚を ${targetRatio} に変換`);

  const optimizedUrls = [];

  for (const url of imageUrls) {
    try {
      // 実際の実装では以下のような処理を行う:
      // 1. 画像をダウンロード
      // 2. 画像の現在の寸法を取得
      // 3. ターゲット比率に合わせてクロップまたはリサイズ
      // 4. 最適化された画像をアップロード
      // 5. 新しいURLを返す

      // シミュレーション
      const optimizedUrl = await simulateImageOptimization(url, targetRatio);
      optimizedUrls.push(optimizedUrl);

    } catch (error) {
      console.error(`❌ 画像最適化失敗 (${url}):`, error.message);
      // エラー時は元画像をそのまま使用
      optimizedUrls.push(url);
    }
  }

  console.log(`✅ 画像最適化完了: ${optimizedUrls.length} 枚`);
  return optimizedUrls;
}

/**
 * 画像最適化のシミュレーション関数
 * 実際の実装では Sharp または Canvas API を使用
 */
async function simulateImageOptimization(url, targetRatio) {
  // シミュレーション: URLに最適化パラメータを付加
  await new Promise(resolve => setTimeout(resolve, 50)); // 処理時間をシミュレート

  const optimizationParams = {
    '1:1': 'square',
    '3:4': 'portrait',
    '4:3': 'landscape',
  };

  const param = optimizationParams[targetRatio] || 'square';

  // 実際にはCloudinaryやS3など画像処理サービスのURLを返す
  return `${url}?optimize=${param}&ratio=${targetRatio.replace(':', 'x')}`;
}

// ==========================================
// T27: Amazon DDP/HSコード統合
// ==========================================

/**
 * AmazonへのDDP価格とHSコードの統合マッピング
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetRegion - Amazonリージョンコード (例: 'US', 'JP')
 * @param {string} fulfillmentType - 'FBA' または 'FBM'
 * @returns {object} Amazon Selling Partner API準拠ペイロード
 */
function mapToAmazonWithDDP(masterListing, targetRegion, fulfillmentType = 'FBM') {
  // 既存のAmazonGlobalMapperの拡張
  const regionConfig = {
    US: { currency: 'USD', marketplaceId: 'ATVPDKIKX0DER' },
    CA: { currency: 'CAD', marketplaceId: 'A2EUQ1WTGCTBG2' },
    UK: { currency: 'GBP', marketplaceId: 'A1F83G8C2ARO7P' },
    DE: { currency: 'EUR', marketplaceId: 'A1PA6795UKMFR9' },
    JP: { currency: 'JPY', marketplaceId: 'A1VC38T7YXB528' },
    AU: { currency: 'AUD', marketplaceId: 'A39IBJ37TRP1C6' },
  }[targetRegion];

  if (!regionConfig) {
    throw new Error(`Unsupported Amazon region: ${targetRegion}`);
  }

  // 価格換算
  const fxRate = masterListing.fx_rates?.[regionConfig.currency] || 1.0;
  const basePriceUSD = masterListing.final_price_usd || masterListing.final_price;
  const localPrice = basePriceUSD * fxRate;

  // T27: DDP価格の計算
  // DDPには関税、VAT、配送料がすべて含まれる
  const customsDuty = localPrice * 0.05; // 仮定: 5%の関税
  const vat = localPrice * 0.10; // 仮定: 10%のVAT
  const ddpPrice = localPrice + customsDuty + vat;

  const payload = {
    // 基本情報
    sku: `${masterListing.master_id}-${targetRegion}`,
    title: masterListing.title,
    description: masterListing.description_html,

    // 価格設定
    marketplaceId: regionConfig.marketplaceId,
    currency: regionConfig.currency,
    standardPrice: ddpPrice.toFixed(2),

    // フルフィルメント設定
    fulfillmentChannel: fulfillmentType === 'FBA' ? 'AMAZON_NA' : 'DEFAULT',
    quantity: masterListing.inventory_count,

    // T27: DDP/HSコード情報
    productTaxCode: masterListing.hs_code_final,
    hsCode: masterListing.hs_code_final,
    countryOfOrigin: masterListing.origin_country,

    // DDP価格の内訳（Amazonの透明性要件に対応）
    pricing_breakdown: {
      base_price: localPrice.toFixed(2),
      customs_duty: customsDuty.toFixed(2),
      vat: vat.toFixed(2),
      total_ddp_price: ddpPrice.toFixed(2),
    },

    // 画像
    mainImage: masterListing.image_urls[0],
    otherImages: masterListing.image_urls.slice(1),

    // メタデータ
    isDDP: true,
    calculatedAt: new Date().toISOString(),
  };

  return payload;
}

// ==========================================
// 統合出品関数
// ==========================================

/**
 * アジア主要モールへの統合出品実行
 * @param {object} masterListing - マスターリスティングデータ
 * @param {object} config - 出品設定
 * @returns {Promise<object>} 出品結果
 */
async function publishToAsiaMarketplaces(masterListing, config = {}) {
  const {
    enableQoo10 = true,
    enableCoupang = true,
    enableShopee = true,
    enableAmazon = true,
    qoo10Promotion = {},
    coupangCategory = 'DEFAULT',
    shopeeMarkets = ['SG', 'PH', 'TW'],
    amazonRegions = ['JP', 'US'],
    amazonFulfillment = 'FBM',
  } = config;

  const results = {
    qoo10: null,
    coupang: null,
    shopee: [],
    amazon: [],
    summary: {
      total: 0,
      success: 0,
      failed: 0,
    },
  };

  console.log('\n🚀 アジア主要モールへの統合出品を開始します...\n');

  // T23: Qoo10 出品
  if (enableQoo10) {
    try {
      console.log('📦 Qoo10 出品処理中...');
      const promotionConfig = buildQoo10PromotionConfig(masterListing, qoo10Promotion);

      // ペイロード生成（既存のQoo10Mapperを使用し、プロモーション設定を追加）
      const qoo10Payload = {
        ...require('./qoo10/Qoo10Mapper').mapToQoo10Payload(masterListing),
        ...promotionConfig,
      };

      results.qoo10 = {
        status: 'SUCCESS',
        payload: qoo10Payload,
        promotion: promotionConfig.promotionActive ? 'ACTIVE' : 'NONE',
      };
      results.summary.success++;
      console.log('✅ Qoo10 出品成功');

    } catch (error) {
      results.qoo10 = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      console.error('❌ Qoo10 出品失敗:', error.message);
    }
    results.summary.total++;
  }

  // T24: Coupang 出品
  if (enableCoupang) {
    try {
      console.log('📦 Coupang 出品処理中...');
      const pricingResult = calculateCoupangPricing(masterListing, coupangCategory);

      if (pricingResult.adjusted) {
        console.log(`⚠️ ${pricingResult.warning}`);
      }

      // ペイロード生成
      const coupangPayload = {
        ...require('./coupang/CoupangMapper').mapToCoupangPayload(masterListing),
        sellingPrice: pricingResult.adjustedPrice,
        pricing_breakdown: pricingResult,
      };

      results.coupang = {
        status: 'SUCCESS',
        payload: coupangPayload,
        pricing: pricingResult,
      };
      results.summary.success++;
      console.log('✅ Coupang 出品成功');

    } catch (error) {
      results.coupang = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      console.error('❌ Coupang 出品失敗:', error.message);
    }
    results.summary.total++;
  }

  // T25 & T26: Shopee 複数市場出品
  if (enableShopee) {
    console.log(`📦 Shopee 出品処理中 (${shopeeMarkets.length} 市場)...`);
    const shopeePayloads = generateShopeeMultiMarketPayloads(masterListing, shopeeMarkets);

    for (const payload of shopeePayloads) {
      try {
        // T26: 画像最適化
        const optimizedImages = await optimizeImagesForMobile(
          payload.image_urls,
          payload.preferred_image_ratio
        );
        payload.image_urls = optimizedImages;

        results.shopee.push({
          status: 'SUCCESS',
          market: payload.marketCode,
          payload,
        });
        results.summary.success++;
        console.log(`✅ Shopee ${payload.marketCode} 出品成功`);

      } catch (error) {
        results.shopee.push({
          status: 'FAILED',
          market: payload.marketCode,
          error: error.message,
        });
        results.summary.failed++;
        console.error(`❌ Shopee ${payload.marketCode} 出品失敗:`, error.message);
      }
      results.summary.total++;
    }
  }

  // T27: Amazon DDP統合
  if (enableAmazon) {
    console.log(`📦 Amazon 出品処理中 (${amazonRegions.length} リージョン)...`);

    for (const region of amazonRegions) {
      try {
        const amazonPayload = mapToAmazonWithDDP(
          masterListing,
          region,
          amazonFulfillment
        );

        results.amazon.push({
          status: 'SUCCESS',
          region,
          payload: amazonPayload,
        });
        results.summary.success++;
        console.log(`✅ Amazon ${region} 出品成功`);

      } catch (error) {
        results.amazon.push({
          status: 'FAILED',
          region,
          error: error.message,
        });
        results.summary.failed++;
        console.error(`❌ Amazon ${region} 出品失敗:`, error.message);
      }
      results.summary.total++;
    }
  }

  // サマリー出力
  console.log('\n📊 出品結果サマリー:');
  console.log(`  総出品数: ${results.summary.total}`);
  console.log(`  成功: ${results.summary.success}`);
  console.log(`  失敗: ${results.summary.failed}`);
  console.log(`  成功率: ${((results.summary.success / results.summary.total) * 100).toFixed(1)}%\n`);

  return results;
}

// ==========================================
// エクスポート
// ==========================================

module.exports = {
  // T23: Qoo10
  buildQoo10PromotionConfig,
  manageQoo10Promotion,

  // T24: Coupang
  calculateCoupangPricing,
  COUPANG_FEE_STRUCTURE,

  // T25: Shopee
  generateShopeeMultiMarketPayloads,
  SHOPEE_MARKET_CONFIG,

  // T26: 画像最適化
  optimizeImagesForMobile,

  // T27: Amazon DDP
  mapToAmazonWithDDP,

  // 統合出品
  publishToAsiaMarketplaces,
};
