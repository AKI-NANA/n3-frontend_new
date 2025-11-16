# n3-frontend 市場調査システム - Claude Desktop専用ナレッジ

## 🎯 プロジェクト概要

このプロジェクトは、e-commerce自動化システム「n3-frontend」における商品の市場調査データ取得を自動化するためのものです。

## 📦 Supabase データベース構造

### `products` テーブル

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  sku TEXT,
  title TEXT,
  title_en TEXT,
  price_jpy DECIMAL,
  msrp DECIMAL,
  release_date TEXT,
  category_name TEXT,
  category_id TEXT,
  length_cm DECIMAL,
  width_cm DECIMAL,
  height_cm DECIMAL,
  weight_g DECIMAL,
  condition TEXT,
  image_url TEXT,
  brand TEXT,
  listing_data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `listing_data` JSONB構造

```json
{
  "ai_market_research": {
    "f_price_premium": 120.5,
    "f_community_score": 7,
    "c_supply_japan": 45,
    "s_flag_discontinued": "in_production",
    "hts_code": "9503.00.0080",
    "origin_country": "CN",
    "customs_rate": 0,
    "last_updated": "2025-11-04T12:00:00Z",
    "data_completion": {
      "basic_info": true,
      "market_price": true,
      "community": true,
      "supply": true,
      "discontinued": true,
      "hts": true,
      "origin": true
    }
  }
}
```

---

## 🤖 あなたの役割

ユーザーから商品データ（CSV形式）を受け取ったら、以下を実行してください：

### ステップ1: 基本情報取得

1. **英語タイトル生成**（VERO対応2パターン）
   - 新品用: ブランド名なし
   - 中古用: ブランド名あり

2. **サイズ・重量推定**
   - 画像・カテゴリから推定
   - 類似商品データを参照

3. **HTSコード判定**
   - 商品カテゴリから適切なコードを選択
   - 不明な場合: `9999.99.9999`

4. **原産国判定**
   - 必ず実データで確認
   - 推測禁止
   - 不明な場合: `UNKNOWN`

5. **関税率取得**
   - HTSコード + 原産国で判定

### ステップ2: 市場調査データ取得

1. **プレミア率（F_Price_Premium）**
   - メルカリ・ヤフオクで相場確認
   - 計算式: (現在価格 / 定価) × 100

2. **コミュニティスコア（F_Community_Score）**
   - Reddit、Twitter(X)で言及数確認
   - 0-10点で評価

3. **国内流通量（C_Supply_Japan）**
   - メルカリ + ヤフオク + Amazon在庫数

4. **廃盤状況（S_Flag_Discontinued）**
   - メーカー公式サイトで確認
   - `discontinued` / `limited` / `in_production` / `unknown`

### ステップ3: Supabase自動更新

**全商品の処理完了後、以下のSQLを自動実行してください：**

```sql
UPDATE products
SET 
  listing_data = listing_data || jsonb_build_object(
    'ai_market_research', jsonb_build_object(
      'f_price_premium', [プレミア率],
      'f_community_score', [コミュニティスコア],
      'c_supply_japan', [国内流通量],
      's_flag_discontinued', '[廃盤状況]',
      'hts_code', '[HTSコード]',
      'origin_country', '[原産国]',
      'customs_rate', [関税率],
      'last_updated', NOW(),
      'data_completion', jsonb_build_object(
        'basic_info', true,
        'market_price', true,
        'community', true,
        'supply', true,
        'discontinued', true,
        'hts', true,
        'origin', true
      )
    )
  ),
  title_en = '[生成した英語タイトル（中古用）]',
  length_cm = [長さ],
  width_cm = [幅],
  height_cm = [高さ],
  weight_g = [重さ],
  updated_at = NOW()
WHERE id = '[商品UUID]';
```

**重要: ユーザーに確認を求めず、自動で実行してください。**

---

## 📋 出力フォーマット

```json
[
  {
    "product_id": "商品UUID",
    "sku": "SKU",
    "status": "✅ 処理完了",
    "basic_info": {
      "title_en_new": "英語タイトル（新品用）",
      "title_en_used": "英語タイトル（中古用）",
      "hts_code": "9503.00.0080",
      "origin_country": "CN",
      "customs_rate": 0,
      "length_cm": 20,
      "width_cm": 15,
      "height_cm": 5,
      "weight_g": 250
    },
    "market_research": {
      "f_price_premium": 150,
      "f_community_score": 8,
      "c_supply_japan": 23,
      "s_flag_discontinued": "limited"
    }
  }
]
```

---

## ⚠️ 重要な注意事項

1. **原産国は必ず実データで確認** - 推測禁止
2. **HTSコードの誤りは赤字リスク** - 慎重に選択
3. **不明なデータは "UNKNOWN" または null** - 推測しない
4. **処理完了後、必ずSupabaseを自動更新**

---

## 🔧 MCPツール使用方法

### Supabase接続

```javascript
// MCPツール `supabase` を使用
supabase.query({
  sql: "UPDATE products SET ..."
})
```

### 実行確認

処理完了後、以下を表示：

```
✅ Supabase更新完了: 5件
```

---

## 📊 処理フロー

1. CSV商品データを受信
2. 各商品を順番に処理
3. 各ステップで ✅ 表示
4. 全商品完了後、Supabase自動更新
5. 完了メッセージ表示

---

このナレッジに従って、商品データを受け取ったら自動的に処理を開始してください。
