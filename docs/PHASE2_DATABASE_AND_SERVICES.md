# 📄 フェーズ2: データベース拡張とコアサービス基盤構築

## 📋 概要

このドキュメントは、総合EC管理システムの第2フェーズで実装された以下の機能の技術仕様と利用方法をまとめたものです：

1. **カテゴリー別出品枠管理** - eBayの出品制限を厳密に管理
2. **オファー自動化** - 赤字防止ロジック付きの自動オファー送信
3. **出品交代機能** - 低スコア商品を自動的に入れ替え

## 🗄️ データベーススキーマ

### 1. ebay_category_limit テーブル

eBayアカウントごとのカテゴリー別出品枠を管理します。

```sql
CREATE TABLE ebay_category_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebay_account_id VARCHAR(255) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  limit_type VARCHAR(20) CHECK (limit_type IN ('10000', '50000', 'other')),
  current_listing_count INTEGER DEFAULT 0,
  max_limit INTEGER NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ebay_account_id, category_id)
);
```

**フィールド説明:**
- `ebay_account_id`: eBayアカウントID
- `category_id`: eBayカテゴリーID
- `limit_type`: 出品枠のタイプ（10000個制限、50000ドル制限、その他）
- `current_listing_count`: 現在の出品数
- `max_limit`: 最大出品可能数
- `last_updated`: 最終更新日時

**インデックス:**
- アカウントID
- カテゴリーID
- アカウント+カテゴリー（複合）

### 2. products_master テーブル拡張

オファー自動化のための3つのフィールドを追加しました。

```sql
ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS auto_offer_enabled BOOLEAN DEFAULT FALSE;
  ADD COLUMN IF NOT EXISTS min_profit_margin_jpy NUMERIC(10,2);
  ADD COLUMN IF NOT EXISTS max_discount_rate NUMERIC(5,4);
```

**追加フィールド:**
- `auto_offer_enabled`: 自動オファー機能の有効/無効
- `min_profit_margin_jpy`: 最低利益マージン（日本円）- 赤字防止用
- `max_discount_rate`: 最大割引率（例: 0.10 = 10%）

### 3. ヘルパー関数

出品可否を効率的にチェックするPostgreSQLファンクション:

```sql
CREATE FUNCTION can_list_in_category(
  p_account_id VARCHAR(255),
  p_category_id VARCHAR(50)
) RETURNS TABLE (
  can_list BOOLEAN,
  current_count INTEGER,
  max_limit INTEGER,
  remaining INTEGER
)
```

## 🚀 マイグレーションの適用方法

### Supabaseコンソールから適用

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `/supabase/migrations/20251122_add_ebay_category_limit_and_offer_fields.sql` の内容をコピー
4. SQLエディタに貼り付けて実行
5. 成功メッセージを確認

### ローカル開発環境での適用

Supabase CLIを使用している場合:

```bash
# マイグレーションを適用
supabase db push

# または特定のファイルを実行
psql $DATABASE_URL < supabase/migrations/20251122_add_ebay_category_limit_and_offer_fields.sql
```

## 📦 作成されたサービスクラス

### 1. ListingRotationService

**ファイル:** `/lib/services/listing/ListingRotationService.ts`

**目的:** 低スコア商品を自動的に高パフォーマンス商品と入れ替える

**主要メソッド:**
- `identifyLowScoreItems(threshold, limit, categoryId)` - 低スコア商品の特定
- `findRotationCandidate(accountId, categoryId)` - 交代候補の選定
- `endListing(itemId, reason)` - eBay出品の終了
- `executeRotation(accountId, categoryId, newProductSku)` - 完全な交代処理
- `getRotationStats(accountId, dateFrom)` - 統計情報の取得

**使用例:**

```typescript
import { listingRotationService } from '@/lib/services/listing/ListingRotationService';

// 低スコア商品を特定（スコア50未満、最大10件）
const lowScoreItems = await listingRotationService.identifyLowScoreItems(50, 10);

// 完全な交代処理を実行
const result = await listingRotationService.executeRotation(
  'ebay_account_123',
  '183454', // CCG Individual Cards
  'NEW-PRODUCT-SKU-001'
);

if (result.rotationComplete && result.readyForNewListing) {
  console.log('交代完了、新規出品可能');
}
```

### 2. AutoOfferService

**ファイル:** `/lib/services/offers/AutoOfferService.ts`

**目的:** 赤字を防ぎながら自動的にオファーを計算・送信

**主要メソッド:**
- `getProductOfferSettings(productId)` - 商品のオファー設定取得
- `calculateOptimalOffer(productId, requestedOfferPrice)` - 最適オファー価格計算
- `sendOfferToBuyer(itemId, offerPrice, buyerId)` - オファー送信
- `processInterestedBuyerEvent(event)` - バイヤーイベント処理
- `adjustPriceForOfferMode(productId, adjustmentRate)` - 価格自動調整
- `validateOfferSettings(settings)` - 設定のバリデーション

**使用例:**

```typescript
import { autoOfferService } from '@/lib/services/offers/AutoOfferService';

// オファー価格を計算
const calculation = await autoOfferService.calculateOptimalOffer('product_123');

if (calculation.isProfitable && calculation.offerPrice) {
  // オファーを送信
  const result = await autoOfferService.sendOfferToBuyer(
    'ebay_item_456',
    calculation.offerPrice
  );

  console.log('オファー送信:', result.success);
  console.log('利益確保価格:', calculation.minimumOfferPrice);
}

// 設定のバリデーション
const settings = {
  sku: 'PROD-001',
  autoOfferEnabled: true,
  minProfitMarginJpy: 1000,
  maxDiscountRate: 0.15,
  purchasePriceJpy: 5000,
  currentListingPriceUsd: 100
};

const validation = autoOfferService.validateOfferSettings(settings);
if (!validation.valid) {
  console.error('設定エラー:', validation.issues);
}
```

**オファー価格計算ロジック:**

```
損益分岐点 = 仕入れ値 + 固定経費 + eBay手数料 + PayPal手数料 + 最低利益マージン

最低オファー価格 = MAX(
  損益分岐点,
  出品価格 × (1 - 最大割引率)
)

最終オファー価格 = 最低オファー価格 + わずかな上乗せ（例: +1ドル）
```

この計算により、**いかなるオファーも赤字にならないことが保証されます。**

### 3. CategoryLimitService

**ファイル:** `/lib/services/listing/CategoryLimitService.ts`

**目的:** カテゴリー別出品枠を管理し、eBayの制限違反を防止

**主要メソッド:**
- `canListInCategory(accountId, categoryId)` - 出品可否のチェック
- `incrementListingCount(accountId, categoryId, incrementBy)` - カウント増加
- `decrementListingCount(accountId, categoryId, decrementBy)` - カウント減少
- `setListingCount(accountId, categoryId, count)` - カウント設定
- `getCategoryLimit(accountId, categoryId)` - 制限情報取得
- `getAllCategoryLimits(accountId)` - 全カテゴリー制限取得
- `upsertCategoryLimit(accountId, categoryId, limitType, maxLimit)` - 制限の作成/更新
- `syncWithEbayAPI(accountId)` - eBay APIと同期
- `getAtCapacityCategories(accountId, threshold)` - 容量限界に近いカテゴリー取得
- `validateBatchListings(accountId, listings)` - 一括出品のバリデーション

**使用例:**

```typescript
import { categoryLimitService } from '@/lib/services/listing/CategoryLimitService';

// 出品可否をチェック
const check = await categoryLimitService.canListInCategory(
  'ebay_account_123',
  '183454' // CCG Individual Cards
);

if (check.canList) {
  console.log(`出品可能: 残り${check.remaining}枠`);
  console.log(`稼働率: ${check.utilizationRate}%`);

  // 出品実行後、カウントを増加
  await categoryLimitService.incrementListingCount('ebay_account_123', '183454');
} else {
  console.error('出品枠がいっぱいです');

  // 容量限界に近いカテゴリーを確認
  const atCapacity = await categoryLimitService.getAtCapacityCategories(
    'ebay_account_123',
    0.90 // 90%以上
  );

  console.log('警告が必要なカテゴリー:', atCapacity);
}

// 一括出品のバリデーション
const validation = await categoryLimitService.validateBatchListings(
  'ebay_account_123',
  [
    { categoryId: '183454', quantity: 5 },
    { categoryId: '139973', quantity: 10 }
  ]
);

if (!validation.canListAll) {
  console.log('ブロックされた出品:', validation.blockedListings);
}
```

## 📊 TypeScript型定義

### Supabase型定義の更新

`/lib/supabase.ts` に以下の型が追加されました:

```typescript
// ebay_category_limit テーブル
type EbayCategoryLimit = Database['public']['Tables']['ebay_category_limit']['Row'];
type EbayCategoryLimitInsert = Database['public']['Tables']['ebay_category_limit']['Insert'];
type EbayCategoryLimitUpdate = Database['public']['Tables']['ebay_category_limit']['Update'];

// products_master テーブル（オファーフィールド追加）
type ProductMaster = Database['public']['Tables']['products_master']['Row'];
```

### サービスクラスのインターフェース

各サービスクラスは、以下のような型定義を提供します:

```typescript
// ListingRotationService
interface LowScoreItem {
  id: string;
  sku: string;
  title: string;
  listing_score: number;
  ebay_item_id?: string;
  category_id?: string;
}

// AutoOfferService
interface OfferCalculation {
  offerPrice: number | null;
  isProfitable: boolean;
  breakEvenPrice: number;
  minimumOfferPrice: number;
  calculationDetails: { /* ... */ };
}

// CategoryLimitService
interface CapacityCheckResult {
  canList: boolean;
  remaining: number;
  currentCount: number;
  maxLimit: number;
  utilizationRate: number;
  warning?: string;
}
```

## 🔄 統合ワークフロー

### 出品前チェックフロー

```
1. CategoryLimitService.canListInCategory()
   ↓ 出品枠あり？
2. YES → 出品実行
   ↓
3. CategoryLimitService.incrementListingCount()
   ↓
4. 完了

2. NO → ListingRotationService.findRotationCandidate()
   ↓
3. 低スコア商品を特定
   ↓
4. ListingRotationService.endListing()
   ↓
5. CategoryLimitService.decrementListingCount()
   ↓
6. 新規出品実行
   ↓
7. CategoryLimitService.incrementListingCount()
   ↓
8. 完了
```

### オファー自動送信フロー

```
1. eBayイベント受信（ウォッチリスト追加など）
   ↓
2. AutoOfferService.processInterestedBuyerEvent()
   ↓
3. 商品のauto_offer_enabled確認
   ↓ TRUE
4. AutoOfferService.calculateOptimalOffer()
   ↓
5. 赤字防止チェック（isProfitable?）
   ↓ TRUE
6. AutoOfferService.sendOfferToBuyer()
   ↓
7. ログ記録
   ↓
8. 完了
```

## ⚙️ 次のステップ（実装が必要な箇所）

現在、以下のファイルは**メソッドシグネチャのみ**が定義されており、実際のロジックは実装されていません:

### 実装タスク一覧

#### フェーズ3: ロジック実装

**P3-1: ListingRotationService のロジック実装**
- [ ] `identifyLowScoreItems()` - Supabaseクエリ実装
- [ ] `findRotationCandidate()` - ビジネスロジック実装
- [ ] `endListing()` - eBay API呼び出し実装
- [ ] `executeRotation()` - 統合ワークフロー実装
- [ ] `getRotationStats()` - 統計収集実装

**P3-2: AutoOfferService のロジック実装**
- [ ] `getProductOfferSettings()` - Supabaseクエリ実装
- [ ] `calculateOptimalOffer()` - 価格計算ロジック実装
- [ ] `sendOfferToBuyer()` - eBay API呼び出し実装
- [ ] `processInterestedBuyerEvent()` - イベント処理実装
- [ ] `adjustPriceForOfferMode()` - 価格調整実装
- [ ] `getOfferStats()` - 統計収集実装

**P3-3: CategoryLimitService のロジック実装**
- [ ] `canListInCategory()` - PostgreSQL関数呼び出し実装
- [ ] `incrementListingCount()` - アトミック更新実装
- [ ] `decrementListingCount()` - アトミック更新実装
- [ ] `setListingCount()` - 同期更新実装
- [ ] `getCategoryLimit()` - Supabaseクエリ実装
- [ ] `getAllCategoryLimits()` - 一覧取得実装
- [ ] `upsertCategoryLimit()` - Upsert実装
- [ ] `syncWithEbayAPI()` - eBay API統合実装
- [ ] `getAtCapacityCategories()` - 容量分析実装
- [ ] `validateBatchListings()` - 一括バリデーション実装
- [ ] `getUtilizationStats()` - 統計収集実装

#### フェーズ4: API統合

**P4-1: オファーAPI作成**
- [ ] `/app/api/ebay/auto-offer/route.ts` - Webhook受信エンドポイント
- [ ] `/app/api/ebay/auto-offer/calculate/route.ts` - オファー計算API
- [ ] `/app/api/ebay/auto-offer/send/route.ts` - オファー送信API

**P4-2: カテゴリー枠管理API作成**
- [ ] `/app/api/ebay/category-limit/route.ts` - CRUD操作
- [ ] `/app/api/ebay/category-limit/sync/route.ts` - 同期API
- [ ] `/app/api/ebay/category-limit/check/route.ts` - チェックAPI

**P4-3: 出品交代API作成**
- [ ] `/app/api/ebay/rotation/route.ts` - 交代実行API
- [ ] `/app/api/ebay/rotation/candidates/route.ts` - 候補取得API

#### フェーズ5: UI統合

**P5-1: 商品編集モーダル拡張**
- [ ] `/app/tools/editing/components/ProductModal.tsx` にオファー設定セクションを追加
  - `auto_offer_enabled` チェックボックス
  - `min_profit_margin_jpy` 入力フィールド
  - `max_discount_rate` スライダー

**P5-2: eBayアカウント設定画面作成**
- [ ] `/app/settings/ebay-account/page.tsx` 新規作成
  - カテゴリー枠一覧表示
  - カテゴリー枠設定編集
  - 稼働率グラフ表示
  - 同期ボタン

**P5-3: ダッシュボード強化**
- [ ] `/app/dashboard/page.tsx` の更新
  - モックデータから実データへの切り替え
  - カテゴリー枠警告アラート追加
  - オファー統計ウィジェット追加

## 🧪 テスト計画

### ユニットテスト

各サービスクラスのメソッドに対して:
- [ ] 正常系テスト
- [ ] 異常系テスト（エラーハンドリング）
- [ ] エッジケーステスト

### 統合テスト

- [ ] データベーストリガーとヘルパー関数のテスト
- [ ] サービス間連携のテスト
- [ ] eBay APIモックとの統合テスト

### E2Eテスト

- [ ] 出品フロー全体のテスト
- [ ] オファー自動送信のエンドツーエンドテスト
- [ ] 出品交代の完全フローテスト

## 📝 開発ガイドライン

### コーディング規約

1. **エラーハンドリング**: すべての非同期メソッドは適切なエラーハンドリングを実装する
2. **ログ記録**: 重要な操作（出品終了、オファー送信など）は必ずログに記録
3. **トランザクション**: 複数テーブルを更新する場合はトランザクションを使用
4. **型安全性**: すべての関数シグネチャに明示的な型を定義

### パフォーマンス考慮事項

1. **インデックス活用**: 頻繁にクエリされるフィールドにはインデックスを設定済み
2. **バッチ処理**: 大量データ処理時はバッチクエリを使用
3. **キャッシング**: eBay APIレスポンスは適切にキャッシュ
4. **N+1問題回避**: 複数レコード取得時はJOINまたはIN句を使用

## 📚 参考資料

- [eBay Trading API Documentation](https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/index.html)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

## 🆘 トラブルシューティング

### マイグレーション失敗時

```sql
-- ロールバック用SQL
DROP TABLE IF EXISTS ebay_category_limit;
ALTER TABLE products_master DROP COLUMN IF EXISTS auto_offer_enabled;
ALTER TABLE products_master DROP COLUMN IF EXISTS min_profit_margin_jpy;
ALTER TABLE products_master DROP COLUMN IF EXISTS max_discount_rate;
DROP FUNCTION IF EXISTS can_list_in_category;
```

### 型エラーが発生した場合

TypeScriptコンパイラをリスタート:
```bash
# VSCodeの場合: Cmd+Shift+P → "TypeScript: Restart TS Server"
# またはプロジェクトを再ビルド
npm run build
```

## 🎯 まとめ

フェーズ2では、以下を完了しました:

✅ **データベーススキーマの拡張**
- `ebay_category_limit` テーブル作成
- `products_master` テーブルへのオファーフィールド追加
- ヘルパー関数とトリガーの実装

✅ **サービスクラスの基盤構築**
- `ListingRotationService` - メソッドシグネチャ完成
- `AutoOfferService` - メソッドシグネチャ完成
- `CategoryLimitService` - メソッドシグネチャ完成

✅ **型定義の更新**
- Supabase型定義に新テーブルを追加
- TypeScript型安全性の確保

次のフェーズでは、これらのサービスクラスに**実際のロジックを実装**し、**APIルートとUIを統合**します。

---

**作成日:** 2025-11-22
**バージョン:** 1.0.0
**ステータス:** フェーズ2完了、フェーズ3準備中
