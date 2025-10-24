# データフロー完全解説

## 🤔 あなたの懸念点

1. ✅ **モールごとにDBを分ける必要は？** → いいえ、全て同じテーブル
2. ✅ **データ二重保存で容量は？** → 問題なし（理由を説明）
3. ✅ **URLなど後で使えなくなる？** → 大丈夫、全て残ります

---

## 📊 現在のデータベース構造

```
┌─────────────────────────────────────────────────────────────┐
│ scraped_products (スクレイピング生データ)                      │
│ ─────────────────────────────────────────────────────────   │
│ • 全プラットフォーム共通テーブル                               │
│ • Yahoo Auction, PayPay Fleamarket, 将来のMercariなど全て    │
│ • platformフィールドで識別                                    │
│ • 役割: 一時的な生データ保存                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓ インポート（1回のみ）
┌─────────────────────────────────────────────────────────────┐
│ products (商品マスター - 出品管理用)                           │
│ ─────────────────────────────────────────────────────────   │
│ • 出品用に標準化されたテーブル                                 │
│ • scraped_dataフィールド(JSONB)に元データ全て保存              │
│ • /tools/editing で表示・編集                                │
│ • eBay/Shopee/Shopifyへ出品                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 なぜ2つのテーブルに分けるのか？

### scraped_products (生データ保存)

**役割**: スクレイピング結果をそのまま保存

**理由**:
1. **履歴として残す** - いつ、何を取得したか記録
2. **品質モニタリング** - 構造変化検知に使用
3. **再インポート可能** - 失敗したら再度インポートできる
4. **データ検証** - インポート前に内容確認

**例**: Yahoo Auctionで1000件スクレイピング
→ 内容確認 → 良い商品だけ選んでインポート

### products (商品マスター)

**役割**: 出品用に整理されたデータ

**理由**:
1. **標準化** - eBay, Shopeeなど出品先に関係なく同じ構造
2. **編集可能** - タイトル修正、価格調整、HTML生成
3. **出品履歴管理** - どこに出品したか追跡
4. **在庫管理** - 在庫数、ステータス管理

---

## 💾 実際のデータ保存例

### ケース: Yahoo Auctionからスクレイピング

#### 1. スクレイピング直後（scraped_products）

```sql
-- scraped_products テーブル
id: 123
title: "ポケモンカード ゲンガーVMAX"
price: 3500
shipping_cost: 110
total_cost: 3610
images: ["https://auctions.c.yimg.jp/image1.jpg", "https://..."]
description: "ポケモンカードゲームのゲンガーVMAX..."
source_url: "https://auctions.yahoo.co.jp/jp/auction/v1203583004"
platform: "Yahoo Auction"
category_path: "コミック、アニメグッズ > ..."
auction_id: "v1203583004"
condition: "目立った傷や汚れなし"
scraped_at: "2025-10-24T12:00:00Z"
```

**サイズ**: 約 2KB

---

#### 2. インポート後（products）

```sql
-- products テーブル
id: 456
source_item_id: "v1203583004"
title: "ポケモンカード ゲンガーVMAX"
english_title: "Pokemon Card Gengar VMAX"  -- AI翻訳済み
price_jpy: 3500
price_usd: 23.33  -- 為替計算済み
current_stock: 1
status: "ready"

-- ★重要: scraped_data (JSONB) に元データ全保存★
scraped_data: {
  "platform": "Yahoo Auction",
  "source_url": "https://auctions.yahoo.co.jp/jp/auction/v1203583004",
  "cost_price_jpy": 3610,  -- 仕入れ値
  "image_urls": [
    "https://auctions.c.yimg.jp/image1.jpg",
    "https://auctions.c.yimg.jp/image2.jpg"
  ],
  "description_jp": "ポケモンカードゲームのゲンガーVMAX...",
  "condition": "目立った傷や汚れなし",
  "category_path": "コミック、アニメグッズ > ...",
  "auction_id": "v1203583004",
  "scraped_at": "2025-10-24T12:00:00Z",
  "shipping_cost": 110,
  "original_price": 3500
}

listing_data: {
  "html_description": "<div>Pokemon Card Gengar VMAX...</div>",
  "ddp_price_usd": 29.99,
  "shipping_policy_id": "..."
}
```

**サイズ**: 約 3KB

---

## 🔍 データへのアクセス方法

### /tools/editing で商品クリック → モーダル表示

```typescript
// ProductModal.tsx が読み込むデータ
product.title                        // "ポケモンカード ゲンガーVMAX"
product.scraped_data.image_urls      // [画像URL配列] ← ここから画像表示
product.scraped_data.source_url      // 元URL ← クリックで元ページへ
product.scraped_data.cost_price_jpy  // 3610円 ← 仕入れ値
product.scraped_data.condition       // "目立った傷や汚れなし"
product.scraped_data.description_jp  // 日本語説明
product.listing_data.html_description // 英語HTML説明
```

**→ URLや画像など、全てのデータにアクセス可能！**

---

## 🌍 複数プラットフォーム対応

### モールごとにDBは分けない！

```
scraped_products テーブル（1つだけ）
├─ Yahoo Auction商品    (platform = "Yahoo Auction")
├─ PayPay Fleamarket商品 (platform = "PayPay Fleamarket")
├─ Mercari商品          (platform = "Mercari")  -- 将来
└─ Rakuma商品           (platform = "Rakuma")   -- 将来
```

**platformフィールドで区別するだけ！**

### なぜ分けないのか？

1. ✅ **同じ構造** - 基本項目（title, price, images）は共通
2. ✅ **JSONB活用** - プラットフォーム固有項目はJSONBに格納
3. ✅ **管理が楽** - 1つのテーブルでクエリ・集計可能
4. ✅ **拡張性** - 新プラットフォーム追加が容易

### プラットフォーム固有項目の扱い

```json
// Yahoo Auction固有
{
  "bid_count": "5件",
  "starting_price": 1000
}

// PayPay Fleamarket固有
{
  "like_count": 15
}

// Mercari固有（将来）
{
  "shipping_method": "らくらくメルカリ便"
}
```

**→ 全てscraped_data (JSONB) に柔軟に保存可能！**

---

## 💽 容量の心配は？

### 実際のデータサイズ

| 項目 | サイズ | 備考 |
|------|--------|------|
| scraped_products (1件) | 2KB | 生データ |
| products (1件) | 3KB | scraped_data含む |
| **合計** | **5KB** | 1商品あたり |

### 1万件スクレイピングした場合

```
scraped_products: 2KB × 10,000 = 20MB
products (インポート後): 3KB × 10,000 = 30MB
─────────────────────────────────────
合計: 50MB
```

**→ 全く問題なし！** （Supabaseは無料枠で500MBまで）

### 画像は保存しない

```
保存するのは: "https://auctions.c.yimg.jp/image1.jpg" (文字列URL)
保存しないのは: 画像ファイル本体
```

**→ URLだけなので容量は微小**

---

## 🔄 データ同期の問題は？

### インポート後の関係

```
scraped_products (id: 123)
  ↓ インポート (1回のみ)
products (id: 456)
  ├─ source_item_id: "v1203583004"  -- 元のauction_id
  └─ scraped_data.source_url: "..."  -- 元URL
```

**重要**: インポート後は独立

- ✅ `scraped_products` を削除しても `products` は影響なし
- ✅ `products` で編集しても `scraped_products` は影響なし
- ✅ 再インポートしたければ、新しいproductsレコードを作成

### 同期は不要！

**理由**:
- `products` は「商品マスター」として独立
- 編集、出品管理は `products` で完結
- `scraped_products` は「スクレイピング履歴」として保持

---

## 📈 データライフサイクル

```
┌──────────────────────────────────────────────────┐
│ 1. スクレイピング                                  │
│    Yahoo Auction → scraped_products (保存)        │
│    保持期間: 無期限（履歴として）                   │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ 2. データ確認                                      │
│    /data-collection で結果確認                     │
│    不要なものは削除、良いものだけインポート          │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ 3. インポート                                      │
│    scraped_products → products (変換)             │
│    - タイトル、価格などマッピング                    │
│    - scraped_dataに元データ全保存                  │
│    - AI翻訳、HTML生成などの加工                     │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ 4. 編集・管理                                      │
│    /tools/editing で表示・編集                     │
│    - モーダルで画像、説明など全て表示可能            │
│    - 価格調整、タイトル修正、カテゴリ選択            │
│    - 利益計算、SellerMirror分析                    │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ 5. 出品                                           │
│    eBay / Shopee / Shopify へ出品                 │
│    listing_history に記録                         │
└──────────────────────────────────────────────────┘
```

---

## ✅ まとめ: あなたの懸念への回答

### ❓ モールごとにDBを分ける？

**→ 分けません！**

- `scraped_products` は全プラットフォーム共通
- `platform` フィールドで識別
- JSONB で柔軟にプラットフォーム固有項目を保存

---

### ❓ データ二重保存で容量は？

**→ 問題なし！**

- 1商品 = 約5KB（画像URLのみ、実画像は保存しない）
- 1万件でも50MB（Supabaseは500MBまで無料）
- JSONBは圧縮されて効率的

---

### ❓ URLなど後で使えなくなる？

**→ 全て使えます！**

```typescript
// /tools/editing のモーダルで全データにアクセス可能
product.scraped_data.source_url      // 元URL
product.scraped_data.image_urls      // 全画像URL
product.scraped_data.cost_price_jpy  // 仕入れ値
product.scraped_data.condition       // 商品状態
product.scraped_data.category_path   // カテゴリパス
// ... 全てのデータが残っています
```

---

## 🎯 設計の利点

### 1. 柔軟性
- 新しいプラットフォーム追加が簡単
- プラットフォーム固有項目も対応可能

### 2. トレーサビリティ
- いつ、どこから取得したか記録
- 元データが常に参照可能

### 3. 安全性
- インポート前に内容確認
- 失敗しても再インポート可能

### 4. 効率性
- 必要な商品だけインポート
- 品質モニタリングで構造変化検知

---

**この設計で問題ありませんか？他に懸念点があればお知らせください！**
