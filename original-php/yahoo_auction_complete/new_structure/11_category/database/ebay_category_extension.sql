-- eBayカテゴリー自動判定システム - データベース拡張SQL
-- Yahoo Auction連携 + 出品枠管理機能追加
-- 実行日: 2025年9月19日

-- =============================================================================
-- Phase 1: Yahoo Auctionテーブル拡張（引き継ぎ書対応）
-- =============================================================================

-- yahoo_scraped_products テーブル拡張
-- eBayカテゴリー判定結果を保存
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS ebay_category_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100),
ADD COLUMN IF NOT EXISTS item_specifics TEXT,
ADD COLUMN IF NOT EXISTS ebay_fees_data JSONB,
ADD COLUMN IF NOT EXISTS category_detected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS listing_quota_type VARCHAR(20), -- 'all_categories', 'select_categories'
ADD COLUMN IF NOT EXISTS detection_method VARCHAR(50); -- 'ebay_api', 'keyword_matching', 'manual'

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_ebay_category 
ON yahoo_scraped_products(ebay_category_id);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_confidence 
ON yahoo_scraped_products(category_confidence);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_quota_type 
ON yahoo_scraped_products(listing_quota_type);

-- =============================================================================
-- Phase 2: 出品枠管理システム（引き継ぎ書Phase D対応）
-- =============================================================================

-- Select Categories分類テーブル
CREATE TABLE IF NOT EXISTS listing_quota_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    quota_type VARCHAR(20) NOT NULL CHECK (quota_type IN ('all_categories', 'select_categories')),
    store_level VARCHAR(20) NOT NULL CHECK (store_level IN ('basic', 'premium', 'anchor', 'enterprise')),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, store_level)
);

-- 現在出品数追跡テーブル  
CREATE TABLE IF NOT EXISTS current_listings_count (
    id SERIAL PRIMARY KEY,
    store_level VARCHAR(20) NOT NULL CHECK (store_level IN ('basic', 'premium', 'anchor', 'enterprise')),
    quota_type VARCHAR(20) NOT NULL CHECK (quota_type IN ('all_categories', 'select_categories')),
    current_count INTEGER DEFAULT 0,
    max_quota INTEGER NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- 'YYYY-MM' format
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_level, quota_type, month_year)
);

-- 出品枠履歴テーブル
CREATE TABLE IF NOT EXISTS listing_quota_history (
    id SERIAL PRIMARY KEY,
    store_level VARCHAR(20) NOT NULL,
    quota_type VARCHAR(20) NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    used_count INTEGER DEFAULT 0,
    max_quota INTEGER NOT NULL,
    daily_snapshots JSONB, -- 日別使用数のスナップショット
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Phase 3: eBay API連携テーブル
-- =============================================================================

-- API呼び出し履歴テーブル
CREATE TABLE IF NOT EXISTS ebay_api_calls (
    id SERIAL PRIMARY KEY,
    api_method VARCHAR(100) NOT NULL, -- 'findItemsAdvanced', 'getCategories'等
    query_params JSONB NOT NULL,
    response_data JSONB,
    response_code INTEGER,
    api_call_time TIMESTAMP DEFAULT NOW(),
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    rate_limit_remaining INTEGER
);

-- eBayカテゴリー検索結果キャッシュ
CREATE TABLE IF NOT EXISTS ebay_category_search_cache (
    id SERIAL PRIMARY KEY,
    search_title VARCHAR(500) NOT NULL,
    title_hash VARCHAR(64) NOT NULL, -- タイトルのハッシュ値
    ebay_category_id VARCHAR(20),
    confidence_score DECIMAL(5,2),
    api_response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    hit_count INTEGER DEFAULT 0,
    UNIQUE(title_hash)
);

-- =============================================================================
-- Phase 4: 初期データ投入
-- =============================================================================

-- Select Categories初期分類（手動マッピング）
INSERT INTO listing_quota_categories (category_id, quota_type, store_level, notes) VALUES
-- Select Categories（出品枠制限あり）
('293', 'select_categories', 'basic', 'Cell Phones & Smartphones - 高需要カテゴリー'),
('625', 'select_categories', 'basic', 'Cameras & Photo - 高価格商品'),
('58058', 'select_categories', 'basic', 'Sports Trading Cards - 人気カテゴリー'),
('183454', 'select_categories', 'basic', 'Non-Sport Trading Cards - Pokemon等'),
('888', 'select_categories', 'basic', 'Trading Card Games - 遊戯王等'),

-- All Categories（通常出品枠）
('139973', 'all_categories', 'basic', 'Video Games - 通常枠'),
('11450', 'all_categories', 'basic', 'Clothing - 通常枠'),
('1425', 'all_categories', 'basic', 'Laptops & Netbooks - 通常枠'),
('99999', 'all_categories', 'basic', 'Other/Unclassified - デフォルト')
ON CONFLICT (category_id, store_level) DO NOTHING;

-- 現在の出品枠設定（2025年9月基準）
INSERT INTO current_listings_count (store_level, quota_type, current_count, max_quota, month_year) VALUES
('basic', 'all_categories', 0, 250, '2025-09'),
('basic', 'select_categories', 0, 10, '2025-09'),
('premium', 'all_categories', 0, 1000, '2025-09'),
('premium', 'select_categories', 0, 100, '2025-09'),
('anchor', 'all_categories', 0, 10000, '2025-09'),
('anchor', 'select_categories', 0, 1000, '2025-09')
ON CONFLICT (store_level, quota_type, month_year) DO NOTHING;

-- =============================================================================
-- Phase 5: 便利関数・ビュー作成
-- =============================================================================

-- 出品枠残数計算関数
CREATE OR REPLACE FUNCTION get_remaining_quota(
    p_store_level VARCHAR(20),
    p_quota_type VARCHAR(20),
    p_month_year VARCHAR(7) DEFAULT TO_CHAR(NOW(), 'YYYY-MM')
) RETURNS INTEGER AS $$
DECLARE
    v_current_count INTEGER := 0;
    v_max_quota INTEGER := 0;
BEGIN
    SELECT current_count, max_quota INTO v_current_count, v_max_quota
    FROM current_listings_count 
    WHERE store_level = p_store_level 
      AND quota_type = p_quota_type 
      AND month_year = p_month_year;
    
    IF FOUND THEN
        RETURN GREATEST(0, v_max_quota - v_current_count);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- カテゴリー判定統計ビュー
CREATE OR REPLACE VIEW ebay_category_detection_stats AS
SELECT 
    ebay_category_id,
    ebay_category_name,
    COUNT(*) as detection_count,
    AVG(category_confidence) as avg_confidence,
    MIN(category_confidence) as min_confidence,
    MAX(category_confidence) as max_confidence,
    COUNT(CASE WHEN category_confidence >= 80 THEN 1 END) as high_confidence_count,
    detection_method,
    listing_quota_type
FROM yahoo_scraped_products 
WHERE ebay_category_id IS NOT NULL
GROUP BY ebay_category_id, ebay_category_name, detection_method, listing_quota_type
ORDER BY detection_count DESC;

-- =============================================================================
-- Phase 6: インデックス最適化
-- =============================================================================

-- API呼び出し効率化インデックス
CREATE INDEX IF NOT EXISTS idx_ebay_api_calls_method_time 
ON ebay_api_calls(api_method, api_call_time DESC);

-- キャッシュ効率化インデックス
CREATE INDEX IF NOT EXISTS idx_ebay_category_cache_hash 
ON ebay_category_search_cache(title_hash);

CREATE INDEX IF NOT EXISTS idx_ebay_category_cache_expires 
ON ebay_category_search_cache(expires_at);

-- 出品枠管理インデックス
CREATE INDEX IF NOT EXISTS idx_listing_quota_categories_type 
ON listing_quota_categories(quota_type, store_level);

CREATE INDEX IF NOT EXISTS idx_current_listings_month 
ON current_listings_count(month_year, store_level);

-- =============================================================================
-- 完了確認
-- =============================================================================

DO $$
DECLARE
    yahoo_table_exists BOOLEAN;
    listing_quota_count INTEGER;
    current_listings_count INTEGER;
BEGIN
    -- yahoo_scraped_products テーブル存在確認
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'yahoo_scraped_products'
    ) INTO yahoo_table_exists;
    
    -- 新規テーブルのレコード数確認
    SELECT COUNT(*) INTO listing_quota_count FROM listing_quota_categories;
    SELECT COUNT(*) INTO current_listings_count FROM current_listings_count;
    
    RAISE NOTICE '=== eBayカテゴリー自動判定システム - データベース拡張完了 ===';
    RAISE NOTICE 'Yahoo Auctionテーブル存在: %', yahoo_table_exists;
    RAISE NOTICE 'Select Categories分類: % 件', listing_quota_count;
    RAISE NOTICE '現在出品枠設定: % 件', current_listings_count;
    RAISE NOTICE '拡張完了日時: %', NOW();
    RAISE NOTICE '次のステップ: eBay Finding API実装開始';
END $$;