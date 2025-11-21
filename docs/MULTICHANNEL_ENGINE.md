# 多販路変換エンジン 実装ドキュメント

## 概要

多販路変換エンジンは、`products_master` のデータを複数のECプラットフォーム向けに自動変換するシステムです。以下のプラットフォームに対応しています：

- **eBay**
- **Shopee**
- **Amazon** (日本、米国、オーストラリア)
- **Coupang** (クーパン、韓国)
- **Qoo10**
- **Shopify**
- **メルカリ**

## 主要機能

### 1. 🌐 コア変換API

**パス**: `/app/api/products/transform-multichannel/route.ts`

商品データをプラットフォーム向けに変換します。

#### リクエスト例

```typescript
POST /api/products/transform-multichannel

{
  "sku": "PRODUCT-001",
  "targetPlatform": "coupang",
  "targetCountry": "KR"
}
```

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "platform": "coupang",
    "title": "[ja→ko] 商品タイトル",
    "description": "[ja→ko] 商品説明",
    "price": 15000,
    "currency": "KRW",
    "images": ["url1", "url2", "..."],
    "sku": "PRODUCT-001",
    "stockQuantity": 100,
    "platformSpecific": {
      "item_id": "PRODUCT-001",
      "brand": "Generic",
      "origin_country": "JP"
    },
    "warnings": []
  }
}
```

### 2. 💲 プラットフォーム別利益計算

**パス**: `/lib/pricing/PlatformPricing.ts`

各プラットフォームの手数料と送料を考慮した最適価格を算出します。

#### 主要機能

- **為替変換**: JPY → USD/AUD/KRW/SGD
- **プラットフォーム手数料**: カテゴリ別の手数料率を適用
- **配送料計算**: 重量ベースで配送方法別の料金を計算
  - Amazon FBA/FBM
  - Coupang Wing/Rocket
  - Qoo10 Qxpress
  - Shopee SLS
- **利益保証**: 最低利益率を下回らないよう価格を調整

#### 使用例

```typescript
import { calculatePlatformPrice } from '@/lib/pricing/PlatformPricing';

const result = await calculatePlatformPrice({
  costJpy: 1000,
  weightG: 500,
  platform: 'amazon_us',
  targetCountry: 'US',
  category: 'electronics',
}, 20); // 最低利益率20%

console.log(result.sellingPrice); // $12.50
console.log(result.profitMargin); // 23.5%
```

### 3. 🌍 多言語翻訳ロジック

**パス**: `/lib/multichannel/translator.ts`

プラットフォームの主要言語に自動翻訳します。

#### 対応言語

- 日本語 (ja)
- 英語 (en)
- 韓国語 (ko)
- 中国語 (zh)

#### 使用例

```typescript
import { translateForPlatform } from '@/lib/multichannel/translator';

const translated = await translateForPlatform(
  '日本製の高品質商品です',
  'coupang' // 韓国語に翻訳
);
```

#### TODO: 実際の翻訳API統合

現在はプレースホルダー実装です。以下のいずれかのAPIを統合する必要があります：

- Google Translate API
- DeepL API
- OpenAI GPT (実装例あり)

### 4. 🖼️ 画像規格調整

**パス**: `/lib/multichannel/imageProcessor.ts`

各モールの画像要件に合わせて画像を調整・バリデーションします。

#### 機能

- 画像枚数の制限
- サイズ要件のチェック
- アスペクト比の検証
- ファイルサイズのチェック
- フォーマットの検証

#### 使用例

```typescript
import { validateImages, adjustImageList } from '@/lib/multichannel/imageProcessor';

const { adjustedUrls, warnings } = adjustImageList(imageUrls, 'amazon_us');
```

### 5. 📄 CSV生成機能

**パス**: `/lib/multichannel/csvGenerator.ts`

プラットフォーム別のCSVフォーマットで商品データをエクスポートします。

#### 対応フォーマット

各プラットフォームの公式CSVフォーマットに準拠：

- eBay: 12画像対応、Action列付き
- Amazon: 9画像、ASIN/JAN対応
- Coupang: 韓国語ヘッダー、20画像対応
- Qoo10: 二重価格設定対応
- Shopee: SLS対応
- Shopify: Variant対応
- メルカリ: 送料負担設定対応

#### 使用例

```typescript
import { downloadCSV } from '@/lib/multichannel/csvGenerator';

downloadCSV({
  platform: 'coupang',
  products: [transformedData],
  includeHeaders: true,
  encoding: 'utf-8',
});
```

## ファイル構造

```
lib/multichannel/
├── types.ts                  # 型定義
├── platformConfigs.ts        # プラットフォーム別設定
├── platformFields.ts         # UI用フィールド定義
├── translator.ts             # 多言語翻訳
├── imageProcessor.ts         # 画像処理
└── csvGenerator.ts           # CSV生成

lib/pricing/
└── PlatformPricing.ts        # 価格計算エンジン

app/api/products/
└── transform-multichannel/
    └── route.ts              # 変換API

components/ProductModal/
└── components/Tabs/
    └── TabMultichannel.tsx   # UI (モーダルタブ)
```

## UI統合

### 統合編集モーダル

**パス**: `/components/ProductModal/FullFeaturedModal.tsx`

「多販路変換」タブが追加されています。

#### 使い方

1. 商品モーダルを開く
2. 「多販路変換」タブをクリック
3. ターゲットプラットフォームを選択
4. 「変換」ボタンをクリック
5. 変換結果を確認
6. 「CSVをダウンロード」をクリック
7. ダウンロードしたCSVを各プラットフォームにアップロード

## プラットフォーム別設定

### Amazon (US/AU/JP)

**必須項目**:
- ASIN (AU)
- UPC (US)
- JANコード (JP)
- ブランド
- フルフィルメント方法 (FBA/FBM)

**特記事項**:
- メイン画像は白背景必須
- 商品が画像の85%以上を占める必要あり
- 手数料: 8-17% (カテゴリ別)

### Coupang (韓国)

**必須項目**:
- 韓国語タイトル・説明文 (必須)
- Item ID (独自商品番号)
- ブランド
- 原産地
- カテゴリ

**特記事項**:
- 韓国語が必須
- カテゴリが細かい
- 手数料: 8-15% (カテゴリ別)
- Coupang Wing配送推奨

### Qoo10

**必須項目**:
- タイトル・説明文
- 通常価格
- セール価格 (オプション)
- カテゴリ
- 配送方法

**特記事項**:
- 二重価格設定が可能
- Qxpress配送がお得
- 手数料: 10% + 決済手数料2%

### Shopify

**特記事項**:
- SKUマスターを信頼
- 在庫連携の親和性が高い
- テーマに合わせた画像比率調整が重要
- 手数料: 2.9% + $0.30

### Shopee

**特記事項**:
- 正方形画像 (1:1) 推奨
- SLS (Shopee Logistics Service) 利用可能
- 手数料: 5% + 決済手数料2%

### メルカリ

**必須項目**:
- 商品名 (最大40文字)
- 商品説明 (最大1000文字)
- カテゴリ
- コンディション
- 配送方法
- 送料負担

**特記事項**:
- らくらくメルカリ便推奨
- 手数料: 10%

## 出品戦略エンジン 🎯

**パス**: `/lib/listing/ListingStrategyEngine.ts`

SKUマスターの商品データに基づき、最適な出品先（モール×アカウント×国）を自動決定するシステムです。

### 3層フィルタリングアーキテクチャ

1. **レイヤー1: システム制約チェック** - 物理的・技術的に出品不可能な候補を除外
   - 重複アカウントチェック（排他制御）
   - プラットフォーム規約チェック
   - 在庫・スコア閾値チェック

2. **レイヤー2: ユーザー戦略フィルタリング** - 経営判断・リスク回避のための除外
   - カテゴリ制限（ブラックリスト/ホワイトリスト）
   - アカウント専門性（専用化）
   - 価格レンジ制限

3. **レイヤー3: スコアリング＆優先順位付け** - 最も利益が見込める候補を選択
   - U_i,Mall = U_i × M_Mall
   - M_Mall = performance × competition × categoryFit

### 使用例

```typescript
import { determineListingStrategy } from '@/lib/listing/ListingStrategyEngine';

const result = determineListingStrategy(
  product,           // SKUMasterData
  allCandidates,     // MarketplaceCandidate[]
  existingListings,  // ListingData[]
  userSettings,      // UserStrategySettings
  boostSettings,     // MarketplaceBoostSettings[]
  -10000            // 最低グローバルスコア閾値
);

console.log(result.finalDecision);
// {
//   shouldList: true,
//   targetPlatform: 'ebay',
//   targetAccountId: 'ebay_main',
//   targetCountry: 'US',
//   reason: '最高スコア候補: ebay (ebay_main) - 最終スコア 111.54'
// }
```

### 主要機能

- **排他制御**: 同一プラットフォームに複数アカウントで同一商品を出品するのを防止
- **規約チェック**: 各モールの出品規約に違反していないかチェック
- **スコアリング**: 過去の売上実績、競合状況、カテゴリ適合度から最適な出品先を判定
- **柔軟な戦略設定**: ユーザー定義のカテゴリ制限、価格レンジ、アカウント専門性を反映

詳細は **[出品戦略エンジンドキュメント](./LISTING_STRATEGY_ENGINE.md)** を参照してください。

## 今後の拡張

### API連携準備

現在はCSV生成のみですが、将来的に各モールのAPIに直接連携できるよう設計されています。

#### 実装予定

1. **一時テーブル作成**
   - 変換済みデータを保存
   - API送信キューとして使用

2. **プラットフォーム別API統合**
   - eBay Trading API
   - Amazon MWS/SP-API
   - Shopee Open Platform
   - Coupang Partner API
   - Qoo10 API
   - Shopify Admin API

3. **自動同期機能**
   - 価格の自動更新
   - 在庫の自動同期
   - 注文の統合管理

### 翻訳API統合

現在はプレースホルダー実装なので、実際の翻訳APIを統合する必要があります。

#### 推奨API

- **DeepL** (高品質、韓国語対応)
- **Google Translate** (多言語対応)
- **OpenAI GPT** (コンテキスト理解に優れる)

実装例は `/lib/multichannel/translator.ts` に含まれています。

### 画像処理の実装

現在は画像URLのバリデーションのみです。実際の画像処理（リサイズ、トリミング）は今後実装予定です。

## トラブルシューティング

### 変換エラー

**問題**: 変換APIがエラーを返す

**解決策**:
1. SKUが正しいか確認
2. products_master にデータが存在するか確認
3. listing_data が紐づいているか確認

### 価格計算エラー

**問題**: 価格が異常に高い/低い

**解決策**:
1. products_master.price_jpy が正しいか確認
2. 重量 (weight_g) が正しいか確認
3. `/lib/pricing/PlatformPricing.ts` の為替レートを確認

### CSV生成エラー

**問題**: CSVフォーマットが正しくない

**解決策**:
1. プラットフォームの公式CSVテンプレートと比較
2. `/lib/multichannel/csvGenerator.ts` のヘッダー定義を確認

## サポート

問題が発生した場合は、以下を確認してください：

1. ブラウザのコンソールログ
2. サーバーログ (`console.log` 出力)
3. API レスポンス
4. データベースの products_master / listing_data

## ライセンス

社内利用のみ
