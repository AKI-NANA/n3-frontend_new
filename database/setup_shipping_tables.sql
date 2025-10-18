-- eBay配送システム用テーブル構造修正

-- 1. ebay_rate_tables テーブルの再作成
DROP TABLE IF EXISTS ebay_rate_tables CASCADE;

CREATE TABLE ebay_rate_tables (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    price_min DECIMAL(10,2) NOT NULL,
    price_max DECIMAL(10,2) NOT NULL,
    tariff_rate DECIMAL(5,4) NOT NULL,
    calculated_ddp_cost DECIMAL(10,2),
    exchange_rate DECIMAL(10,2) DEFAULT 150,
    multiplier DECIMAL(5,2) DEFAULT 2.2,
    description TEXT,
    ebay_rate_table_id VARCHAR(100), -- eBay APIから返されるID
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_tables_price ON ebay_rate_tables(price_min, price_max);
CREATE INDEX idx_rate_tables_tariff ON ebay_rate_tables(tariff_rate);
CREATE INDEX idx_rate_tables_name ON ebay_rate_tables(name);

COMMENT ON TABLE ebay_rate_tables IS 'eBay Rate Tables（240個）- 商品価格帯×関税率';

-- 2. ebay_shipping_policies テーブルの確認・修正
-- 既存テーブルの構造を確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_shipping_policies' 
        AND column_name = 'rate_multiplier'
    ) THEN
        ALTER TABLE ebay_shipping_policies ADD COLUMN rate_multiplier DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_shipping_policies' 
        AND column_name = 'excluded_countries'
    ) THEN
        ALTER TABLE ebay_shipping_policies ADD COLUMN excluded_countries TEXT[];
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_shipping_policies' 
        AND column_name = 'policy_code'
    ) THEN
        ALTER TABLE ebay_shipping_policies ADD COLUMN policy_code VARCHAR(50);
    END IF;
END $$;

-- 3. ebay_excluded_locations テーブルはすでに作成済み（確認済み）

-- 完了メッセージ
SELECT 
    'ebay_rate_tables' as table_name,
    COUNT(*) as record_count
FROM ebay_rate_tables
UNION ALL
SELECT 
    'ebay_shipping_policies' as table_name,
    COUNT(*) as record_count
FROM ebay_shipping_policies
UNION ALL
SELECT 
    'ebay_excluded_locations' as table_name,
    COUNT(*) as record_count
FROM ebay_excluded_locations;
