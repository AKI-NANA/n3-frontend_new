--
-- eBayカテゴリー統合システム - 完全拡張データベーススキーマ
-- 緊急修正版: sell_mirror_analysis テーブル不足対応
--

-- =============================================================================
-- yahoo_scraped_products テーブル拡張（カラム追加）
-- =============================================================================

-- 新規カラム追加（存在チェック付き）
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
    
    -- profit_estimation カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='profit_estimation') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN profit_estimation DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- listing_strategy カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='listing_strategy') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN listing_strategy VARCHAR(20) DEFAULT 'standard';
    END IF;
    
    -- approval_status カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='approval_status') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    -- detection_method カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='detection_method') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN detection_method VARCHAR(50) DEFAULT 'keyword';
    END IF;
    
    -- category_detected_at カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='yahoo_scraped_products' AND column_name='category_detected_at') THEN
        ALTER TABLE yahoo_scraped_products ADD COLUMN category_detected_at TIMESTAMP;
    END IF;

    RAISE NOTICE 'yahoo_scraped_products テーブル拡張完了';
END $$;

-- =============================================================================
-- sell_mirror_analysis テーブル作成（重要：エラー解決）
-- =============================================================================

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
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- 外部キー制約
    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE,
    
    -- ユニーク制約（1商品1有効分析）
    UNIQUE (yahoo_product_id, is_valid) WHERE is_valid = TRUE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sell_mirror_yahoo_product ON sell_mirror_analysis(yahoo_product_id);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_confidence ON sell_mirror_analysis(mirror_confidence);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_risk_level ON sell_mirror_analysis(risk_level);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_valid ON sell_mirror_analysis(is_valid);
CREATE INDEX IF NOT EXISTS idx_sell_mirror_expires ON sell_mirror_analysis(expires_at);

-- =============================================================================
-- store_listing_limits テーブル作成（出品枠管理）
-- =============================================================================

CREATE TABLE IF NOT EXISTS store_listing_limits (
    id SERIAL PRIMARY KEY,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('basic', 'premium', 'anchor', 'enterprise')),
    month_year VARCHAR(7) NOT NULL, -- 'YYYY-MM' 形式
    
    -- 出品枠制限
    all_categories_limit INTEGER DEFAULT 250,
    select_categories_limit INTEGER DEFAULT 250,
    
    -- 現在使用数
    current_all_categories INTEGER DEFAULT 0,
    current_select_categories INTEGER DEFAULT 0,
    
    -- メタデータ
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- ユニーク制約
    UNIQUE (plan_type, month_year)
);

-- 初期データ投入
INSERT INTO store_listing_limits (plan_type, month_year, all_categories_limit, select_categories_limit) VALUES
('basic', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 250, 250),
('premium', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 1000, 1000),
('anchor', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 10000, 10000),
('enterprise', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 100000, 100000)
ON CONFLICT (plan_type, month_year) DO NOTHING;

-- =============================================================================
-- listing_quota_categories テーブル作成（Select Categories管理）
-- =============================================================================

CREATE TABLE IF NOT EXISTS listing_quota_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    is_select_category BOOLEAN DEFAULT FALSE,
    quota_usage_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- ユニーク制約
    UNIQUE (category_id)
);

-- =============================================================================
-- ebay_api_usage_log テーブル作成（API使用量監視）
-- =============================================================================

CREATE TABLE IF NOT EXISTS ebay_api_usage_log (
    id SERIAL PRIMARY KEY,
    date_hour TIMESTAMP NOT NULL, -- 時間単位
    api_type VARCHAR(50) NOT NULL, -- 'finding', 'trading', 'shopping'
    endpoint VARCHAR(100),
    request_count INTEGER DEFAULT 1,
    response_time_ms INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    error_count INTEGER DEFAULT 0,
    
    -- パーティション対応のインデックス
    UNIQUE (date_hour, api_type, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_date_hour ON ebay_api_usage_log(date_hour);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_type ON ebay_api_usage_log(api_type);

-- =============================================================================
-- mirror_listing_templates テーブル作成（ミラーテンプレート管理）
-- =============================================================================

CREATE TABLE IF NOT EXISTS mirror_listing_templates (
    id SERIAL PRIMARY KEY,
    ebay_item_id VARCHAR(20) NOT NULL,
    yahoo_product_id INTEGER,
    
    -- テンプレートデータ
    title_template TEXT NOT NULL,
    description_template TEXT,
    price DECIMAL(10,2),
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Item Specifics
    item_specifics TEXT,
    item_specifics_json JSONB,
    
    -- 画像URL
    image_urls TEXT[],
    
    -- パフォーマンスデータ
    view_count INTEGER DEFAULT 0,
    watcher_count INTEGER DEFAULT 0,
    sold_date TIMESTAMP,
    final_price DECIMAL(10,2),
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 外部キー
    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_scraped_products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mirror_templates_ebay_item ON mirror_listing_templates(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_mirror_templates_yahoo_product ON mirror_listing_templates(yahoo_product_id);
CREATE INDEX IF NOT EXISTS idx_mirror_templates_active ON mirror_listing_templates(is_active);

-- =============================================================================
-- ebay_complete_item_specifics テーブル作成（Item Specifics仕様管理）
-- =============================================================================

CREATE TABLE IF NOT EXISTS ebay_complete_item_specifics (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('required', 'recommended', 'optional')),
    
    -- 仕様詳細
    field_data_type VARCHAR(30) DEFAULT 'text',
    possible_values TEXT[],
    default_value VARCHAR(200),
    
    -- 優先度・信頼度
    priority_score INTEGER DEFAULT 50,
    confidence_score INTEGER DEFAULT 80,
    usage_frequency INTEGER DEFAULT 0,
    
    -- メタデータ
    is_critical_for_seo BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50) DEFAULT 'trading_api',
    
    -- ユニーク制約
    UNIQUE (category_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_item_specifics_category ON ebay_complete_item_specifics(category_id);
CREATE INDEX IF NOT EXISTS idx_item_specifics_field_type ON ebay_complete_item_specifics(field_type);
CREATE INDEX IF NOT EXISTS idx_item_specifics_priority ON ebay_complete_item_specifics(priority_score);

-- =============================================================================
-- 関数作成
-- =============================================================================

-- スコア計算関数
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
    
    -- 1. AI信頼度スコア (25点満点)
    score := score + COALESCE(product_record.ai_confidence, product_record.category_confidence, 0) * 0.25;
    
    -- 2. カテゴリー信頼度スコア (20点満点)
    score := score + COALESCE(product_record.category_confidence, 0) * 0.20;
    
    -- 3. セルミラースコア (30点満点)
    IF mirror_record IS NOT NULL THEN
        score := score + mirror_record.mirror_confidence * 0.30;
        -- リスクレベルボーナス
        CASE mirror_record.risk_level
            WHEN 'LOW' THEN score := score + 5;
            WHEN 'MEDIUM' THEN score := score + 2;
            ELSE score := score + 0;
        END CASE;
    END IF;
    
    -- 4. 利益率スコア (15点満点)
    IF COALESCE(product_record.profit_estimation, 0) > 0 THEN
        score := score + LEAST(15, product_record.profit_estimation / 10);
    END IF;
    
    -- 5. 鮮度スコア (5点満点)
    days_old := EXTRACT(epoch FROM (CURRENT_TIMESTAMP - product_record.created_at)) / 86400;
    IF days_old <= 1 THEN
        score := score + 5;
    ELSIF days_old <= 7 THEN
        score := score + 3;
    ELSIF days_old <= 30 THEN
        score := score + 1;
    END IF;
    
    -- 6. Select Categoriesボーナス (5点満点)
    IF EXISTS (
        SELECT 1 FROM listing_quota_categories lqc
        JOIN ebay_category_fees ecf ON lqc.category_id = ecf.category_id
        WHERE ecf.category_id = product_record.ebay_category_id AND lqc.is_select_category = TRUE
    ) THEN
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

-- 出品枠チェック関数
CREATE OR REPLACE FUNCTION check_listing_quota(store_plan VARCHAR(20), category_id VARCHAR(20))
RETURNS JSON AS $$
DECLARE
    current_month VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    quota_record RECORD;
    is_select BOOLEAN := FALSE;
    available_all INTEGER;
    available_select INTEGER;
BEGIN
    -- 現在の出品枠状況取得
    SELECT * INTO quota_record
    FROM store_listing_limits 
    WHERE plan_type = store_plan AND month_year = current_month;
    
    IF NOT FOUND THEN
        RETURN json_build_object('available', false, 'reason', 'quota_record_not_found');
    END IF;
    
    -- Select Categories確認
    SELECT is_select_category INTO is_select
    FROM listing_quota_categories 
    WHERE category_id = check_listing_quota.category_id;
    
    -- 残数計算
    available_all := quota_record.all_categories_limit - quota_record.current_all_categories;
    available_select := quota_record.select_categories_limit - quota_record.current_select_categories;
    
    -- 判定
    IF is_select AND available_select > 0 THEN
        RETURN json_build_object(
            'available', true,
            'quota_type', 'select_categories',
            'remaining', available_select
        );
    ELSIF available_all > 0 THEN
        RETURN json_build_object(
            'available', true,
            'quota_type', 'all_categories', 
            'remaining', available_all
        );
    ELSE
        RETURN json_build_object(
            'available', false,
            'reason', 'quota_exceeded',
            'remaining_all', available_all,
            'remaining_select', available_select
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- データクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- 期限切れセルミラー分析削除
    DELETE FROM sell_mirror_analysis WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 期限切れミラーテンプレート削除
    DELETE FROM mirror_listing_templates WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- 古いAPI使用ログ削除（90日以上前）
    DELETE FROM ebay_api_usage_log WHERE date_hour < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 月次データ整合性チェック関数
CREATE OR REPLACE FUNCTION monthly_data_integrity_check()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    inconsistent_scores INTEGER;
    missing_categories INTEGER;
BEGIN
    -- スコア不整合チェック
    SELECT COUNT(*) INTO inconsistent_scores
    FROM yahoo_scraped_products 
    WHERE ABS(COALESCE(listing_score, 0) - calculate_listing_score(id)) > 1;
    
    IF inconsistent_scores > 0 THEN
        result_text := result_text || 'inconsistent scores: ' || inconsistent_scores || ' items; ';
    END IF;
    
    -- カテゴリー未設定チェック
    SELECT COUNT(*) INTO missing_categories
    FROM yahoo_scraped_products 
    WHERE ebay_category_id IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
    
    IF missing_categories > 0 THEN
        result_text := result_text || 'missing categories: ' || missing_categories || ' items; ';
    END IF;
    
    IF result_text = '' THEN
        result_text := 'data integrity check passed';
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 初期データ投入・更新
-- =============================================================================

-- ebay_category_fees テーブルの is_select_category カラム追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ebay_category_fees' AND column_name='is_select_category') THEN
        ALTER TABLE ebay_category_fees ADD COLUMN is_select_category BOOLEAN DEFAULT FALSE;
        
        -- Select Categories 設定（主要カテゴリー）
        UPDATE ebay_category_fees SET is_select_category = TRUE 
        WHERE category_id IN ('293', '625', '58058', '183454', '139973');
        
        RAISE NOTICE 'ebay_category_fees テーブル is_select_category カラム追加完了';
    END IF;
END $$;

-- listing_quota_categories 初期データ
INSERT INTO listing_quota_categories (category_id, category_name, is_select_category) VALUES
('293', 'Cell Phones & Smartphones', TRUE),
('625', 'Cameras & Photo', TRUE),
('58058', 'Sports Trading Cards', TRUE),
('183454', 'Non-Sport Trading Cards', TRUE),
('139973', 'Video Games', TRUE)
ON CONFLICT (category_id) DO UPDATE SET
    is_select_category = EXCLUDED.is_select_category;

-- =============================================================================
-- 完了メッセージ
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'eBayカテゴリー統合システム';
    RAISE NOTICE '完全拡張データベーススキーマ構築完了';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ sell_mirror_analysis テーブル作成完了';
    RAISE NOTICE '✅ store_listing_limits テーブル作成完了';  
    RAISE NOTICE '✅ listing_quota_categories テーブル作成完了';
    RAISE NOTICE '✅ ebay_api_usage_log テーブル作成完了';
    RAISE NOTICE '✅ mirror_listing_templates テーブル作成完了';
    RAISE NOTICE '✅ ebay_complete_item_specifics テーブル作成完了';
    RAISE NOTICE '✅ 全計算関数作成完了';
    RAISE NOTICE '✅ yahoo_scraped_products テーブル拡張完了';
    RAISE NOTICE '';
    RAISE NOTICE 'システム稼働準備完了！';
    RAISE NOTICE '';
END $$;