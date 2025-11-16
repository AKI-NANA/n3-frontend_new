# N3 データベーススキーマ

## products_master（メインテーブル）

### 基本情報

| カラム名            | 型      | 説明                   |
| ------------------- | ------- | ---------------------- |
| id                  | integer | 主キー                 |
| sku                 | text    | 商品 SKU               |
| title               | text    | 商品タイトル（日本語） |
| english_title       | text    | 商品タイトル（英語）   |
| description         | text    | 商品説明（日本語）     |
| english_description | text    | 商品説明（英語）       |

### 価格情報

| カラム名      | 型      | 説明             |
| ------------- | ------- | ---------------- |
| price_jpy     | numeric | 仕入れ価格（円） |
| price_usd     | numeric | 販売価格（ドル） |
| cost_price    | numeric | コスト価格       |
| profit_amount | numeric | 利益額           |
| profit_margin | numeric | 利益率           |

### 画像データ

| カラム名          | 型     | 説明                      |
| ----------------- | ------ | ------------------------- |
| gallery_images    | jsonb  | 画像 URL 配列             |
| primary_image_url | text   | メイン画像 URL            |
| image_urls        | text[] | 画像 URL 配列（レガシー） |

### JSON 構造

| カラム名      | 型    | 説明                   |
| ------------- | ----- | ---------------------- |
| scraped_data  | jsonb | スクレイピング生データ |
| listing_data  | jsonb | 出品データ             |
| ebay_api_data | jsonb | eBay API データ        |

### 重要な JSONB 構造

#### scraped_data

```json
{
  "images": ["https://...", "https://..."],
  "condition": "目立った傷や汚れなし",
  "category": "おもちゃ、ゲーム > トレーディングカード",
  "shipping_cost": 230
}
```

#### listing_data

```json
{
  "condition": "目立った傷や汚れなし",
  "condition_en": "Good",
  "weight_g": 10,
  "length_cm": 8.8,
  "width_cm": 6.3,
  "height_cm": 0.1
}
```

## yahoo_scraped_products（スクレイピングテーブル）

| カラム名     | 型      | 説明               |
| ------------ | ------- | ------------------ |
| id           | integer | 主キー             |
| sku          | text    | SKU                |
| title        | text    | タイトル（日本語） |
| price_jpy    | numeric | 価格（円）         |
| description  | text    | 説明文             |
| scraped_data | jsonb   | 生データ           |
