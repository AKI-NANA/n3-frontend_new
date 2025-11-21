# Shopee 多販路出品ツール実装ドキュメント

## 📋 概要

本ドキュメントは、Shopee出品ツールの実装内容をまとめたものです。eBayのSKUマスターデータを元に、Shopee各国の言語・通貨・カテゴリに自動変換し、CSV出力またはAPI連携で出品できるシステムを構築しました。

## 🌟 実装機能

### 1. 多言語翻訳システム (`/lib/shopee/translator.ts`)

**機能:**
- eBayの英語タイトル・説明文を各国言語に自動翻訳
- Google Translate API連携
- フォールバック機能（翻訳失敗時は英語をそのまま使用）
- 翻訳キャッシュ機能（同じテキストを複数回翻訳しない）

**対応国:**
- 🇹🇼 台湾 (中文繁體)
- 🇹🇭 タイ (ภาษาไทย)
- 🇸🇬 シンガポール (English)
- 🇲🇾 マレーシア (English)
- 🇵🇭 フィリピン (English)
- 🇻🇳 ベトナム (Tiếng Việt)
- 🇮🇩 インドネシア (Bahasa Indonesia)
- 🇧🇷 ブラジル (Português)
- 🇲🇽 メキシコ (Español)

**主要関数:**
```typescript
// テキスト翻訳
await translateText(text: string, targetCountry: ShopeeCountryCode)

// 商品情報一括翻訳
await translateProductListing(englishTitle, englishDescription, targetCountry)

// 複数国への同時翻訳
await translateProductToMultipleCountries(title, description, countries)
```

### 2. 為替レート取得システム (`/lib/shopee/exchangeRates.ts`)

**機能:**
- JPY → 各国通貨のリアルタイム為替レート取得
- ExchangeRate-API / Fixer API 連携
- フォールバックレート（API障害時）
- 60分キャッシュ機能

**主要関数:**
```typescript
// 全通貨レート取得
await getExchangeRates()

// Shopee対応国レート取得
await getShopeeExchangeRates()

// 通貨換算
convertJPYTo(amountJPY, rate)
convertToJPY(amount, rate)
```

### 3. Shopee利益計算システム (`/lib/mappers/shopee/profitCalculator.ts`)

**機能:**
- 仕入れ価格、重量、配送費から現地通貨での最適販売価格を算出
- 国別手数料率、SLS送料、補助率を考慮
- 目標利益率に基づく逆算価格計算

**計算式:**
```
Shopee価格 = [ (仕入れ円 + 国内送料) × 為替レート × (1 + 利益率) + SLS送料 × (1 - 補助率) ] / (1 - 手数料率)
```

**主要関数:**
```typescript
calculateShopeePrice({
  priceJpy: 8000,
  domesticShippingJpy: 800,
  targetCountry: 'TW',
  targetProfitRate: 0.25,
  productWeightKg: 0.5,
  exchangeRateJpyToTarget: 0.214
})
```

### 4. カテゴリマッピングテーブル (`/lib/shopee/categoryMapping.ts`)

**機能:**
- eBayカテゴリ → Shopeeカテゴリへの自動変換
- 国別カテゴリパスとID管理
- カテゴリ別必須属性・推奨属性の定義

**対応カテゴリ例:**
- 電子機器 (Consumer Electronics)
- ファッション (Clothing, Shoes & Accessories)
- 美容・健康 (Health & Beauty)
- ホーム&リビング (Home & Garden)
- スポーツ&アウトドア (Sporting Goods)
- おもちゃ&ホビー (Toys & Hobbies)

**主要関数:**
```typescript
// カテゴリマッピング検索
findShopeeCategoryMapping(ebayCategoryNameOrId)

// 特定国のカテゴリ情報取得
getShopeeCategoryForCountry(ebayCategory, country)

// デフォルトカテゴリ取得
getDefaultShopeeCategory(country)
```

### 5. データ変換API (`/app/api/shopee/transform-listing/route.ts`)

**機能:**
- products_masterのデータをShopee用に一括変換
- 翻訳、為替換算、価格計算を統合実行
- カテゴリ自動マッピング

**エンドポイント:**
```
POST /api/shopee/transform-listing

Request:
{
  "productId": "abc123",
  "targetCountry": "TW",
  "englishTitle": "Vintage Camera",
  "englishDescription": "...",
  "priceJpy": 8000,
  "weightG": 500,
  "targetProfitRate": 0.25,
  "ebayCategory": "Consumer Electronics"
}

Response:
{
  "success": true,
  "data": {
    "title": "復古相機",
    "description": "...",
    "categoryId": 100001,
    "categoryPath": ["電子產品", "相機與攝影"],
    "priceLocal": 380,
    "currency": "TWD",
    "profitRate": 0.25,
    "weightKg": 0.5
  }
}
```

### 6. CSV生成API (`/app/api/shopee/generate-csv/route.ts`)

**機能:**
- Shopee国別CSVフォーマットで出力
- 複数商品の一括CSV生成
- 画像URL、配送情報、属性データの自動整形

**CSVフォーマット (例: 台湾):**
```csv
category_id,item_name,description,item_sku,price,stock,weight,image_1,image_2,...
100001,復古相機,這是一款經典的復古相機...,SKU123,380,10,0.5,https://...,https://...
```

**エンドポイント:**
```
POST /api/shopee/generate-csv

Request:
{
  "targetCountry": "TW",
  "products": [
    {
      "sku": "SKU123",
      "title": "復古相機",
      "description": "...",
      "categoryId": 100001,
      "price": 380,
      "stock": 10,
      "weight": 0.5,
      "images": ["https://..."]
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "csv": "category_id,item_name,...",
    "fileName": "shopee_TW_2025-11-21T12-00-00.csv",
    "rowCount": 1
  }
}
```

### 7. バリデーションシステム (`/lib/shopee/validator.ts`)

**機能:**
- Shopee出品データの必須項目チェック
- 画像規格バリデーション (枚数、解像度、アスペクト比)
- タイトル・説明文の文字数制限チェック
- カテゴリ必須属性の検証

**バリデーション項目:**
- ✓ タイトル (最大120文字)
- ✓ 説明文 (最大5000文字)
- ✓ カテゴリID
- ✓ 価格 (>0)
- ✓ 在庫数 (≥0)
- ✓ 重量 (>0)
- ✓ 画像 (1-9枚、800x800px以上、1:1または3:4)
- ✓ SKU
- ✓ カテゴリ必須属性

**主要関数:**
```typescript
// 単一商品バリデーション
validateShopeeListingData({
  title, description, categoryId, price, stock, weight,
  images, brand, condition, sku, targetCountry
})

// バッチバリデーション
validateMultipleListings([listing1, listing2, ...])
```

### 8. 統合編集モーダルUI (`/components/ProductModal/components/Tabs/TabShopee.tsx`)

**機能:**
- Shopee出品データの可視化・編集UI
- ターゲット国選択 (9カ国対応)
- ワンクリック自動変換
- リアルタイムバリデーション
- CSV出力ボタン

**UI構成:**
1. **ターゲット国選択** - 9カ国のボタンから選択
2. **自動変換実行** - API呼び出しで翻訳・価格計算
3. **変換結果編集** - タイトル、説明文、価格、在庫など
4. **バリデーション** - 出品前の必須項目チェック
5. **CSV出力** - Shopee用CSVダウンロード

## 📁 ファイル構成

```
/lib/shopee/
├── translator.ts           # 翻訳システム
├── exchangeRates.ts        # 為替レート取得
├── categoryMapping.ts      # カテゴリマッピング
└── validator.ts            # バリデーション

/lib/mappers/shopee/
├── profitCalculator.ts     # 利益計算
└── ShopeeMapper.js         # 既存マッパー

/app/api/shopee/
├── transform-listing/
│   └── route.ts            # データ変換API
└── generate-csv/
    └── route.ts            # CSV生成API

/components/ProductModal/components/Tabs/
└── TabShopee.tsx           # Shopee専用UI
```

## 🚀 使い方

### 1. 環境変数設定

`.env.local` に以下を追加:

```env
# Google Translate API (翻訳用)
GOOGLE_TRANSLATE_API_KEY=your_api_key_here

# ExchangeRate-API (為替レート取得用)
EXCHANGE_RATE_API_KEY=your_api_key_here

# Fixer API (代替為替レートAPI)
FIXER_API_KEY=your_api_key_here
```

### 2. 統合編集モーダルでの操作

1. **マーケットプレイス選択** で「Shopee」を選択
2. **出品情報タブ** を開く
3. **ターゲット国** を選択 (例: 台湾)
4. **自動変換を実行** ボタンをクリック
5. 変換結果を確認・編集
6. **バリデーション実行** で出品可否をチェック
7. **CSV出力** で Shopee CSVをダウンロード

### 3. APIを直接使用する場合

```typescript
// データ変換
const response = await fetch('/api/shopee/transform-listing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'abc123',
    targetCountry: 'TW',
    englishTitle: 'Vintage Camera',
    englishDescription: 'A classic vintage camera...',
    priceJpy: 8000,
    weightG: 500,
    targetProfitRate: 0.25,
    domesticShippingJpy: 800,
    ebayCategory: 'Consumer Electronics',
  }),
});

// CSV生成
const csvResponse = await fetch('/api/shopee/generate-csv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetCountry: 'TW',
    products: [transformedData],
  }),
});
```

## ⚠️ 注意事項

### 翻訳API
- Google Translate APIキーが未設定の場合、フォールバックで英語がそのまま使用されます
- 翻訳精度を上げるため、英語タイトル・説明文は簡潔で明瞭な文章にしてください

### 為替レート
- APIキーが未設定の場合、固定フォールバックレートが使用されます
- フォールバックレートは定期的に更新する必要があります
- 本番環境では必ずAPI連携を推奨

### カテゴリマッピング
- 現在は主要6カテゴリのみ対応
- マッピングが見つからない場合はデフォルトカテゴリ (ID: 100099) が使用されます
- 新規カテゴリは `/lib/shopee/categoryMapping.ts` に追加してください

### Shopee API連携 (将来対応)
- 現在はCSV出力のみ対応
- Shopee Open API / Partner API 連携は今後実装予定
- API連携には Shopee Partner アカウントが必要

## 🔧 今後の拡張予定

1. **Shopee Open API 連携**
   - CSV手動アップロードから API自動出品へ移行
   - 在庫リアルタイム同期
   - 注文情報の自動取得

2. **画像変換機能**
   - 自動リサイズ・トリミング (800x800px, 1:1)
   - 画像圧縮・最適化
   - Shopee CDNへの直接アップロード

3. **カテゴリ拡張**
   - 全カテゴリマッピング対応
   - Shopee APIからの動的カテゴリ取得

4. **バリエーション対応**
   - 親SKU・子SKUの管理
   - サイズ・色バリエーションの自動生成

5. **バッチ処理**
   - 複数商品の一括変換・出品
   - スケジュール実行

## 📝 ライセンス

本実装は NAGANO-3 プロジェクトの一部です。

---

**作成日:** 2025-11-21
**作成者:** Claude AI
**バージョン:** 1.0.0
