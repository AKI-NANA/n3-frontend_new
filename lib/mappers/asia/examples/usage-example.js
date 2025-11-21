// Phase 8: AsiaPublisher 使用例
// このファイルは、アジア主要モール統合の実際の使用方法を示します

const AsiaPublisher = require('../AsiaPublisher');
const Hub = require('../../hub/IntegratedPublisherHub');

// ==========================================
// サンプルデータ: 日本発のトレーディングカード
// ==========================================

const sampleListing = {
  master_id: 'CARD-JP-2025-001',
  title: 'レア ポケモンカード 初版 ピカチュウ PSA10 鑑定済み',
  description_html: `
    <h2>商品説明</h2>
    <p>希少な初版ポケモンカード ピカチュウです。PSA10グレード鑑定済みの最高品質品です。</p>
    <ul>
      <li>状態: PSA10 (Gem Mint)</li>
      <li>鑑定番号: PSA-12345678</li>
      <li>発行年: 1996年</li>
      <li>言語: 日本語</li>
    </ul>
  `,
  inventory_count: 1,
  image_urls: [
    'https://example.com/pikachu-front.jpg',
    'https://example.com/pikachu-back.jpg',
    'https://example.com/psa-cert.jpg',
  ],

  // コストと価格データ
  base_cost: 5000,          // 仕入れコスト (USD)
  base_cost_jpy: 750000,    // 仕入れコスト (JPY)
  base_cost_krw: 6500000,   // 仕入れコスト (KRW)

  final_price: 10000,       // 基本販売価格 (USD)
  final_price_usd: 10000,
  final_price_jpy: 1500000, // 日本円販売価格
  final_price_krw: 13000000, // 韓国ウォン販売価格

  // DDP/国際配送情報
  hs_code_final: '9504.40', // トレーディングカードのHSコード
  origin_country: 'Japan',

  // 為替レート（2025年11月時点の想定レート）
  fx_rates: {
    USD: 1.0,
    JPY: 150.0,
    KRW: 1300.0,
    SGD: 1.35,
    PHP: 56.0,
    TWD: 32.0,
    MYR: 4.7,
    THB: 36.0,
    VND: 25000.0,
    GBP: 0.79,
    EUR: 0.93,
    AUD: 1.53,
    CAD: 1.37,
  },

  // 画像寸法メタデータ（T26用）
  image_dimensions: {
    'https://example.com/pikachu-front.jpg': '4:3',
    'https://example.com/pikachu-back.jpg': '4:3',
    'https://example.com/psa-cert.jpg': '1:1',
  },
};

// ==========================================
// 例1: Qoo10のみへの出品（タイムセール付き）
// ==========================================

async function example1_Qoo10TimeSale() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例1: Qoo10タイムセール出品');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = await AsiaPublisher.publishToAsiaMarketplaces(sampleListing, {
    enableQoo10: true,
    enableCoupang: false,
    enableShopee: false,
    enableAmazon: false,

    qoo10Promotion: {
      enableTimeSale: true,
      salePrice: 1350000,  // 10%オフ
      saleStartDate: '2025-11-25T00:00:00Z',
      saleEndDate: '2025-11-30T23:59:59Z',
      minProfitMargin: 0.10, // 最低10%の利益を確保
    },
  });

  console.log('✅ Qoo10出品結果:');
  console.log(JSON.stringify(results.qoo10, null, 2));
}

// ==========================================
// 例2: Coupangへの出品（利益保証付き）
// ==========================================

async function example2_CoupangProfitGuarantee() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例2: Coupang利益保証出品');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // まず、価格計算を確認
  const pricingResult = AsiaPublisher.calculateCoupangPricing(
    sampleListing,
    'C003', // ホビー・コレクティブル（手数料15%）
    0.15    // 最低利益率15%
  );

  console.log('💰 Coupang価格計算結果:');
  console.log(`  元の価格: ${pricingResult.originalPrice.toLocaleString()} KRW`);
  console.log(`  調整後価格: ${pricingResult.adjustedPrice.toLocaleString()} KRW`);
  console.log(`  手数料合計: ${pricingResult.fees.total.toLocaleString()} KRW`);
  console.log(`  利益: ${pricingResult.profit.toLocaleString()} KRW`);
  console.log(`  利益率: ${(pricingResult.profitMargin * 100).toFixed(2)}%`);

  if (pricingResult.adjusted) {
    console.log(`  ⚠️ 警告: ${pricingResult.warning}`);
  }

  // 出品実行
  const results = await AsiaPublisher.publishToAsiaMarketplaces(sampleListing, {
    enableQoo10: false,
    enableCoupang: true,
    enableShopee: false,
    enableAmazon: false,

    coupangCategory: 'C003',
    coupangMinProfitMargin: 0.15,
  });

  console.log('\n✅ Coupang出品結果:');
  console.log(JSON.stringify(results.coupang, null, 2));
}

// ==========================================
// 例3: Shopee複数市場への同時出品
// ==========================================

async function example3_ShopeeMultiMarket() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例3: Shopee 複数市場同時出品');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = await AsiaPublisher.publishToAsiaMarketplaces(sampleListing, {
    enableQoo10: false,
    enableCoupang: false,
    enableShopee: true,
    enableAmazon: false,

    shopeeMarkets: ['SG', 'PH', 'TW', 'MY', 'TH'],
  });

  console.log('✅ Shopee出品結果:');
  results.shopee.forEach(result => {
    if (result.status === 'SUCCESS') {
      console.log(`\n  📍 ${result.market}市場:`);
      console.log(`     価格: ${result.payload.price} ${result.payload.currency}`);
      console.log(`     配送プロファイル: ${result.payload.shipping_channel_id}`);
      console.log(`     画像比率: ${result.payload.preferred_image_ratio}`);
      console.log(`     最適化画像数: ${result.payload.image_urls.length}`);
    } else {
      console.log(`\n  ❌ ${result.market}市場: ${result.error}`);
    }
  });

  console.log(`\n  合計: ${results.shopee.length} 市場に出品`);
}

// ==========================================
// 例4: Amazon グローバル展開（DDP価格）
// ==========================================

async function example4_AmazonGlobalDDP() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例4: Amazon グローバル展開（DDP価格）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = await AsiaPublisher.publishToAsiaMarketplaces(sampleListing, {
    enableQoo10: false,
    enableCoupang: false,
    enableShopee: false,
    enableAmazon: true,

    amazonRegions: ['JP', 'US', 'UK', 'DE'],
    amazonFulfillment: 'FBM', // Fulfilled by Merchant (自社配送)
  });

  console.log('✅ Amazon出品結果:');
  results.amazon.forEach(result => {
    if (result.status === 'SUCCESS') {
      const payload = result.payload;
      console.log(`\n  🌎 ${result.region}リージョン:`);
      console.log(`     価格: ${payload.standardPrice} ${payload.currency}`);
      console.log(`     DDP価格内訳:`);
      console.log(`       基本価格: ${payload.pricing_breakdown.base_price} ${payload.currency}`);
      console.log(`       関税: ${payload.pricing_breakdown.customs_duty} ${payload.currency}`);
      console.log(`       VAT: ${payload.pricing_breakdown.vat} ${payload.currency}`);
      console.log(`       合計: ${payload.pricing_breakdown.total_ddp_price} ${payload.currency}`);
      console.log(`     HSコード: ${payload.hsCode}`);
      console.log(`     配送: ${payload.fulfillmentChannel}`);
    } else {
      console.log(`\n  ❌ ${result.region}リージョン: ${result.error}`);
    }
  });

  console.log(`\n  合計: ${results.amazon.length} リージョンに出品`);
}

// ==========================================
// 例5: 全モール一括出品（フル統合）
// ==========================================

async function example5_AllMarkets() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例5: 全アジアモール一括出品');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = await AsiaPublisher.publishToAsiaMarketplaces(sampleListing, {
    enableQoo10: true,
    enableCoupang: true,
    enableShopee: true,
    enableAmazon: true,

    // Qoo10: 共同購入キャンペーン
    qoo10Promotion: {
      enableGroupBuy: true,
      minQuantity: 2,
      maxQuantity: 5,
      groupDiscountRate: 10,
      minProfitMargin: 0.08,
    },

    // Coupang: 利益率15%確保
    coupangCategory: 'C003',
    coupangMinProfitMargin: 0.15,

    // Shopee: 主要6市場
    shopeeMarkets: ['SG', 'PH', 'TW', 'MY', 'TH', 'VN'],

    // Amazon: 日米英独の4大市場
    amazonRegions: ['JP', 'US', 'UK', 'DE'],
    amazonFulfillment: 'FBM',
  });

  // サマリー表示
  console.log('📊 統合出品サマリー:');
  console.log(`  総出品数: ${results.summary.total}`);
  console.log(`  成功: ${results.summary.success} ✅`);
  console.log(`  失敗: ${results.summary.failed} ❌`);
  console.log(`  成功率: ${((results.summary.success / results.summary.total) * 100).toFixed(1)}%`);

  console.log('\n📦 モール別詳細:');
  console.log(`  Qoo10: ${results.qoo10?.status || 'N/A'}`);
  console.log(`  Coupang: ${results.coupang?.status || 'N/A'}`);
  console.log(`  Shopee: ${results.shopee.filter(r => r.status === 'SUCCESS').length}/${results.shopee.length} 市場成功`);
  console.log(`  Amazon: ${results.amazon.filter(r => r.status === 'SUCCESS').length}/${results.amazon.length} リージョン成功`);

  return results;
}

// ==========================================
// 例6: IntegratedPublisherHubを使った全市場出品
// ==========================================

async function example6_GlobalIntegration() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例6: グローバル全市場統合出品');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = await Hub.publishToAllMarkets(sampleListing, {
    // アジア市場を含める
    includeAsia: true,
    asiaConfig: {
      enableQoo10: true,
      enableCoupang: true,
      enableShopee: true,
      enableAmazon: true,
      shopeeMarkets: ['SG', 'PH', 'TW'],
      amazonRegions: ['JP', 'US'],
    },

    // 高級品市場は除外（トレーディングカードには不向き）
    includeLuxury: false,

    // ホビー・コレクティブル市場を含める
    includeHobby: true,
  });

  console.log('🌏 グローバル統合出品完了:');
  console.log(`  アジア市場: ${results.asia ? '✅ 完了' : '⏭️ スキップ'}`);
  console.log(`  高級品市場: ${results.luxury ? '✅ 完了' : '⏭️ スキップ'}`);
  console.log(`  ホビー市場: ${results.hobby ? '✅ 完了' : '⏭️ スキップ'}`);
  console.log(`  エラー数: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️ エラー詳細:');
    results.errors.forEach(err => {
      console.log(`  - ${err.group}: ${err.error}`);
    });
  }
}

// ==========================================
// 例7: 画像最適化の独立使用
// ==========================================

async function example7_ImageOptimization() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('例7: モバイル画像最適化');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const imageUrls = sampleListing.image_urls;

  // 正方形画像に最適化（Shopee SG, TW, MY用）
  console.log('📸 正方形（1:1）画像生成中...');
  const squareImages = await AsiaPublisher.optimizeImagesForMobile(imageUrls, '1:1');
  console.log('✅ 正方形画像:');
  squareImages.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));

  // 縦長画像に最適化（Shopee PH, TH用）
  console.log('\n📸 縦長（3:4）画像生成中...');
  const portraitImages = await AsiaPublisher.optimizeImagesForMobile(imageUrls, '3:4');
  console.log('✅ 縦長画像:');
  portraitImages.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
}

// ==========================================
// メイン実行
// ==========================================

async function runAllExamples() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     Phase 8: アジア主要モール統合 - 使用例デモ              ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // 各例を順番に実行
    await example1_Qoo10TimeSale();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example2_CoupangProfitGuarantee();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example3_ShopeeMultiMarket();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example4_AmazonGlobalDDP();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example5_AllMarkets();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example6_GlobalIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example7_ImageOptimization();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║              🎉 全ての例を実行完了しました！ 🎉             ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

// ==========================================
// 個別例の実行（コメントを外して使用）
// ==========================================

// 単一の例を実行する場合:
// example1_Qoo10TimeSale();
// example2_CoupangProfitGuarantee();
// example3_ShopeeMultiMarket();
// example4_AmazonGlobalDDP();
// example5_AllMarkets();
// example6_GlobalIntegration();
// example7_ImageOptimization();

// 全ての例を実行する場合:
// runAllExamples();

// ==========================================
// エクスポート（他のファイルから使用する場合）
// ==========================================

module.exports = {
  example1_Qoo10TimeSale,
  example2_CoupangProfitGuarantee,
  example3_ShopeeMultiMarket,
  example4_AmazonGlobalDDP,
  example5_AllMarkets,
  example6_GlobalIntegration,
  example7_ImageOptimization,
  runAllExamples,
  sampleListing,
};

// 直接実行された場合（node usage-example.js）
if (require.main === module) {
  runAllExamples();
}
