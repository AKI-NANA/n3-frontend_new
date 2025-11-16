# 🔧 データ不足エラーの解決ガイド

## 📋 問題の概要

**エラーメッセージ**: 
```
エラー1: ID=322, メッセージ=重量または仕入れ価格が不足しています
```

**原因**: 
送料・利益計算に必要なデータが不足しています:
- `price_jpy` (仕入れ価格・円)
- `listing_data.weight_g` (重量・グラム)

---

## 🎯 解決方法（3つの選択肢）

### 方法1: データベースで直接修正（推奨）

Supabaseの管理画面で以下のSQLを実行:

```sql
-- 1. 現在のデータを確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  listing_data
FROM products_master
WHERE id = 322;

-- 2. price_jpyを設定（例: 5000円）
UPDATE products_master
SET 
  price_jpy = 5000,  -- 実際の価格に変更
  updated_at = NOW()
WHERE id = 322;

-- 3. listing_dataを初期化（NULLの場合）
UPDATE products_master
SET 
  listing_data = COALESCE(listing_data, '{}'::jsonb),
  updated_at = NOW()
WHERE id = 322
  AND listing_data IS NULL;

-- 4. 重量を設定（例: 500g）
UPDATE products_master
SET 
  listing_data = jsonb_set(
    listing_data,
    '{weight_g}',
    '500'::jsonb  -- 実際の重量に変更
  ),
  updated_at = NOW()
WHERE id = 322;

-- 5. 修正結果を確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  CASE 
    WHEN price_jpy IS NOT NULL 
      AND (listing_data->>'weight_g')::numeric > 0 
    THEN '✅ 計算可能'
    ELSE '❌ データ不足'
  END as status
FROM products_master
WHERE id = 322;
```

---

### 方法2: フロントエンドで修正（簡単）

#### ステップ1: ProductDataDebugコンポーネントを追加

`app/tools/editing/components/EditingTable.tsx` を編集:

```typescript
import { ProductDataDebug } from './ProductDataDebug'
import { QuickDataFix } from './QuickDataFix'

// テーブル内の適切な場所に追加:
<td className="p-2 text-center border-r border-border">
  <div className="flex flex-col gap-1">
    <ProductDataDebug product={product} />
    <QuickDataFix 
      product={product} 
      onUpdate={updateLocalProduct}
    />
  </div>
</td>
```

#### ステップ2: データを修正

1. `/tools/editing` ページで「⚠️ データ不足を修正」ボタンをクリック
2. 必要なデータを入力:
   - **仕入れ価格**: 商品の購入価格（円）
   - **重量**: 商品の重量（グラム）
   - **サイズ**: オプション（長さ・幅・高さ in cm）
3. 「更新」ボタンをクリック
4. **重要**: 「保存(1)」ボタンでDBに保存

---

### 方法3: 一括修正スクリプト

複数の商品に同様の問題がある場合:

```sql
-- データ不足の商品を確認
SELECT 
  id,
  title,
  CASE WHEN price_jpy IS NULL THEN '❌' ELSE '✅' END as has_price,
  CASE WHEN listing_data->>'weight_g' IS NULL THEN '❌' ELSE '✅' END as has_weight
FROM products_master
WHERE price_jpy IS NULL 
   OR listing_data->>'weight_g' IS NULL
ORDER BY id;

-- ⚠️ 一括修正（バックアップ必須！）

-- Step 1: price_jpyを他のフィールドから補完
UPDATE products_master
SET 
  price_jpy = COALESCE(
    price_jpy,
    purchase_price_jpy,
    current_price,
    (scraped_data->>'current_price')::numeric
  ),
  updated_at = NOW()
WHERE price_jpy IS NULL
  AND (
    purchase_price_jpy IS NOT NULL 
    OR current_price IS NOT NULL
    OR scraped_data->>'current_price' IS NOT NULL
  );

-- Step 2: listing_dataを初期化
UPDATE products_master
SET 
  listing_data = '{}'::jsonb,
  updated_at = NOW()
WHERE listing_data IS NULL;

-- Step 3: デフォルト重量を設定（500g）
-- ⚠️ 注意: 実際の商品重量に基づいて個別に設定することを推奨！
UPDATE products_master
SET 
  listing_data = jsonb_set(
    listing_data,
    '{weight_g}',
    '500'::jsonb
  ),
  updated_at = NOW()
WHERE listing_data->>'weight_g' IS NULL;

-- Step 4: 結果を確認
SELECT 
  COUNT(*) as total,
  COUNT(price_jpy) as has_price,
  COUNT(*) FILTER (
    WHERE (listing_data->>'weight_g')::numeric > 0
  ) as has_weight,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL 
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready
FROM products_master;
```

---

## 🔍 データ構造の確認

### APIで確認

```bash
# ブラウザで開く:
http://localhost:3000/api/debug/product?id=322

# またはcurlで:
curl "http://localhost:3000/api/debug/product?id=322" | jq
```

### 期待される構造

```json
{
  "id": 322,
  "title": "商品名",
  "price_jpy": 5000,  // ✅ 必須
  "listing_data": {
    "weight_g": 500,   // ✅ 必須
    "length_cm": 20,   // オプション
    "width_cm": 15,    // オプション
    "height_cm": 10    // オプション
  }
}
```

---

## 📊 重量の目安

| 商品カテゴリ | 推奨重量 |
|------------|---------|
| アクセサリー・小物 | 50-200g |
| 書籍・雑誌 | 200-500g |
| CD・DVD | 100-150g |
| ゲームソフト | 100-200g |
| カメラ・レンズ | 300-1500g |
| 腕時計 | 50-200g |
| フィギュア | 200-800g |
| おもちゃ | 300-1000g |
| 衣類 | 200-500g |
| 靴 | 500-1000g |

---

## ✅ 修正完了の確認

1. **データベースで確認**:
```sql
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  CASE 
    WHEN price_jpy IS NOT NULL 
      AND (listing_data->>'weight_g')::numeric > 0 
    THEN '✅ OK'
    ELSE '❌ NG'
  END as status
FROM products_master
WHERE id = 322;
```

2. **フロントエンドで確認**:
   - `/tools/editing` で商品を選択
   - 「送料計算」ボタンをクリック
   - エラーが出ないことを確認

3. **期待される結果**:
```
✅ 送料・利益計算完了
送料計算結果: {success: true, updated: 1, message: '送料計算: 1件, 利益計算: 1件'}
```

---

## 🚨 トラブルシューティング

### Q: 修正したのにまだエラーが出る
**A**: ブラウザをリフレッシュして、最新データを読み込んでください

### Q: 全商品を一度に修正したい
**A**: 方法3の一括修正スクリプトを使用（バックアップ必須）

### Q: 適切な重量がわからない
**A**: 以下の方法で推定:
1. 類似商品の重量を参考
2. Amazon等で同じ商品を検索
3. とりあえず500gで設定し、後で修正

---

## 📁 関連ファイル

- `/fix_product_322.sql` - 個別修正用SQLスクリプト
- `/debug_product_322.sql` - データ確認用SQLスクリプト
- `/app/tools/editing/components/ProductDataDebug.tsx` - デバッグUI
- `/app/tools/editing/components/QuickDataFix.tsx` - クイック修正UI
- `/app/api/debug/product/route.ts` - デバッグAPI

---

修正後、必ず動作確認を行ってください！
