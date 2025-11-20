# セット品・バリエーション作成機能

## 📋 概要

このドキュメントでは、N3フロントエンドに追加された**セット品・バリエーション作成機能**の使い方と技術的詳細を説明します。

### 目的

- 複数のアイテムを統合的に選択し、セット品またはバリエーションとして出品できるようにする
- eBay向けの最低価格ベース・ダイナミック送料加算戦略を実装
- EU（DDU）とUSA（DDP）で最適な価格競争力を実現

---

## 🎯 主な機能

### 1. セット品作成（全モール共通）

複数のアイテムを組み合わせて1つのセット品として出品します。

**特徴:**
- 原価の自動計算（構成品のDDPコスト × 数量の合計）
- 最大在庫数の自動決定（構成品の中で最小）
- データ継承（最も高価なアイテムからカテゴリ、HTS、画像などを継承）
- 在庫連携（セット品が売れると構成品の在庫が自動で引き落とされる）

### 2. バリエーション作成（eBay特化）

複数のアイテムをバリエーション（色・サイズなど）として出品します。

**特徴:**
- **最低価格ベース戦略**: 全バリエーションの中で最も安いDDPコストを統一Item Price（eBay出品価格）とする
- **ダイナミック送料加算**: Item Priceとの差額をUSA向け送料に動的に加算
- **EU競争力**: EU（DDU販売）ではItem Priceが安価になるため、競争力を確保
- **リスク管理**: 過大な送料加算額や外部ツール連携失敗を検出

---

## 🛠️ 技術仕様

### データベーススキーマ

#### 1. products_master テーブル（追加カラム）

```sql
-- バリエーション・セット品関連
parent_sku_id TEXT                    -- 親SKU参照
variation_type TEXT                   -- 'Parent', 'Child', 'Single'
policy_group_id TEXT                  -- ポリシーグループID
external_tool_sync_status TEXT        -- 外部ツール連携ステータス
```

#### 2. ebay_variation_categories テーブル（新規）

```sql
CREATE TABLE ebay_variation_categories (
  id UUID PRIMARY KEY,
  category_id BIGINT UNIQUE NOT NULL,
  category_name TEXT,
  default_attributes JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. bundle_compositions テーブル（新規）

```sql
CREATE TABLE bundle_compositions (
  id UUID PRIMARY KEY,
  parent_sku TEXT NOT NULL,
  child_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (parent_sku) REFERENCES products_master(sku),
  FOREIGN KEY (child_sku) REFERENCES products_master(sku)
);
```

### listing_data JSONB構造

#### 親SKU（バリエーション）

```typescript
{
  min_ddp_cost_usd: 83.00,           // 統一Item Price
  variation_attributes: ["Color", "Size"],
  variations: [
    {
      variation_sku: "GOLF-001",
      attributes: [{ name: "Color", value: "Red" }],
      actual_ddp_cost_usd: 83.00,
      shipping_surcharge_usd: 0.00,
      stock_quantity: 10,
      image_url: "..."
    },
    {
      variation_sku: "GOLF-002",
      attributes: [{ name: "Color", value: "Blue" }],
      actual_ddp_cost_usd: 127.66,
      shipping_surcharge_usd: 44.66,  // USA向け加算額
      stock_quantity: 5,
      image_url: "..."
    }
  ]
}
```

#### 親SKU（セット品）

```typescript
{
  components: [
    {
      child_sku: "ITEM-A",
      child_title: "ゴルフクラブ",
      quantity: 2,
      unit_cost: 50.00,
      total_cost: 100.00
    },
    {
      child_sku: "ITEM-B",
      child_title: "ゴルフボール",
      quantity: 1,
      unit_cost: 20.00,
      total_cost: 20.00
    }
  ],
  total_component_cost: 120.00
}
```

---

## 🔌 API エンドポイント

### 1. バリエーション作成API

**エンドポイント:** `POST /api/products/create-variation`

**リクエスト:**

```json
{
  "selectedItems": [
    {
      "id": "123",
      "sku": "GOLF-001",
      "title": "ゴルフクラブ",
      "image": "...",
      "quantity": 1,
      "ddp_cost_usd": 83.00,
      "stock_quantity": 10
    },
    {
      "id": "124",
      "sku": "GOLF-002",
      "title": "ゴルフクラブ（青）",
      "image": "...",
      "quantity": 1,
      "ddp_cost_usd": 127.66,
      "stock_quantity": 5
    }
  ],
  "parentSkuName": "VAR-GOLF-001",
  "attributes": [
    [{ "name": "Color", "value": "Red" }],
    [{ "name": "Color", "value": "Blue" }]
  ]
}
```

**レスポンス:**

```json
{
  "success": true,
  "message": "バリエーションが正常に作成されました",
  "parentSku": "VAR-GOLF-001",
  "minPrice": 83.00,
  "children": [...],
  "warnings": [],
  "summary": {
    "totalVariations": 2,
    "unifiedItemPrice": 83.00,
    "maxShippingSurcharge": 44.66,
    "failedChildUpdates": 0
  }
}
```

### 2. セット品作成API

**エンドポイント:** `POST /api/products/create-bundle`

**リクエスト:**

```json
{
  "selectedItems": [
    {
      "id": "123",
      "sku": "ITEM-A",
      "title": "ゴルフクラブ",
      "quantity": 2,
      "ddp_cost_usd": 50.00,
      "stock_quantity": 20
    },
    {
      "id": "124",
      "sku": "ITEM-B",
      "title": "ゴルフボール",
      "quantity": 1,
      "ddp_cost_usd": 20.00,
      "stock_quantity": 50
    }
  ],
  "bundleSkuName": "BUNDLE-GOLF-001",
  "bundleTitle": "ゴルフスターターセット"
}
```

**レスポンス:**

```json
{
  "success": true,
  "message": "セット品が正常に作成されました",
  "bundleSku": "BUNDLE-GOLF-001",
  "bundleTitle": "ゴルフスターターセット",
  "totalCost": 120.00,
  "maxStock": 10,
  "components": [...],
  "summary": {
    "totalComponents": 2,
    "estimatedPrice": 156.00,
    "profitMargin": 0.3,
    "inheritedFrom": "ITEM-A"
  }
}
```

---

## 💻 UIコンポーネント

### 1. Grouping Box

**ファイル:** `/app/tools/editing/components/GroupingBox.tsx`

選択されたアイテムを表示し、セット品/バリエーション作成のための統合UIを提供します。

**主な機能:**
- 選択アイテムのリスト表示（SKU、商品名、画像、在庫数）
- 各アイテムの数量設定
- 合計コストと最大在庫数の自動計算
- バリエーション作成の事前チェック（DDPコスト近接、サイズ許容範囲）

### 2. VariationCreationModal

**ファイル:** `/app/tools/editing/components/VariationCreationModal.tsx`

バリエーション作成の詳細設定を行うモーダルです。

**主な機能:**
- 親SKU名の入力
- バリエーション属性の定義（Color, Size など）
- 各子SKUの属性値設定
- 統一Item Priceと送料加算額の表示

### 3. BundleCreationModal

**ファイル:** `/app/tools/editing/components/BundleCreationModal.tsx`

セット品作成の詳細設定を行うモーダルです。

**主な機能:**
- セット品SKU名の入力
- セット品タイトルの入力
- 構成品テーブルの表示
- 自動計算結果の表示（原価、最大在庫数）

---

## 🚀 使い方

### 1. セット品を作成する

1. 編集ページ（`/tools/editing`）で、セット品に含めたいアイテムにチェックを入れる
2. 「Grouping Box」ボタンをクリック
3. Grouping Boxで各アイテムの数量を設定
4. 「セット品作成（全モール共通）」ボタンをクリック
5. モーダルでセット品SKU名とタイトルを入力
6. 「セット品を作成」ボタンをクリック

### 2. バリエーションを作成する

1. 編集ページで、バリエーションに含めたいアイテムにチェックを入れる
2. 「Grouping Box」ボタンをクリック
3. 「バリエーション作成（eBay）」ボタンをクリック
   - DDPコスト近接チェックに合格する必要があります
4. モーダルで親SKU名を入力
5. バリエーション属性（Color, Size など）を定義
6. 各子SKUの属性値を入力
7. 「作成」ボタンをクリック

---

## ⚠️ 注意事項

### バリエーション作成の制約

- **最低2つのアイテムが必要**
- **DDPコスト近接**: 最大DDP - 最小DDPが$20または10%を超えないこと
- **サイズ許容範囲**: 最大体積が最小体積の150%を超えないこと

### 外部ツール連携

バリエーション作成後、外部ツール（Ebaymugなど）を使用して、USA向け送料加算ルールを設定する必要があります。

**手順:**
1. バリエーションを作成
2. `shipping_surcharge_usd` > 0 の子SKUを確認
3. 外部ツールで送料加算ルールを設定
4. 連携確認後、eBayに出品

### 在庫連携

セット品が出品されると、構成品の在庫が「予約済み」として引き落とされます。セット品が売れた場合、構成品の在庫が設定された数量分減少します。

---

## 🔧 開発者向け情報

### マイグレーションの実行

```bash
# マイグレーションAPIを使用
POST /api/admin/execute-migration
{
  "migrationFile": "001_add_bundle_variation_support.sql"
}
```

または、Supabase CLIを使用:

```bash
supabase migration up
```

### 型定義の場所

- **グローバル型**: `/types/product.ts`
- **編集ページ型**: `/app/tools/editing/types/product.ts`
- **完全型**: `/types/products-master-complete.ts`

### テスト

```bash
# バリエーション作成APIのテスト
curl -X POST http://localhost:3000/api/products/create-variation \
  -H "Content-Type: application/json" \
  -d @test-data/variation-request.json

# セット品作成APIのテスト
curl -X POST http://localhost:3000/api/products/create-bundle \
  -H "Content-Type: application/json" \
  -d @test-data/bundle-request.json
```

---

## 📚 関連ドキュメント

- [eBay Variation API Documentation](https://developer.ebay.com/api-docs/sell/inventory/resources/inventory_item/methods/bulkCreateOrReplaceInventoryItem)
- [開発指示書（原文）](../docs/BUNDLE_VARIATION_SPEC.md)

---

## 🤝 サポート

問題や質問がある場合は、開発チームまでお問い合わせください。
