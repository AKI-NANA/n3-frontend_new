# 🎯 関税計算システム実装 - 次のチャット用指示書

## 📋 現状の確認完了事項

### データベース構造（確定）

products (UUID) - メインテーブル
  - id, item_id, title, description
  - brand, category_name
  - acquired_price_jpy, shipping_cost_usd
  - sm_competitors, sm_min_price_usd, sm_profit_margin
  - listing_score, ready_to_list

sellermirror_analysis
  - product_id (UUID, FK → products.id)
  - common_aspects (JSONB) ← 素材・原産国
  
product_scores - スコア計算結果
score_settings - スコアカスタマイズ設定

### 既に作成済みのSQL関数
1. calculate_final_tariff - 関税計算
2. detect_country_from_text - 国名自動判定
3. get_tariff_summary - 簡易関税情報

---

## 🎯 実装すべき機能

### Phase 1: SM分析データの保存
- 選択した1商品のみSM分析
- sellermirror_analysisに保存
- トリガーでproductsを自動更新

### Phase 2: Gemini分析フロー（コピペ方式）
- タイトルリライト
- 素材・原産国の補完
- HTSコード候補（3つ + 信頼度）

### Phase 3: HTS自動判定
- 入力: タイトル、説明、素材、原産国、カテゴリー
- 出力: HTSコード候補3つ + 信頼度

### Phase 4: 関税計算の統合
- HTS + 原産国 + 素材 → 最終関税率
- 利益計算に反映

---

## 🔧 最優先タスク

1. productsテーブルにカラム追加:
```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS origin_country TEXT,
ADD COLUMN IF NOT EXISTS hts_code TEXT,
ADD COLUMN IF NOT EXISTS final_tariff_rate DECIMAL(5,2);
```

2. SM分析の修正（editing.js）
3. Gemini分析テーブル作成

---

次のチャットで: 
「~/n3-frontend_new/NEXT-CHAT-INSTRUCTIONS.md を読み込んで実装を開始」
と伝えてください。
