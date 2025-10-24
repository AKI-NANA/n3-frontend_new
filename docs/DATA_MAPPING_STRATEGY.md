# スクレイピングデータ → 商品マスターへのマッピング戦略

## データフロー
```
[Yahoo Auction / PayPay Fleamarket など]
  ↓ スクレイピング
scraped_products テーブル
  ↓ インポート（マッピング）
products テーブル
  ↓ 表示・編集
/tools/editing
  ↓ 出品
eBay / Shopee / Shopify
```

---

## テーブル構造比較

### scraped_products (スクレイピング結果)

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | bigint | 自動採番 |
| title | text | 商品タイトル（日本語） |
| price | integer | 価格（円） |
| shipping_cost | integer | 送料（円） |
| total_cost | integer | **仕入れ値（円）** |
| source_url | text | 元URL |
| condition | text | 商品の状態 |
| bid_count | text | 入札数（オークション） |
| images | text[] | **画像URL配列** |
| description | text | 商品説明（日本語） |
| category_path | text | カテゴリパス（eBayマッピング用） |
| quantity | text | 個数 |
| shipping_days | text | 発送日数 |
| auction_id | text | 商品ID |
| starting_price | integer | 開始価格 |
| platform | text | プラットフォーム名 |
| scraped_at | timestamptz | スクレイピング日時 |
| scraping_method | text | スクレイピング手法 |

### products (商品マスター)

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | integer | 自動採番 |
| source_item_id | varchar | 元商品ID（auction_id） |
| sku | varchar | SKU（生成） |
| master_key | varchar | マスターキー |
| title | text | タイトル（日本語） |
| english_title | text | タイトル（英語）※要翻訳 |
| price_jpy | numeric | 価格（円） |
| price_usd | numeric | 価格（ドル）※要計算 |
| current_stock | integer | 在庫数 |
| status | varchar | ステータス |
| profit_margin | numeric | 利益率 |
| profit_amount_usd | numeric | 利益額（ドル） |
| ebay_api_data | jsonb | eBayカテゴリ等 |
| **scraped_data** | jsonb | **画像URL等** |
| **listing_data** | jsonb | **HTML説明、EU情報等** |
| eu_responsible_* | text | EU責任者情報 |
| sm_* | numeric | SellerMirror分析結果 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

---

## フィールドマッピング

### 基本情報

| scraped_products | → | products | 処理 |
|-----------------|---|----------|------|
| title | → | title | そのまま |
| title | → | english_title | **AI翻訳** |
| auction_id | → | source_item_id | そのまま |
| platform | → | scraped_data.platform | JSON格納 |
| source_url | → | scraped_data.source_url | JSON格納 |

### 価格・コスト

| scraped_products | → | products | 処理 |
|-----------------|---|----------|------|
| price | → | price_jpy | そのまま |
| total_cost | → | **scraped_data.cost_price_jpy** | 仕入れ値として保存 |
| price | → | price_usd | **為替計算**（例：price ÷ 150） |
| - | → | profit_amount_usd | **後で計算** |
| - | → | profit_margin | **後で計算** |

### 画像

| scraped_products | → | products | 処理 |
|-----------------|---|----------|------|
| images[] | → | **scraped_data.image_urls[]** | JSON配列として保存 |

**重要**: モーダルは `scraped_data.image_urls` を参照します！

### 商品情報

| scraped_products | → | products | 処理 |
|-----------------|---|----------|------|
| description | → | scraped_data.description_jp | そのまま |
| description | → | **listing_data.html_description** | **AI翻訳+HTMLフォーマット** |
| condition | → | scraped_data.condition | そのまま |
| category_path | → | scraped_data.category_path | eBayカテゴリ自動選択の参考 |

### オークション固有情報

| scraped_products | → | products | 処理 |
|-----------------|---|----------|------|
| bid_count | → | scraped_data.bid_count | 参考情報 |
| starting_price | → | scraped_data.starting_price | 参考情報 |
| shipping_days | → | scraped_data.shipping_days | 発送目安 |
| quantity | → | current_stock | 在庫数として設定 |

### メタ情報

| scraped_products | → | products | 処理 |
|-----------------|---|----------|------|
| scraped_at | → | scraped_data.scraped_at | 取得日時 |
| scraping_method | → | scraped_data.method | 手法記録 |

---

## JSON構造例

### scraped_data (JSONB)

```json
{
  "platform": "Yahoo Auction",
  "source_url": "https://auctions.yahoo.co.jp/jp/auction/v1203583004",
  "cost_price_jpy": 1910,
  "image_urls": [
    "https://auctions.c.yimg.jp/.../image1.jpg",
    "https://auctions.c.yimg.jp/.../image2.jpg"
  ],
  "description_jp": "ポケモンカードの説明文...",
  "condition": "目立った傷や汚れなし",
  "category_path": "コミック、アニメグッズ > 作品別 > ...",
  "bid_count": "0件",
  "starting_price": 1800,
  "shipping_days": "1〜2日で発送",
  "scraped_at": "2025-10-24T12:00:00Z",
  "method": "structure_based_puppeteer_v2025_product_info"
}
```

### listing_data (JSONB)

```json
{
  "html_description": "<div>Product description in English...</div>",
  "ddp_price_usd": 15.99,
  "eu_responsible_company_name": "...",
  "shipping_policy_id": "...",
  "payment_policy_id": "..."
}
```

---

## 処理フロー

### 1. インポート時の自動処理

```javascript
const importScrapedProduct = async (scrapedId) => {
  // 1. scraped_products から取得
  const scraped = await getScrapedProduct(scrapedId)

  // 2. マッピング
  const productData = {
    // 基本情報
    source_item_id: scraped.auction_id,
    title: scraped.title,
    english_title: null,  // 後でAI翻訳

    // 価格
    price_jpy: scraped.price,
    price_usd: scraped.price / 150,  // 仮レート

    // 在庫
    current_stock: scraped.quantity ? parseInt(scraped.quantity) : 1,

    // ステータス
    status: 'imported',  // 新規インポート

    // JSON データ
    scraped_data: {
      platform: scraped.platform,
      source_url: scraped.source_url,
      cost_price_jpy: scraped.total_cost,  // 仕入れ値
      image_urls: scraped.images,  // 画像配列
      description_jp: scraped.description,
      condition: scraped.condition,
      category_path: scraped.category_path,
      bid_count: scraped.bid_count,
      starting_price: scraped.starting_price,
      shipping_days: scraped.shipping_days,
      scraped_at: scraped.scraped_at,
      method: scraped.scraping_method
    },

    listing_data: {
      html_description: null,  // 後でHTML生成
      ddp_price_usd: null  // 後で計算
    }
  }

  // 3. products に挿入
  const inserted = await insertProduct(productData)

  return inserted
}
```

### 2. インポート後の追加処理（オプション）

```javascript
// eBayカテゴリ自動選択
await autoSelectEbayCategory(productId, scraped.category_path)

// AI翻訳
await translateTitle(productId)

// 利益計算
await calculateProfit(productId)

// HTML生成
await generateHTMLDescription(productId)
```

---

## 重要な設計判断

### ✅ 画像は scraped_data.image_urls に保存

**理由**: ProductModal は `product.scraped_data?.image_urls` を参照しているため

```typescript
// ProductModal.tsx (Line 29)
const imageUrls = product.scraped_data?.image_urls || product.listing_data?.image_urls || []
```

### ✅ 仕入れ値は scraped_data.cost_price_jpy に保存

**理由**: total_cost（価格+送料）が真の仕入れ値

### ✅ 元データは scraped_data に全て保持

**理由**:
- トレーサビリティ確保
- 後でデータ修正が必要な場合に参照可能
- スクレイピング手法の検証

---

## 今後のデータソース対応

新しいプラットフォーム（Mercari, Rakumaなど）を追加する場合：

1. **scraped_products テーブルは共通** - 新しいプラットフォームもこのテーブルに保存
2. **マッピングロジックは同じ** - 上記の変換処理を適用
3. **platform フィールドで識別** - "Mercari", "Rakuma" など

**統一されたデータフローが維持されます！**

---

## 次のステップ

1. ✅ マッピング戦略設計 ← **完了**
2. インポートAPI実装 (`/api/scraped-products/import`)
3. データ収集ページにインポートボタン追加
4. 自動翻訳・カテゴリ選択・利益計算の統合
5. テスト実行

---

**このマッピングで問題ありませんか？修正点があればお知らせください。**
