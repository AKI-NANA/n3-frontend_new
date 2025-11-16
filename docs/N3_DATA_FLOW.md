# N3 データフロー完全マップ

## 1. スクレイピング → DB 保存

```
Yahoo Auction URL
  ↓
[Puppeteer スクレイピング]
app/api/scraping/execute/route.ts
  ↓
scraped_data = {
  images: ["url1", "url2", ...],
  condition: "目立った傷や汚れなし",
  category: "おもちゃ、ゲーム > ...",
  shipping_cost: 230
}
  ↓
[Supabase INSERT]
yahoo_scraped_products テーブル
```

## 2. 同期処理

```
yahoo_scraped_products
  ↓
[API: /api/sync-latest-scraped]
  - title → title
  - scraped_data.images → gallery_images
  - price_jpy → price_jpy
  - description → description
  ↓
products_master テーブル
```

## 3. 編集ツールでの表示

```
products_master
  ↓
[API: /api/products/list]
  ↓
app/tools/editing/page.tsx
  - テーブル表示
  - 商品クリック
  ↓
[モーダル開く]
components/ProductModal/FullFeaturedModal.tsx
  ↓
[タブ切り替え]
components/ProductModal/components/Tabs/TabData.tsx
  ↓
表示:
  - title (日本語)
  - english_title (英語)
  - price_jpy (円)
  - price_usd (ドル) = price_jpy / 152
  - gallery_images → 画像表示
  - scraped_data.category → カテゴリ表示
```

## 4. 保存処理

```
[ユーザーが編集]
formData = {
  title: "...",
  englishTitle: "...",
  cost: 4000,
  originCountry: "Japan"
}
  ↓
[API: /api/products/update]
POST /api/products/update
body = {
  id: 123,
  updates: {
    title: "...",
    title_en: "...",
    price_jpy: 4000,
    origin_country: "Japan"
  }
}
  ↓
[Supabase UPDATE]
products_master テーブル更新
```

## データマッピング一覧

| DB                    | API 経由                      | UI (formData)          | 表示名      |
| --------------------- | ----------------------------- | ---------------------- | ----------- |
| price_jpy             | product.price_jpy             | formData.cost          | 価格（JPY） |
| price_usd             | product.price_usd             | formData.price         | 価格（USD） |
| gallery_images        | product.gallery_images        | images 配列            | 商品画像    |
| scraped_data.category | product.scraped_data.category | scrapedData.category   | カテゴリー  |
| origin_country        | product.origin_country        | formData.originCountry | 原産国      |
