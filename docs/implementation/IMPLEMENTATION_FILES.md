# AI商品データ強化システム - 完全無料版 実装ファイル

## 📂 実装ファイル一覧

### ✅ バックエンドAPI（既存活用 + 新規1ファイル）

```
/Users/aritahiroaki/n3-frontend_new/app/api/

【既存活用】
├── hts/
│   ├── search/route.ts          ✅ HTS検索（既存）
│   └── verify/route.ts          ✅ HTS検証（既存）
├── tariff/
│   └── calculate/route.ts       ✅ 関税計算（既存）
├── hts-codes/route.ts           ✅ HTSコード一覧（既存）
└── hts-countries/route.ts       ✅ 原産国マスター（既存）

【新規実装】
└── ai-enrichment/
    └── save-result/route.ts     🆕 AI結果保存API（新規）
```

**重要**: プロンプト生成はフロントエンドで実行するため、`prepare-prompt/route.ts` は**不要**になりました。

---

### ✅ フロントエンド（2ファイル修正）

```
/Users/aritahiroaki/n3-frontend_new/app/tools/editing/

【新規実装】
└── components/
    └── AIDataEnrichmentModal.tsx   🆕 AIモーダル（完全書き換え）
                                       - プロンプト生成をフロントで実行
                                       - Gemini/Claude Web へのリンク
                                       - JSON貼り付け・検証
                                       - ¥0表示

【修正】
├── components/
│   └── ToolPanel.tsx               ✏️ AI強化ボタン追加
└── page.tsx                        ✏️ モーダル統合
```

---

### ✅ データベース（既存テーブル活用）

```
Supabase Tables（既存）:
- products                      ✅ 商品データ
- hs_codes                      ✅ HTSコード
- hts_countries                 ✅ 原産国マスター
- customs_duties                ✅ 関税率データ

※ 追加テーブル不要！既存で完結
```

---

## 🔄 データフロー（API課金¥0）

```
【ステップ1: プロンプト生成】フロントエンド - 無料
商品選択
  ↓
AIDataEnrichmentModal
  ├─ products から商品データ取得
  ├─ ebay_api_data.listing_reference からセルミラー取得
  ├─ GET /api/hts-codes でHTSコード候補取得（既存API）
  ├─ GET /api/hts-countries で原産国マスター取得（既存API）
  └─ ブラウザでプロンプト生成 → 表示

【ステップ2: AI処理】無料Web版 - 課金なし
人間がプロンプトをコピー
  ↓
Gemini Web (https://gemini.google.com/) または
Claude Web (https://claude.ai/)
  ↓
AIが回答（JSON）
  ↓
人間がJSONをコピー

【ステップ3: 保存】バックエンド - 無料
モーダルにJSON貼り付け
  ↓
POST /api/ai-enrichment/save-result
  ├─ POST /api/hts/verify でHTS検証
  ├─ POST /api/tariff/calculate で関税率計算
  ├─ products テーブル更新
  └─ POST /api/ebay-intl-pricing/calculate でDDP計算

💰 総コスト: ¥0
```

---

## 📋 JSON標準フォーマット

### AIへの入力（プロンプトに含まれる）

```typescript
{
  product: {
    title: "商品タイトル",
    price_jpy: 5000,
    images: ["https://..."],
    category: "カテゴリ"
  },
  sellerMirror: {
    referenceCount: 10,
    averagePrice: 29.99,
    topTitles: [
      "Premium Wireless Bluetooth Headphones...",
      "Noise Cancelling Headphones with..."
    ]
  },
  databaseReferences: {
    htsCandidates: [
      { code: "8471.30.0100", description: "..." },
      { code: "8517.62.0050", description: "..." }
    ],
    countries: [
      { code: "JP", name: "Japan" },
      { code: "CN", name: "China" }
    ]
  }
}
```

### AIからの出力（人間が貼り付け）

```json
{
  "dimensions": {
    "weight_g": 250,
    "length_cm": 20.5,
    "width_cm": 15.0,
    "height_cm": 5.0,
    "verification_source": "公式サイト名",
    "confidence": "verified"
  },
  "hts_candidates": [
    {
      "code": "8471.30.0100",
      "description": "portable automatic data processing machines",
      "reasoning": "選定理由",
      "confidence": 85
    },
    {
      "code": "8517.62.0050",
      "description": "smartphones",
      "reasoning": "選定理由",
      "confidence": 70
    },
    {
      "code": "6204.62.4031",
      "description": "women's trousers",
      "reasoning": "選定理由",
      "confidence": 60
    }
  ],
  "origin_country": {
    "code": "CN",
    "name": "China",
    "reasoning": "Made in China表記のため"
  },
  "english_title": "premium wireless bluetooth headphones with noise cancellation"
}
```

---

## 🚀 実装手順

### 1. 不要なファイルを削除

```bash
cd /Users/aritahiroaki/n3-frontend_new

# プロンプト生成APIは不要（フロントで実行するため）
rm -rf app/api/ai-enrichment/prepare-prompt
```

### 2. 既存ファイルの確認

```bash
# 以下のファイルが存在することを確認
ls app/api/hts/verify/route.ts
ls app/api/tariff/calculate/route.ts
ls app/api/hts-codes/route.ts
ls app/api/hts-countries/route.ts
```

### 3. 新規ファイルの確認

```bash
# 以下のファイルが作成されていることを確認
ls app/api/ai-enrichment/save-result/route.ts
ls app/tools/editing/components/AIDataEnrichmentModal.tsx
```

### 4. サーバー起動

```bash
npm run dev
```

### 5. 動作テスト

```
1. http://localhost:3000/tools/editing を開く
2. 商品を1つ選択
3. 「AI強化」ボタン（紫グラデーション）をクリック
4. プロンプトをコピー
5. 「Gemini を開く」をクリック
6. プロンプトを貼り付けて送信
7. JSON回答をコピー
8. モーダルに戻ってJSON貼り付け
9. 「検証して保存」をクリック
10. ✅ 完了！
```

---

## 🎯 重要なポイント

### プロンプト生成をフロントエンドで実行

**理由**:
- API課金を完全に回避
- ブラウザで完結
- サーバー負荷ゼロ

**実装**:
```typescript
// AIDataEnrichmentModal.tsx
const loadPromptData = async () => {
  // 既存APIからデータ取得（無料）
  const htsCandidates = await fetchHTSCandidates()
  const countries = await fetchCountries()
  
  // ブラウザでプロンプト生成
  const data = {
    product: { ... },
    sellerMirror: { ... },
    databaseReferences: {
      htsCandidates,
      countries
    }
  }
  
  setPrompt(generateAIPrompt(data))
}
```

### 無料AIサービスへの直接リンク

```typescript
<Button onClick={() => window.open('https://gemini.google.com/', '_blank')}>
  <ExternalLink /> Gemini を開く
</Button>

<Button onClick={() => window.open('https://claude.ai/', '_blank')}>
  <ExternalLink /> Claude を開く
</Button>
```

### API課金¥0の明示

```typescript
// 完了画面で表示
<div className="bg-blue-50 p-4 rounded-lg">
  <p className="font-semibold">💰 API課金: ¥0</p>
  <p className="text-xs">
    無料のGemini/Claude Webを使用したため、API料金は発生していません
  </p>
</div>
```

---

## 📊 コスト比較

| 方式 | 1商品 | 100商品 | 1000商品 |
|------|-------|---------|----------|
| Claude API | ¥7.5 | ¥750 | ¥7,500 |
| Gemini API | ¥0.45 | ¥45 | ¥450 |
| **無料Web版** | **¥0** | **¥0** | **¥0** |

---

## ✅ 実装完了

**新規作成ファイル**: 2ファイル
- `/app/api/ai-enrichment/save-result/route.ts`
- `/app/tools/editing/components/AIDataEnrichmentModal.tsx`

**修正ファイル**: 2ファイル
- `/app/tools/editing/components/ToolPanel.tsx`
- `/app/tools/editing/page.tsx`

**削除推奨**: 1ファイル
- `/app/api/ai-enrichment/prepare-prompt/route.ts`（不要）

**API課金**: ¥0

**実装完了日**: 2025-10-29

---

## 🎉 次のアクション

```bash
# 1. 不要なファイル削除
rm -rf /Users/aritahiroaki/n3-frontend_new/app/api/ai-enrichment/prepare-prompt

# 2. サーバー起動
cd /Users/aritahiroaki/n3-frontend_new
npm run dev

# 3. 動作テスト
open http://localhost:3000/tools/editing
```

完成です！🚀
