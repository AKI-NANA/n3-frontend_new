# Phase 8 拡張: アジア主要モール統合

## 📋 概要

このモジュールは、アジアのローカル市場で必須となる4つの主要モールへの最適化された出品ロジックを提供します。

### 対応モール

| モール名 | 主要市場 | 特徴と出品戦略 |
|---------|---------|--------------|
| **Qoo10** | 日本、シンガポール | 共同購入、タイムセールが強力。価格変動とプロモーションへの迅速な対応が必須 |
| **Shopee** | 東南アジア全域 | モバイルファースト、チャット対応が重要。各国市場ごとにローカライズされた配送設定が必要 |
| **Coupang** | 韓国 | ロケット配送（自社配送網）と手数料構造が複雑。価格競争が激しいため、利益率の自動監視が重要 |
| **Amazon** | グローバル、日本 | FBA/FBMの切り替え。HSコード/DDP価格をAmazonの形式にマッピング |

---

## 🎯 実装機能

### T23: Qoo10 共同購入/セールAPI対応

**目的**: Qoo10の売上を最大化する価格戦略の自動化

**機能**:
- Qoo10のAPIを通じて、リスティングを共同購入やタイムセールに自動登録・解除
- セール期間中の価格（一時的な赤字許容ライン）をシステムで設定可能
- 最低利益率を保証する価格自動調整機能

**使用例**:

```javascript
const AsiaPublisher = require('./lib/mappers/asia/AsiaPublisher');

// プロモーション設定の構築
const promotionConfig = AsiaPublisher.buildQoo10PromotionConfig(masterListing, {
  enableTimeSale: true,
  salePrice: 14000,
  saleStartDate: '2025-11-25T00:00:00Z',
  saleEndDate: '2025-12-01T23:59:59Z',
  minProfitMargin: 0.05, // 最低5%の利益を確保
});

// プロモーションの登録
await AsiaPublisher.manageQoo10Promotion(
  'QOO10-LISTING-123',
  promotionConfig,
  'register'
);

// プロモーションの解除
await AsiaPublisher.manageQoo10Promotion(
  'QOO10-LISTING-123',
  promotionConfig,
  'cancel'
);
```

---

### T24: Coupang 複雑な手数料構造対応

**目的**: 利益保証。激しい価格競争下での赤字出品を未然に防止

**機能**:
- Coupangのカテゴリー別/販売形態別の複雑な手数料率を計算
- 最終価格設定時に最低利益を確実に保証
- 価格が低すぎる場合、自動で最適価格に調整

**カテゴリー別手数料率**:

| カテゴリーID | 手数料率 | 最低手数料 | 配送手数料 |
|------------|---------|-----------|-----------|
| C001 (電子機器) | 8% | 500 KRW | 2500 KRW |
| C002 (ファッション) | 12% | 300 KRW | 2000 KRW |
| C003 (ホビー・コレクティブル) | 15% | 200 KRW | 1500 KRW |
| C004 (ホーム・リビング) | 10% | 400 KRW | 2200 KRW |
| C005 (ビューティー) | 13% | 350 KRW | 1800 KRW |

**使用例**:

```javascript
// Coupang価格計算
const pricingResult = AsiaPublisher.calculateCoupangPricing(
  masterListing,
  'C003', // ホビー・コレクティブル
  0.10    // 最低利益率10%
);

console.log(pricingResult);
/*
{
  originalPrice: 150000,
  adjustedPrice: 165000,  // 自動調整後
  baseCost: 75000,
  fees: {
    commission: 24750,
    shipping: 1500,
    total: 26250
  },
  profit: 63750,
  profitMargin: 0.10,
  adjusted: true,
  warning: "価格を 150000 KRW から 165000 KRW に調整しました"
}
*/
```

---

### T25: Shopee 複数市場セグメントマッピング

**目的**: 地域分散と各国の配送要件への確実な対応

**機能**:
- Shopee Japanから出品する際、ターゲットとなる各国ごとに異なる配送オプションと価格を設定
- 各市場の通貨とVAT率に対応
- 為替変動を考慮した価格計算

**対応市場**:

| 市場コード | 通貨 | VAT率 | 推奨画像比率 |
|----------|------|-------|-------------|
| SG (シンガポール) | SGD | 7% | 1:1 |
| PH (フィリピン) | PHP | 12% | 3:4 |
| TW (台湾) | TWD | 5% | 1:1 |
| MY (マレーシア) | MYR | 6% | 1:1 |
| TH (タイ) | THB | 7% | 3:4 |
| VN (ベトナム) | VND | 10% | 1:1 |

**使用例**:

```javascript
// 複数市場へのペイロード生成
const shopeePayloads = AsiaPublisher.generateShopeeMultiMarketPayloads(
  masterListing,
  ['SG', 'PH', 'TW', 'MY'] // ターゲット市場
);

shopeePayloads.forEach(payload => {
  console.log(`${payload.marketCode}: ${payload.price} ${payload.currency}`);
});

/*
SG: 147.88 SGD
PH: 6160.00 PHP
TW: 3622.50 TWD
MY: 535.60 MYR
*/
```

---

### T26: モバイル最適化画像強制

**目的**: モバイルSEOの最適化

**機能**:
- Shopeeが重視する縦長（3:4）または正方形（1:1）画像を生成
- システムが指定された比率で画像を自動トリミング
- 最適化された画像URLを返却

**使用例**:

```javascript
// 画像の最適化
const imageUrls = [
  'https://example.com/product1.jpg',
  'https://example.com/product2.jpg',
];

const optimizedImages = await AsiaPublisher.optimizeImagesForMobile(
  imageUrls,
  '1:1' // または '3:4'
);

console.log(optimizedImages);
/*
[
  'https://example.com/product1.jpg?optimize=square&ratio=1x1',
  'https://example.com/product2.jpg?optimize=square&ratio=1x1'
]
*/
```

**注意**: 実際の実装では、Sharp や Canvas API などの画像処理ライブラリを使用して、画像を物理的にトリミング・リサイズします。

---

### T27: Amazon FBA/FBM DDP価格マッピング

**目的**: Amazonの国際販売（Amazon Global Selling）における関税トラブルを予防

**機能**:
- 確定したHSコードとDDP価格をAmazonのAPIにマッピング
- FBA（Fulfilled by Amazon）とFBM（Fulfilled by Merchant）の切り替え対応
- 関税、VAT、配送料を含むDDP価格の自動計算

**対応リージョン**:

| リージョン | 通貨 | マーケットプレイスID |
|----------|------|-------------------|
| US | USD | ATVPDKIKX0DER |
| CA | CAD | A2EUQ1WTGCTBG2 |
| UK | GBP | A1F83G8C2ARO7P |
| DE | EUR | A1PA6795UKMFR9 |
| JP | JPY | A1VC38T7YXB528 |
| AU | AUD | A39IBJ37TRP1C6 |

**使用例**:

```javascript
// Amazon DDP統合ペイロード生成
const amazonPayload = AsiaPublisher.mapToAmazonWithDDP(
  masterListing,
  'US',  // リージョン
  'FBM'  // または 'FBA'
);

console.log(amazonPayload);
/*
{
  sku: 'TEST-001-US',
  title: 'Japanese Premium Trading Cards Set',
  marketplaceId: 'ATVPDKIKX0DER',
  currency: 'USD',
  standardPrice: '115.00',
  fulfillmentChannel: 'DEFAULT',
  hsCode: '9504.40',
  countryOfOrigin: 'Japan',
  isDDP: true,
  pricing_breakdown: {
    base_price: '100.00',
    customs_duty: '5.00',
    vat: '10.00',
    total_ddp_price: '115.00'
  },
  ...
}
*/
```

---

## 🚀 統合出品の使い方

### 基本的な使い方

```javascript
const AsiaPublisher = require('./lib/mappers/asia/AsiaPublisher');

// マスターリスティングデータ
const masterListing = {
  master_id: 'PROD-001',
  title: 'Premium Japanese Trading Cards',
  description_html: '<p>Authenticated and graded.</p>',
  inventory_count: 10,
  image_urls: ['https://example.com/image1.jpg'],

  // 価格データ
  final_price_usd: 100,
  final_price_jpy: 15000,
  final_price_krw: 150000,

  // DDP情報
  hs_code_final: '9504.40',
  origin_country: 'Japan',

  // 為替レート
  fx_rates: {
    USD: 1.0,
    JPY: 150.0,
    KRW: 1300.0,
    SGD: 1.35,
    PHP: 55.0,
    TWD: 31.5,
    // ... 他の通貨
  },
};

// アジア主要モールへの統合出品
const results = await AsiaPublisher.publishToAsiaMarketplaces(masterListing, {
  // モール選択
  enableQoo10: true,
  enableCoupang: true,
  enableShopee: true,
  enableAmazon: true,

  // T23: Qoo10プロモーション設定
  qoo10Promotion: {
    enableTimeSale: true,
    salePrice: 14000,
    minProfitMargin: 0.05,
  },

  // T24: Coupang設定
  coupangCategory: 'C003',

  // T25: Shopee設定
  shopeeMarkets: ['SG', 'PH', 'TW', 'MY'],

  // T27: Amazon設定
  amazonRegions: ['JP', 'US', 'UK'],
  amazonFulfillment: 'FBM',
});

console.log(results);
/*
{
  qoo10: { status: 'SUCCESS', payload: {...}, promotion: 'ACTIVE' },
  coupang: { status: 'SUCCESS', payload: {...}, pricing: {...} },
  shopee: [
    { status: 'SUCCESS', market: 'SG', payload: {...} },
    { status: 'SUCCESS', market: 'PH', payload: {...} },
    { status: 'SUCCESS', market: 'TW', payload: {...} },
    { status: 'SUCCESS', market: 'MY', payload: {...} }
  ],
  amazon: [
    { status: 'SUCCESS', region: 'JP', payload: {...} },
    { status: 'SUCCESS', region: 'US', payload: {...} },
    { status: 'SUCCESS', region: 'UK', payload: {...} }
  ],
  summary: {
    total: 9,
    success: 9,
    failed: 0
  }
}
*/
```

### IntegratedPublisherHub との統合

```javascript
const Hub = require('./lib/mappers/hub/IntegratedPublisherHub');

// アジア市場のみへの出品
const asiaResults = await Hub.publishToAsiaMarkets(masterListing, {
  qoo10Promotion: { enableTimeSale: true, salePrice: 14000 },
  shopeeMarkets: ['SG', 'PH', 'TW'],
  amazonRegions: ['JP', 'US'],
});

// 全市場（アジア + グローバル）への一括出品
const allResults = await Hub.publishToAllMarkets(masterListing, {
  includeAsia: true,
  includeLuxury: true,
  includeHobby: true,
  asiaConfig: {
    qoo10Promotion: { enableTimeSale: true },
    shopeeMarkets: ['SG', 'PH', 'TW', 'MY'],
  },
});
```

---

## 📊 出品結果の分析

```javascript
const results = await AsiaPublisher.publishToAsiaMarketplaces(masterListing, config);

// サマリー情報
console.log(`総出品数: ${results.summary.total}`);
console.log(`成功: ${results.summary.success}`);
console.log(`失敗: ${results.summary.failed}`);
console.log(`成功率: ${(results.summary.success / results.summary.total * 100).toFixed(1)}%`);

// 各モールの詳細
if (results.qoo10.status === 'SUCCESS') {
  console.log('Qoo10 出品成功:', results.qoo10.payload);
}

if (results.coupang.status === 'SUCCESS') {
  console.log('Coupang 価格調整:', results.coupang.pricing);
}

results.shopee.forEach(result => {
  if (result.status === 'SUCCESS') {
    console.log(`Shopee ${result.market} 出品成功`);
  }
});

results.amazon.forEach(result => {
  if (result.status === 'SUCCESS') {
    console.log(`Amazon ${result.region} 出品成功`);
  }
});
```

---

## 🧪 テスト

テストスイートは `__tests__/AsiaPublisher.test.js` に含まれています。

```bash
# テストの実行
npm test -- AsiaPublisher.test.js

# または
yarn test AsiaPublisher.test.js
```

### テストカバレッジ

- ✅ T23: Qoo10プロモーション設定と最低利益保証
- ✅ T24: Coupang価格計算と手数料構造
- ✅ T25: Shopee複数市場マッピングとVAT計算
- ✅ T26: モバイル画像最適化
- ✅ T27: Amazon DDP統合と価格内訳
- ✅ 統合出品フロー

---

## 📝 開発ガイドライン

### マスターリスティングデータ要件

AsiaPublisher を使用するには、以下のフィールドを含むマスターリスティングデータが必要です。

**必須フィールド**:
- `master_id`: 商品ID
- `title`: 商品タイトル
- `description_html`: 商品説明（HTML）
- `inventory_count`: 在庫数
- `image_urls`: 画像URL配列
- `hs_code_final`: HSコード
- `origin_country`: 原産国

**価格フィールド**:
- `final_price_usd`: USD価格
- `final_price_jpy`: JPY価格（Qoo10用）
- `final_price_krw`: KRW価格（Coupang用）
- `fx_rates`: 為替レートオブジェクト

**オプションフィールド**:
- `base_cost`: 原価
- `base_cost_jpy`: JPY原価
- `base_cost_krw`: KRW原価
- `amazon_fulfillment_type`: Amazon配送タイプ ('FBA' または 'FBM')

### エラーハンドリング

```javascript
try {
  const results = await AsiaPublisher.publishToAsiaMarketplaces(
    masterListing,
    config
  );

  // 個別のモール失敗を確認
  if (results.qoo10?.status === 'FAILED') {
    console.error('Qoo10 出品失敗:', results.qoo10.error);
  }

} catch (error) {
  console.error('統合出品エラー:', error.message);
  // エラーハンドリング処理
}
```

---

## 🔧 カスタマイズ

### 手数料率のカスタマイズ

`AsiaPublisher.js` の `COUPANG_FEE_STRUCTURE` を編集して、カテゴリー別手数料率をカスタマイズできます。

```javascript
const COUPANG_FEE_STRUCTURE = {
  'C001': { commission: 0.08, minFee: 500, shipping: 2500 },
  // ... 他のカテゴリー
};
```

### 市場設定のカスタマイズ

`SHOPEE_MARKET_CONFIG` を編集して、新しい市場を追加したり、既存の設定を変更できます。

```javascript
const SHOPEE_MARKET_CONFIG = {
  'SG': {
    currency: 'SGD',
    fxKey: 'SGD',
    shippingProfileId: 'SHP_SG_DDP_1',
    vatRate: 0.07,
    preferredImageRatio: '1:1',
  },
  // ... 他の市場
};
```

---

## 📚 関連ファイル

- `AsiaPublisher.js`: メインモジュール
- `__tests__/AsiaPublisher.test.js`: テストスイート
- `../hub/IntegratedPublisherHub.js`: 統合ハブ
- `../qoo10/Qoo10Mapper.js`: Qoo10マッパー
- `../coupang/CoupangMapper.js`: Coupangマッパー
- `../shopee/ShopeeMapper.js`: Shopeeマッパー
- `../amazon/AmazonGlobalMapper.js`: Amazonマッパー

---

## 🎯 次のステップ

1. **実際のAPI統合**: 各モールのAPIクライアントを実装
2. **画像処理**: Sharp や Canvas API を使用した実際の画像最適化
3. **在庫同期**: 各モール間での在庫同期機能
4. **価格自動調整**: 競合価格に基づく動的価格調整
5. **分析ダッシュボード**: 各モールの販売実績を可視化

---

## 📞 サポート

質問や問題がある場合は、プロジェクトの Issue トラッカーまでお問い合わせください。

---

**Phase 8 完了**: これで、世界中の主要EC市場と、アジアのローカル市場の両方に最適化された出品が可能になりました！ 🎉
