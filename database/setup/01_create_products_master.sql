-- ============================================
-- products_master 統合テーブル作成 + ETL処理
-- ============================================
-- 目的: 複数のソーステーブルを1つの統合テーブルに集約
-- 対象: yahoo_scraped_products, inventory_products, 
--       mystical_japan_treasures_inventory, ebay_inventory
-- ============================================

-- ============================================
-- STEP 1: products_master テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS products_master (
    -- 基本ID
    id BIGSERIAL PRIMARY KEY,
    
    -- ソース識別
    source_system VARCHAR(50) NOT NULL,  -- 'yahoo_scraped', 'inventory', 'mystical', 'ebay'
    source_id VARCHAR(255) NOT NULL,     -- 元テーブルのID
    
    -- 基本商品情報
    sku VARCHAR(255),
    title TEXT,
    title_en TEXT,
    description TEXT,
    condition VARCHAR(50),
    category VARCHAR(255),
    
    -- 価格情報
    purchase_price_jpy DECIMAL(12,2),
    purchase_price_usd DECIMAL(12,2),
    recommended_price_usd DECIMAL(12,2),
    lowest_price_usd DECIMAL(12,2),
    
    -- 利益計算
    profit_amount_usd DECIMAL(12,2),
    profit_margin_percent DECIMAL(5,2),
    lowest_price_profit_usd DECIMAL(12,2),
    lowest_price_profit_margin DECIMAL(5,2),
    
    -- スコア
    final_score INTEGER,
    category_score INTEGER,
    competition_score INTEGER,
    profit_score INTEGER,
    
    -- フィルター結果
    export_filter_pass BOOLEAN DEFAULT false,
    patent_filter_pass BOOLEAN DEFAULT false,
    mall_filter_pass BOOLEAN DEFAULT false,
    filter_issues JSONB DEFAULT '[]'::jsonb,
    
    -- HTS・原産国
    hts_code VARCHAR(20),
    country_of_origin VARCHAR(100),
    hts_risk_level VARCHAR(20),
    
    -- AI分析
    discontinued_flag BOOLEAN DEFAULT false,
    limited_edition_flag BOOLEAN DEFAULT false,
    left_handed_flag BOOLEAN DEFAULT false,
    
    -- 競合情報
    japanese_seller_count INTEGER DEFAULT 0,
    foreign_seller_absent BOOLEAN DEFAULT false,
    
    -- SellerMirror分析
    sm_lowest_price DECIMAL(12,2),
    sm_average_price DECIMAL(12,2),
    sm_competitor_count INTEGER DEFAULT 0,
    
    -- 画像
    primary_image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    image_urls JSONB DEFAULT '[]'::jsonb,
    
    -- JSONBデータ (元テーブルの全データを保持)
    listing_data JSONB DEFAULT '{}'::jsonb,
    scraped_data JSONB DEFAULT '{}'::jsonb,
    ebay_api_data JSONB DEFAULT '{}'::jsonb,
    
    -- ワークフロー管理
    approval_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    workflow_status VARCHAR(50) DEFAULT 'scraped',  -- 処理段階
    approved_at TIMESTAMP,
    approved_by VARCHAR(100),
    rejection_reason TEXT,
    
    -- ターゲット市場
    target_marketplaces JSONB DEFAULT '[]'::jsonb,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    synced_at TIMESTAMP DEFAULT NOW(),
    
    -- ユニーク制約: 同じソースからの重複防止
    UNIQUE(source_system, source_id)
);

-- ============================================
-- STEP 2: インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_master_source ON products_master(source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_products_master_sku ON products_master(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_master_approval ON products_master(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_master_workflow ON products_master(workflow_status);
CREATE INDEX IF NOT EXISTS idx_products_master_score ON products_master(final_score) WHERE final_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_master_created ON products_master(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_master_updated ON products_master(updated_at DESC);

-- FullText Search用インデックス
CREATE INDEX IF NOT EXISTS idx_products_master_title_search ON products_master USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(title_en, '')));

-- ============================================
-- STEP 3: トリガー関数 (updated_atの自動更新)
-- ============================================

CREATE OR REPLACE FUNCTION update_products_master_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_master_update
    BEFORE UPDATE ON products_master
    FOR EACH ROW
    EXECUTE FUNCTION update_products_master_timestamp();

-- ============================================
-- STEP 4: ETL処理 - yahoo_scraped_products
-- ============================================

INSERT INTO products_master (
    source_system,
    source_id,
    sku,
    title,
    title_en,
    purchase_price_jpy,
    primary_image_url,
    images,
    image_urls,
    scraped_data,
    approval_status,
    workflow_status,
    created_at
)
SELECT 
    'yahoo_scraped' as source_system,
    COALESCE(id::text, item_id) as source_id,
    sku,
    title,
    title_en,
    current_price as purchase_price_jpy,
    COALESCE(
        image_url,
        CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 
             THEN images->0->>'url' 
             ELSE NULL END
    ) as primary_image_url,
    images,
    CASE 
        WHEN image_url IS NOT NULL THEN jsonb_build_array(image_url)
        ELSE '[]'::jsonb
    END as image_urls,
    jsonb_strip_nulls(jsonb_build_object(
        'item_id', item_id,
        'url', url,
        'seller_id', seller_id,
        'condition', condition,
        'category', category,
        'end_date', end_date
    )) as scraped_data,
    COALESCE(approval_status, 'pending') as approval_status,
    'scraped' as workflow_status,
    COALESCE(created_at, NOW()) as created_at
FROM yahoo_scraped_products
ON CONFLICT (source_system, source_id) 
DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    purchase_price_jpy = EXCLUDED.purchase_price_jpy,
    primary_image_url = EXCLUDED.primary_image_url,
    images = EXCLUDED.images,
    scraped_data = EXCLUDED.scraped_data,
    updated_at = NOW(),
    synced_at = NOW();

-- ============================================
-- STEP 5: ETL処理 - inventory_products
-- ============================================

INSERT INTO products_master (
    source_system,
    source_id,
    sku,
    title,
    description,
    category,
    purchase_price_usd,
    primary_image_url,
    approval_status,
    workflow_status,
    created_at
)
SELECT 
    'inventory' as source_system,
    id::text as source_id,
    sku,
    COALESCE(product_name, name) as title,
    description,
    category,
    COALESCE(price_usd, price) as purchase_price_usd,
    image_url as primary_image_url,
    COALESCE(approval_status, 'pending') as approval_status,
    COALESCE(status, 'in_stock') as workflow_status,
    COALESCE(created_at, NOW()) as created_at
FROM inventory_products
ON CONFLICT (source_system, source_id) 
DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    purchase_price_usd = EXCLUDED.purchase_price_usd,
    primary_image_url = EXCLUDED.primary_image_url,
    updated_at = NOW(),
    synced_at = NOW();

-- ============================================
-- STEP 6: ETL処理 - mystical_japan_treasures_inventory
-- ============================================

INSERT INTO products_master (
    source_system,
    source_id,
    sku,
    title,
    title_en,
    purchase_price_jpy,
    recommended_price_usd,
    profit_amount_usd,
    profit_margin_percent,
    final_score,
    category_score,
    competition_score,
    profit_score,
    export_filter_pass,
    patent_filter_pass,
    mall_filter_pass,
    filter_issues,
    primary_image_url,
    images,
    listing_data,
    approval_status,
    workflow_status,
    created_at
)
SELECT 
    'mystical' as source_system,
    id::text as source_id,
    sku,
    title,
    title_en,
    purchase_price_jpy,
    recommended_price_usd,
    profit_amount_usd,
    profit_margin_percent,
    final_score,
    category_score,
    competition_score,
    profit_score,
    export_filter_pass,
    patent_filter_pass,
    mall_filter_pass,
    filter_issues,
    COALESCE(
        primary_image_url,
        CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 
             THEN images->>0 
             ELSE NULL END
    ) as primary_image_url,
    images,
    listing_data,
    COALESCE(approval_status, 'pending') as approval_status,
    COALESCE(workflow_status, 'processed') as workflow_status,
    COALESCE(created_at, NOW()) as created_at
FROM mystical_japan_treasures_inventory
ON CONFLICT (source_system, source_id) 
DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    purchase_price_jpy = EXCLUDED.purchase_price_jpy,
    recommended_price_usd = EXCLUDED.recommended_price_usd,
    profit_amount_usd = EXCLUDED.profit_amount_usd,
    profit_margin_percent = EXCLUDED.profit_margin_percent,
    final_score = EXCLUDED.final_score,
    export_filter_pass = EXCLUDED.export_filter_pass,
    patent_filter_pass = EXCLUDED.patent_filter_pass,
    mall_filter_pass = EXCLUDED.mall_filter_pass,
    filter_issues = EXCLUDED.filter_issues,
    primary_image_url = EXCLUDED.primary_image_url,
    images = EXCLUDED.images,
    listing_data = EXCLUDED.listing_data,
    updated_at = NOW(),
    synced_at = NOW();

-- ============================================
-- STEP 7: ETL処理 - ebay_inventory
-- ============================================

INSERT INTO products_master (
    source_system,
    source_id,
    sku,
    title,
    purchase_price_usd,
    primary_image_url,
    category,
    ebay_api_data,
    approval_status,
    workflow_status,
    created_at
)
SELECT 
    'ebay' as source_system,
    COALESCE(id::text, item_id) as source_id,
    sku,
    title,
    COALESCE(current_price, buy_it_now_price) as purchase_price_usd,
    COALESCE(
        primary_picture_url,
        CASE WHEN picture_urls IS NOT NULL AND jsonb_array_length(picture_urls) > 0 
             THEN picture_urls->>0 
             ELSE NULL END
    ) as primary_image_url,
    category_name as category,
    jsonb_build_object(
        'item_id', item_id,
        'listing_type', listing_type,
        'listing_status', listing_status,
        'seller_info', seller_info
    ) as ebay_api_data,
    COALESCE(listing_status, 'active') as approval_status,
    'listed' as workflow_status,
    COALESCE(created_at, updated_at, NOW()) as created_at
FROM ebay_inventory
ON CONFLICT (source_system, source_id) 
DO UPDATE SET
    title = EXCLUDED.title,
    purchase_price_usd = EXCLUDED.purchase_price_usd,
    primary_image_url = EXCLUDED.primary_image_url,
    category = EXCLUDED.category,
    ebay_api_data = EXCLUDED.ebay_api_data,
    updated_at = NOW(),
    synced_at = NOW();

-- ============================================
-- STEP 8: 統計情報確認
-- ============================================

-- 各ソースからの統合データ件数確認
SELECT 
    source_system,
    COUNT(*) as total_records,
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected
FROM products_master
GROUP BY source_system
ORDER BY source_system;

-- ============================================
-- STEP 9: ビュー作成 (オプション: 承認待ち商品)
-- ============================================

CREATE OR REPLACE VIEW v_approval_queue AS
SELECT 
    id,
    source_system,
    source_id,
    sku,
    title,
    title_en,
    purchase_price_jpy,
    purchase_price_usd,
    recommended_price_usd,
    profit_amount_usd,
    profit_margin_percent,
    final_score,
    export_filter_pass,
    patent_filter_pass,
    mall_filter_pass,
    filter_issues,
    primary_image_url,
    images,
    approval_status,
    workflow_status,
    created_at,
    updated_at
FROM products_master
WHERE approval_status = 'pending'
ORDER BY 
    CASE 
        WHEN final_score IS NOT NULL THEN final_score
        ELSE 0
    END DESC,
    created_at DESC;

-- ============================================
-- 完了メッセージ
-- ============================================

DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM products_master;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'products_master 統合完了!';
    RAISE NOTICE '総レコード数: %', total_count;
    RAISE NOTICE '============================================';
END $$;
