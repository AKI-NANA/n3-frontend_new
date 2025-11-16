📋 NAGANO-3 products_master 完全マスター構築手順
============================================================================

🎯 目的
--------
全ツールのカラムを一度に追加して、完全なproducts_masterテーブルを構築する

⏱️ 所要時間: 約10分

============================================================================
ステップ1: SQLでカラムを追加
============================================================================

Supabase SQL Editorで以下を実行:

```sql
-- ===== 送料計算関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ddu_price_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ddp_price_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS shipping_policy VARCHAR(255);

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2) DEFAULT 0.00;

-- ===== カテゴリ分析関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS category_number VARCHAR(50);

-- ===== フィルター関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_passed BOOLEAN DEFAULT true;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_reasons TEXT;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_checked_at TIMESTAMPTZ;

-- ===== SellerMirror分析関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(50);

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_sales_count INTEGER DEFAULT 0;

-- ===== Browse API検索関連 =====
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER DEFAULT 0;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_profit_amount_usd NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_profit_margin NUMERIC(10,2) DEFAULT 0.00;
```

✅ 確認クエリ:
```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
  AND column_name IN (
    'ddu_price_usd',
    'ddp_price_usd',
    'shipping_cost_usd',
    'shipping_policy',
    'profit_margin',
    'profit_amount_usd',
    'category_name',
    'category_number',
    'filter_passed',
    'filter_reasons',
    'filter_checked_at',
    'ebay_category_id',
    'sm_sales_count',
    'sm_lowest_price',
    'sm_average_price',
    'sm_competitor_count',
    'sm_profit_amount_usd',
    'sm_profit_margin'
  )
ORDER BY column_name;
```

期待される結果: 18行が返されること

============================================================================
ステップ2: APIコードを修正
============================================================================

❌ 問題: shipping-calculateとprofit-calculateがsm_profit_marginを誤って使用

🔧 修正ファイル1: app/api/tools/shipping-calculate/route.ts
-------------------------------------------------------------------

【修正箇所1】 約115行目付近

変更前:
```typescript
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    listing_data: updatedListingData,
    ddu_price_usd: breakdown.finalProductPrice,
    ddp_price_usd: breakdown.finalTotal,
    shipping_cost_usd: breakdown.finalShipping,
    shipping_policy: breakdown.selectedPolicyName,
    sm_profit_margin: breakdown.profitMargin,  // ❌ これを削除
    profit_amount_usd: breakdown.profit,
    updated_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

変更後:
```typescript
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    listing_data: updatedListingData,
    ddu_price_usd: breakdown.finalProductPrice,
    ddp_price_usd: breakdown.finalTotal,
    shipping_cost_usd: breakdown.finalShipping,
    shipping_policy: breakdown.selectedPolicyName,
    profit_margin: breakdown.profitMargin,      // ✅ 既存のカラムを使用
    profit_amount_usd: breakdown.profit,
    updated_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

理由:
- sm_profit_margin はSellerMirror/Browse API専用
- 送料計算では既存の profit_margin を使用すべき

🔧 修正ファイル2: app/api/tools/profit-calculate/route.ts
-------------------------------------------------------------------

【修正箇所1】 約115行目付近 (shipping-calculateと同じ修正)

変更前:
```typescript
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    listing_data: {
      ...listingData,
      // ... 省略 ...
    },
    ddu_price_usd: breakdown.finalProductPrice,
    ddp_price_usd: breakdown.finalTotal,
    shipping_cost_usd: breakdown.finalShipping,
    shipping_policy: breakdown.selectedPolicyName,
    sm_profit_margin: breakdown.profitMargin,  // ❌ これを削除
    profit_amount_usd: breakdown.profit,
    updated_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

変更後:
```typescript
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    listing_data: {
      ...listingData,
      // ... 省略 ...
    },
    ddu_price_usd: breakdown.finalProductPrice,
    ddp_price_usd: breakdown.finalTotal,
    shipping_cost_usd: breakdown.finalShipping,
    shipping_policy: breakdown.selectedPolicyName,
    profit_margin: breakdown.profitMargin,      // ✅ 既存のカラムを使用
    profit_amount_usd: breakdown.profit,
    updated_at: new Date().toISOString()
  })
  .eq('id', product.id)
```

============================================================================
ステップ3: 動作確認
============================================================================

1. フロントエンドを再起動
   ```bash
   cd /Users/aritahiroaki/n3-frontend_new
   npm run dev
   ```

2. /approval ページを開く

3. 商品を選択して「送料計算」を実行

4. エラーが出ないことを確認:
   ✅ "送料計算完了"が表示されること
   ❌ "Could not find the 'sm_profit_margin' column"が出ないこと

5. 各カラムにデータが保存されているか確認:
   ```sql
   SELECT 
     id,
     title,
     ddu_price_usd,
     ddp_price_usd,
     shipping_cost_usd,
     profit_margin,
     sm_profit_margin,
     sm_lowest_price,
     sm_competitor_count,
     category_name
   FROM products_master
   WHERE id = 322  -- テスト対象のID
   LIMIT 1;
   ```

============================================================================
📊 カラム使用目的マップ
============================================================================

送料計算API → profit_margin (既存カラム)
利益計算API → profit_margin (既存カラム)
Browse API  → sm_profit_margin (SellerMirror専用)
Research API→ sm_profit_margin (SellerMirror専用)

============================================================================
🎯 完了条件
============================================================================

✅ ステップ1: 18個のカラムが追加されていること
✅ ステップ2: APIコードが修正されていること
✅ ステップ3: 送料計算がエラーなく完了すること
✅ ステップ3: データがDBに正しく保存されていること

============================================================================
📌 注意事項
============================================================================

⚠️ sm_profit_margin を削除しないでください
   - これはSellerMirror/Browse API専用カラムです
   - 送料計算・利益計算では profit_margin を使用します

⚠️ 既存データは保持されます
   - ALTER TABLE ... IF NOT EXISTS なので安全です
   - 既存のproducts_masterのデータは影響を受けません

============================================================================
終了
============================================================================
