# HTSキーワードマッピングテーブル設計

## 📊 テーブル構造

### `hts_keyword_mapping`

```sql
CREATE TABLE hts_keyword_mapping (
  id BIGSERIAL PRIMARY KEY,
  
  -- キーワード情報
  keyword TEXT NOT NULL,              -- 検索キーワード（例: "toy", "camera", "watch"）
  keyword_type TEXT NOT NULL,         -- キーワードタイプ: 'product', 'material', 'category', 'brand'
  
  -- HTS関連
  hts_number TEXT,                    -- 完全HTSコード（10桁）
  chapter_code TEXT,                  -- Chapterコード（2桁）
  heading_code TEXT,                  -- Headingコード（4桁）
  subheading_code TEXT,               -- Subheadingコード（6桁）
  
  -- メタ情報
  confidence_score DECIMAL(3,2),      -- 信頼度スコア（0.0-1.0）
  priority INTEGER DEFAULT 0,         -- 優先度（高いほど優先）
  
  -- 追加情報
  notes TEXT,                         -- 備考
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  UNIQUE(keyword, keyword_type, hts_number)
);

-- インデックス
CREATE INDEX idx_keyword ON hts_keyword_mapping(keyword);
CREATE INDEX idx_keyword_type ON hts_keyword_mapping(keyword_type);
CREATE INDEX idx_hts_number ON hts_keyword_mapping(hts_number);
```

## 🔍 検索ロジック

### Step 1: 商品タイトル・カテゴリから抽出
```typescript
入力: "Vintage Camera Nikon D750"
↓
キーワード抽出:
- "camera" (product)
- "nikon" (brand)
- "vintage" (condition)
```

### Step 2: DB検索（優先度順）
```sql
SELECT * FROM hts_keyword_mapping
WHERE keyword IN ('camera', 'nikon', 'vintage')
ORDER BY priority DESC, confidence_score DESC
LIMIT 10;
```

### Step 3: HTSコード確定
```typescript
結果例:
- "camera" → hts_number="9006.53.00.00" (Digital cameras)
- confidence_score=0.95, priority=10

推定結果:
{
  htsCode: "9006.53.00.00",
  confidence: "high",
  dutyRate: "Free"
}
```

## 📝 初期データ例

```sql
INSERT INTO hts_keyword_mapping (keyword, keyword_type, hts_number, chapter_code, heading_code, subheading_code, confidence_score, priority, notes)
VALUES
  -- カメラ関連
  ('camera', 'product', '9006.53.00.00', '90', '9006', '900653', 0.95, 10, 'Digital cameras'),
  ('lens', 'product', '9002.11.60.00', '90', '9002', '900211', 0.90, 8, 'Camera lenses'),
  
  -- 時計関連
  ('watch', 'product', '9102.11.10.00', '91', '9102', '910211', 0.95, 10, 'Wristwatches, electrically operated'),
  ('clock', 'product', '9105.21.40.00', '91', '9105', '910521', 0.90, 8, 'Wall clocks'),
  
  -- 玩具関連
  ('toy', 'product', '9503.00.00.80', '95', '9503', '950300', 0.85, 7, 'Other toys'),
  ('doll', 'product', '9503.00.00.21', '95', '9503', '950300', 0.90, 9, 'Dolls'),
  
  -- 素材関連
  ('plastic', 'material', '9503.00.00.80', '95', '9503', '950300', 0.70, 5, 'Plastic toys'),
  ('metal', 'material', '9503.00.00.40', '95', '9503', '950300', 0.70, 5, 'Metal toys'),
  
  -- カテゴリ関連
  ('photography', 'category', '9006.53.00.00', '90', '9006', '900653', 0.85, 7, 'Photography equipment');
```

## 🎯 API実装イメージ

```typescript
// /api/hts/estimate
POST /api/hts/estimate
Body: {
  title: "Vintage Nikon Camera D750",
  categoryName: "Cameras & Photo",
  material: "Metal"
}

↓

Response: {
  success: true,
  htsCode: "9006.53.00.00",
  dutyRate: "Free",
  confidence: "high",  // high/medium/low/uncertain
  matchedKeywords: ["camera", "nikon", "photography"]
}
```

## ⚙️ データメンテナンス

### 1. 定期的なキーワード追加
- SellerMirror分析から頻出ワードを抽出
- 手動で信頼度の高いマッピングを追加

### 2. 信頼度の調整
- 実際の使用結果からconfidence_scoreを更新
- 間違ったマッピングを削除/修正

### 3. UIでのメンテナンス機能
- `/tools/hts-hierarchy`の「自動選定」タブで管理
- キーワード追加/編集/削除UI
