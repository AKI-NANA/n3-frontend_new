-- ============================================
-- products_master に全ツール必須カラムを追加
-- ============================================

-- 送料・価格関連カラム
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS ddp_price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS ddu_price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS shipping_policy TEXT,
ADD COLUMN IF NOT EXISTS base_shipping_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS usa_shipping_policy_name TEXT;

-- SellerMirror分析関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_sales_count INTEGER,
ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER,
ADD COLUMN IF NOT EXISTS sm_profit_margin NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_profit_amount_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_data JSONB,
ADD COLUMN IF NOT EXISTS sm_fetched_at TIMESTAMP;

-- 競合分析関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS competitors_lowest_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS competitors_average_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS competitors_count INTEGER,
ADD COLUMN IF NOT EXISTS competitors_data JSONB;

-- リサーチ関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS research_sold_count INTEGER,
ADD COLUMN IF NOT EXISTS research_competitor_count INTEGER,
ADD COLUMN IF NOT EXISTS research_lowest_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS research_profit_margin NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS research_profit_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS research_data JSONB,
ADD COLUMN IF NOT EXISTS research_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS research_updated_at TIMESTAMP;

-- カテゴリ分析関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS category_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS category_candidates JSONB,
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS ebay_category_path TEXT;

-- フィルター関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS filter_passed BOOLEAN,
ADD COLUMN IF NOT EXISTS filter_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS export_filter_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS patent_filter_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS mall_filter_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS final_judgment VARCHAR(50);

-- VEROブランド関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS is_vero_brand BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vero_brand_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS vero_risk_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS vero_notes TEXT,
ADD COLUMN IF NOT EXISTS vero_checked_at TIMESTAMP;

-- HTS/関税関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS hts_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS origin_country VARCHAR(10),
ADD COLUMN IF NOT EXISTS duty_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS base_duty_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS additional_duty_rate NUMERIC(5,2);

-- 出品関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS target_marketplaces TEXT[],
ADD COLUMN IF NOT EXISTS scheduled_listing_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS listing_session_id VARCHAR(100);

-- EU関連
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS eu_responsible_company_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS eu_responsible_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS eu_responsible_country VARCHAR(100);

-- 確認: 追加されたカラムをリスト
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_master'
  AND column_name IN (
    'ddp_price_usd',
    'ddu_price_usd',
    'shipping_cost_usd',
    'shipping_policy',
    'sm_sales_count',
    'research_sold_count',
    'filter_passed'
  )
ORDER BY column_name;
