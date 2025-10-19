-- eBayカテゴリー統合システム - 緊急エラー修正SQL
-- 実行方法: psql -h localhost -U aritahiroaki -d nagano3_db -f この_ファイル

-- 🚨 緊急: sell_mirror_analysis テーブル作成
CREATE TABLE IF NOT EXISTS sell_mirror_analysis (
    id SERIAL PRIMARY KEY,
    yahoo_product_id INTEGER NOT NULL,
    analysis_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 分析結果データ
    mirror_confidence DECIMAL(5,2) DEFAULT 0 CHECK (mirror_confidence >= 0 AND mirror_confidence <= 100),
    risk_level VARCHAR(20) DEFAULT 'HIGH' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    
    -- 売上データ
    sold_count_90days INTEGER DEFAULT 0,
    sold_count_30days INTEGER DEFAULT 0,
    average_price DECIMAL(10,2) DEFAULT 0,
    min_price DECIMAL(10,2) DEFAULT 0,
    max_price DECIMAL(10,2) DEFAULT 0,
    median_price DECIMAL(10,2) DEFAULT 0,
    
    -- 競合データ
    competitor_count INTEGER DEFAULT 0,
    active_listings_count INTEGER DEFAULT 0,
    
    -- 推定データ
    profit_estimation DECIMAL(10,2) DEFAULT 0,
    demand_score INTEGER DEFAULT 0 CHECK (demand_score >= 0 AND demand_score <= 100),
    
    -- ミラーテンプレート
    mirror_templates JSONB,
    
    -- 分析メタデータ
    ebay_category_id VARCHAR(20),
    api_calls_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    
    -- 有効性管理
    is_valid BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sell_mirror_yahoo_product ON sell_mirror_analysis(yahoo_product_id);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_confidence ON sell_mirror_analysis(mirror_confidence);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_valid ON sell_mirror_analysis(is_valid);

-- yahoo_scraped_products テーブル拡張（必要なカラム追加）
DO $$ 
BEGIN
    -- listing_score カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='listing_score') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN listing_score DECIMAL(8,4) DEFAULT 0;
    END IF;
    
    -- listing_rank カラム追加  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='listing_rank') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN listing_rank VARCHAR(10) DEFAULT 'C';
    END IF;
    
    -- ai_confidence カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='ai_confidence') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN ai_confidence DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- complete_item_specifics カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='complete_item_specifics') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN complete_item_specifics TEXT;
    END IF;
    
    -- category_detected_at カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='category_detected_at') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN category_detected_at TIMESTAMP;
    END IF;
END $$;

-- store_listing_limits テーブル作成（出品枠管理）
CREATE TABLE IF NOT EXISTS store_listing_limits (
    id SERIAL PRIMARY KEY,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('basic', 'premium', 'anchor', 'enterprise')),
    month_year VARCHAR(7) NOT NULL,
    all_categories_limit INTEGER DEFAULT 250,
    select_categories_limit INTEGER DEFAULT 250,
    current_all_categories INTEGER DEFAULT 0,
    current_select_categories INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (plan_type, month_year)
);

-- 初期データ投入
INSERT INTO store_listing_limits (plan_type, month_year, all_categories_limit, select_categories_limit) VALUES
('basic', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 250, 250)
ON CONFLICT (plan_type, month_year) DO NOTHING;

-- listing_quota_categories テーブル作成
CREATE TABLE IF NOT EXISTS listing_quota_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    is_select_category BOOLEAN DEFAULT FALSE,
    quota_usage_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_id)
);

-- ebay_complete_item_specifics テーブル作成
CREATE TABLE IF NOT EXISTS ebay_complete_item_specifics (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('required', 'recommended', 'optional')),
    field_data_type VARCHAR(30) DEFAULT 'text',
    possible_values TEXT[],
    default_value VARCHAR(200),
    priority_score INTEGER DEFAULT 50,
    confidence_score INTEGER DEFAULT 80,
    usage_frequency INTEGER DEFAULT 0,
    is_critical_for_seo BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50) DEFAULT 'trading_api',
    UNIQUE (category_id, field_name)
);

-- スコア計算関数作成
CREATE OR REPLACE FUNCTION calculate_listing_score(product_id INTEGER)
RETURNS DECIMAL(8,4) AS $$
DECLARE
    score DECIMAL(8,4) := 0;
    product_record RECORD;
    mirror_record RECORD;
    days_old INTEGER;
BEGIN
    -- 商品データ取得
    SELECT * INTO product_record
    FROM yahoo_scraped_products 
    WHERE id = product_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- セルミラーデータ取得
    SELECT * INTO mirror_record
    FROM sell_mirror_analysis 
    WHERE yahoo_product_id = product_id AND is_valid = TRUE
    LIMIT 1;
    
    -- 1. AI信頼度スコア (25点満点) - NULLチェック追加
    score := score + COALESCE(product_record.ai_confidence, product_record.category_confidence, 0) * 0.25;
    
    -- 2. カテゴリー信頼度スコア (20点満点)
    score := score + COALESCE(product_record.category_confidence, 0) * 0.20;
    
    -- 3. セルミラースコア (30点満点)
    IF mirror_record IS NOT NULL THEN
        score := score + COALESCE(mirror_record.mirror_confidence, 0) * 0.30;
    ELSE
        -- セルミラーデータがない場合はデフォルト値
        score := score + 15; -- 30点の半分をデフォルト
    END IF;
    
    -- 4. 利益率スコア (15点満点) - NULLチェック追加
    score := score + LEAST(15, COALESCE(product_record.price_usd, product_record.price_jpy / 150.0, 0) * 0.1);
    
    -- 5. 鮮度スコア (5点満点)
    days_old := EXTRACT(epoch FROM (CURRENT_TIMESTAMP - product_record.created_at)) / 86400;
    IF days_old <= 1 THEN
        score := score + 5;
    ELSIF days_old <= 7 THEN
        score := score + 3;
    ELSIF days_old <= 30 THEN
        score := score + 1;
    END IF;
    
    -- 6. カテゴリーボーナス (5点満点)
    IF product_record.ebay_category_id IS NOT NULL THEN
        score := score + 5;
    END IF;
    
    -- 最大100点制限
    RETURN LEAST(100, GREATEST(0, score));
END;
$$ LANGUAGE plpgsql;

-- ランク計算関数
CREATE OR REPLACE FUNCTION calculate_listing_rank(score DECIMAL(8,4))
RETURNS VARCHAR(10) AS $$
BEGIN
    IF score >= 90 THEN
        RETURN 'S';
    ELSIF score >= 70 THEN
        RETURN 'A';
    ELSIF score >= 50 THEN
        RETURN 'B';
    ELSE
        RETURN 'C';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 既存データのスコア更新（NULLエラー対策）
UPDATE yahoo_scraped_products 
SET 
    listing_score = calculate_listing_score(id),
    listing_rank = calculate_listing_rank(calculate_listing_score(id))
WHERE listing_score IS NULL OR listing_score = 0;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚨 緊急エラー修正完了!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ sell_mirror_analysis テーブル作成完了';
    RAISE NOTICE '✅ yahoo_scraped_products テーブル拡張完了';  
    RAISE NOTICE '✅ store_listing_limits テーブル作成完了';
    RAISE NOTICE '✅ listing_quota_categories テーブル作成完了';
    RAISE NOTICE '✅ ebay_complete_item_specifics テーブル作成完了';
    RAISE NOTICE '✅ スコア計算関数作成完了 (NULLエラー対策済み)';
    RAISE NOTICE '✅ 既存データのスコア更新完了';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 システム完全修復完了！';
    RAISE NOTICE '   両方のURLが正常動作するはずです！';
    RAISE NOTICE '';
END $$;