# マルチマーケットプレイス出品システム

## 📋 概要

このシステムは、約50のマーケットプレイスに効率的に出品するための戦略的グルーピング機能とAPI統合基盤を提供します。

### 主要コンポーネント

- **T28: ListingGroupManager** - 戦略的グルーピング機能
- **T29: UniversalApiConnector** - 汎用APIコネクタハブ
- **T30: SpecializedDataMapper** - 特化型データマッパー
- **IntegratedPublisher** - 統合出品実行ロジック

---

## 🚀 クイックスタート

### 基本的な使用例

```typescript
import { publishToGroup } from "./services/IntegratedPublisher";
import type { MasterListingData } from "./services/SpecializedDataMapper";

// マスターデータの準備
const masterData: MasterListingData = {
  master_id: "WATCH_001",
  title: "Rolex Submariner 116610LN",
  description: "Authentic Rolex watch in excellent condition",
  price_jpy: 1200000,
  currency: "JPY",
  quantity: 1,
  images: ["https://example.com/image1.jpg"],
  category: "Watches",
  condition: "Excellent",
  sku: "ROL-SUB-001",

  // HSコード（フェーズ8要件）
  hs_code_final: "9101.21.00",
  hs_code_confirmed: true,
  ddp_cost_calculated: true,

  // 専門属性（Chrono24用）
  watch_condition: "1", // 1 = Unworn
  certificate_type: "manufacturer",
  movement_type: "automatic",
  case_material: "stainless_steel",
  brand: "Rolex",
  model_number: "116610LN",
  year_of_manufacture: 2020,
};

// ハイエンド・鑑定グループに出品
const result = await publishToGroup(masterData, "HIGH_END_LUXURY");

console.log(result.summary);
// => "Published to ハイエンド・鑑定: 5/7 successful, 2 failed, 0 skipped. Execution time: 12.34s"
```

---

## 📦 戦略的グループ

### 利用可能なグループ

| グループID | グループ名 | 対象モール数 | 主な用途 |
|-----------|-----------|------------|---------|
| `GLOBAL_MAJOR` | 🥇 グローバル主力 | 12 | 汎用性の高い商品の最大ボリューム出品 |
| `HIGH_END_LUXURY` | 💎 ハイエンド・鑑定 | 7 | 高額品、真贋鑑定が必要な商品 |
| `HOBBY_COLLECTIBLES` | 🃏 ホビー・コレクティブル | 4 | トレカ、レコード、楽器などの趣味商品 |
| `ASIA_MAJOR` | 🛍️ アジア主要市場 | 14 | 東アジア・東南アジア向け |
| `INDUSTRIAL_EQUIPMENT` | 🛠️ 産業・専門機器 | 5 | B2B、産業機器、電子部品 |
| `FASHION_VINTAGE` | 👗 ファッション・古着 | 7 | 古着、ストリートファッション |

### グループ情報の取得

```typescript
import {
  getAllGroups,
  getGroupDefinition,
  getMarketplacesByGroup,
} from "./services/ListingGroupManager";

// すべてのグループを取得
const allGroups = getAllGroups();

// 特定のグループの詳細を取得
const group = getGroupDefinition("HIGH_END_LUXURY");
console.log(group.name); // => "ハイエンド・鑑定"
console.log(group.marketplaces); // => ["CHRONO24", "STOCKX", ...]

// グループに含まれるマーケットプレイスIDを取得
const marketplaces = getMarketplacesByGroup("HIGH_END_LUXURY");
// => ["CHRONO24", "THE_REAL_REAL", "STOCKX", "GOAT", ...]
```

---

## 🔧 専門属性マッピング

### マーケットプレイス別の必須属性

#### StockX / GOAT（限定スニーカー）

```typescript
const sneakerData: MasterListingData = {
  // 基本属性...
  master_id: "SNEAKER_001",
  title: "Nike Air Jordan 1 Retro High OG",

  // 必須専門属性
  authentication_id: "STOCKX_AUTH_12345",
  authentication_provider: "StockX Authentication",
  deadstock_status: true,
  brand: "Nike",
  size: "US 10",
  color: "Chicago",

  // HSコード
  hs_code_final: "6403.99.00",
  hs_code_confirmed: true,
  ddp_cost_calculated: true,
};

await publishToGroup(sneakerData, "HIGH_END_LUXURY");
```

#### Chrono24（高級時計）

```typescript
const watchData: MasterListingData = {
  // 基本属性...
  master_id: "WATCH_002",
  title: "Omega Speedmaster Professional",

  // 必須専門属性
  watch_condition: "2", // 2 = Very Good
  certificate_type: "manufacturer",
  movement_type: "manual",
  case_material: "stainless_steel",
  brand: "Omega",
  model_number: "311.30.42.30.01.005",
  year_of_manufacture: 2019,

  // HSコード
  hs_code_final: "9101.21.00",
  hs_code_confirmed: true,
  ddp_cost_calculated: true,
};

await publishToGroup(watchData, "HIGH_END_LUXURY");
```

#### Card Market / TCGplayer（トレーディングカード）

```typescript
const cardData: MasterListingData = {
  // 基本属性...
  master_id: "CARD_001",
  title: "Black Lotus (Alpha Edition)",

  // 必須専門属性
  tcg_game: "Magic",
  edition_type: "alpha",
  foil_status: false,
  card_condition_grade: "NM", // Near Mint
  card_language: "en",

  // HSコード
  hs_code_final: "4911.99.00",
  hs_code_confirmed: true,
  ddp_cost_calculated: true,
};

await publishToGroup(cardData, "HOBBY_COLLECTIBLES");
```

---

## ⚙️ 高度な使用方法

### オプション設定

```typescript
import { publishToGroup } from "./services/IntegratedPublisher";

const result = await publishToGroup(masterData, "GLOBAL_MAJOR", {
  // 並列実行数（デフォルト: 3）
  maxConcurrency: 5,

  // エラー時に中止（デフォルト: false）
  stopOnError: false,

  // ドライラン（実際には出品しない）
  dryRun: false,

  // 特定のマーケットプレイスをスキップ
  skipMarketplaces: ["EBAY_UK", "AMAZON_DE"],

  // API呼び出しオプション
  apiOptions: {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 30000,
  },
});
```

### 複数グループへの同時出品

```typescript
import { publishToMultipleGroups } from "./services/IntegratedPublisher";

// 汎用商品を複数グループに出品
const results = await publishToMultipleGroups(
  masterData,
  ["GLOBAL_MAJOR", "ASIA_MAJOR"],
  {
    maxConcurrency: 3,
  }
);

console.log(`Total marketplaces: ${results.reduce((sum, r) => sum + r.totalMarketplaces, 0)}`);
console.log(`Total success: ${results.reduce((sum, r) => sum + r.successCount, 0)}`);
```

### ドライランでテスト

```typescript
import { testPublishToGroup } from "./services/IntegratedPublisher";

// 実際にAPI呼び出しせずにテスト
const testResult = await testPublishToGroup(masterData, "HIGH_END_LUXURY");

console.log(testResult.summary);
// すべてのバリデーションとマッピングが実行されますが、実際のAPI呼び出しは行われません
```

---

## 🔐 環境変数設定

### 必要な環境変数

各マーケットプレイスのAPI認証情報を環境変数として設定してください。

```bash
# eBay
EBAY_US_CLIENT_ID=your_client_id
EBAY_US_CLIENT_SECRET=your_client_secret
EBAY_US_ACCESS_TOKEN=your_access_token

# Amazon
AMAZON_US_CLIENT_ID=your_client_id
AMAZON_US_CLIENT_SECRET=your_client_secret
AMAZON_US_ACCESS_TOKEN=your_access_token
AMAZON_US_REFRESH_TOKEN=your_refresh_token

# Walmart
WALMART_US_CLIENT_ID=your_client_id
WALMART_US_CLIENT_SECRET=your_client_secret

# Chrono24
CHRONO24_API_KEY=your_api_key
CHRONO24_MERCHANT_ID=your_merchant_id

# StockX
STOCKX_API_KEY=your_api_key
STOCKX_API_SECRET=your_api_secret

# Card Market
CARD_MARKET_API_KEY=your_api_key
CARD_MARKET_API_SECRET=your_api_secret
CARD_MARKET_ACCESS_TOKEN=your_access_token

# TCGplayer
TCGPLAYER_CLIENT_ID=your_client_id
TCGPLAYER_CLIENT_SECRET=your_client_secret

# Shopee
SHOPEE_SG_API_KEY=your_api_key
SHOPEE_SG_MERCHANT_ID=your_merchant_id

# Rakuten
RAKUTEN_JP_API_KEY=your_api_key
RAKUTEN_JP_API_SECRET=your_api_secret
```

---

## 📊 出品結果の処理

### 結果の型定義

```typescript
interface GroupPublicationResult {
  groupId: GroupId;
  groupName: string;
  totalMarketplaces: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: PublicationResult[];
  executionTime: number;
  summary: string;
}

interface PublicationResult {
  marketplaceId: MarketplaceId;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  listingId?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 結果のハンドリング

```typescript
const result = await publishToGroup(masterData, "GLOBAL_MAJOR");

// 成功したマーケットプレイスの処理
const successfulListings = result.results.filter(r => r.status === "SUCCESS");
for (const listing of successfulListings) {
  console.log(`✅ ${listing.marketplaceId}: ${listing.listingId}`);

  // データベースに保存、在庫同期に登録など
  // await saveToDatabase(listing.marketplaceId, listing.listingId);
}

// 失敗したマーケットプレイスの処理
const failedListings = result.results.filter(r => r.status === "FAILED");
for (const listing of failedListings) {
  console.error(`❌ ${listing.marketplaceId}: ${listing.error?.message}`);

  // エラーログの記録、アラート送信など
  // await logError(listing.marketplaceId, listing.error);
}

// 成功率の計算
const successRate = (result.successCount / result.totalMarketplaces) * 100;
console.log(`Success rate: ${successRate.toFixed(2)}%`);
```

---

## 🛡️ エラーハンドリング

### HSコード未確定エラー

```typescript
try {
  await publishToGroup(masterData, "GLOBAL_MAJOR");
} catch (error) {
  if (error.message.includes("HS Code not finalized")) {
    console.error("HSコードが確定していません。先にHSコードを確定してください。");
    // HSコード確定フローにリダイレクト
  }
}
```

### バリデーションエラー

```typescript
import { validateRequiredAttributes } from "./services/SpecializedDataMapper";

// 出品前に検証
const validation = validateRequiredAttributes(masterData, "STOCKX");

if (!validation.valid) {
  console.error("Validation errors:");
  validation.errors.forEach(err => console.error(`  - ${err}`));
  // エラーをユーザーに表示
}
```

### レート制限エラー

レート制限は自動的に処理されますが、エラーが発生した場合は以下のように対処できます：

```typescript
const result = await publishToGroup(masterData, "GLOBAL_MAJOR", {
  apiOptions: {
    retryCount: 5, // リトライ回数を増やす
    retryDelay: 2000, // リトライ間隔を長くする
  },
  maxConcurrency: 2, // 並列実行数を減らす
});
```

---

## 🔄 将来の拡張

### 新しいマーケットプレイスの追加

1. **ListingGroupManager.ts** にマーケットプレイスIDを追加
2. **UniversalApiConnector.ts** にマーケットプレイス設定を追加
3. 必要に応じて **SpecializedDataMapper.ts** に特化型マッパーを追加

```typescript
// 1. ListingGroupManager.ts
export type MarketplaceId =
  | "EXISTING_MARKETPLACE"
  | "NEW_MARKETPLACE"; // 追加

// 2. UniversalApiConnector.ts
const MARKETPLACE_CONFIGS = {
  // ...existing configs
  NEW_MARKETPLACE: {
    id: "NEW_MARKETPLACE",
    name: "New Marketplace",
    baseUrl: "https://api.newmarketplace.com",
    // ...
  },
};

// 3. SpecializedDataMapper.ts（必要な場合のみ）
const mapForNewMarketplace: SpecializedMapper = (masterData) => {
  return {
    // 専門属性のマッピング
  };
};

const MARKETPLACE_MAPPERS = {
  // ...existing mappers
  NEW_MARKETPLACE: mapForNewMarketplace,
};
```

---

## 📝 ベストプラクティス

### 1. HSコードの事前確定

```typescript
// ❌ 悪い例
const masterData = {
  // ...
  hs_code_confirmed: false, // 未確定
};
await publishToGroup(masterData, "GLOBAL_MAJOR"); // エラー

// ✅ 良い例
const masterData = {
  // ...
  hs_code_final: "9101.21.00",
  hs_code_confirmed: true,
  ddp_cost_calculated: true,
};
await publishToGroup(masterData, "GLOBAL_MAJOR"); // 成功
```

### 2. 適切なグループ選択

```typescript
// 高級時計 => HIGH_END_LUXURY
await publishToGroup(rolexData, "HIGH_END_LUXURY");

// トレーディングカード => HOBBY_COLLECTIBLES
await publishToGroup(pokemonCardData, "HOBBY_COLLECTIBLES");

// 汎用電化製品 => GLOBAL_MAJOR
await publishToGroup(electronicData, "GLOBAL_MAJOR");
```

### 3. ドライランでテスト

```typescript
// 本番環境に出品する前に、必ずドライランでテスト
const testResult = await testPublishToGroup(masterData, "HIGH_END_LUXURY");

if (testResult.successCount === testResult.totalMarketplaces) {
  // すべてのバリデーションが通過
  const realResult = await publishToGroup(masterData, "HIGH_END_LUXURY");
}
```

---

## 🤝 サポート

質問や問題がある場合は、開発チームにお問い合わせください。

---

## 📄 ライセンス

このシステムは N3 マルチマーケットプレイス出品システムの一部です。
