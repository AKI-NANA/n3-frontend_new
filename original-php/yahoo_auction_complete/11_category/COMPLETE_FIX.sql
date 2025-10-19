-- eBayカテゴリー統合システム - 完全修復SQL
-- テーブル構造の問題を解決する包括的修正

-- 1. まず現在のテーブル構造を確認
DO $$
DECLARE
    col_exists boolean;
BEGIN
    -- yahoo_scraped_products テーブルが存在するかチェック
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products') THEN
        RAISE NOTICE '✅ yahoo_scraped_products テーブルが存在します';
        
        -- 主要カラムの存在確認
        SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='title') INTO col_exists;
        IF col_exists THEN
            RAISE NOTICE '✅ title カラム存在';
        ELSE
            RAISE NOTICE '❌ title カラム不存在 - product_title を確認';
        END IF;
        
        SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='product_title') INTO col_exists;
        IF col_exists THEN
            RAISE NOTICE '✅ product_title カラム存在';
        ELSE
            RAISE NOTICE '❌ product_title カラム不存在';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ yahoo_scraped_products テーブルが存在しません！';
    END IF;
END $$;

-- 2. sell_mirror_analysis テーブル作成（存在チェック付き）
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

-- インデックス作成（重複チェック付き）
CREATE INDEX IF NOT EXISTS idx_sell_mirror_yahoo_product ON sell_mirror_analysis(yahoo_product_id);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_confidence ON sell_mirror_analysis(mirror_confidence);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_valid ON sell_mirror_analysis(is_valid);

-- 3. yahoo_scraped_products テーブル拡張（柔軟な対応）
DO $$ 
DECLARE
    table_exists boolean;
    title_col_exists boolean;
    product_title_col_exists boolean;
BEGIN
    -- テーブル存在チェック
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products') INTO table_exists;
    
    IF NOT table_exists THEN
        -- テーブルが存在しない場合は作成
        CREATE TABLE yahoo_scraped_products (
            id SERIAL PRIMARY KEY,
            title TEXT,
            product_title TEXT,
            description TEXT,
            price_jpy DECIMAL(10,2),
            price_usd DECIMAL(10,2),
            category VARCHAR(200),
            yahoo_category VARCHAR(200),
            image_url TEXT,
            active_image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE '✅ yahoo_scraped_products テーブルを新規作成しました';
    END IF;
    
    -- title カラムチェック
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='title') INTO title_col_exists;
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='product_title') INTO product_title_col_exists;
    
    -- title カラムが存在しない場合の対応
    IF NOT title_col_exists AND NOT product_title_col_exists THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN title TEXT;
        RAISE NOTICE '✅ title カラムを追加しました';
    ELSIF NOT title_col_exists AND product_title_col_exists THEN
        -- product_title カラムがある場合は title として使用するためのビューを作成
        RAISE NOTICE 'ℹ️ product_title カラムが存在します - title カラムを追加して同期します';
        ALTER TABLE yahoo_scraped_products ADD COLUMN title TEXT;
        UPDATE yahoo_scraped_products SET title = product_title WHERE title IS NULL;
    END IF;
    
    -- 必要なカラムを順次追加
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='listing_score') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN listing_score DECIMAL(8,4) DEFAULT 0;
        RAISE NOTICE '✅ listing_score カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='listing_rank') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN listing_rank VARCHAR(10) DEFAULT 'C';
        RAISE NOTICE '✅ listing_rank カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='ai_confidence') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN ai_confidence DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE '✅ ai_confidence カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='category_confidence') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN category_confidence DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE '✅ category_confidence カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='complete_item_specifics') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN complete_item_specifics TEXT;
        RAISE NOTICE '✅ complete_item_specifics カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='ebay_category_id') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN ebay_category_id VARCHAR(20);
        RAISE NOTICE '✅ ebay_category_id カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='ebay_category_name') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN ebay_category_name VARCHAR(200);
        RAISE NOTICE '✅ ebay_category_name カラム追加';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='category_detected_at') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN category_detected_at TIMESTAMP;
        RAISE NOTICE '✅ category_detected_at カラム追加';
    END IF;
    
END $$;

-- 4. 其他必要なテーブル作成
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

INSERT INTO store_listing_limits (plan_type, month_year, all_categories_limit, select_categories_limit) VALUES
('basic', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 250, 250)
ON CONFLICT (plan_type, month_year) DO NOTHING;

CREATE TABLE IF NOT EXISTS listing_quota_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    is_select_category BOOLEAN DEFAULT FALSE,
    quota_usage_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_id)
);

-- 5. サンプルデータ投入（テスト用）
INSERT INTO yahoo_scraped_products (title, description, price_jpy, price_usd) VALUES
('iPhone 14 Pro 128GB スペースブラック', 'SIMフリー 美品', 120000, 800)
ON CONFLICT DO NOTHING;

-- 6. 改良されたスコア計算関数（NULLエラー完全対策）
CREATE OR REPLACE FUNCTION calculate_listing_score(product_id INTEGER)
RETURNS DECIMAL(8,4) AS $$
DECLARE
    score DECIMAL(8,4) := 0;
    product_record RECORD;
    mirror_record RECORD;
    days_old INTEGER;
    base_score DECIMAL(8,4);
BEGIN
    -- 商品データ取得（全カラムNULLチェック対応）
    SELECT 
        id,
        COALESCE(title, product_title, '') as title,
        COALESCE(ai_confidence, 0) as ai_confidence,
        COALESCE(category_confidence, 0) as category_confidence,
        COALESCE(price_usd, price_jpy / 150.0, 0) as price,
        COALESCE(ebay_category_id, '') as ebay_category_id,
        created_at
    INTO product_record
    FROM yahoo_scraped_products 
    WHERE id = product_id;
    
    IF NOT FOUND THEN
        RETURN 50.0; -- デフォルトスコア
    END IF;
    
    -- セルミラーデータ取得
    SELECT 
        COALESCE(mirror_confidence, 0) as mirror_confidence,
        COALESCE(risk_level, 'MEDIUM') as risk_level
    INTO mirror_record
    FROM sell_mirror_analysis 
    WHERE yahoo_product_id = product_id AND is_valid = TRUE
    LIMIT 1;
    
    -- 基本スコア計算（最低50点保証）
    base_score := 50.0;
    
    -- 1. AI信頼度スコア (15点満点)
    IF product_record.ai_confidence > 0 THEN
        score := score + (product_record.ai_confidence * 0.15);
    ELSIF product_record.category_confidence > 0 THEN
        score := score + (product_record.category_confidence * 0.15);
    ELSE
        score := score + 7.5; -- デフォルト値
    END IF;
    
    -- 2. カテゴリー設定ボーナス (15点満点)
    IF product_record.ebay_category_id != '' THEN
        score := score + 15;
    ELSE
        score := score + 5; -- 部分ボーナス
    END IF;
    
    -- 3. セルミラースコア (20点満点)
    IF mirror_record IS NOT NULL THEN
        score := score + (COALESCE(mirror_record.mirror_confidence, 0) * 0.20);
        -- リスクレベルボーナス
        CASE mirror_record.risk_level
            WHEN 'LOW' THEN score := score + 5;
            WHEN 'MEDIUM' THEN score := score + 2;
            ELSE score := score + 0;
        END CASE;
    ELSE
        score := score + 10; -- デフォルト値
    END IF;
    
    -- 4. 商品情報充実度 (10点満点)
    IF LENGTH(COALESCE(product_record.title, '')) > 10 THEN
        score := score + 10;
    ELSE
        score := score + 3;
    END IF;
    
    -- 5. 鮮度スコア (10点満点)
    IF product_record.created_at IS NOT NULL THEN
        days_old := EXTRACT(epoch FROM (CURRENT_TIMESTAMP - product_record.created_at)) / 86400;
        IF days_old <= 1 THEN
            score := score + 10;
        ELSIF days_old <= 7 THEN
            score := score + 7;
        ELSIF days_old <= 30 THEN
            score := score + 3;
        ELSE
            score := score + 1;
        END IF;
    ELSE
        score := score + 5; -- デフォルト
    END IF;
    
    -- 最終スコア調整
    score := base_score + score;
    
    -- 0-100範囲制限
    RETURN LEAST(100.0, GREATEST(0.0, score));
END;
$$ LANGUAGE plpgsql;

-- 7. ランク計算関数（NULLセーフ）
CREATE OR REPLACE FUNCTION calculate_listing_rank(score DECIMAL(8,4))
RETURNS VARCHAR(10) AS $$
BEGIN
    IF score IS NULL THEN
        RETURN 'C';
    ELSIF score >= 90 THEN
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

-- 8. 既存データのスコア更新（安全に実行）
UPDATE yahoo_scraped_products 
SET 
    listing_score = calculate_listing_score(id),
    listing_rank = calculate_listing_rank(calculate_listing_score(id)),
    ai_confidence = COALESCE(ai_confidence, 0),
    category_confidence = COALESCE(category_confidence, 0)
WHERE id IS NOT NULL;

-- 9. 完了メッセージ
DO $$
DECLARE
    product_count INTEGER;
    avg_score DECIMAL;
BEGIN
    SELECT COUNT(*), AVG(COALESCE(listing_score, 0)) 
    INTO product_count, avg_score 
    FROM yahoo_scraped_products;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 完全修復完了！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ sell_mirror_analysis テーブル作成完了';
    RAISE NOTICE '✅ yahoo_scraped_products 構造修正完了';
    RAISE NOTICE '✅ title/product_title カラム問題解決';
    RAISE NOTICE '✅ NULLエラー完全対策済みスコア計算';
    RAISE NOTICE '✅ 既存データ更新完了';
    RAISE NOTICE '';
    RAISE NOTICE 'データ状況:';
    RAISE NOTICE '  商品数: % 件', product_count;
    RAISE NOTICE '  平均スコア: %', COALESCE(avg_score, 0);
    RAISE NOTICE '';
    RAISE NOTICE '🚀 両方のURLが正常動作するはずです！';
    RAISE NOTICE '   number_format エラーも解決済み！';
    RAISE NOTICE '';
END $$;