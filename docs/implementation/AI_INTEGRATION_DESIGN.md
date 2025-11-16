# AI商品データ強化システム - 完全統合設計書

## 🎯 現状分析と課題

### 現在の利益計算システム（存在する）
- **場所**: `/app/api/profit-calculator/route.ts`
- **機能**: 基本的な利益計算、段階手数料、ROI計算
- **問題**: **HTSコードと原産国の関税率が考慮されていない**

### 現在のDDP計算システム（存在する）
- **場所**: `/app/api/ebay-intl-pricing/calculate/route.ts`
- **機能**: 国際配送、関税計算、VAT計算
- **データ取得**: `/lib/ebay-intl/data-fetcher.ts`
- **関税データ**: `customs_duties` テーブルから取得
  - `hs_code` × `origin_country` × `destination_country` で検索
  - デフォルト値あり（米国5%、カナダ18%等）

### 問題点
1. **HTSコードと原産国がないとDDP計算できない**
2. **現在は手動入力または推測値を使用**
3. **AIによる自動判定システムが未実装**

---

## 🚀 AI統合データフロー（完全版）

### Phase 1: データ収集（既存データ活用）

```
Supabase products テーブル
├─ scraped_data (JSONB)        ← Yahoo!から取得した生データ
│  ├─ title (日本語)
│  ├─ description (日本語)
│  ├─ price
│  ├─ image_urls (配列)
│  ├─ specifications (商品仕様)
│  └─ seller_info
│
├─ ebay_api_data (JSONB)       ← eBay APIから取得したデータ
│  ├─ category_id
│  ├─ item_specifics
│  └─ compatible_products
│
└─ listing_data (JSONB)        ← 手動入力データ（既存）
   ├─ weight_g
   ├─ dimensions { length, width, height }
   └─ cost_jpy
```

### Phase 2: AIへのデータ送信（Claude Web / Claude API）

#### 送信するデータ構造
```typescript
interface AIEnrichmentInput {
  // 商品基本情報
  productId: number
  title: string                    // 日本語タイトル
  description: string              // 商品説明
  
  // 既存の寸法・コストデータ
  weight_g?: number                // 既に入力済みなら送る
  length_cm?: number
  width_cm?: number
  height_cm?: number
  cost_jpy?: number
  
  // 画像URL（AIが視覚的に判断できる）
  image_urls: string[]
  
  // カテゴリ情報
  ebay_category_id?: number
  
  // 商品仕様（詳細情報）
  specifications?: Record<string, any>
}
```

#### AIプロンプト構造
```
以下の商品について、Web検索を使って正確な情報を調査し、JSON形式で回答してください。

**商品情報:**
- 商品名: {title}
- 説明: {description}
- 既存データ: 重量 {weight_g}g, サイズ {length}×{width}×{height}cm
- 画像: {image_urls[0]}

**調査項目:**

1. **Web検索で実物の寸法を取得**（推測NG、必ず検索してください）
   - 重量(g) ← 既存データがあれば確認のみ
   - 長さ(cm)、幅(cm)、高さ(cm) ← 既存データがあれば確認のみ
   - パッケージサイズではなく商品本体のサイズ

2. **HTSコード（10桁）を3つ候補を挙げてください**
   - 形式: XXXX.XX.XXXX
   - 商品の材質・用途に基づいて選定
   - 各候補の確信度スコア（0-100）

3. **原産国（製造国）**
   - 2文字の国コード（例: JP, CN, US）
   - 判定根拠を説明

4. **SEO最適化された英語タイトル**
   - 最大80文字
   - キーワードを含める
   - 先頭を大文字にしない（小文字で開始）

**回答フォーマット:**
{
  "weight_g": 250,
  "length_cm": 20.5,
  "width_cm": 15.0,
  "height_cm": 5.0,
  "hts_candidates": [
    {
      "code": "8471.30.0100",
      "description": "portable automatic data processing machines",
      "confidence": 85
    },
    {
      "code": "8517.62.0050",
      "description": "smartphones and cellular phones",
      "confidence": 70
    },
    {
      "code": "9006.91.0000",
      "description": "camera tripods and supports",
      "confidence": 60
    }
  ],
  "origin_country": "CN",
  "origin_reasoning": "商品説明に「Made in China」の記載、メーカーが中国企業",
  "english_title": "premium wireless bluetooth headphones with noise cancellation"
}
```

### Phase 3: AI結果の検証（Supabase）

```typescript
// 1. HTSコード検証
POST /api/hts/verify
{
  "hts_code": "9006.91.0000",
  "origin_country": "CN"
}

// レスポンス
{
  "success": true,
  "valid": true,
  "data": {
    "hts_code": "9006.91.0000",
    "origin_country": "CN",
    "duty_rate": 0.3400,        // 34%
    "special_program": "TRUMP_2025",
    "notes": "Camera tripods and supports - China origin"
  }
}

// 2. 関税率計算
POST /api/tariff/calculate
{
  "origin_country": "CN",
  "hts_code": "9006.91.0000"
}

// レスポンス
{
  "success": true,
  "data": {
    "origin_country": "CN",
    "country_name": "China",
    "country_name_ja": "中国",
    "base_tariff_rate": 0.2400,      // 24%
    "section301_rate": 0.1000,       // 10%
    "section232_rate": 0.0000,
    "antidumping_rate": 0.0000,
    "total_tariff_rate": 0.3400,     // 合計34%
    "hts_specific": true,
    "hts_code": "9006.91.0000"
  }
}
```

### Phase 4: データ保存（Supabase）

```typescript
// productsテーブル更新
PATCH /api/products/{productId}
{
  // 英語タイトル
  "english_title": "premium wireless bluetooth headphones with noise cancellation",
  
  // listing_data (JSONB) に格納
  "listing_data": {
    // 寸法情報（既存 + AI強化）
    "weight_g": 250,
    "length_cm": 20.5,
    "width_cm": 15.0,
    "height_cm": 5.0,
    
    // HTS情報（NEW）
    "hts_code": "9006.91.0000",
    "origin_country": "CN",
    "duty_rate": 0.3400,              // ← これがDDP計算に必要
    
    // AI判定の信頼度（オプション）
    "ai_confidence": {
      "hts_code": 85,
      "origin_country": "high",
      "dimensions": "verified"
    },
    
    // 既存データ（そのまま保持）
    "ddp_price_usd": 89.99,
    "html_description": "<p>...</p>"
  }
}
```

### Phase 5: DDP利益計算（既存システム活用）

```typescript
// 国際価格計算API（既存）
POST /api/ebay-intl-pricing/calculate
{
  "productId": "12345",
  "costJPY": 8000,
  "weightKg": 0.25,             // ← AI取得
  "lengthCm": 20.5,             // ← AI取得
  "widthCm": 15.0,              // ← AI取得
  "heightCm": 5.0,              // ← AI取得
  "hsCode": "9006.91.0000",     // ← AI判定 ✅
  "categoryId": 293,
  "condition": "New",
  "originCountry": "CN",        // ← AI判定 ✅
  "targetCountries": ["US", "UK", "DE"]
}

// data-fetcher.tsが自動的に以下を実行
// 1. customs_dutiesテーブルから関税率取得
//    WHERE hs_code = '9006.91.0000'
//      AND origin_country = 'CN'
//      AND destination_country = 'US'
// 
// 2. 関税計算
//    tariff = (item_price × 34%) + VAT
// 
// 3. 送料計算
//    cpass_ratesから重量・サイズで検索
// 
// 4. 総コスト算出
//    total = cost + shipping + tariff + VAT + ebay_fee
// 
// 5. 推奨価格算出
//    price = total / (1 - target_margin)
```

---

## 🔧 実装ステップ

### Step 1: AIDataEnrichmentModal（フロントエンド）

```typescript
// app/tools/editing/components/AIDataEnrichmentModal.tsx

interface AIDataEnrichmentModalProps {
  product: Product
  onClose: () => void
  onSave: (enrichedData: EnrichedData) => Promise<void>
}

// ワークフロー:
// 1. プロンプト自動生成
//    - product.title, scraped_data, listing_dataを使用
//    - 既存データがあれば「確認」モードに
// 
// 2. Claude Webで処理
//    - ユーザーがClaudeにプロンプトを貼り付け
//    - Web検索 + AI判定が実行される
// 
// 3. JSON結果を貼り付け
//    - パース + バリデーション
// 
// 4. Supabase検証
//    - /api/hts/verify でHTSコード検証
//    - /api/tariff/calculate で関税率取得
// 
// 5. データ保存
//    - listing_dataに統合して保存
```

### Step 2: ToolPanel統合

```typescript
// app/tools/editing/components/ToolPanel.tsx

<Button
  onClick={handleAIEnrich}
  variant="outline"
  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
>
  <Sparkles className="w-4 h-4" />
  AI商品データ強化
</Button>

// 動作:
// 1. 選択商品のデータを取得
// 2. AIDataEnrichmentModal を開く
// 3. 保存後に自動的にDDP計算を実行
```

### Step 3: 自動DDP計算トリガー

```typescript
// app/tools/editing/page.tsx

const handleSaveEnrichedData = async (data: EnrichedData) => {
  // 1. productsテーブル更新
  await updateProduct(productId, {
    english_title: data.english_title,
    listing_data: {
      ...existingListingData,
      weight_g: data.weight_g,
      dimensions: { ... },
      hts_code: data.hts_code,
      origin_country: data.origin_country,
      duty_rate: data.duty_rate
    }
  })
  
  // 2. 自動的にDDP計算を実行（バックグラウンド）
  await fetch('/api/ebay-intl-pricing/calculate', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      hsCode: data.hts_code,         // ← AI判定データ
      originCountry: data.origin_country,  // ← AI判定データ
      weightKg: data.weight_g / 1000,
      lengthCm: data.length_cm,
      widthCm: data.width_cm,
      heightCm: data.height_cm,
      costJPY: product.listing_data?.cost_jpy || product.price_jpy,
      categoryId: product.ebay_api_data?.category_id || 293,
      condition: 'New'
    })
  })
  
  // 3. UI更新
  showToast('AI強化 + DDP計算完了！')
  reloadProducts()
}
```

---

## 📊 データベース設計（完全版）

### 既存テーブル活用

```sql
-- productsテーブル（既存）
-- listing_data (JSONB) に以下を格納:

{
  // 寸法・コスト（既存）
  "weight_g": 250,
  "length_cm": 20.5,
  "width_cm": 15.0,
  "height_cm": 5.0,
  "cost_jpy": 8000,
  
  // HTS・原産国（NEW）
  "hts_code": "9006.91.0000",
  "origin_country": "CN",
  "duty_rate": 0.3400,
  
  // AI信頼度（オプション）
  "ai_confidence": {
    "hts_code": 85,
    "origin_country": "high",
    "dimensions": "verified",
    "enriched_at": "2025-10-29T10:30:00Z"
  },
  
  // 既存フィールド（そのまま）
  "ddp_price_usd": 89.99,
  "html_description": "<p>...</p>",
  "image_urls": ["url1", "url2"]
}
```

### 新規テーブル（AI判定履歴 - オプション）

```sql
CREATE TABLE IF NOT EXISTS ai_enrichment_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  
  -- 入力データ
  input_title TEXT,
  input_description TEXT,
  input_images TEXT[],
  
  -- AI判定結果
  hts_candidates JSONB,        -- 3つの候補
  selected_hts_code TEXT,      -- 選択されたHTSコード
  origin_country TEXT,
  origin_reasoning TEXT,
  english_title TEXT,
  
  -- 検証結果
  hts_verified BOOLEAN,
  duty_rate NUMERIC(6,4),
  
  -- メタデータ
  ai_model TEXT DEFAULT 'claude-sonnet-3.5',
  confidence_score INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 実装優先順位

### Phase 1: 基本実装（1-2時間）
1. ✅ Supabaseテーブル作成（完了）
2. ✅ バックエンドAPI作成（完了）
3. 🚧 AIDataEnrichmentModal作成
4. 🚧 ToolPanelにボタン追加
5. 🚧 page.tsxで統合

### Phase 2: DDP統合（30分）
1. 保存後の自動DDP計算トリガー
2. UIでの計算結果表示
3. エラーハンドリング強化

### Phase 3: 最適化（1時間）
1. 一括AI強化機能
2. AI判定履歴の保存
3. 信頼度スコアの活用

---

## 💡 重要ポイント

### 1. データの流れ
```
Yahoo!スクレイピング
  ↓
scraped_data (JSONB) に保存
  ↓
AI商品データ強化 [NEW]
  ↓
listing_data (JSONB) に hts_code + origin_country 追加
  ↓
DDP計算API (既存)
  ↓
customs_dutiesテーブルから関税率取得
  ↓
推奨価格算出
```

### 2. 既存システムとの統合
- **利益計算API**: `/api/profit-calculator` は基本計算用
- **DDP計算API**: `/api/ebay-intl-pricing` が関税込み計算用
- **AI強化**: `hts_code` と `origin_country` を提供することでDDP計算が正確に

### 3. Claude WebとAPI選択
- **Claude Web（無料）**: ユーザーが手動でプロンプト送信
  - メリット: コスト0円、Web検索が使える
  - デメリット: 手動コピペが必要
  
- **Claude API（有料）**: 自動化可能
  - メリット: 完全自動化、一括処理可能
  - デメリット: APIコスト（$3-15/1000リクエスト）
  
→ **推奨**: まずClaude Web版で実装、後でAPI版に切り替え可能

---

## 🚀 次のアクション

1. **Supabase SQLを実行**
   ```bash
   # /Users/aritahiroaki/n3-frontend_new/supabase/migrations/create_ai_enrichment_tables.sql
   ```

2. **AIDataEnrichmentModalを作成**
   - プロンプト自動生成機能
   - JSON貼り付け・パース機能
   - Supabase検証統合

3. **動作テスト**
   - 1商品でエンドツーエンドテスト
   - DDP計算まで自動実行確認

---

**作成日**: 2025-10-29
**バージョン**: 2.0（完全統合版）
