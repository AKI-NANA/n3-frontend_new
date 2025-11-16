-- ========================================
-- Phase 1: データベース構造確認
-- ========================================

-- 1. sellermirror_analysisテーブルの存在確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'sellermirror_analysis'
) AS table_exists;

-- 2. sellermirror_analysisテーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sellermirror_analysis'
ORDER BY ordinal_position;

-- 3. productsテーブルの関連カラム確認
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN (
    'material', 
    'origin_country', 
    'hts_code', 
    'final_tariff_rate',
    'sm_competitors',
    'sm_min_price_usd',
    'sm_profit_margin'
)
ORDER BY ordinal_position;

-- 4. sync_sm_data_to_products() トリガーの存在確認
SELECT 
    tgname AS trigger_name,
    tgenabled AS is_enabled,
    tgtype AS trigger_type,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%sync_sm%'
OR proname LIKE '%sync_sm%';

-- 5. sync_sm_data_to_products() 関数の定義確認
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname LIKE '%sync_sm%';

-- ========================================
-- Phase 2: 必要に応じてテーブル作成
-- ========================================

-- sellermirror_analysisテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS sellermirror_analysis (
    id SERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- 競合分析データ
    competitor_count INTEGER NOT NULL DEFAULT 0,
    avg_price_usd DECIMAL(10,2),
    min_price_usd DECIMAL(10,2),
    max_price_usd DECIMAL(10,2),
    
    -- Item Specifics（素材・原産国等）
    common_aspects JSONB DEFAULT '{}'::jsonb,
    
    -- メタデータ
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 重複防止
    UNIQUE(product_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sm_analysis_product_id ON sellermirror_analysis(product_id);
CREATE INDEX IF NOT EXISTS idx_sm_analysis_analyzed_at ON sellermirror_analysis(analyzed_at);

-- ========================================
-- Phase 3: productsテーブルにカラム追加
-- ========================================

-- material カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS material TEXT;

-- origin_country カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS origin_country TEXT;

-- hts_code カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS hts_code TEXT;

-- final_tariff_rate カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS final_tariff_rate DECIMAL(10,2);

-- sm_competitors カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sm_competitors INTEGER DEFAULT 0;

-- sm_min_price_usd カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sm_min_price_usd DECIMAL(10,2);

-- sm_profit_margin カラム
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sm_profit_margin DECIMAL(10,2);

COMMENT ON COLUMN products.material IS '素材（plush/plastic/metal等）';
COMMENT ON COLUMN products.origin_country IS '原産国コード（JP/CN/US等）';
COMMENT ON COLUMN products.hts_code IS 'HTSコード（10桁）';
COMMENT ON COLUMN products.final_tariff_rate IS '最終関税率（%）';
COMMENT ON COLUMN products.sm_competitors IS 'SM分析: 競合数';
COMMENT ON COLUMN products.sm_min_price_usd IS 'SM分析: 最低価格';
COMMENT ON COLUMN products.sm_profit_margin IS 'SM分析: 利益率';

-- ========================================
-- Phase 4: トリガー関数作成
-- ========================================

-- sync_sm_data_to_products() 関数
CREATE OR REPLACE FUNCTION sync_sm_data_to_products()
RETURNS TRIGGER AS $$
DECLARE
    v_material TEXT;
    v_origin_country TEXT;
BEGIN
    -- common_aspects から素材と原産国を抽出
    v_material := NEW.common_aspects->>'Material';
    v_origin_country := NEW.common_aspects->>'Country/Region of Manufacture';
    
    -- 原産国コードの変換（例: "Japan" → "JP"）
    IF v_origin_country IS NOT NULL THEN
        v_origin_country := CASE
            WHEN v_origin_country ILIKE '%japan%' THEN 'JP'
            WHEN v_origin_country ILIKE '%china%' THEN 'CN'
            WHEN v_origin_country ILIKE '%united states%' OR v_origin_country ILIKE '%usa%' THEN 'US'
            WHEN v_origin_country ILIKE '%korea%' THEN 'KR'
            WHEN v_origin_country ILIKE '%taiwan%' THEN 'TW'
            WHEN v_origin_country ILIKE '%hong kong%' THEN 'HK'
            WHEN v_origin_country ILIKE '%vietnam%' THEN 'VN'
            WHEN v_origin_country ILIKE '%thailand%' THEN 'TH'
            WHEN v_origin_country ILIKE '%germany%' THEN 'DE'
            WHEN v_origin_country ILIKE '%france%' THEN 'FR'
            WHEN v_origin_country ILIKE '%uk%' OR v_origin_country ILIKE '%united kingdom%' THEN 'GB'
            ELSE v_origin_country
        END;
    END IF;
    
    -- productsテーブルを更新
    UPDATE products
    SET
        sm_competitors = NEW.competitor_count,
        sm_min_price_usd = NEW.min_price_usd,
        sm_profit_margin = CASE
            WHEN NEW.min_price_usd IS NOT NULL AND NEW.min_price_usd > 0
            THEN ROUND(((NEW.min_price_usd - COALESCE(acquired_price_jpy, 0) / 150) / NEW.min_price_usd * 100)::numeric, 2)
            ELSE NULL
        END,
        material = COALESCE(v_material, material),
        origin_country = COALESCE(v_origin_country, origin_country),
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_sync_sm_data ON sellermirror_analysis;

CREATE TRIGGER trigger_sync_sm_data
AFTER INSERT OR UPDATE ON sellermirror_analysis
FOR EACH ROW
EXECUTE FUNCTION sync_sm_data_to_products();

-- ========================================
-- Phase 5: 動作確認用クエリ
-- ========================================

-- テーブル確認
SELECT 
    'sellermirror_analysis' AS table_name,
    COUNT(*) AS row_count
FROM sellermirror_analysis
UNION ALL
SELECT 
    'products (with SM data)' AS table_name,
    COUNT(*) AS row_count
FROM products
WHERE sm_competitors IS NOT NULL;

-- トリガー確認
SELECT 
    tgname AS trigger_name,
    tgenabled AS is_enabled,
    'sellermirror_analysis' AS table_name
FROM pg_trigger
WHERE tgname = 'trigger_sync_sm_data';
