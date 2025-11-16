# AI商品データ強化システム - 完全無料版

## 🎯 課金回避設計の完成

### ✅ API課金を完全に回避する仕組み

```
【フロー】
1. 商品選択
   ↓
2. プロンプト生成（フロントエンド - 無料）
   - 商品データをブラウザで取得
   - セルミラーデータを統合
   - HTSコード候補を取得（既存API使用 - 無料）
   - 原産国マスターを取得（既存API使用 - 無料）
   ↓
3. 人間がGemini/Claude Webにコピペ（完全無料）
   - Gemini: https://gemini.google.com/
   - Claude: https://claude.ai/
   ↓
4. AIが回答（JSON形式）
   ↓
5. 人間が回答をコピー
   ↓
6. ツールにJSONを貼り付け
   ↓
7. 検証・保存（バックエンドAPI - 無料）
   - HTS検証
   - 関税計算
   - DB保存
   - DDP計算自動実行

💰 API課金: ¥0
```

---

## 📋 JSON標準フォーマット

### 入力フォーマット（AIに渡す）

```typescript
// プロンプトに含まれるデータ構造
{
  product: {
    id: number
    title: string
    description: string
    price_jpy: number
    images: string[]
    category: string
  },
  existingData: {
    weight_g: number | null
    length_cm: number | null
    width_cm: number | null
    height_cm: number | null
  },
  sellerMirror: {
    referenceCount: number
    averagePrice: number
    categoryPath: string
    topTitles: string[]  // 競合の英語タイトル例
  } | null,
  databaseReferences: {
    htsCandidates: Array<{
      code: string          // "8471.30.0100"
      description: string   // "portable automatic data processing machines"
      baseDuty: number
      section301Rate: number
    }>,
    countries: Array<{
      code: string  // "JP"
      name: string  // "Japan"
    }>
  }
}
```

### 出力フォーマット（AIからの回答）

```json
{
  "dimensions": {
    "weight_g": 250,
    "length_cm": 20.5,
    "width_cm": 15.0,
    "height_cm": 5.0,
    "verification_source": "公式サイト名 or Amazon商品ページ",
    "confidence": "verified | estimated | unknown"
  },
  "hts_candidates": [
    {
      "code": "8471.30.0100",
      "description": "portable automatic data processing machines",
      "reasoning": "このHTSコードを選んだ詳細な理由",
      "confidence": 85
    },
    {
      "code": "8517.62.0050",
      "description": "smartphones and cellular phones",
      "reasoning": "選定理由",
      "confidence": 70
    },
    {
      "code": "6204.62.4031",
      "description": "women's trousers and shorts",
      "reasoning": "選定理由",
      "confidence": 60
    }
  ],
  "origin_country": {
    "code": "CN",
    "name": "China",
    "reasoning": "商品説明に「Made in China」の記載があるため"
  },
  "english_title": "premium wireless bluetooth headphones with noise cancellation and 30h battery",
  "title_reasoning": "競合商品のタイトルパターンを参考に、主要キーワードを含めた（オプション）"
}
```

---

## 🔧 実装の詳細

### 1. プロンプト生成（フロントエンド）

**ファイル**: `AIDataEnrichmentModal.tsx`

**処理内容**:
- ✅ 商品データ: `product` propから取得
- ✅ セルミラーデータ: `product.ebay_api_data.listing_reference`から取得
- ✅ 既存寸法: `product.listing_data`から取得
- ✅ HTSコード候補: `/api/hts-codes`から取得（既存API - 無料）
- ✅ 原産国マスター: `/api/hts-countries`から取得（既存API - 無料）

**生成されるプロンプト**:
```markdown
# 商品データ強化タスク

## 📦 商品基本情報
- 商品名: (商品タイトル)
- 価格: ¥(価格)
- 画像URL: (画像URL)

## 🔍 eBay競合分析データ（SellerMirror）
- 類似商品数: 10件
- 平均価格: $29.99
- 競合商品の英語タイトル例:
  1. Premium Wireless Bluetooth Headphones...
  2. Noise Cancelling Headphones with...
  3. ...

## 🗂️ データベース参照（以下から選択）
### HTSコード候補
- 8471.30.0100: portable automatic data processing machines
- 8517.62.0050: smartphones and cellular phones
- ...

### 原産国候補
- JP: Japan
- CN: China
- ...

## 📋 実行タスク
1. 寸法データの確認・取得（Web検索で実物確認）
2. HTSコード判定（上記から3つ選択）
3. 原産国判定（上記から選択）
4. SEO最適化英語タイトル生成

## 📤 回答フォーマット
```json
{...}
```
```

### 2. JSON検証・保存（バックエンド）

**ファイル**: `/api/ai-enrichment/save-result/route.ts`

**処理フロー**:
```typescript
1. JSONパース・バリデーション
   ↓
2. HTS検証
   POST /api/hts/verify
   {
     hts_code: "8471.30.0100",
     origin_country: "JP"
   }
   ↓
3. 関税率計算
   POST /api/tariff/calculate
   {
     origin_country: "JP",
     hts_code: "8471.30.0100"
   }
   ↓
4. products テーブル更新
   UPDATE products SET
     english_title = "...",
     listing_data = {
       ...existing,
       weight_g: 250,
       dimensions: {...},
       hts_code: "8471.30.0100",
       origin_country: "JP",
       duty_rate: 0.0275,
       ai_confidence: {
         hts_code: 85,
         dimensions: "verified",
         enriched_at: "2025-10-29T12:00:00Z"
       }
     }
   ↓
5. DDP計算自動実行（バックグラウンド）
   POST /api/ebay-intl-pricing/calculate
```

---

## 🎨 UIの改善点

### モーダルの機能

#### ステップ1: プロンプト表示
- 📊 統合データ概要カード
  - 商品タイトル
  - セルミラーデータ件数
  - HTSコード候補件数
  - 原産国マスター件数

- 🚀 無料AI利用ガイド
  - 手順説明（5ステップ）
  - 「Gemini を開く」ボタン → `https://gemini.google.com/`
  - 「Claude を開く」ボタン → `https://claude.ai/`

- 📋 プロンプト表示エリア
  - 読み取り専用テキストエリア
  - 「コピー」ボタン → クリップボードにコピー

#### ステップ2: JSON貼り付け
- ✅ 貼り付けガイド
  - JSON部分のみ貼り付け指示
  - マークダウン記号（```json）は自動削除

- 📝 JSON入力エリア
  - フリーテキスト入力
  - リアルタイムバリデーション

- ▶️ 「検証して保存」ボタン
  - JSONパース
  - バックエンドAPI呼び出し

#### ステップ3: 検証中
- 🔄 ローディング表示
  - スピナーアニメーション
  - 「Supabaseで検証中...」メッセージ

#### ステップ4: 完了
- ✅ 成功メッセージ
  - HTSコード表示
  - 原産国表示
  - 関税率表示

- 💰 API課金情報
  - **API課金: ¥0** を明示
  - 無料のGemini/Claude使用を強調

---

## 🔄 データフローの最適化

### キャッシュ戦略

```typescript
// HTSコード候補のキャッシュ（ローカルストレージ）
const fetchHTSCandidates = async () => {
  const cached = localStorage.getItem('hts_candidates')
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    // 24時間以内ならキャッシュを使用
    if (Date.now() - timestamp < 86400000) {
      return data
    }
  }
  
  // キャッシュがない or 古い場合はAPI呼び出し
  const response = await fetch('/api/hts-codes')
  const data = await response.json()
  
  localStorage.setItem('hts_candidates', JSON.stringify({
    data,
    timestamp: Date.now()
  }))
  
  return data
}
```

### バックグラウンド処理

```typescript
// DDP計算を非同期実行（ユーザーを待たせない）
async function triggerDDPCalculation(result: AIEnrichmentResult) {
  try {
    console.log('📊 DDP計算を自動実行中...')
    
    const ddpResponse = await fetch('/api/ebay-intl-pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({
        productId: result.productId,
        weightKg: result.dimensions.weight_g / 1000,
        hsCode: result.hts_candidates[0].code,
        originCountry: result.origin_country.code
      })
    })
    
    if (ddpResponse.ok) {
      console.log('✅ DDP計算完了')
    }
  } catch (error) {
    console.error('DDP計算エラー:', error)
    // エラーでもユーザーには影響させない
  }
}
```

---

## 📊 コスト比較

### API課金方式（従来型）
```
Claude API:
- $0.003 / 1K input tokens
- $0.015 / 1K output tokens
- 1商品あたり約$0.05（約¥7.5）
- 100商品: ¥750
- 1000商品: ¥7,500

Gemini API:
- $0.00025 / 1K input tokens
- $0.0005 / 1K output tokens
- 1商品あたり約$0.003（約¥0.45）
- 100商品: ¥45
- 1000商品: ¥450
```

### 無料Web版方式（今回実装）
```
Gemini Web: 完全無料
Claude Web: 完全無料

処理時間:
- 1商品あたり約30秒（人間の操作時間含む）
- 100商品: 約50分（並行処理で短縮可能）

コスト: ¥0
```

---

## 🚀 使用方法

### 1. 商品選択
```
/tools/editing ページで商品を1つ選択
```

### 2. AI強化開始
```
「AI強化」ボタン（紫グラデーション）をクリック
```

### 3. プロンプトコピー
```
モーダルの「コピー」ボタンでプロンプトをコピー
```

### 4. AI実行
```
「Gemini を開く」または「Claude を開く」ボタンをクリック
→ 新しいタブでAIサービスが開く
→ プロンプトを貼り付けて送信
```

### 5. JSON取得
```
AIの回答からJSON部分をコピー
（```json ... ``` の部分）
```

### 6. 結果貼り付け
```
モーダルに戻る
→ 「次へ」をクリック
→ JSONを貼り付け
→ 「検証して保存」をクリック
```

### 7. 完了
```
✅ 検証成功
✅ DB保存
✅ DDP計算自動実行
```

---

## 🔐 セキュリティ

### JSONバリデーション

```typescript
// 必須フィールドチェック
if (!parsed.dimensions || !parsed.hts_candidates || 
    !parsed.origin_country || !parsed.english_title) {
  throw new Error('必須フィールドが不足しています')
}

// HTSコード候補数チェック
if (parsed.hts_candidates.length < 3) {
  throw new Error('HTSコード候補は3つ必要です')
}

// データ型チェック
if (typeof parsed.dimensions.weight_g !== 'number' ||
    parsed.dimensions.weight_g <= 0) {
  throw new Error('重量データが不正です')
}
```

### サーバーサイド検証

```typescript
// HTS検証（Supabaseで実在確認）
const verifyResponse = await fetch('/api/hts/verify', {
  method: 'POST',
  body: JSON.stringify({
    hts_code: topHtsCandidate.code,
    origin_country: result.origin_country.code
  })
})

if (!verifyResult.valid) {
  throw new Error('HTSコード検証失敗')
}

// 関税率計算（正確な税率取得）
const tariffResponse = await fetch('/api/tariff/calculate', {...})
```

---

## 📈 今後の拡張

### Phase 2: バッチ処理
```typescript
// 複数商品の連続処理
interface BatchAIEnrichment {
  products: Product[]
  onProgress: (index: number, total: number) => void
  onComplete: (results: AIResult[]) => void
}

// 実装例
for (let i = 0; i < products.length; i++) {
  const prompt = generatePrompt(products[i])
  // 人間が1つずつAIで処理
  onProgress(i + 1, products.length)
}
```

### Phase 3: プロンプトテンプレート
```typescript
// カテゴリ別のプロンプトテンプレート
const templates = {
  electronics: {...},
  apparel: {...},
  toys: {...}
}

// 商品カテゴリに応じて最適なプロンプト生成
const template = templates[product.category] || templates.default
```

### Phase 4: AI判定履歴
```sql
CREATE TABLE ai_enrichment_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  prompt_data JSONB,
  ai_response JSONB,
  verification_result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ チェックリスト

### 実装完了項目
- ✅ プロンプト生成（フロントエンド）
- ✅ セルミラーデータ統合
- ✅ HTSコード候補取得
- ✅ 原産国マスター取得
- ✅ JSON標準フォーマット定義
- ✅ JSON検証・保存API
- ✅ HTS検証API統合
- ✅ 関税計算API統合
- ✅ DDP自動計算
- ✅ UIモーダル実装
- ✅ エラーハンドリング
- ✅ API課金: ¥0

### テスト項目
- ✅ プロンプト生成テスト
- ✅ JSONパーステスト
- ✅ HTS検証テスト
- ✅ 関税計算テスト
- ✅ DB保存テスト
- ✅ DDP計算テスト
- ✅ エラーケーステスト

---

## 🎉 まとめ

### 完全無料版の実現

**API課金: ¥0**

- ✅ プロンプト生成: フロントエンドで実行
- ✅ AI処理: 無料のGemini/Claude Webを使用
- ✅ 検証・保存: 既存の無料APIを使用

**処理時間**: 1商品あたり約30秒（人間の操作時間含む）

**データ品質**:
- ✅ セルミラーデータによる高精度な英語タイトル
- ✅ Supabaseデータベース参照によるHTS/原産国の正確性
- ✅ Web検索による寸法データの実測値確認

**将来性**:
- バッチ処理への拡張可能
- Claude API統合でフル自動化も可能（オプション）
- プロンプトテンプレートによる精度向上

---

**実装完了日**: 2025-10-29  
**API課金**: ¥0  
**コスト削減率**: 100%
