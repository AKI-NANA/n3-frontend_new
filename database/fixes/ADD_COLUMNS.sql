-- ============================================================================
-- 🚀 NAGANO-3 products_master カラム一括追加SQL
-- ============================================================================
-- 実行方法: Supabase SQL Editorにコピペして実行
-- 所要時間: 約5秒
-- 安全性: IF NOT EXISTS 付きなので既存カラムには影響なし
-- ============================================================================

-- ===== 送料計算関連カラム =====
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ddu_price_usd NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ddp_price_usd NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS shipping_policy VARCHAR(255);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2) DEFAULT 0.00;

-- ===== カテゴリ分析関連カラム =====
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS category_number VARCHAR(50);

-- ===== フィルター関連カラム =====
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS filter_passed BOOLEAN DEFAULT true;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS filter_reasons TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS filter_checked_at TIMESTAMPTZ;

-- ===== SellerMirror分析関連カラム =====
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(50);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_sales_count INTEGER DEFAULT 0;

-- ===== Browse API検索関連カラム =====
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER DEFAULT 0;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_profit_amount_usd NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_profit_margin NUMERIC(10,2) DEFAULT 0.00;

-- ============================================================================
-- ✅ 確認クエリ (このまま実行して18行返ってくればOK)
-- ============================================================================

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
