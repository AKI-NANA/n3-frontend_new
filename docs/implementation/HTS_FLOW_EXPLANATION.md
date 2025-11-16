# HTSコード・関税率の判定フロー完全解説

## 🎯 重要な疑問点の回答

### Q1: ツールがHTSや原産国を判定できるのか？
**A: いいえ、ツールは判定できません。AIが判定します。**

### Q2: Supabaseから関税率を取得できるのか？
**A: はい、できます。ただし「HTSコード×原産国」の組み合わせが分かっている場合のみ。**

### Q3: ツールはSupabaseを検索できるのか？
**A: はい、できます。既存のAPIを使います。**

---

## 📊 完全なデータフロー図解

### ステップ1: データ準備（ツール実行）

```
【人間の操作】
商品を選択 → 「AI強化」ボタンをクリック

↓

【ツール（フロントエンド）が実行】
AIDataEnrichmentModal.tsx
├─ 商品データ取得
│   └─ product.title = "Canon EOS カメラ三脚"
│
├─ セルミラーデータ取得
│   └─ product.ebay_api_data.listing_reference
│       ├─ 競合10件
│       └─ 英語タイトル例: "Canon EOS Camera Tripod..."
│
├─ GET /api/hts-codes （Supabaseから取得）
│   └─ 返り値: HTSコード候補リスト（200件程度）
│       [
│         { code: "9006.91.0000", description: "camera tripods" },
│         { code: "8517.62.0050", description: "smartphones" },
│         { code: "8471.30.0100", description: "laptops" },
│         ...200件
│       ]
│
└─ GET /api/hts-countries （Supabaseから取得）
    └─ 返り値: 原産国マスターリスト
        [
          { code: "JP", name: "Japan" },
          { code: "CN", name: "China" },
          { code: "US", name: "United States" },
          ...50カ国
        ]

↓

【ツールが生成】
プロンプト = `
商品名: Canon EOS カメラ三脚
競合の英語タイトル:
  1. Canon EOS Camera Tripod Professional
  2. Camera Tripod for Canon EOS Series
  
HTSコード候補（以下から選んでください）:
  - 9006.91.0000: camera tripods
  - 8517.62.0050: smartphones
  - 8471.30.0100: laptops
  ...200件

原産国候補（以下から選んでください）:
  - JP: Japan
  - CN: China
  - US: United States
  ...50カ国

この商品に最も適切なHTSコードを3つ選んでください。
原産国も上記から選んでください。
`

↓ プロンプトをコピー
```

---

### ステップ2: AI判定（人間 + 無料AI）

```
【人間の操作】
1. プロンプトをコピー
2. Gemini または Claude Web を開く
3. プロンプトを貼り付けて送信

↓

【AIが判定】※ここが重要！
Gemini/Claude が以下を判定:

1. HTSコード選定（Supabaseの候補から選択）
   「カメラ三脚」を分析
   → Web検索: "camera tripod HTS code"
   → 候補から最適なものを選択
   → 9006.91.0000 が最適（信頼度85%）
   
2. 原産国判定（Supabaseの候補から選択）
   「Canon」を分析
   → Web検索: "Canon manufacturing country"
   → 候補から選択
   → CN (China) が最適（理由: Canonの多くは中国製造）

3. 寸法データ（Web検索）
   → "Canon EOS tripod dimensions"
   → 実物の寸法を取得
   → 250g, 20×15×5cm

4. 英語タイトル生成（競合タイトルを参考）
   → "professional camera tripod for canon eos series"

↓

【AIの出力】JSON形式
{
  "dimensions": {
    "weight_g": 250,
    "length_cm": 20,
    "width_cm": 15,
    "height_cm": 5,
    "verification_source": "Amazon product page",
    "confidence": "verified"
  },
  "hts_candidates": [
    {
      "code": "9006.91.0000",
      "description": "camera tripods",
      "reasoning": "商品はカメラ用三脚なので、このHTSコードが最適",
      "confidence": 85
    },
    {
      "code": "9006.99.0000",
      "description": "other photographic accessories",
      "reasoning": "代替候補",
      "confidence": 70
    },
    {
      "code": "8529.90.9900",
      "description": "parts of cameras",
      "reasoning": "部品扱いの場合",
      "confidence": 50
    }
  ],
  "origin_country": {
    "code": "CN",
    "name": "China",
    "reasoning": "Canonの多くの製品は中国で製造されている"
  },
  "english_title": "professional camera tripod for canon eos series"
}

↓ JSON をコピー
```

---

### ステップ3: 検証・保存（ツール実行）

```
【人間の操作】
1. JSONをツールに貼り付け
2. 「検証して保存」をクリック

↓

【ツール（バックエンド）が実行】
POST /api/ai-enrichment/save-result

1. JSON受信
   {
     hts_candidates: [
       { code: "9006.91.0000", ... },
       ...
     ],
     origin_country: { code: "CN", ... }
   }

2. 最も信頼度の高いHTSコードを取得
   topHtsCandidate = "9006.91.0000"
   originCountry = "CN"

3. 【重要】Supabaseから関税率を取得
   
   ① 優先: customs_duties テーブルから検索
   
   SELECT * FROM customs_duties 
   WHERE hts_code = '9006.91.0000' 
     AND origin_country = 'CN'
   
   結果:
   {
     hts_code: "9006.91.0000",
     origin_country: "CN",
     base_duty: 0.0275,        // 2.75%
     section301_rate: 0.075,   // 7.5%
     total_duty_rate: 0.1025   // 10.25%
   }
   
   ② なければ: hs_codes_by_country テーブルから検索
   
   SELECT * FROM hs_codes_by_country 
   WHERE hts_code = '9006.91.0000' 
     AND country_code = 'CN'
   
   ③ それでもなければ: エラー
   「このHTSコード×原産国の組み合わせはデータベースに存在しません」

4. DB保存
   UPDATE products 
   SET listing_data = {
     hts_code: "9006.91.0000",
     origin_country: "CN",
     duty_rate: 0.1025,  ← ★ Supabaseから取得した値
     ...
   }
   WHERE id = 123

5. DDP計算自動実行
   POST /api/ebay-intl-pricing/calculate
   {
     hsCode: "9006.91.0000",
     originCountry: "CN",
     dutyRate: 0.1025  ← ★ Supabaseから取得した値
   }
```

---

## 🔑 重要なポイント

### 1. AIの役割
```
AIができること:
✅ HTSコード選定（Supabaseの候補200件から選ぶ）
✅ 原産国判定（Supabaseの候補50カ国から選ぶ）
✅ 寸法データ取得（Web検索）
✅ 英語タイトル生成（競合タイトル参考）

AIができないこと:
❌ 関税率の計算（データベースにしかない）
❌ DDP計算（複雑な計算式が必要）
❌ データベースへの保存
```

### 2. ツールの役割
```
ツールができること:
✅ Supabaseからデータ取得
✅ 関税率検索（HTSコード×原産国）
✅ DDP計算
✅ データベース保存
✅ プロンプト生成
✅ JSON検証

ツールができないこと:
❌ HTSコードの判定（AIが判定）
❌ 原産国の判定（AIが判定）
❌ 商品の理解（AIが理解）
```

### 3. Supabaseの役割
```
Supabaseに保存されているデータ:
✅ HTSコード候補リスト（200件）
✅ 原産国マスター（50カ国）
✅ 関税率データ（HTSコード × 原産国）

取得方法:
① ツール → Supabase: 候補リストを取得
② AI → 判定: 最適なものを選択
③ ツール → Supabase: 関税率を取得（選択された組み合わせで）
```

---

## 🎯 なぜこのフローなのか？

### 理由1: API課金を回避
```
❌ Claude API を使う場合:
   ツール → Claude API → 判定結果
   コスト: 1商品 = ¥7.5

✅ 無料AI を使う場合:
   ツール → 人間 → Gemini/Claude Web → 人間 → ツール
   コスト: ¥0
```

### 理由2: 判定精度の向上
```
AIに200件のHTSコード候補を渡す
→ AIがWeb検索で確認
→ 候補から最適なものを選択
→ 精度向上
```

### 理由3: データベース一貫性
```
関税率はSupabaseに一元管理
→ 更新が容易
→ 履歴管理可能
→ 他の機能でも使用可能
```

---

## 🔄 データの流れ（簡略版）

```
【準備フェーズ】
ツール → Supabase
  └─ HTSコード候補200件取得
  └─ 原産国候補50カ国取得

【判定フェーズ】
人間 → AI（無料）
  └─ 候補から最適なものを選択
  └─ HTSコード: 9006.91.0000
  └─ 原産国: CN

【検証フェーズ】
ツール → Supabase
  └─ WHERE hts_code = '9006.91.0000' AND origin_country = 'CN'
  └─ 関税率取得: 10.25%

【保存フェーズ】
ツール → Supabase
  └─ 商品データ保存
  └─ DDP計算実行
```

---

## 📋 Supabaseのテーブル構造

### customs_duties テーブル
```sql
CREATE TABLE customs_duties (
  id SERIAL PRIMARY KEY,
  hts_code TEXT NOT NULL,           -- "9006.91.0000"
  origin_country TEXT NOT NULL,     -- "CN"
  base_duty DECIMAL,                -- 0.0275 (2.75%)
  section301_rate DECIMAL,          -- 0.075 (7.5%)
  total_duty_rate DECIMAL,          -- 0.1025 (10.25%)
  updated_at TIMESTAMP,
  UNIQUE(hts_code, origin_country)
);
```

### hs_codes テーブル（候補リスト用）
```sql
CREATE TABLE hs_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,        -- "9006.91.0000"
  description TEXT,                 -- "camera tripods"
  category TEXT                     -- "Photographic Equipment"
);
```

### hts_countries テーブル（原産国マスター）
```sql
CREATE TABLE hts_countries (
  id SERIAL PRIMARY KEY,
  country_code TEXT UNIQUE,         -- "CN"
  country_name TEXT                 -- "China"
);
```

---

## 🎉 まとめ

### 誰が何を判定するのか？

| 判定内容 | 判定者 | データソース |
|---------|-------|------------|
| HTSコード選定 | **AI** | Supabaseの候補リスト |
| 原産国判定 | **AI** | Supabaseの候補リスト |
| 寸法データ | **AI** | Web検索 |
| 英語タイトル | **AI** | 競合タイトル参考 |
| **関税率取得** | **ツール** | **Supabase検索** |
| DDP計算 | **ツール** | 計算式 |

### データの流れ

```
Supabase → ツール → 人間 → AI → 人間 → ツール → Supabase
  候補      プロンプト        判定          検証     保存
```

### コスト

- **AI判定**: ¥0（無料AIサービス使用）
- **関税率取得**: ¥0（Supabase検索）
- **総コスト**: ¥0

---

**これで明確になりましたか？**
