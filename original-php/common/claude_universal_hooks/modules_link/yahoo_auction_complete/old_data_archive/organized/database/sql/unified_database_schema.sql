-- =======================================================================
-- Yahoo Auction Tool 統合データベーススキーマ
-- 目的: 分散したデータを統一管理・重複検出・SKU統合システム構築
-- 作成日: 2025-09-12
-- =======================================================================

-- 既存テーブルが存在する場合はバックアップ作成
DO $$
BEGIN
    -- バックアップテーブル作成（データ保護）
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mystical_japan_treasures_inventory_backup_' || to_char(now(), 'YYYYMMDD')) THEN
        RAISE NOTICE 'バックアップテーブルは既に存在します';
    ELSE
        EXECUTE 'CREATE TABLE mystical_japan_treasures_inventory_backup_' || to_char(now(), 'YYYYMMDD') || ' AS SELECT * FROM mystical_japan_treasures_inventory';
        RAISE NOTICE 'バックアップテーブルを作成しました: mystical_japan_treasures_inventory_backup_%', to_char(now(), 'YYYYMMDD');
    END IF;
END $$;

-- =======================================================================
-- 1. 中央商品マスターテーブル（統合管理の核心）
-- =======================================================================

CREATE TABLE IF NOT EXISTS product_master (
    -- 主キー：全システム統合SKU
    master_sku VARCHAR(50) PRIMARY KEY,
    
    -- 基本商品情報
    product_name_jp TEXT NOT NULL,
    product_name_en TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    model_number VARCHAR(100),
    
    -- 価格情報
    purchase_price_jpy DECIMAL(10,2),
    selling_price_usd DECIMAL(10,2),
    exchange_rate_used DECIMAL(6,3) DEFAULT 150.0,
    
    -- 状態・在庫
    condition_code INTEGER DEFAULT 1000, -- eBay ConditionID準拠
    inventory_type VARCHAR(20) DEFAULT 'physical' CHECK (inventory_type IN ('physical', 'dropship', 'hybrid', 'set')),
    
    -- 管理情報
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system',
    
    -- データ品質保証
    data_quality_score INTEGER DEFAULT 50 CHECK (data_quality_score BETWEEN 0 AND 100),
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- 楽観的ロック制御
    lock_version INTEGER DEFAULT 1
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_product_master_name_jp ON product_master USING gin(to_tsvector('japanese', product_name_jp));
CREATE INDEX IF NOT EXISTS idx_product_master_category ON product_master(category);
CREATE INDEX IF NOT EXISTS idx_product_master_brand ON product_master(brand);
CREATE INDEX IF NOT EXISTS idx_product_master_updated ON product_master(updated_at);

-- =======================================================================
-- 2. スクレイピングデータテーブル（重複検出機能付き）
-- =======================================================================

CREATE TABLE IF NOT EXISTS scraped_product_data (
    id SERIAL PRIMARY KEY,
    
    -- 商品マスター連携
    master_sku VARCHAR(50) REFERENCES product_master(master_sku) ON DELETE CASCADE,
    
    -- スクレイピング情報
    source_platform VARCHAR(50) NOT NULL, -- 'yahoo', 'mercari', 'amazon', etc.
    source_item_id VARCHAR(100) NOT NULL,
    source_url TEXT NOT NULL,
    
    -- 元データ
    original_title TEXT NOT NULL,
    original_price_jpy DECIMAL(10,2),
    original_condition VARCHAR(100),
    original_category VARCHAR(100),
    original_description TEXT,
    
    -- 画像情報
    primary_image_url TEXT,
    gallery_urls TEXT[], -- 配列で複数画像保存
    
    -- 重複検出用
    title_hash VARCHAR(64) NOT NULL, -- MD5ハッシュ
    content_fingerprint VARCHAR(64) NOT NULL, -- 内容類似度検出
    duplicate_group_id UUID DEFAULT gen_random_uuid(),
    similarity_score DECIMAL(5,2), -- 他商品との類似度（0-100）
    
    -- スクレイピング情報
    scraped_at TIMESTAMP DEFAULT NOW(),
    scraper_version VARCHAR(20),
    extraction_confidence DECIMAL(3,2), -- 抽出精度（0.00-1.00）
    
    -- ユニーク制約
    UNIQUE(source_platform, source_item_id)
);

-- インデックス作成（重複検出最適化）
CREATE INDEX IF NOT EXISTS idx_scraped_title_hash ON scraped_product_data(title_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_fingerprint ON scraped_product_data(content_fingerprint);
CREATE INDEX IF NOT EXISTS idx_scraped_duplicate_group ON scraped_product_data(duplicate_group_id);
CREATE INDEX IF NOT EXISTS idx_scraped_similarity ON scraped_product_data(similarity_score);
CREATE INDEX IF NOT EXISTS idx_scraped_platform ON scraped_product_data(source_platform);

-- =======================================================================
-- 3. eBay出品管理テーブル
-- =======================================================================

CREATE TABLE IF NOT EXISTS ebay_listing_data (
    id SERIAL PRIMARY KEY,
    
    -- 商品マスター連携
    master_sku VARCHAR(50) REFERENCES product_master(master_sku) ON DELETE CASCADE,
    
    -- eBay情報
    ebay_item_id VARCHAR(50) UNIQUE,
    ebay_listing_id VARCHAR(50),
    ebay_sku VARCHAR(100),
    
    -- 出品情報
    ebay_title VARCHAR(80) NOT NULL, -- eBay 80文字制限
    ebay_category_id INTEGER,
    ebay_condition_id INTEGER DEFAULT 1000,
    
    -- 価格・送料
    listing_price_usd DECIMAL(10,2) NOT NULL,
    shipping_cost_usd DECIMAL(10,2) DEFAULT 25.00,
    
    -- 商品詳細（Item Specifics）
    brand VARCHAR(100),
    mpn VARCHAR(100), -- Manufacturer Part Number
    upc VARCHAR(20),
    ean VARCHAR(20),
    item_type VARCHAR(100),
    color VARCHAR(50),
    size VARCHAR(50),
    material VARCHAR(100),
    
    -- 寸法・重量
    weight_lbs INTEGER DEFAULT 1,
    weight_oz INTEGER DEFAULT 0,
    length_inch DECIMAL(4,1),
    width_inch DECIMAL(4,1),
    height_inch DECIMAL(4,1),
    
    -- ステータス管理
    listing_status VARCHAR(20) DEFAULT 'draft' CHECK (listing_status IN ('draft', 'ready', 'listed', 'sold', 'ended', 'error')),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'review')),
    
    -- API連携情報
    ebay_api_response JSON,
    last_ebay_sync TIMESTAMP,
    sync_error_count INTEGER DEFAULT 0,
    
    -- 日時管理
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    listed_at TIMESTAMP,
    ended_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_item_id ON ebay_listing_data(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_ebay_status ON ebay_listing_data(listing_status);
CREATE INDEX IF NOT EXISTS idx_ebay_approval ON ebay_listing_data(approval_status);
CREATE INDEX IF NOT EXISTS idx_ebay_updated ON ebay_listing_data(updated_at);

-- =======================================================================
-- 4. 在庫管理テーブル（複数システム対応）
-- =======================================================================

CREATE TABLE IF NOT EXISTS inventory_management (
    id SERIAL PRIMARY KEY,
    
    -- 商品マスター連携
    master_sku VARCHAR(50) REFERENCES product_master(master_sku) ON DELETE CASCADE,
    
    -- 在庫情報
    inventory_type VARCHAR(20) NOT NULL CHECK (inventory_type IN ('physical', 'dropship', 'hybrid')),
    available_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    total_quantity INTEGER GENERATED ALWAYS AS (available_quantity + reserved_quantity) STORED,
    
    -- 場所情報
    warehouse_location VARCHAR(100),
    shelf_location VARCHAR(50),
    
    -- 管理システム情報
    management_system VARCHAR(50) NOT NULL, -- 'yahoo_tool', 'ebay_manager', 'manual'
    external_system_id VARCHAR(100),
    
    -- 在庫監視
    low_stock_threshold INTEGER DEFAULT 5,
    reorder_point INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 100,
    
    -- 楽観的ロック制御
    lock_version INTEGER DEFAULT 1,
    
    -- 日時管理
    last_inventory_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- ユニーク制約（同一商品・同一システム）
    UNIQUE(master_sku, management_system)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_management(master_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_system ON inventory_management(management_system);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_management(inventory_type);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory_management(available_quantity);

-- =======================================================================
-- 5. 禁止キーワード管理テーブル
-- =======================================================================

CREATE TABLE IF NOT EXISTS prohibited_keywords (
    id SERIAL PRIMARY KEY,
    
    -- キーワード情報
    keyword VARCHAR(255) NOT NULL,
    keyword_pattern VARCHAR(255), -- 正規表現パターン
    
    -- 分類情報
    category VARCHAR(50) NOT NULL, -- 'brand', 'illegal', 'restricted', 'policy'
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=最高優先度
    
    -- 検出情報
    detection_count INTEGER DEFAULT 0,
    last_detected TIMESTAMP,
    
    -- 管理情報
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system',
    
    -- ユニーク制約
    UNIQUE(keyword, category)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_prohibited_keyword ON prohibited_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_prohibited_category ON prohibited_keywords(category);
CREATE INDEX IF NOT EXISTS idx_prohibited_priority ON prohibited_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_prohibited_status ON prohibited_keywords(status);

-- =======================================================================
-- 6. 承認キューテーブル
-- =======================================================================

CREATE TABLE IF NOT EXISTS approval_queue (
    id SERIAL PRIMARY KEY,
    
    -- 商品マスター連携
    master_sku VARCHAR(50) REFERENCES product_master(master_sku) ON DELETE CASCADE,
    
    -- 承認情報
    approval_type VARCHAR(30) DEFAULT 'product_review', -- 'product_review', 'price_change', 'bulk_operation'
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- AI判定結果
    ai_status VARCHAR(20) DEFAULT 'pending' CHECK (ai_status IN ('approved', 'rejected', 'pending', 'review_required')),
    ai_confidence DECIMAL(3,2), -- AI判定の信頼度（0.00-1.00）
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    
    -- 人間判定結果
    human_status VARCHAR(20) DEFAULT 'pending' CHECK (human_status IN ('approved', 'rejected', 'pending')),
    approved_by VARCHAR(50),
    approval_notes TEXT,
    
    -- 日時管理
    queued_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_approval_sku ON approval_queue(master_sku);
CREATE INDEX IF NOT EXISTS idx_approval_type ON approval_queue(approval_type);
CREATE INDEX IF NOT EXISTS idx_approval_ai_status ON approval_queue(ai_status);
CREATE INDEX IF NOT EXISTS idx_approval_human_status ON approval_queue(human_status);
CREATE INDEX IF NOT EXISTS idx_approval_priority ON approval_queue(priority);

-- =======================================================================
-- 7. 重複検出・統合関数
-- =======================================================================

-- 重複検出関数
CREATE OR REPLACE FUNCTION detect_duplicates()
RETURNS TABLE(
    group_id UUID,
    master_skus TEXT[],
    similarity_count INTEGER,
    avg_similarity DECIMAL
) 
LANGUAGE plpgsql AS $$
BEGIN
    -- タイトルハッシュ による完全重複検出
    RETURN QUERY
    WITH hash_duplicates AS (
        SELECT 
            spd.duplicate_group_id,
            array_agg(spd.master_sku) as skus,
            COUNT(*) as dup_count,
            AVG(spd.similarity_score) as avg_sim
        FROM scraped_product_data spd
        WHERE spd.title_hash IN (
            SELECT title_hash 
            FROM scraped_product_data 
            GROUP BY title_hash 
            HAVING COUNT(*) > 1
        )
        GROUP BY spd.duplicate_group_id
        HAVING COUNT(*) > 1
    )
    SELECT 
        hd.duplicate_group_id,
        hd.skus,
        hd.dup_count,
        hd.avg_sim
    FROM hash_duplicates hd
    ORDER BY hd.dup_count DESC, hd.avg_sim DESC;
END $$;

-- 在庫計算関数
CREATE OR REPLACE FUNCTION calculate_available_stock(sku VARCHAR)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    total_available INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(available_quantity), 0)
    INTO total_available
    FROM inventory_management 
    WHERE master_sku = sku 
    AND inventory_type IN ('physical', 'hybrid');
    
    RETURN total_available;
END $$;

-- 安全在庫更新関数（楽観的ロック）
CREATE OR REPLACE FUNCTION sync_inventory_safe(
    sku VARCHAR, 
    new_quantity INTEGER, 
    system_name VARCHAR,
    expected_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE inventory_management 
    SET 
        available_quantity = new_quantity,
        updated_at = NOW(),
        lock_version = lock_version + 1
    WHERE master_sku = sku 
    AND management_system = system_name
    AND lock_version = expected_version;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    RETURN rows_updated > 0;
END $$;

-- タイトル禁止キーワードチェック関数
CREATE OR REPLACE FUNCTION check_prohibited_keywords(input_title TEXT)
RETURNS TABLE(
    keyword VARCHAR,
    category VARCHAR,
    priority INTEGER,
    match_position INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    -- キーワード検出・更新
    UPDATE prohibited_keywords 
    SET 
        detection_count = detection_count + 1,
        last_detected = NOW()
    WHERE status = 'active'
    AND (
        input_title ILIKE '%' || keyword || '%'
        OR (keyword_pattern IS NOT NULL AND input_title ~ keyword_pattern)
    );
    
    -- 検出結果返却
    RETURN QUERY
    SELECT 
        pk.keyword,
        pk.category,
        pk.priority,
        POSITION(LOWER(pk.keyword) IN LOWER(input_title)) as match_pos
    FROM prohibited_keywords pk
    WHERE pk.status = 'active'
    AND (
        input_title ILIKE '%' || pk.keyword || '%'
        OR (pk.keyword_pattern IS NOT NULL AND input_title ~ pk.keyword_pattern)
    )
    ORDER BY pk.priority ASC, CHAR_LENGTH(pk.keyword) DESC;
END $$;

-- =======================================================================
-- 8. 統合ビュー（フロントエンド用）
-- =======================================================================

-- 承認待ち商品統合ビュー
CREATE OR REPLACE VIEW approval_queue_unified AS
SELECT 
    pm.master_sku,
    pm.product_name_jp as title,
    pm.selling_price_usd as current_price,
    pm.condition_code,
    pm.category,
    pm.brand,
    
    spd.primary_image_url as picture_url,
    spd.source_url,
    spd.source_platform,
    spd.scraped_at,
    
    aq.ai_status,
    aq.risk_level,
    aq.priority,
    aq.queued_at as updated_at,
    
    calculate_available_stock(pm.master_sku) as stock_quantity,
    
    CASE 
        WHEN pm.selling_price_usd > 100 THEN 'ai-approved'
        WHEN pm.selling_price_usd < 50 THEN 'ai-rejected'
        ELSE 'ai-pending'
    END as ai_recommendation,
    
    CASE 
        WHEN pm.condition_code >= 4000 THEN 'high-risk'
        WHEN pm.condition_code >= 2000 THEN 'medium-risk'
        ELSE 'low-risk'
    END as calculated_risk_level
    
FROM product_master pm
LEFT JOIN scraped_product_data spd ON pm.master_sku = spd.master_sku
LEFT JOIN approval_queue aq ON pm.master_sku = aq.master_sku
WHERE pm.is_verified = FALSE 
OR aq.human_status = 'pending'
ORDER BY 
    aq.priority ASC NULLS LAST,
    pm.updated_at DESC;

-- eBay出品準備統合ビュー
CREATE OR REPLACE VIEW ebay_preparation_unified AS
SELECT 
    pm.master_sku,
    pm.product_name_jp as original_title,
    pm.selling_price_usd as original_price,
    pm.category,
    pm.brand,
    pm.condition_code,
    
    spd.primary_image_url as picture_url,
    spd.source_url,
    spd.source_platform,
    spd.scraped_at,
    
    eld.ebay_title,
    eld.ebay_category_id,
    eld.listing_price_usd as final_price,
    eld.listing_status,
    eld.approval_status,
    
    eld.weight_lbs,
    eld.weight_oz,
    eld.length_inch,
    eld.width_inch,
    eld.height_inch,
    
    calculate_available_stock(pm.master_sku) as available_stock
    
FROM product_master pm
LEFT JOIN scraped_product_data spd ON pm.master_sku = spd.master_sku
LEFT JOIN ebay_listing_data eld ON pm.master_sku = eld.master_sku
WHERE pm.selling_price_usd > 0
ORDER BY eld.updated_at DESC NULLS LAST, pm.updated_at DESC;

-- =======================================================================
-- 9. 初期データ・サンプルキーワード投入
-- =======================================================================

-- 禁止キーワード初期データ
INSERT INTO prohibited_keywords (keyword, category, priority) VALUES
-- ブランド関連（最高優先度）
('偽物', 'brand', 1),
('コピー', 'brand', 1),
('レプリカ', 'brand', 1),
('fake', 'brand', 1),
('replica', 'brand', 1),

-- 法的問題（高優先度）
('盗品', 'illegal', 2),
('違法', 'illegal', 2),
('海賊版', 'illegal', 2),
('コピー品', 'illegal', 2),

-- eBayポリシー違反（中優先度）
('転売禁止', 'policy', 3),
('業者向け', 'policy', 3),
('サンプル品', 'policy', 3),
('非売品', 'policy', 3),

-- 制限商品（中優先度）
('医薬品', 'restricted', 4),
('化粧品', 'restricted', 4),
('食品', 'restricted', 4),
('電池', 'restricted', 4)

ON CONFLICT (keyword, category) DO NOTHING;

-- システム動作確認
DO $$
BEGIN
    RAISE NOTICE '=== 統合データベース構築完了 ===';
    RAISE NOTICE 'テーブル数: %', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%product%' OR table_name LIKE '%scraped%' OR table_name LIKE '%ebay%' OR table_name LIKE '%inventory%' OR table_name LIKE '%prohibited%' OR table_name LIKE '%approval%');
    RAISE NOTICE '関数数: %', (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('detect_duplicates', 'calculate_available_stock', 'sync_inventory_safe', 'check_prohibited_keywords'));
    RAISE NOTICE 'ビュー数: %', (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%unified%');
    RAISE NOTICE 'サンプルキーワード数: %', (SELECT count(*) FROM prohibited_keywords);
    RAISE NOTICE '================================';
END $$;
