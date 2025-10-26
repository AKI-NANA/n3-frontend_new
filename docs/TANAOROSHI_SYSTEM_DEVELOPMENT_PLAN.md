# 📦 棚卸し（在庫）統合システム 開発計画書

**プロジェクト名**: 多販路統合棚卸し管理システム
**バージョン**: 1.0
**作成日**: 2025年10月26日
**開発期間**: 6週間（Phase 1-1 ～ Phase 1-4）
**技術スタック**: Next.js 14 + Supabase + TypeScript

---

## 📋 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システム全体像](#2-システム全体像)
3. [データベース設計](#3-データベース設計)
4. [機能要件](#4-機能要件)
5. [UI/UX設計](#5-uiux設計)
6. [開発フェーズ](#6-開発フェーズ)
7. [技術仕様](#7-技術仕様)
8. [テスト計画](#8-テスト計画)
9. [デプロイ計画](#9-デプロイ計画)
10. [リスク管理](#10-リスク管理)

---

## 1. プロジェクト概要

### 1.1 背景と目的

**現状の課題**:
- 在庫データと出品データが分離されており、二重管理が発生
- セット商品の在庫連動が手動で非効率
- 受注時の在庫減算が自動化されていない
- 複数モール（eBay、Amazon、Shopee等）の在庫を一元管理できていない

**目的**:
1. ✅ **在庫マスター管理**：SKU、原価、在庫数を一元管理する起点を作る
2. ✅ **出品フロー統合**：棚卸し → 出品データ作成 → 出品実行の一貫したフロー
3. ✅ **セット商品対応**：複数商品を組み合わせたセット品の自動在庫計算
4. ✅ **受注連動**：eBay/Amazon等の受注APIと連携し自動で在庫減算
5. ✅ **重複排除**：セット品出品時に構成単品の重複出品を自動停止

### 1.2 スコープ

**Phase 1（本計画書の対象）**:
- `/zaiko/tanaoroshi` 棚卸し管理画面の実装
- `inventory_master`、`set_components`、`inventory_changes` テーブルの構築
- 既存 `/tools/editing` との連携実装
- セット商品作成・出品機能
- 受注連動の基本ロジック

**Phase 2（将来計画）**:
- Amazon SP-API連携
- Shopee/Coupang API連携
- 在庫自動補充アラート
- 多言語対応

---

## 2. システム全体像

### 2.1 システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        ユーザー                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   棚卸し     │ │  出品編集    │ │  受注管理    │
│ /zaiko/      │ │ /tools/      │ │ /orders/     │
│ tanaoroshi   │ │ editing      │ │ webhook      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Supabase          │
              │  (PostgreSQL)       │
              │                     │
              │ • inventory_master  │
              │ • set_components    │
              │ • inventory_changes │
              │ • marketplace_      │
              │   listings          │
              └─────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   eBay API   │ │  Amazon      │ │   Shopee     │
│              │ │  SP-API      │ │   API        │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 2.2 データフロー

#### **A. 商品登録 → 出品フロー**

```
[棚卸し画面]
1. 商品登録モーダル
   ├─ SKU入力
   ├─ 原価入力
   ├─ 在庫数入力
   ├─ 画像アップロード
   └─ 仕入先情報（無在庫の場合）
        ↓
2. inventory_master に保存
        ↓
3. 「出品データ作成」ボタン
        ↓
[出品編集画面]
4. /tools/editing に遷移
   ├─ タイトル英訳
   ├─ カテゴリ選択
   ├─ HTML生成
   ├─ 配送設定
   └─ 価格設定
        ↓
5. TabFinal「出品実行」
        ↓
6. eBay AddItem API
        ↓
7. marketplace_listings に記録
```

#### **B. セット商品作成 → 出品フロー**

```
[棚卸し画面]
1. 商品A, B, Cを選択
        ↓
2. 「セット商品作成」ボタン
        ↓
3. セット品作成モーダル
   ├─ セット名入力
   ├─ 構成品と数量設定
   │  • iPhone × 1
   │  • AirPods × 1
   │  • AppleWatch × 1
   ├─ セット販売価格入力
   └─ 在庫数自動計算
        ↓
4. inventory_master (type='set') に保存
        ↓
5. set_components に構成情報保存
        ↓
6. 「出品データ作成」ボタン
        ↓
[出品編集画面]
7. /tools/editing でセット品情報表示
        ↓
8. 重複出品チェック
   ├─ iPhoneが既に出品中？
   │   → 自動停止フラグ
   └─ 警告メッセージ表示
        ↓
9. 「セット品として出品」実行
        ↓
10. 構成品の出品を自動停止
        ↓
11. セット品をeBayに出品
```

#### **C. 受注連動フロー**

```
[eBay受注通知]
1. Order Webhook受信
        ↓
2. /api/orders/webhook
        ↓
3. SKUでinventory_master検索
        ↓
4. 商品タイプ判定
   ├─ 単品（stock）
   │   → physical_quantity - 1
   └─ セット品（set）
       → 構成品の在庫をそれぞれ減算
        ↓
5. inventory_changes に履歴記録
   {
     change_type: 'sale',
     quantity_before: 10,
     quantity_after: 9,
     source: 'ebay_order_12345'
   }
        ↓
6. WebSocket通知で棚卸し画面をリアルタイム更新
```

---

## 3. データベース設計

### 3.1 テーブル構成

#### **A. inventory_master（棚卸しマスター）**

```sql
CREATE TABLE inventory_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unique_id TEXT UNIQUE NOT NULL,              -- 商品固有ID (ITEM-001, SET-001)
    product_name TEXT NOT NULL,                  -- 商品名
    sku TEXT,                                    -- SKU (管理コード)
    product_type inventory_type NOT NULL,        -- 'stock'|'dropship'|'set'|'hybrid'
    physical_quantity INTEGER DEFAULT 0,         -- 実在庫数
    listing_quantity INTEGER DEFAULT 0,          -- 出品中在庫数
    cost_price DECIMAL(12,2) DEFAULT 0,         -- 仕入価格（USD）
    selling_price DECIMAL(12,2) DEFAULT 0,      -- 販売価格（USD）
    condition_name TEXT DEFAULT 'used',          -- 状態（new/used/refurbished）
    category TEXT DEFAULT 'Electronics',         -- カテゴリ
    subcategory TEXT,                            -- サブカテゴリ
    images JSONB DEFAULT '[]'::jsonb,            -- 画像URL配列
    source_data JSONB DEFAULT '{}'::jsonb,       -- 仕入元データ
    supplier_info JSONB DEFAULT '{}'::jsonb,     -- 仕入先情報（無在庫用）
    is_manual_entry BOOLEAN DEFAULT FALSE,       -- 手動登録フラグ
    priority_score INTEGER DEFAULT 0,            -- 優先度スコア
    notes TEXT,                                  -- 備考
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE inventory_type AS ENUM ('stock', 'dropship', 'set', 'hybrid');

CREATE INDEX idx_inventory_sku ON inventory_master(sku);
CREATE INDEX idx_inventory_type ON inventory_master(product_type);
CREATE INDEX idx_inventory_updated ON inventory_master(updated_at);
```

**カラム説明**:

| カラム | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `product_type` | ENUM | 商品タイプ | 'stock'（有在庫）、'dropship'（無在庫）、'set'（セット品） |
| `physical_quantity` | INTEGER | 実在庫数（受注で自動減算） | 10 |
| `listing_quantity` | INTEGER | 各モールでの出品数合計 | 8 |
| `cost_price` | DECIMAL | 仕入価格（利益計算に使用） | 50.00 |
| `supplier_info` | JSONB | 仕入先URL、在庫追跡ID等 | `{"url": "https://...", "track_id": "..."}` |

#### **B. set_components（セット品構成）**

```sql
CREATE TABLE set_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    quantity_required INTEGER NOT NULL CHECK (quantity_required > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(set_product_id, component_product_id)
);

CREATE INDEX idx_set_components_set ON set_components(set_product_id);
CREATE INDEX idx_set_components_comp ON set_components(component_product_id);
```

**例**:
```sql
-- Apple Bundle Set (SET-001) の構成
INSERT INTO set_components VALUES
  (uuid1, 'SET-001', 'ITEM-001', 1),  -- iPhone × 1
  (uuid2, 'SET-001', 'ITEM-003', 1),  -- AirPods × 1
  (uuid3, 'SET-001', 'ITEM-004', 1);  -- AppleWatch × 1
```

#### **C. inventory_changes（在庫変更履歴）**

```sql
CREATE TABLE inventory_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    change_type change_type NOT NULL,            -- 変更タイプ
    quantity_before INTEGER NOT NULL,            -- 変更前在庫数
    quantity_after INTEGER NOT NULL,             -- 変更後在庫数
    source TEXT DEFAULT 'manual',                -- 変更元（manual/ebay_order/amazon_order）
    notes TEXT,                                  -- 備考
    metadata JSONB DEFAULT '{}'::jsonb,          -- 追加情報（注文ID等）
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE change_type AS ENUM ('sale', 'import', 'manual', 'adjustment', 'set_sale');

CREATE INDEX idx_changes_product ON inventory_changes(product_id);
CREATE INDEX idx_changes_type ON inventory_changes(change_type);
CREATE INDEX idx_changes_created ON inventory_changes(created_at);
```

**change_type説明**:
- `sale`: 受注による減算
- `import`: 仕入れによる増加
- `manual`: 手動調整
- `adjustment`: 棚卸し調整
- `set_sale`: セット品販売（構成品の減算）

### 3.2 ストアド関数

#### **セット品在庫数自動計算**

```sql
CREATE OR REPLACE FUNCTION calculate_set_available_quantity(set_id UUID)
RETURNS INTEGER AS $$
DECLARE
    min_available INTEGER := 999999;
    component_record RECORD;
BEGIN
    -- セットを構成する各商品の在庫数を取得
    FOR component_record IN
        SELECT
            im.physical_quantity,
            sc.quantity_required
        FROM set_components sc
        JOIN inventory_master im ON sc.component_product_id = im.id
        WHERE sc.set_product_id = set_id
    LOOP
        -- 各構成品で作成可能なセット数を計算し、最小値を取得
        min_available := LEAST(min_available,
            FLOOR(component_record.physical_quantity / component_record.quantity_required));
    END LOOP;

    IF min_available = 999999 THEN
        RETURN 0;
    END IF;

    RETURN min_available;
END;
$$ LANGUAGE plpgsql;
```

**使用例**:
```sql
-- セット商品の在庫数を取得
SELECT calculate_set_available_quantity('SET-001');
-- → 5 (iPhone 5個、AirPods 10個、Watch 8個 の場合)
```

#### **在庫自動更新トリガー**

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_master_updated_at
    BEFORE UPDATE ON inventory_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## 4. 機能要件

### 4.1 棚卸し管理画面（`/zaiko/tanaoroshi`）

#### **FR-T01: 商品一覧表示**

**優先度**: ⭐⭐⭐⭐⭐ (必須)

**機能**:
- 全商品を8列グリッドで表示
- カードビュー / テーブルビューの切替
- 商品タイプバッジ表示（有在庫/無在庫/セット品）
- 在庫数のカラー表示（在庫あり：緑、在庫切れ：赤）

**UI要素**:
```
┌──────────────────────────────────────────────────┐
│ 📦 棚卸し管理                                     │
├──────────────────────────────────────────────────┤
│ 総商品: 120  在庫あり: 85  在庫切れ: 35  選択中: 3 │
├──────────────────────────────────────────────────┤
│ [新規商品登録] [セット商品作成(3)] [CSV一括更新]  │
├──────────────────────────────────────────────────┤
│ 🔍 [検索...] [種類▼] [状態▼] [カテゴリ▼] [カード/テーブル] │
├──────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│ │ □  │ │ □  │ │ ☑  │ │ □  │ │ ☑  │ │ □  │ │ ☑  │ │ □  │ │
│ │[🖼]│ │[🖼]│ │[🖼]│ │[🖼]│ │[🖼]│ │[🖼]│ │[🖼]│ │[🖼]│ │
│ │商品│ │商品│ │商品│ │商品│ │商品│ │商品│ │商品│ │商品│ │
│ │名  │ │名  │ │名  │ │名  │ │名  │ │名  │ │名  │ │名  │ │
│ │SKU │ │SKU │ │SKU │ │SKU │ │SKU │ │SKU │ │SKU │ │SKU │ │
│ │$50 │ │$30 │ │$80 │ │$25 │ │$60 │ │$45 │ │$70 │ │$35 │ │
│ │在庫:│ │在庫:│ │在庫:│ │在庫:│ │在庫:│ │在庫:│ │在庫:│ │在庫:│ │
│ │ 10 │ │ 0  │ │ 15 │ │ 5  │ │ 8  │ │ 0  │ │ 12 │ │ 3  │ │
│ │[編集]│ │[編集]│ │[編集]│ │[編集]│ │[編集]│ │[編集]│ │[編集]│ │[編集]│ │
│ │[出品へ]│[出品へ]│[出品へ]│[出品へ]│[出品へ]│[出品へ]│[出品へ]│[出品へ]│
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
└──────────────────────────────────────────────────┘
```

**受入基準**:
- ✅ 100件以上の商品を1秒以内に表示
- ✅ レスポンシブ対応（モバイル：2列、タブレット：4列、PC：8列）
- ✅ 在庫0の商品は「出品へ」ボタンが無効化

---

#### **FR-T02: 商品登録モーダル**

**優先度**: ⭐⭐⭐⭐⭐ (必須)

**機能**:
- 有在庫/無在庫/セット品/ハイブリッドの選択
- 画像ドラッグ&ドロップアップロード（複数枚対応）
- SKU重複チェック
- 自動リサイズ（1000px以上、Amazon規約準拠）

**フォームフィールド**:

| フィールド | 必須 | バリデーション |
|-----------|------|---------------|
| 商品タイプ | ✅ | stock/dropship/set/hybrid |
| 商品名 | ✅ | 最大255文字 |
| SKU | ✅ | 半角英数字、重複不可 |
| 原価（USD） | | 数値、0以上 |
| 販売価格（USD） | | 数値、0以上 |
| 在庫数 | | 整数、0以上（有在庫のみ） |
| 状態 | ✅ | new/used/refurbished |
| カテゴリ | | テキスト |
| 仕入先 | | テキスト（無在庫のみ） |
| 画像 | | 最大10枚、各5MB以下 |

**UI要素**:
```
┌─────────────────────────────────────────┐
│ ✕ 新規商品登録                           │
├─────────────────────────────────────────┤
│ 商品タイプ                               │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 📦   │ │ 🚚   │ │ 📚   │ │ 🔄   │   │
│ │有在庫│ │無在庫│ │セット│ │ハイブ│   │
│ │      │ │      │ │商品  │ │リッド│   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│ 商品画像                                 │
│ ┌─────────────────────────────────────┐ │
│ │ 📷 画像をドラッグ&ドロップ            │ │
│ │    またはクリックして選択              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 商品名 *                                 │
│ [_________________________________]    │
│                                         │
│ SKU * ────────── 原価(USD)              │
│ [__________]    [__________]           │
│                                         │
│ 在庫数 ──────── 状態                     │
│ [__________]    [新品 ▼]               │
│                                         │
│ カテゴリ                                 │
│ [Electronics___________________________]│
│                                         │
│ 商品説明                                 │
│ [_________________________________]    │
│ [_________________________________]    │
│                                         │
│         [キャンセル] [保存して出品へ]      │
└─────────────────────────────────────────┘
```

**受入基準**:
- ✅ SKU重複時にエラーメッセージ表示
- ✅ 画像アップロード時に自動リサイズ（1000px以上）
- ✅ 保存後に「出品データ作成」ボタンが有効化

---

#### **FR-T03: セット商品作成**

**優先度**: ⭐⭐⭐⭐ (高)

**機能**:
- 複数商品を選択してセット品作成
- 各構成品の数量を設定
- セット在庫数を自動計算
- セット販売価格の設定

**フロー**:
```
1. 商品一覧で複数選択（チェックボックス）
   → 「セット商品作成」ボタン有効化
      ↓
2. セット商品作成モーダル表示
   ├─ セット名入力
   ├─ 構成品リスト表示
   │  • iPhone × [1] 在庫: 10個
   │  • AirPods × [1] 在庫: 15個
   │  • Watch × [1] 在庫: 8個
   ├─ 作成可能数: 8セット（自動計算）
   └─ セット販売価格: $1,800
      ↓
3. 「作成」ボタン
   → inventory_master (type='set') に保存
   → set_components に構成情報保存
      ↓
4. 「出品データ作成」ボタンで /tools/editing へ遷移
```

**UI要素**:
```
┌──────────────────────────────────────────┐
│ ✕ セット商品作成                          │
├──────────────────────────────────────────┤
│ セット商品名 *                            │
│ [Apple Bundle Set__________________]   │
│                                          │
│ 構成品と数量                              │
│ ┌────────────────────────────────────┐   │
│ │ [🖼] iPhone 14 Pro                 │   │
│ │      在庫: 10個      数量: [1] ▲▼ │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ [🖼] AirPods Pro                   │   │
│ │      在庫: 15個      数量: [1] ▲▼ │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ [🖼] Apple Watch Series 9          │   │
│ │      在庫: 8個       数量: [1] ▲▼ │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ 🧮 作成可能なセット数                │   │
│ │         8 セット                   │   │
│ │ ※ 構成品の在庫から自動計算          │   │
│ └────────────────────────────────────┘   │
│                                          │
│ セット販売価格（USD）*                    │
│ [1800.00___________________________]   │
│ 参考: 個別合計 $1,950.00                 │
│                                          │
│      [キャンセル] [作成して出品画面へ]     │
└──────────────────────────────────────────┘
```

**受入基準**:
- ✅ セット在庫数が正しく計算される
- ✅ 構成品の在庫が0の場合、セット作成不可
- ✅ セット作成後、自動で `/tools/editing` に遷移

---

#### **FR-T04: データ連携（出品データ作成）**

**優先度**: ⭐⭐⭐⭐⭐ (必須)

**機能**:
- 棚卸し画面から `/tools/editing` へのデータ受け渡し
- `inventory_master` → `yahoo_scraped_products` 形式への変換
- セット品情報の引き継ぎ

**実装方法**:

```typescript
// /zaiko/tanaoroshi で実行
const handleSendToEditing = async (productId: string) => {
  const { data: product } = await supabase
    .from('inventory_master')
    .select(`
      *,
      set_components (
        quantity_required,
        component:component_product_id (
          id, product_name, sku, images
        )
      )
    `)
    .eq('id', productId)
    .single()

  // yahoo_scraped_products に挿入
  await supabase.from('yahoo_scraped_products').insert({
    source: 'tanaoroshi',
    source_item_id: product.unique_id,
    sku: product.sku,
    title: product.product_name,
    price_jpy: product.cost_price * 150, // USD → JPY概算
    current_stock: product.physical_quantity,
    scraped_data: {
      images: product.images,
      category: product.category,
      is_set: product.product_type === 'set',
      set_components: product.set_components
    }
  })

  // /tools/editing に遷移
  router.push(`/tools/editing?from=tanaoroshi`)
}
```

**受入基準**:
- ✅ 商品データが正しく変換される
- ✅ セット品の構成情報が引き継がれる
- ✅ `/tools/editing` でデータが正常に表示される

---

### 4.2 出品編集画面（`/tools/editing`）拡張

#### **FR-E01: セット品情報表示**

**優先度**: ⭐⭐⭐⭐ (高)

**機能**:
- TabFinal にセット品専用セクション表示
- 構成品リストの表示
- 重複出品警告の表示

**UI要素** (TabFinal に追加):
```
┌──────────────────────────────────────────┐
│ TabFinal: 最終確認・出品実行              │
├──────────────────────────────────────────┤
│                                          │
│ 📚 セット商品情報                         │
│ ┌────────────────────────────────────┐   │
│ │ セット構成:                        │   │
│ │ • iPhone 14 Pro × 1                │   │
│ │ • AirPods Pro × 1                  │   │
│ │ • Apple Watch Series 9 × 1         │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ⚠️ 重複出品の警告                         │
│ ┌────────────────────────────────────┐   │
│ │ 以下の構成品が既に出品されています： │   │
│ │ • iPhone 14 Pro (eBay出品ID: 123) │   │
│ │                                    │   │
│ │ セット品出品時に自動停止されます。  │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [📦 セット品として出品]                   │
└──────────────────────────────────────────┘
```

**受入基準**:
- ✅ セット品の場合、構成品リストが表示される
- ✅ 重複出品がある場合、警告が表示される
- ✅ 出品実行時に構成品が自動停止される

---

#### **FR-E02: 重複出品チェック**

**優先度**: ⭐⭐⭐⭐ (高)

**機能**:
- セット品出品前に構成品の出品状況をチェック
- 重複がある場合、ユーザーに確認
- 確認後、構成品を自動停止

**実装**:

```typescript
const checkDuplicateListings = async (setComponents: any[]) => {
  const duplicates = []

  for (const comp of setComponents) {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('sku', comp.sku)
      .eq('marketplace', 'ebay')
      .eq('status', 'active')

    if (data && data.length > 0) {
      duplicates.push({
        name: comp.product_name,
        listingId: data[0].listing_id
      })
    }
  }

  return duplicates
}

const handlePublishSet = async () => {
  const duplicates = await checkDuplicateListings(setComponents)

  if (duplicates.length > 0) {
    const confirmed = confirm(
      `⚠️ 以下の構成品が既に出品されています。\n` +
      `これらの出品を自動停止してセット品を出品しますか？\n\n` +
      duplicates.map(d => `• ${d.name} (ID: ${d.listingId})`).join('\n')
    )

    if (!confirmed) return

    // 構成品を停止
    for (const dup of duplicates) {
      await stopListing(dup.listingId)
    }
  }

  // セット品を出品
  await publishSetProduct()
}
```

**受入基準**:
- ✅ 重複チェックが正しく動作する
- ✅ ユーザー確認後に構成品が停止される
- ✅ セット品が正常に出品される

---

### 4.3 受注連動機能

#### **FR-O01: 受注Webhook処理**

**優先度**: ⭐⭐⭐⭐⭐ (必須)

**機能**:
- eBay/Amazon等の受注通知を受信
- SKUで在庫を検索
- 在庫数を自動減算
- 履歴を記録

**実装**:

```typescript
// app/api/orders/webhook/route.ts
export async function POST(req: Request) {
  const order = await req.json()

  // SKUで商品検索
  const { data: product } = await supabase
    .from('inventory_master')
    .select('*')
    .eq('sku', order.sku)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // 在庫減算
  const newQuantity = product.physical_quantity - order.quantity

  await supabase
    .from('inventory_master')
    .update({ physical_quantity: newQuantity })
    .eq('id', product.id)

  // 履歴記録
  await supabase
    .from('inventory_changes')
    .insert({
      product_id: product.id,
      change_type: 'sale',
      quantity_before: product.physical_quantity,
      quantity_after: newQuantity,
      source: `${order.marketplace}_order_${order.orderId}`,
      metadata: {
        order_id: order.orderId,
        marketplace: order.marketplace,
        buyer: order.buyerName
      }
    })

  return NextResponse.json({ success: true })
}
```

**受入基準**:
- ✅ 受注通知を正しく処理できる
- ✅ 在庫数が正確に減算される
- ✅ 履歴が正しく記録される

---

## 5. UI/UX設計

### 5.1 デザインシステム

**カラーパレット**:
```css
:root {
  /* Primary */
  --color-primary: #3b82f6;      /* Blue 500 */
  --color-primary-dark: #2563eb; /* Blue 600 */

  /* 商品タイプ別カラー */
  --inventory-stock: #16a34a;    /* Green 600 - 有在庫 */
  --inventory-dropship: #9333ea; /* Purple 600 - 無在庫 */
  --inventory-set: #f59e0b;      /* Amber 500 - セット品 */
  --inventory-hybrid: #06b6d4;   /* Cyan 500 - ハイブリッド */

  /* Status */
  --color-success: #22c55e;      /* Green 500 */
  --color-warning: #f59e0b;      /* Amber 500 */
  --color-danger: #ef4444;       /* Red 500 */

  /* Neutral */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-600: #475569;
  --color-slate-900: #0f172a;
}
```

**タイポグラフィ**:
```css
/* フォントファミリー */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* フォントサイズ */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

**スペーシング**:
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
```

### 5.2 コンポーネント一覧

| コンポーネント | ファイルパス | 説明 |
|--------------|-------------|------|
| `ProductCard` | `components/inventory/ProductCard.tsx` | 商品カード表示 |
| `ProductRegistrationModal` | `components/inventory/ProductRegistrationModal.tsx` | 商品登録モーダル |
| `SetProductModal` | `components/inventory/SetProductModal.tsx` | セット商品作成モーダル |
| `StatsHeader` | `components/inventory/StatsHeader.tsx` | 統計ヘッダー |
| `FilterPanel` | `components/inventory/FilterPanel.tsx` | フィルターパネル |
| `ProductTypeBadge` | `components/inventory/ProductTypeBadge.tsx` | 商品タイプバッジ |
| `ImageUploader` | `components/inventory/ImageUploader.tsx` | 画像アップローダー |

---

## 6. 開発フェーズ

### Phase 1-1: データベース・基本UI（2週間）

**Week 1**:
- ✅ Supabaseマイグレーション実行
  - `inventory_master`
  - `set_components`
  - `inventory_changes`
  - インデックス作成
  - RLS ポリシー設定
- ✅ `/zaiko/tanaoroshi` ページ骨組み作成
- ✅ `ProductCard` コンポーネント実装
- ✅ `StatsHeader` コンポーネント実装

**Week 2**:
- ✅ 商品一覧表示機能（カードビュー）
- ✅ テーブルビュー実装
- ✅ フィルター機能（商品タイプ、カテゴリ、在庫状態）
- ✅ 検索機能（SKU、商品名）
- ✅ ページネーション

**成果物**:
- データベーススキーマ完成
- 商品一覧画面の基本機能完成

---

### Phase 1-2: 商品登録・連携（2週間）

**Week 3**:
- ✅ `ProductRegistrationModal` 実装
  - 商品タイプ選択UI
  - 画像アップロード機能
  - バリデーション
  - SKU重複チェック
- ✅ 画像リサイズ処理（Supabase Storageアップロード）
- ✅ 商品登録API実装

**Week 4**:
- ✅ 「出品データ作成」ボタン実装
- ✅ `/tools/editing` へのデータ受け渡し
- ✅ `inventory_master` → `yahoo_scraped_products` 変換ロジック
- ✅ `/tools/editing` でのデータ受取処理

**成果物**:
- 商品登録機能完成
- 棚卸し ↔ 出品編集の連携完成

---

### Phase 1-3: セット商品機能（2週間）

**Week 5**:
- ✅ 複数商品選択UI（チェックボックス）
- ✅ `SetProductModal` 実装
  - セット名入力
  - 構成品リスト表示
  - 数量設定UI
  - セット在庫自動計算
  - セット販売価格入力
- ✅ `set_components` テーブル連携
- ✅ `calculate_set_available_quantity()` 関数テスト

**Week 6**:
- ✅ `/tools/editing` でのセット品検出
- ✅ `TabFinal` にセット品情報表示
- ✅ 重複出品チェック機能
- ✅ 構成品自動停止ロジック
- ✅ セット品出品API実装

**成果物**:
- セット商品作成・出品機能完成

---

### Phase 1-4: 受注連動・最終調整（1週間）

**Week 7**:
- ✅ `/api/orders/webhook` 実装
- ✅ 在庫自動減算ロジック
- ✅ `inventory_changes` 履歴記録
- ✅ WebSocket通知実装（オプション）
- ✅ エラーハンドリング強化
- ✅ ログ機能実装

**成果物**:
- 受注連動機能完成
- システム全体の統合テスト完了

---

## 7. 技術仕様

### 7.1 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| **フロントエンド** | Next.js | 14.2.x |
| **言語** | TypeScript | 5.x |
| **UIライブラリ** | shadcn/ui | latest |
| **データベース** | Supabase (PostgreSQL) | 15.x |
| **認証** | Supabase Auth | latest |
| **ストレージ** | Supabase Storage | latest |
| **スタイリング** | Tailwind CSS | 3.x |
| **フォーム管理** | React Hook Form | 7.x |
| **バリデーション** | Zod | 3.x |
| **状態管理** | React Context + Hooks | - |

### 7.2 ディレクトリ構成

```
app/
├── zaiko/
│   └── tanaoroshi/
│       ├── page.tsx                    # メインページ
│       ├── components/
│       │   ├── ProductCard.tsx         # 商品カード
│       │   ├── ProductRegistrationModal.tsx  # 商品登録モーダル
│       │   ├── SetProductModal.tsx     # セット商品作成モーダル
│       │   ├── StatsHeader.tsx         # 統計ヘッダー
│       │   ├── FilterPanel.tsx         # フィルターパネル
│       │   └── ImageUploader.tsx       # 画像アップローダー
│       └── hooks/
│           ├── useInventoryData.ts     # 在庫データ取得
│           └── useSetCreation.ts       # セット商品作成
│
├── tools/
│   └── editing/
│       ├── page.tsx                    # 既存
│       └── components/
│           └── ProductModal.tsx        # 拡張: セット品対応
│
└── api/
    ├── inventory/
    │   ├── route.ts                    # GET/POST
    │   └── [id]/route.ts               # PUT/DELETE
    ├── inventory/
    │   └── set/route.ts                # セット品作成
    └── orders/
        └── webhook/route.ts            # 受注Webhook

components/
└── inventory/                          # 共通コンポーネント
    ├── ProductTypeBadge.tsx
    └── StockIndicator.tsx

lib/
├── supabase/
│   └── inventory.ts                    # 在庫関連ヘルパー
└── utils/
    ├── imageResize.ts                  # 画像リサイズ
    └── setCalculation.ts               # セット在庫計算

types/
└── inventory.ts                        # 在庫関連型定義
```

### 7.3 API仕様

#### **GET /api/inventory**

**説明**: 在庫一覧取得

**Query Parameters**:
```typescript
{
  product_type?: 'stock' | 'dropship' | 'set' | 'hybrid'
  search?: string          // SKUまたは商品名で検索
  category?: string
  stock_status?: 'in_stock' | 'out_of_stock'
  limit?: number           // デフォルト: 50
  offset?: number          // デフォルト: 0
}
```

**Response**:
```typescript
{
  data: InventoryProduct[]
  total: number
  limit: number
  offset: number
}
```

---

#### **POST /api/inventory**

**説明**: 商品登録

**Request Body**:
```typescript
{
  product_name: string
  sku: string
  product_type: 'stock' | 'dropship' | 'set' | 'hybrid'
  cost_price: number
  selling_price?: number
  physical_quantity: number
  condition_name: 'new' | 'used' | 'refurbished'
  category?: string
  images: string[]           // Supabase Storage URLs
  supplier_info?: {          // 無在庫の場合
    url: string
    tracking_id?: string
  }
}
```

**Response**:
```typescript
{
  success: true
  data: InventoryProduct
}
```

---

#### **POST /api/inventory/set**

**説明**: セット商品作成

**Request Body**:
```typescript
{
  product_name: string
  sku: string
  selling_price: number
  components: Array<{
    product_id: string
    quantity: number
  }>
}
```

**Response**:
```typescript
{
  success: true
  data: {
    set_product: InventoryProduct
    calculated_stock: number
  }
}
```

---

#### **POST /api/orders/webhook**

**説明**: 受注通知受信

**Request Body**:
```typescript
{
  marketplace: 'ebay' | 'amazon' | 'shopee'
  order_id: string
  sku: string
  quantity: number
  buyer_name: string
}
```

**Response**:
```typescript
{
  success: true
  updated_stock: number
}
```

---

## 8. テスト計画

### 8.1 ユニットテスト

**対象**:
- `lib/utils/setCalculation.ts` - セット在庫計算
- `lib/utils/imageResize.ts` - 画像リサイズ
- バリデーション関数

**ツール**: Jest + React Testing Library

**カバレッジ目標**: 80%以上

---

### 8.2 統合テスト

**シナリオ**:

**Test Case 1: 商品登録 → 出品フロー**
```
1. 商品登録モーダルを開く
2. SKU、原価、在庫数を入力
3. 画像をアップロード
4. 「保存」ボタンをクリック
5. inventory_master に保存されることを確認
6. 「出品データ作成」ボタンをクリック
7. /tools/editing に遷移することを確認
8. データが正しく表示されることを確認
```

**Test Case 2: セット商品作成 → 出品**
```
1. 商品A, B, Cを選択
2. 「セット商品作成」ボタンをクリック
3. セット名、数量を入力
4. セット在庫数が正しく計算されることを確認
5. 「作成」ボタンをクリック
6. set_components テーブルに保存されることを確認
7. /tools/editing に遷移
8. セット品情報が表示されることを確認
9. 重複チェックが動作することを確認
10. 出品実行で構成品が停止されることを確認
```

**Test Case 3: 受注連動**
```
1. 在庫10個の商品を準備
2. 受注Webhookを送信（quantity: 1）
3. 在庫が9個に減算されることを確認
4. inventory_changes に履歴が記録されることを確認
```

---

### 8.3 E2Eテスト

**ツール**: Playwright

**シナリオ**:
```
E2E-1: 完全な出品フロー
  ├─ 商品登録
  ├─ 出品データ編集
  ├─ eBay出品
  └─ 受注 → 在庫減算

E2E-2: セット品の完全フロー
  ├─ 単品登録×3
  ├─ セット作成
  ├─ セット出品
  ├─ 重複停止確認
  └─ セット受注 → 構成品在庫減算
```

---

## 9. デプロイ計画

### 9.1 環境

| 環境 | URL | 用途 |
|------|-----|------|
| **開発** | `localhost:3000` | ローカル開発 |
| **ステージング** | `https://staging.n3.emverze.com` | テスト環境 |
| **本番** | `https://n3.emverze.com` | 本番環境 |

### 9.2 デプロイフロー

```
1. 開発ブランチ（claude/tanaoroshi-system）で開発
   ↓
2. Pull Request作成
   ↓
3. レビュー + 自動テスト実行
   ↓
4. mainブランチにマージ
   ↓
5. Vercel自動デプロイ（本番）
   ↓
6. VPSでpm2 restart（現在の運用）
```

### 9.3 ロールバック計画

**手順**:
```bash
# VPS上で実行
cd /home/ubuntu/n3-frontend_new
git log --oneline -10  # 直前のコミットを確認
git checkout <前のコミットID>
npm run build
pm2 restart n3-frontend
```

---

## 10. リスク管理

### 10.1 技術的リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **画像アップロードの失敗** | 中 | - エラーハンドリング強化<br>- リトライ機能実装<br>- Supabase Storage容量監視 |
| **セット在庫計算の不整合** | 高 | - ストアド関数でのトランザクション保証<br>- 定期的な在庫整合性チェック |
| **受注Webhook取りこぼし** | 高 | - Webhook再送機能<br>- ログ記録<br>- 手動補正UI |
| **大量データでのパフォーマンス低下** | 中 | - ページネーション<br>- インデックス最適化<br>- キャッシング |

### 10.2 運用リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **ユーザーの操作ミス** | 中 | - 確認ダイアログ表示<br>- 操作履歴記録<br>- Undo機能（将来実装） |
| **データ消失** | 高 | - Supabase自動バックアップ<br>- 定期的な手動バックアップ |
| **API制限超過** | 中 | - レート制限監視<br>- アラート設定 |

---

## 11. 成功基準

### 11.1 機能面

- ✅ 商品登録から出品までのフローが5分以内で完了
- ✅ セット商品の在庫が正確に計算される（誤差0%）
- ✅ 受注から在庫減算まで30秒以内
- ✅ 100件以上の商品を1秒以内に表示

### 11.2 品質面

- ✅ ユニットテストカバレッジ80%以上
- ✅ E2Eテスト全シナリオPass
- ✅ Lighthouse Performance Score 90以上
- ✅ エラー発生率1%未満

### 11.3 ビジネス面

- ✅ 在庫管理工数を50%削減
- ✅ 重複出品ミスを0件に
- ✅ 在庫不足による機会損失を30%削減

---

## 12. 今後の拡張計画

### Phase 2（3ヶ月後）

- Amazon SP-API連携
- Shopee API連携
- Coupang API連携
- 在庫自動補充アラート

### Phase 3（6ヶ月後）

- 仕入先自動発注
- 多言語対応（英語、中国語）
- モバイルアプリ
- AI在庫予測

---

## 13. 開発リソース

### 13.1 開発体制

| 役割 | 担当者 | 工数 |
|------|--------|------|
| **プロジェクトマネージャー** | User | 全期間 |
| **フロントエンド開発** | Claude | 6週間 |
| **バックエンド開発** | Claude | 6週間 |
| **UI/UXデザイン** | Claude | 2週間 |
| **テスト** | Claude | 1週間 |

### 13.2 スケジュール

```
Week 1-2: Phase 1-1 (データベース・基本UI)
Week 3-4: Phase 1-2 (商品登録・連携)
Week 5-6: Phase 1-3 (セット商品機能)
Week 7:   Phase 1-4 (受注連動・最終調整)
```

**完成予定日**: 2025年12月8日

---

## 14. 承認

| 承認者 | 役割 | 承認日 |
|--------|------|--------|
| User | プロダクトオーナー | 2025-10-26 |

---

**以上、棚卸し（在庫）統合システム開発計画書**
