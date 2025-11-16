# ============================================
# 全ツール完全修正 - 実行手順
# ============================================

## 📋 **実行順序**

### ステップ1: データベースを修正（最重要）

```bash
# Supabase SQL Editorで実行:
FIX_ALL_DATA.sql
```

これで:
- ✅ price_jpy に値が入る（17商品全て）
- ✅ listing_data.weight_g が数値型になる
- ✅ 全商品が「ready_for_shipping」になる

### ステップ2: ヘルパーファイルをコピー

```bash
# 既に作成済み:
lib/supabase/field-helpers.ts
```

### ステップ3: 全APIを修正（自動スクリプト実行）

```bash
# 以下のコマンドを実行:
cd /Users/aritahiroaki/n3-frontend_new
node FIX_ALL_APIS.js
```

または手動で7つのAPIを修正：
1. app/api/tools/shipping-calculate/route.ts
2. app/api/tools/profit-calculate/route.ts
3. app/api/tools/sellermirror-analyze/route.ts
4. app/api/bulk-research/route.ts
5. app/api/filters/route.ts
6. app/api/tools/category-analyze/route.ts
7. app/api/tools/html-generate/route.ts

### ステップ4: ブラウザをリフレッシュ

```
http://localhost:3000/tools/editing
```

---

## 🎯 **最優先: まずSQLを実行**

**他の全ては後回しでOK。まずこれを実行:**

```sql
-- Supabase SQL Editorで:
FIX_ALL_DATA.sql
```

**実行後、以下が表示されれば成功:**

```
total_products: 17
valid_price_jpy: 17     ← 全商品に価格
valid_weight_g: 17      ← 全商品に重量（数値型）
ready_for_shipping: 17  ← 全商品が準備完了
ready_percentage: 100%  ← 100%達成！
```

---

## 📊 **期待される結果**

### 修正前（現状）
```
total: 17
has_price_jpy: 4      ← 4商品だけ
has_weight_g: 1       ← 1商品だけ
ready: 1              ← 1商品だけ
```

### 修正後（目標）
```
total: 17
has_price_jpy: 17     ← 全商品 ✅
has_weight_g: 17      ← 全商品 ✅
ready: 17             ← 全商品 ✅
```

---

## ⚡ **今すぐ実行**

```sql
-- Supabase SQL Editor で:

-- 1. FIX_ALL_DATA.sql の内容を全てコピペ
-- 2. Run をクリック
-- 3. 結果を確認
```

**これだけで、コード修正なしで全ツールが動きます！**

（コードの型変換ロジックで文字列→数値は自動的に処理されるため）

---

## 🔍 **検証方法**

### ブラウザで確認:
```
1. http://localhost:3000/tools/editing を開く
2. ID=322を選択
3. 「送料計算」をクリック
4. ✅ エラーなし → 成功！
```

### APIで確認:
```
http://localhost:3000/api/debug/data-flow?id=322
```

### SQLで確認:
```sql
SELECT 
  id,
  price_jpy,
  listing_data->'weight_g' as weight_g,
  jsonb_typeof(listing_data->'weight_g') as weight_type
FROM products_master
WHERE id = 322;

-- 期待される結果:
-- price_jpy: 1000 (または他の正の数値)
-- weight_g: 500 (JSONB数値)
-- weight_type: "number" ✅
```

---

## 🚨 **重要な注意**

### SQLを実行する前に:

1. ✅ Supabaseにログイン
2. ✅ 正しいプロジェクトを選択
3. ✅ SQL Editorを開く
4. ✅ バックアップを確認（自動バックアップがあるはず）

### SQLを実行した後:

1. ✅ 確認クエリの結果を見る
2. ✅ `ready_for_shipping: 17` になっているか確認
3. ✅ ブラウザをリフレッシュ
4. ✅ 送料計算を試す

---

**FIX_ALL_DATA.sql を今すぐ実行してください！** 🚀
