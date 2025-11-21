# 多販路出品戦略エンジン 実装ドキュメント

## 概要

出品戦略エンジンは、SKUマスターの商品データに基づき、最適な出品先（モール×アカウント×国）を自動決定するシステムです。

### 3層フィルタリングアーキテクチャ

1. **レイヤー1: システム制約チェック** - 物理的・技術的に出品不可能な候補を除外
2. **レイヤー2: ユーザー戦略フィルタリング** - 経営判断・リスク回避のための除外
3. **レイヤー3: スコアリング＆優先順位付け** - 最も利益が見込める候補を選択

## アーキテクチャ

```
SKU商品データ + 全候補モール
         ↓
┌────────────────────────────────┐
│ Layer 1: システム制約チェック     │
│ - 重複アカウントチェック（排他制御）│
│ - プラットフォーム規約チェック    │
│ - 在庫・スコア閾値チェック        │
└────────────────────────────────┘
         ↓ (合格候補のみ)
┌────────────────────────────────┐
│ Layer 2: ユーザー戦略フィルタ     │
│ - カテゴリ制限（出品禁止リスト）  │
│ - アカウント専門性（専用化）      │
│ - 価格レンジ制限                 │
└────────────────────────────────┘
         ↓ (合格候補のみ)
┌────────────────────────────────┐
│ Layer 3: スコアリング             │
│ U_i,Mall = U_i × M_Mall         │
│ M_Mall = performance × competition × categoryFit │
└────────────────────────────────┘
         ↓ (最高スコア候補を選択)
    最終決定: 出品先候補
```

## ファイル構造

```
lib/listing/
├── types.ts                      # 型定義
├── platformRules.ts              # プラットフォーム規約テーブル
└── ListingStrategyEngine.ts      # メインエンジン
```

## 使い方

### 基本的な使用例

```typescript
import { determineListingStrategy } from '@/lib/listing/ListingStrategyEngine';
import type {
  SKUMasterData,
  MarketplaceCandidate,
  ListingData,
  UserStrategySettings,
  MarketplaceBoostSettings,
} from '@/lib/listing/types';

// 1. 商品データを準備
const product: SKUMasterData = {
  sku: 'POKEMON-CARD-001',
  product_id: 'uuid-123',
  category: 'Trading Cards',
  condition: 'New',
  hts_code: '9504.40',
  stock_quantity: 50,
  price_jpy: 1000,
  global_score: 85.5, // 高スコア商品
};

// 2. 全候補モールを定義
const allCandidates: MarketplaceCandidate[] = [
  { platform: 'ebay', account_id: 'ebay_main', target_country: 'US' },
  { platform: 'amazon_us', account_id: 'amazon_us_main', target_country: 'US' },
  { platform: 'amazon_jp', account_id: 'amazon_jp_main', target_country: 'JP' },
  { platform: 'coupang', account_id: 'coupang_main', target_country: 'KR' },
  { platform: 'shopee', account_id: 'shopee_main', target_country: 'SG' },
];

// 3. 既存出品状況を取得（DBから）
const existingListings: ListingData[] = [
  {
    sku: 'POKEMON-CARD-001',
    platform: 'ebay',
    account_id: 'ebay_main', // ← すでにeBayのこのアカウントで出品中
    target_country: 'US',
    listing_status: 'active',
  },
];

// 4. ユーザー戦略設定を定義
const userSettings: UserStrategySettings = {
  categoryRestrictions: {
    // 医薬品・食品は出品禁止
    blacklist: ['Pharmaceuticals', 'Food & Beverages'],
  },
  accountSpecialization: {
    // amazon_us_electronics は電子機器専用アカウント
    amazon_us_electronics: {
      allowedCategories: ['Electronics', 'Computers', 'Camera'],
    },
  },
  priceRanges: {
    // 高額商品（10万円以上）はAmazon限定
    amazon_us: { minPrice: 0, maxPrice: 1000000 },
    ebay: { minPrice: 0, maxPrice: 100000 },
  },
};

// 5. モール別ブースト設定を定義
const boostSettings: MarketplaceBoostSettings[] = [
  {
    platform: 'ebay',
    country: 'US',
    category: 'Trading Cards',
    performanceMultiplier: 1.3, // eBayはトレカで強い
    competitionMultiplier: 1.1,
    categoryFitMultiplier: 1.5, // カテゴリ適合度高い
  },
  {
    platform: 'amazon_us',
    country: 'US',
    category: 'Trading Cards',
    performanceMultiplier: 1.1,
    competitionMultiplier: 0.9, // Amazonは競合多い
    categoryFitMultiplier: 1.0,
  },
];

// 6. エンジンを実行
const result = determineListingStrategy(
  product,
  allCandidates,
  existingListings,
  userSettings,
  boostSettings,
  -10000 // 最低グローバルスコア閾値（デフォルト）
);

// 7. 結果を確認
console.log('最終決定:', result.finalDecision);
// {
//   shouldList: false,
//   targetPlatform: null,
//   targetAccountId: null,
//   targetCountry: null,
//   reason: 'eBay に既に ebay_main で出品済みのため、他のeBayアカウントへの出品をブロック'
// }

// レイヤー1の結果を確認
console.log('システム制約チェック結果:');
result.systemConstraints.forEach((r) => {
  console.log(`${r.candidate.platform} (${r.candidate.account_id}): ${r.filterResult.passed ? 'PASS' : 'FAIL'} - ${r.filterResult.reason}`);
});

// レイヤー3のスコア結果を確認
console.log('スコアリング結果:');
result.scoredCandidates.forEach((s) => {
  console.log(`${s.candidate.platform}: ${s.finalScore.toFixed(2)} (U_i=${product.global_score} × M_Mall=${s.marketplaceMultiplier.toFixed(2)})`);
});
```

### 出力例

#### 正常ケース（出品推奨あり）

```json
{
  "sku": "POKEMON-CARD-002",
  "productId": "uuid-456",
  "recommendedCandidate": {
    "platform": "ebay",
    "account_id": "ebay_main",
    "target_country": "US"
  },
  "finalDecision": {
    "shouldList": true,
    "targetPlatform": "ebay",
    "targetAccountId": "ebay_main",
    "targetCountry": "US",
    "reason": "最高スコア候補: ebay (ebay_main) - 最終スコア 111.54 (U_i=85.5 × M_Mall=1.30)"
  },
  "systemConstraints": [
    {
      "candidate": { "platform": "ebay", "account_id": "ebay_main", "target_country": "US" },
      "filterResult": { "passed": true, "reason": "全てのシステム制約をクリア", "layer": 1 }
    }
  ],
  "scoredCandidates": [
    {
      "candidate": { "platform": "ebay", "account_id": "ebay_main", "target_country": "US" },
      "finalScore": 111.54,
      "marketplaceMultiplier": 1.30,
      "breakdown": {
        "baseScore": 85.5,
        "performanceBoost": 1.3,
        "competitionBoost": 1.1,
        "categoryFitBoost": 1.5
      }
    }
  ]
}
```

#### 重複アカウントブロックケース

```json
{
  "sku": "POKEMON-CARD-001",
  "productId": "uuid-123",
  "recommendedCandidate": null,
  "finalDecision": {
    "shouldList": false,
    "targetPlatform": null,
    "targetAccountId": null,
    "targetCountry": null,
    "reason": "eBay に既に ebay_main で出品済みのため、他のeBayアカウントへの出品をブロック"
  },
  "systemConstraints": [
    {
      "candidate": { "platform": "ebay", "account_id": "ebay_secondary", "target_country": "US" },
      "filterResult": {
        "passed": false,
        "reason": "eBay に既に ebay_main で出品済みのため、他のeBayアカウントへの出品をブロック",
        "layer": 1
      }
    }
  ]
}
```

## レイヤー別詳細

### Layer 1: システム制約チェック

物理的・技術的に出品不可能な候補を除外します。

#### 1. 重複アカウントチェック（排他制御）

**目的**: 同じプラットフォームに複数のアカウントで同一商品を出品するのを防ぐ

**ロジック**:
```typescript
// すでにeBayのアカウントAで出品済みの場合
// → eBayの全ての他のアカウント（B, C, D...）への出品をブロック
if (existingListings.some(l => l.platform === 'ebay')) {
  // 全てのeBayアカウント候補を除外
}
```

**具体例**:
- SKU "CARD-001" がすでに `ebay (ebay_main)` で出品中
- 候補: `ebay (ebay_secondary)`
- **結果**: ❌ FAIL - "eBay に既に ebay_main で出品済み"

#### 2. プラットフォーム規約チェック

**目的**: 各モールの出品規約・制限に違反していないかチェック

**対応規約**:
- **コンディション制限**: Amazon US の電子機器は New/Refurbished のみ
- **カテゴリ制限**: Mercari はアルコール・タバコ・現金類は出品禁止
- **HSコード制限**: Coupang は医薬品・化粧品は特別な認証が必要

**具体例**:
```typescript
// Amazon US で中古の電子機器を出品しようとした場合
{
  category: 'Electronics',
  condition: 'Used', // ← NG!
  platform: 'amazon_us'
}
// 結果: ❌ FAIL - "Amazon US: 電子機器は新品または再生品のみ出品可能"
```

#### 3. 在庫・スコア閾値チェック

**目的**: 在庫切れ商品や低スコア商品を除外

**チェック項目**:
- `stock_quantity > 0`
- `global_score >= minGlobalScore` (デフォルト -10000)

**具体例**:
```typescript
// 在庫がない商品
{
  sku: 'OUT-OF-STOCK-001',
  stock_quantity: 0, // ← NG!
}
// 結果: ❌ FAIL - "在庫数が0のため出品不可"
```

### Layer 2: ユーザー戦略フィルタリング

経営判断・リスク回避のための戦略的除外を行います。

#### 1. カテゴリ制限

**目的**: 特定カテゴリの出品をブラックリスト/ホワイトリストで制御

**設定例**:
```typescript
const userSettings: UserStrategySettings = {
  categoryRestrictions: {
    blacklist: ['Pharmaceuticals', 'Food & Beverages'], // 出品禁止
    whitelist: ['Trading Cards', 'Electronics'], // これだけ出品OK（指定時）
  },
};
```

**ロジック**:
- ホワイトリスト指定時: リストにないカテゴリは全て除外
- ブラックリスト指定時: リストにあるカテゴリは除外
- 両方未指定時: 全て許可

#### 2. アカウント専門性（専用化）

**目的**: 特定アカウントを特定カテゴリ専用にする

**設定例**:
```typescript
const userSettings: UserStrategySettings = {
  accountSpecialization: {
    amazon_us_electronics: {
      allowedCategories: ['Electronics', 'Computers', 'Camera'],
    },
    ebay_collectibles: {
      allowedCategories: ['Trading Cards', 'Antiques', 'Art'],
    },
  },
};
```

**ロジック**:
```typescript
// amazon_us_electronics アカウントでトレカを出品しようとした場合
{
  account_id: 'amazon_us_electronics',
  category: 'Trading Cards', // ← 許可リストに含まれていない
}
// 結果: ❌ FAIL - "アカウント amazon_us_electronics は Trading Cards の出品を許可されていません"
```

#### 3. 価格レンジ制限

**目的**: プラットフォームごとに出品可能な価格帯を制限

**設定例**:
```typescript
const userSettings: UserStrategySettings = {
  priceRanges: {
    amazon_us: { minPrice: 0, maxPrice: 1000000 }, // 100万円以下
    ebay: { minPrice: 0, maxPrice: 50000 }, // 5万円以下
    mercari: { minPrice: 300, maxPrice: 100000 }, // 300円～10万円
  },
};
```

**ロジック**:
```typescript
// eBayで15万円の商品を出品しようとした場合
{
  platform: 'ebay',
  price_jpy: 150000, // ← 上限5万円を超過
}
// 結果: ❌ FAIL - "価格 150000 円が ebay の許可範囲外（最大: 50000 円）"
```

### Layer 3: スコアリング＆優先順位付け

通過した候補の中から、最も利益が見込める候補を選択します。

#### スコア計算式

```
U_i,Mall = U_i × M_Mall

M_Mall = performance_Mall × competition_Mall × categoryFit_Mall
```

#### パラメータ説明

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| U_i | SKUマスターのグローバルスコア | 85.5 |
| M_Mall | モール別補正係数（ブースト設定から計算） | 1.30 |
| performance_Mall | 過去の売上実績による補正 | 1.3（eBayでよく売れる） |
| competition_Mall | 競合状況による補正 | 1.1（競合少ない） |
| categoryFit_Mall | カテゴリ適合度による補正 | 1.5（カテゴリマッチ度高い） |

#### ブースト設定例

```typescript
const boostSettings: MarketplaceBoostSettings[] = [
  {
    platform: 'ebay',
    country: 'US',
    category: 'Trading Cards',
    performanceMultiplier: 1.3, // eBayはトレカで過去の売上実績が高い
    competitionMultiplier: 1.1, // 競合が少ない
    categoryFitMultiplier: 1.5, // カテゴリ適合度が非常に高い
  },
  {
    platform: 'amazon_us',
    country: 'US',
    category: 'Trading Cards',
    performanceMultiplier: 1.1, // Amazonもトレカ販売実績あり
    competitionMultiplier: 0.9, // 競合が多い（スコア減少）
    categoryFitMultiplier: 1.0, // 標準的な適合度
  },
  {
    platform: 'coupang',
    country: 'KR',
    category: 'Trading Cards',
    performanceMultiplier: 0.8, // 韓国市場ではトレカの需要が低い
    competitionMultiplier: 1.2, // 競合が少ない
    categoryFitMultiplier: 0.9, // やや適合度低い
  },
];
```

#### スコア計算例

商品: `global_score = 85.5` のトレーディングカード

**eBay (US)**:
```
M_Mall = 1.3 × 1.1 × 1.5 = 2.145
U_i,Mall = 85.5 × 2.145 = 183.40  ← 最高スコア！
```

**Amazon US**:
```
M_Mall = 1.1 × 0.9 × 1.0 = 0.99
U_i,Mall = 85.5 × 0.99 = 84.65
```

**Coupang (KR)**:
```
M_Mall = 0.8 × 1.2 × 0.9 = 0.864
U_i,Mall = 85.5 × 0.864 = 73.87
```

**結果**: eBay (US) を推奨（最高スコア 183.40）

## 統合フロー

### VPSバッチ処理での使用例

```typescript
// app/api/listing/determine-strategy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { determineListingStrategy } from '@/lib/listing/ListingStrategyEngine';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { sku } = await request.json();

  // 1. SKUマスターからデータ取得
  const { data: product } = await supabase
    .from('products_master')
    .select('*')
    .eq('sku', sku)
    .single();

  if (!product) {
    return NextResponse.json({ error: 'SKU not found' }, { status: 404 });
  }

  // 2. 全候補モールを構築
  const allCandidates = [
    { platform: 'ebay', account_id: 'ebay_main', target_country: 'US' },
    { platform: 'amazon_us', account_id: 'amazon_us_main', target_country: 'US' },
    // ... 他の候補
  ];

  // 3. 既存出品状況を取得
  const { data: existingListings } = await supabase
    .from('listing_data')
    .select('*')
    .eq('sku', sku)
    .in('listing_status', ['active', 'pending']);

  // 4. ユーザー戦略設定を取得（DBまたは環境変数から）
  const { data: userSettings } = await supabase
    .from('user_strategy_settings')
    .select('*')
    .single();

  // 5. ブースト設定を取得
  const { data: boostSettings } = await supabase
    .from('marketplace_boost_settings')
    .select('*');

  // 6. エンジン実行
  const result = determineListingStrategy(
    product,
    allCandidates,
    existingListings || [],
    userSettings || {},
    boostSettings || [],
    -10000
  );

  // 7. 結果をDBに記録
  if (result.finalDecision.shouldList) {
    await supabase.from('products_master').update({
      listing_strategy_status: '出品戦略決定済',
    }).eq('sku', sku);

    await supabase.from('listing_data').insert({
      sku,
      platform: result.finalDecision.targetPlatform,
      account_id: result.finalDecision.targetAccountId,
      target_country: result.finalDecision.targetCountry,
      listing_status: 'strategy_determined',
      strategy_score: result.recommendedCandidate?.finalScore,
    });
  }

  return NextResponse.json({
    success: true,
    result,
  });
}
```

### UIでの使用例

```typescript
// app/tools/strategy-settings/page.tsx
'use client';

import { useState } from 'react';

export default function StrategySettingsPage() {
  const [settings, setSettings] = useState<UserStrategySettings>({
    categoryRestrictions: {
      blacklist: ['Pharmaceuticals'],
    },
    accountSpecialization: {},
    priceRanges: {},
  });

  const handleSave = async () => {
    await fetch('/api/settings/user-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  };

  return (
    <div>
      <h1>出品戦略設定</h1>

      {/* カテゴリ制限設定 */}
      <section>
        <h2>カテゴリ制限</h2>
        <label>
          出品禁止カテゴリ:
          <input
            type="text"
            placeholder="Pharmaceuticals, Food & Beverages"
            onChange={(e) => {
              setSettings({
                ...settings,
                categoryRestrictions: {
                  ...settings.categoryRestrictions,
                  blacklist: e.target.value.split(',').map(s => s.trim()),
                },
              });
            }}
          />
        </label>
      </section>

      {/* アカウント専門性設定 */}
      <section>
        <h2>アカウント専門性</h2>
        {/* アカウントごとに許可カテゴリを設定するUI */}
      </section>

      {/* 価格レンジ設定 */}
      <section>
        <h2>価格レンジ</h2>
        {/* プラットフォームごとに最小・最大価格を設定するUI */}
      </section>

      <button onClick={handleSave}>保存</button>
    </div>
  );
}
```

## テストケース

### ケース1: 正常パターン（高スコア商品）

**入力**:
```typescript
{
  product: {
    sku: 'HIGH-SCORE-001',
    category: 'Trading Cards',
    condition: 'New',
    stock_quantity: 100,
    global_score: 95.0,
  },
  existingListings: [], // 未出品
  userSettings: {}, // 制限なし
}
```

**期待結果**:
- Layer 1: 全候補パス
- Layer 2: 全候補パス
- Layer 3: 最高スコア候補を推奨
- `shouldList: true`

### ケース2: 重複アカウントブロック

**入力**:
```typescript
{
  product: { sku: 'DUP-001' },
  existingListings: [
    { platform: 'ebay', account_id: 'ebay_main', listing_status: 'active' }
  ],
  allCandidates: [
    { platform: 'ebay', account_id: 'ebay_secondary' }, // ← ブロック対象
  ],
}
```

**期待結果**:
- Layer 1: eBay候補は全てFAIL
- `shouldList: false`
- `reason: "eBay に既に ebay_main で出品済み..."`

### ケース3: プラットフォーム規約違反

**入力**:
```typescript
{
  product: {
    category: 'Electronics',
    condition: 'Used', // ← Amazon USではNG
  },
  allCandidates: [
    { platform: 'amazon_us', account_id: 'amazon_us_main' }
  ],
}
```

**期待結果**:
- Layer 1: Amazon US候補がFAIL
- `reason: "Amazon US: 電子機器は新品または再生品のみ出品可能"`

### ケース4: ユーザー戦略（カテゴリブラックリスト）

**入力**:
```typescript
{
  product: { category: 'Pharmaceuticals' },
  userSettings: {
    categoryRestrictions: {
      blacklist: ['Pharmaceuticals']
    }
  }
}
```

**期待結果**:
- Layer 1: パス
- Layer 2: 全候補FAIL
- `reason: "カテゴリ Pharmaceuticals はブラックリストに含まれています"`

### ケース5: スコアリング比較

**入力**:
```typescript
{
  product: { global_score: 80.0, category: 'Trading Cards' },
  boostSettings: [
    { platform: 'ebay', performanceMultiplier: 1.5, ...otherBoosts: 1.0 },
    { platform: 'amazon_us', performanceMultiplier: 1.0, ...otherBoosts: 1.0 },
  ]
}
```

**期待結果**:
- eBay: 80.0 × 1.5 = 120.0
- Amazon US: 80.0 × 1.0 = 80.0
- 推奨: eBay（高スコア）

## トラブルシューティング

### 問題: 全ての候補が除外される

**原因**:
1. 既存出品で全プラットフォームがブロックされている
2. ユーザー戦略設定が厳しすぎる
3. プラットフォーム規約に違反している

**解決策**:
1. `result.systemConstraints` と `result.userStrategyFiltered` の理由を確認
2. コンソールログで各レイヤーの除外理由を確認
3. ユーザー戦略設定を緩和

### 問題: スコアが期待通りに計算されない

**原因**:
1. ブースト設定が適用されていない
2. `global_score` が低い

**解決策**:
1. `result.scoredCandidates[].breakdown` でブースト内訳を確認
2. ブースト設定のplatform/country/categoryが候補と一致しているか確認

### 問題: 重複アカウントチェックが動作しない

**原因**:
1. `existingListings` の `listing_status` が `'active'` または `'pending'` でない
2. プラットフォーム名が一致していない

**解決策**:
1. `existingListings` のデータ構造を確認
2. コンソールログで `checkDuplicateAccount()` の出力を確認

## データベーススキーマ（推奨）

### user_strategy_settings テーブル

```sql
CREATE TABLE user_strategy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  category_blacklist TEXT[], -- ['Pharmaceuticals', 'Food & Beverages']
  category_whitelist TEXT[], -- ['Trading Cards', 'Electronics']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### account_specialization テーブル

```sql
CREATE TABLE account_specialization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  allowed_categories TEXT[], -- ['Electronics', 'Computers']
  created_at TIMESTAMP DEFAULT NOW()
);
```

### marketplace_boost_settings テーブル

```sql
CREATE TABLE marketplace_boost_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  performance_multiplier NUMERIC DEFAULT 1.0,
  competition_multiplier NUMERIC DEFAULT 1.0,
  category_fit_multiplier NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## パフォーマンス最適化

### バッチ処理での最適化

```typescript
// 大量のSKUを処理する場合
const results = await Promise.all(
  skus.map(async (sku) => {
    const product = await fetchProduct(sku);
    const result = determineListingStrategy(/* ... */);
    return result;
  })
);
```

### キャッシング

```typescript
// ユーザー戦略設定をキャッシュ
let cachedUserSettings: UserStrategySettings | null = null;

async function getUserSettings() {
  if (!cachedUserSettings) {
    cachedUserSettings = await fetchUserSettings();
  }
  return cachedUserSettings;
}
```

## まとめ

このエンジンを使用することで:

1. ✅ **自動化**: 手動での出品先判断が不要
2. ✅ **重複防止**: 同一プラットフォームでのアカウント重複を排除
3. ✅ **最適化**: スコアリングにより最も利益が見込める候補を選択
4. ✅ **柔軟性**: ユーザー戦略設定で経営方針を反映
5. ✅ **拡張性**: 新しいプラットフォームやルールを簡単に追加可能

## サポート

問題が発生した場合:
1. コンソールログを確認（各レイヤーの詳細ログを出力）
2. `result.systemConstraints` / `result.userStrategyFiltered` / `result.scoredCandidates` を確認
3. 各種設定データ（userSettings, boostSettings）を確認

## ライセンス

社内利用のみ
