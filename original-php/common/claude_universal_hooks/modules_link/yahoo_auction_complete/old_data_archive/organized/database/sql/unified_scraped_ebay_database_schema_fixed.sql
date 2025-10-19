-- 🔥 Yahoo スクレイピング + eBay API 統合データベース（修正版）
-- 重複項目修正・PostgreSQL最適化版

-- 既存テーブル削除・再構築
DROP TABLE IF EXISTS unified_scraped_ebay_products CASCADE;
DROP TABLE IF EXISTS scraping_session_logs CASCADE;
DROP TABLE IF EXISTS product_editing_history CASCADE;

-- 拡張機能有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 🎯 1. 統合商品データテーブル（メインテーブル）
-- ========================================
CREATE TABLE unified_scraped_ebay_products (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- 🔑 統合識別システム
    unified_product_id UUID DEFAULT gen_random_uuid() UNIQUE,
    product_id VARCHAR(20) UNIQUE NOT NULL,
    master_sku VARCHAR(255),
    
    -- 🎯 重複防止ハッシュシステム
    title_hash VARCHAR(32),
    price_range_hash VARCHAR(16),
    duplicate_detection_hash VARCHAR(64),
    
    -- 📊 データソース管理
    data_source_priority VARCHAR(20) DEFAULT 'scraped',
    integration_status VARCHAR(20) DEFAULT 'scraped',
    last_integrated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- ========================================
    -- 🌸 Yahoo スクレイピング項目（21項目）
    -- ========================================
    
    -- 基本識別情報
    scrape_timestamp TIMESTAMP WITH TIME ZONE,
    yahoo_url TEXT,
    yahoo_auction_id VARCHAR(50),
    
    -- 日本語データ
    title_jp TEXT,
    description_jp TEXT,
    price_jpy INTEGER DEFAULT 0,
    category_jp TEXT,
    seller_info_jp TEXT,
    
    -- 画像情報
    scraped_image_urls TEXT,
    scraped_image_count INTEGER DEFAULT 0,
    
    -- eBay出品用編集項目
    title_en TEXT,
    description_en TEXT,
    ebay_category_id VARCHAR(20), -- 統合：1つのebay_category_idのみ
    ebay_price_usd DECIMAL(10,2),
    shipping_cost_usd DECIMAL(8,2) DEFAULT 0,
    
    -- 在庫・ステータス管理
    stock_quantity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'scraped',
    last_stock_check TIMESTAMP WITH TIME ZONE,
    
    -- エラー管理
    scrape_success BOOLEAN DEFAULT TRUE,
    ebay_list_success BOOLEAN DEFAULT FALSE,
    scraping_errors TEXT,
    
    -- ========================================
    -- 🔥 eBay API完全データ項目（80項目以上）
    -- ========================================
    
    -- eBay基本識別
    ebay_item_id VARCHAR(20),
    ebay_parent_item_id VARCHAR(20),
    ebay_uuid VARCHAR(50),
    
    -- eBay商品基本情報
    ebay_title TEXT,
    ebay_subtitle TEXT,
    ebay_description TEXT,
    ebay_short_description TEXT,
    ebay_sku VARCHAR(255),
    
    -- eBay価格情報
    ebay_current_price_value DECIMAL(12,2),
    ebay_current_price_currency VARCHAR(10) DEFAULT 'USD',
    ebay_start_price_value DECIMAL(12,2),
    ebay_start_price_currency VARCHAR(10),
    ebay_buy_it_now_price_value DECIMAL(12,2),
    ebay_buy_it_now_price_currency VARCHAR(10),
    ebay_converted_price_value DECIMAL(12,2),
    ebay_original_price_value DECIMAL(12,2),
    ebay_reserve_price_value DECIMAL(12,2),
    ebay_minimum_bid_value DECIMAL(12,2),
    
    -- eBay在庫・数量情報
    ebay_quantity INTEGER DEFAULT 0,
    ebay_quantity_sold INTEGER DEFAULT 0,
    ebay_quantity_available INTEGER DEFAULT 0,
    ebay_quantity_threshold INTEGER DEFAULT 0,
    
    -- eBay商品詳細情報
    ebay_condition_id VARCHAR(20),
    ebay_condition_name VARCHAR(100),
    ebay_condition_description TEXT,
    ebay_brand VARCHAR(255),
    ebay_manufacturer VARCHAR(255),
    ebay_manufacturer_part_number VARCHAR(255),
    ebay_model_number VARCHAR(255),
    ebay_upc_code VARCHAR(20),
    ebay_ean_code VARCHAR(20),
    ebay_isbn_code VARCHAR(20),
    
    -- eBayカテゴリ情報
    ebay_category_name TEXT,
    ebay_category_path TEXT,
    ebay_primary_category_id VARCHAR(20),
    ebay_primary_category_name VARCHAR(255),
    ebay_secondary_category_id VARCHAR(20),
    ebay_secondary_category_name VARCHAR(255),
    
    -- eBay画像・メディア情報
    ebay_gallery_url TEXT,
    ebay_gallery_type VARCHAR(50),
    ebay_picture_urls JSONB,
    ebay_picture_details JSONB,
    ebay_video_urls JSONB,
    
    -- eBay出品情報
    ebay_listing_type VARCHAR(50),
    ebay_listing_format VARCHAR(50),
    ebay_listing_status VARCHAR(50),
    ebay_listing_duration VARCHAR(50),
    ebay_selling_state VARCHAR(50),
    
    -- eBay日時情報
    ebay_start_time TIMESTAMP WITH TIME ZONE,
    ebay_end_time TIMESTAMP WITH TIME ZONE,
    ebay_time_left VARCHAR(50),
    ebay_time_left_details TEXT,
    
    -- eBay地域・配送情報
    ebay_location VARCHAR(255),
    ebay_country VARCHAR(10),
    ebay_country_name VARCHAR(100),
    ebay_postal_code VARCHAR(20),
    ebay_region VARCHAR(100),
    ebay_site_id INTEGER DEFAULT 0,
    ebay_site_name VARCHAR(50) DEFAULT 'eBay.com',
    
    -- eBay配送詳細情報
    ebay_shipping_details JSONB,
    ebay_shipping_cost DECIMAL(10,2),
    ebay_shipping_type VARCHAR(50),
    ebay_ship_to_locations TEXT,
    ebay_global_shipping_enabled BOOLEAN DEFAULT FALSE,
    ebay_fast_and_free_shipping BOOLEAN DEFAULT FALSE,
    ebay_free_shipping BOOLEAN DEFAULT FALSE,
    ebay_local_pickup_available BOOLEAN DEFAULT FALSE,
    
    -- eBay販売者情報
    ebay_seller_user_id VARCHAR(100),
    ebay_seller_feedback_score INTEGER,
    ebay_seller_positive_feedback_percent DECIMAL(5,2),
    ebay_seller_info TEXT,
    ebay_seller_business_type VARCHAR(50),
    ebay_top_rated_seller BOOLEAN DEFAULT FALSE,
    ebay_power_seller BOOLEAN DEFAULT FALSE,
    
    -- eBay取引・支払い情報
    ebay_payment_methods TEXT,
    ebay_payment_instructions TEXT,
    ebay_paypal_email_address VARCHAR(255),
    
    -- eBay返品・保証情報
    ebay_return_policy TEXT,
    ebay_returns_accepted BOOLEAN DEFAULT FALSE,
    ebay_return_period VARCHAR(50),
    ebay_warranty_type VARCHAR(100),
    ebay_warranty_duration VARCHAR(50),
    
    -- eBay統計・パフォーマンス情報
    ebay_hit_count INTEGER DEFAULT 0,
    ebay_hit_counter VARCHAR(20),
    ebay_watch_count INTEGER DEFAULT 0,
    ebay_view_count INTEGER DEFAULT 0,
    ebay_visitor_count INTEGER DEFAULT 0,
    ebay_question_count INTEGER DEFAULT 0,
    ebay_bid_count INTEGER DEFAULT 0,
    ebay_best_offer_count INTEGER DEFAULT 0,
    
    -- eBayオプション・機能フラグ
    ebay_auto_pay BOOLEAN DEFAULT FALSE,
    ebay_best_offer_enabled BOOLEAN DEFAULT FALSE,
    ebay_buy_it_now_enabled BOOLEAN DEFAULT FALSE,
    ebay_get_it_fast BOOLEAN DEFAULT FALSE,
    ebay_private_listing BOOLEAN DEFAULT FALSE,
    ebay_cross_border_trade BOOLEAN DEFAULT FALSE,
    ebay_integrated_merchant_credit_card BOOLEAN DEFAULT FALSE,
    ebay_checkout_enabled BOOLEAN DEFAULT FALSE,
    ebay_mechanical_check_accepted BOOLEAN DEFAULT FALSE,
    ebay_now_and_new BOOLEAN DEFAULT FALSE,
    ebay_out_of_stock_control BOOLEAN DEFAULT FALSE,
    ebay_reserve_met BOOLEAN DEFAULT FALSE,
    ebay_second_chance_eligible BOOLEAN DEFAULT FALSE,
    ebay_secure_checkout BOOLEAN DEFAULT FALSE,
    ebay_top_rated_listing BOOLEAN DEFAULT FALSE,
    
    -- eBay特別機能・サービス
    ebay_party_type VARCHAR(20),
    ebay_pickup_in_store_details TEXT,
    ebay_postal_code_hide BOOLEAN DEFAULT FALSE,
    ebay_product_listing_details TEXT,
    ebay_promotional_sale_details TEXT,
    ebay_quantity_info TEXT,
    ebay_revise_status TEXT,
    ebay_storefront TEXT,
    ebay_tax_table TEXT,
    ebay_third_party_checkout BOOLEAN DEFAULT FALSE,
    ebay_vat_details TEXT,
    ebay_charity_info TEXT,
    
    -- eBayビジネス・マーケット情報
    ebay_business_seller_details TEXT,
    ebay_buyer_protection TEXT,
    ebay_digital_good_info TEXT,
    ebay_listing_checkoutredirect_preference TEXT,
    ebay_listing_designer TEXT,
    ebay_listing_enhancement TEXT,
    ebay_listing_subtype INTEGER,
    
    -- eBay商品詳細仕様（JSON）
    ebay_item_specifics JSONB,
    ebay_variations JSONB,
    ebay_variation_pictures JSONB,
    ebay_compatibility_list JSONB,
    
    -- eBay URL・リンク情報
    ebay_view_item_url TEXT,
    ebay_view_item_url_for_natural_search TEXT,
    ebay_desktop_view_item_url TEXT,
    ebay_mobile_view_item_url TEXT,
    
    -- eBayデータ品質・メタデータ
    ebay_data_completeness_score INTEGER DEFAULT 0,
    ebay_data_quality_flags JSONB,
    ebay_missing_fields JSONB,
    
    -- eBay同期・API情報
    ebay_sync_type VARCHAR(20) DEFAULT 'api',
    ebay_api_source VARCHAR(50) DEFAULT 'ebay_trading',
    ebay_api_call_name VARCHAR(100),
    ebay_api_version VARCHAR(20),
    ebay_raw_xml_data TEXT,
    ebay_raw_json_data JSONB,
    ebay_api_fetch_timestamp TIMESTAMP WITH TIME ZONE,
    ebay_fetch_success BOOLEAN DEFAULT FALSE,
    ebay_sync_status VARCHAR(20) DEFAULT 'not_synced',
    ebay_error_message TEXT,
    
    -- ========================================
    -- 🎯 統合データ管理（アクティブデータ）
    -- ========================================
    
    -- 表示用統合データ
    active_title TEXT,
    active_description TEXT,
    active_price_usd DECIMAL(12,2),
    active_price_jpy INTEGER,
    active_image_url TEXT,
    active_image_urls JSONB,
    active_category VARCHAR(255),
    active_condition VARCHAR(50),
    
    -- 在庫統合管理
    current_stock INTEGER DEFAULT 1,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- パフォーマンス統合
    total_views INTEGER DEFAULT 0,
    total_watchers INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- システム管理情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 同期フラグ
    sync_to_tanaoroshi BOOLEAN DEFAULT TRUE,
    sync_to_ebay_system BOOLEAN DEFAULT FALSE,
    sync_to_yahoo_system BOOLEAN DEFAULT FALSE,
    
    -- データソース確認
    has_scraped_data BOOLEAN DEFAULT FALSE,
    has_ebay_api_data BOOLEAN DEFAULT FALSE,
    has_manual_data BOOLEAN DEFAULT FALSE
);

-- ========================================
-- 🎯 2. スクレイピングセッションログテーブル
-- ========================================
CREATE TABLE scraping_session_logs (
    log_id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    
    -- セッション情報
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- スクレイピング統計
    total_urls_processed INTEGER DEFAULT 0,
    successful_scrapes INTEGER DEFAULT 0,
    failed_scrapes INTEGER DEFAULT 0,
    duplicate_urls_skipped INTEGER DEFAULT 0,
    
    -- エラー管理
    error_urls TEXT,
    error_details TEXT,
    
    -- システム情報
    user_agent TEXT,
    ip_address INET,
    python_version VARCHAR(20),
    
    created_by VARCHAR(100) DEFAULT 'system'
);

-- ========================================
-- 🎯 3. 商品編集履歴テーブル
-- ========================================
CREATE TABLE product_editing_history (
    edit_id SERIAL PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL,
    
    -- 編集情報
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    edit_type VARCHAR(20),
    
    -- 編集者情報
    edited_by VARCHAR(100) DEFAULT 'system',
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edit_reason TEXT,
    
    -- 外部キー
    FOREIGN KEY (product_id) REFERENCES unified_scraped_ebay_products(product_id) ON DELETE CASCADE
);

-- ========================================
-- 📊 インデックス作成（パフォーマンス最適化）
-- ========================================

-- 統合商品テーブル（主要検索）
CREATE INDEX idx_unified_product_id ON unified_scraped_ebay_products(product_id);
CREATE INDEX idx_unified_master_sku ON unified_scraped_ebay_products(master_sku);
CREATE INDEX idx_unified_title_hash ON unified_scraped_ebay_products(title_hash);
CREATE INDEX idx_unified_duplicate_hash ON unified_scraped_ebay_products(duplicate_detection_hash);
CREATE INDEX idx_unified_data_source ON unified_scraped_ebay_products(data_source_priority);
CREATE INDEX idx_unified_status ON unified_scraped_ebay_products(status);
CREATE INDEX idx_unified_integration_status ON unified_scraped_ebay_products(integration_status);
CREATE INDEX idx_unified_yahoo_url ON unified_scraped_ebay_products(yahoo_url);
CREATE INDEX idx_unified_ebay_item_id ON unified_scraped_ebay_products(ebay_item_id);
CREATE INDEX idx_unified_active_title ON unified_scraped_ebay_products(active_title);
CREATE INDEX idx_unified_active_price_usd ON unified_scraped_ebay_products(active_price_usd);
CREATE INDEX idx_unified_active_price_jpy ON unified_scraped_ebay_products(price_jpy);

-- 日時関連
CREATE INDEX idx_unified_scrape_timestamp ON unified_scraped_ebay_products(scrape_timestamp);
CREATE INDEX idx_unified_created_at ON unified_scraped_ebay_products(created_at);
CREATE INDEX idx_unified_updated_at ON unified_scraped_ebay_products(updated_at);

-- 同期フラグ
CREATE INDEX idx_unified_sync_tanaoroshi ON unified_scraped_ebay_products(sync_to_tanaoroshi);
CREATE INDEX idx_unified_sync_ebay ON unified_scraped_ebay_products(sync_to_ebay_system);

-- JSON列用GINインデックス
CREATE INDEX idx_unified_ebay_picture_urls_gin ON unified_scraped_ebay_products USING GIN(ebay_picture_urls);
CREATE INDEX idx_unified_ebay_item_specifics_gin ON unified_scraped_ebay_products USING GIN(ebay_item_specifics);
CREATE INDEX idx_unified_ebay_shipping_details_gin ON unified_scraped_ebay_products USING GIN(ebay_shipping_details);
CREATE INDEX idx_unified_active_image_urls_gin ON unified_scraped_ebay_products USING GIN(active_image_urls);

-- セッションログテーブル
CREATE INDEX idx_session_logs_session_id ON scraping_session_logs(session_id);
CREATE INDEX idx_session_logs_started_at ON scraping_session_logs(started_at);

-- 編集履歴テーブル
CREATE INDEX idx_editing_history_product_id ON product_editing_history(product_id);
CREATE INDEX idx_editing_history_edited_at ON product_editing_history(edited_at);
CREATE INDEX idx_editing_history_field_name ON product_editing_history(field_name);

-- ========================================
-- 🔍 統合データ管理ビュー
-- ========================================

-- スクレイピングデータ品質レポート
CREATE OR REPLACE VIEW scraping_quality_report AS
SELECT 
    COUNT(*) as total_scraped_products,
    COUNT(*) FILTER (WHERE title_jp IS NOT NULL AND LENGTH(title_jp) > 10) as products_with_title,
    COUNT(*) FILTER (WHERE description_jp IS NOT NULL AND LENGTH(description_jp) > 50) as products_with_description,
    COUNT(*) FILTER (WHERE price_jpy > 0) as products_with_price,
    COUNT(*) FILTER (WHERE scraped_image_urls IS NOT NULL AND LENGTH(scraped_image_urls) > 0) as products_with_images,
    COUNT(*) FILTER (WHERE category_jp IS NOT NULL) as products_with_category,
    COUNT(*) FILTER (WHERE scrape_success = true) as successful_scrapes,
    COUNT(*) FILTER (WHERE scrape_success = false) as failed_scrapes,
    ROUND(AVG(scraped_image_count), 1) as avg_images_per_product,
    MAX(scrape_timestamp) as latest_scrape_time,
    MIN(scrape_timestamp) as earliest_scrape_time
FROM unified_scraped_ebay_products
WHERE has_scraped_data = true;

-- データ統合状況サマリー
CREATE OR REPLACE VIEW integration_status_summary AS
SELECT 
    integration_status,
    COUNT(*) as product_count,
    COUNT(*) FILTER (WHERE has_scraped_data = true) as with_scraped_data,
    COUNT(*) FILTER (WHERE has_ebay_api_data = true) as with_ebay_data,
    COUNT(*) FILTER (WHERE has_manual_data = true) as with_manual_data,
    COUNT(*) FILTER (WHERE has_scraped_data = true AND has_ebay_api_data = true) as fully_integrated,
    ROUND(AVG(active_price_usd), 2) as avg_price_usd,
    MAX(updated_at) as latest_update
FROM unified_scraped_ebay_products
GROUP BY integration_status
ORDER BY product_count DESC;

-- 編集準備完了商品ビュー
CREATE OR REPLACE VIEW products_ready_for_editing AS
SELECT 
    product_id,
    title_jp,
    price_jpy,
    active_price_usd,
    scraped_image_urls,
    category_jp,
    status,
    scrape_timestamp,
    CASE 
        WHEN title_en IS NULL OR LENGTH(title_en) = 0 THEN '英語タイトル要編集'
        WHEN description_en IS NULL OR LENGTH(description_en) = 0 THEN '英語説明要編集'
        WHEN ebay_category_id IS NULL OR LENGTH(ebay_category_id) = 0 THEN 'eBayカテゴリ要設定'
        WHEN ebay_price_usd IS NULL OR ebay_price_usd = 0 THEN 'USD価格要設定'
        ELSE '編集完了'
    END as editing_status
FROM unified_scraped_ebay_products
WHERE status = 'scraped' AND has_scraped_data = true
ORDER BY scrape_timestamp DESC;

-- eBay出品準備完了商品ビュー
CREATE OR REPLACE VIEW products_ready_for_ebay AS
SELECT 
    product_id,
    title_en,
    description_en,
    ebay_price_usd,
    shipping_cost_usd,
    ebay_category_id,
    active_image_urls,
    stock_quantity,
    status
FROM unified_scraped_ebay_products
WHERE status = 'edited' 
    AND title_en IS NOT NULL AND LENGTH(title_en) > 10
    AND description_en IS NOT NULL AND LENGTH(description_en) > 50
    AND ebay_price_usd > 0
    AND ebay_category_id IS NOT NULL
ORDER BY updated_at DESC;

-- ========================================
-- 🔄 自動更新トリガー
-- ========================================

-- Updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 統合商品テーブル updated_at トリガー
CREATE TRIGGER update_unified_products_updated_at 
    BEFORE UPDATE ON unified_scraped_ebay_products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- アクティブデータ自動設定関数
CREATE OR REPLACE FUNCTION update_active_data()
RETURNS TRIGGER AS $$
BEGIN
    -- タイトル自動選択
    IF NEW.title_en IS NOT NULL AND LENGTH(NEW.title_en) > 0 THEN
        NEW.active_title = NEW.title_en;
    ELSIF NEW.title_jp IS NOT NULL THEN
        NEW.active_title = NEW.title_jp;
    END IF;
    
    -- 説明自動選択
    IF NEW.description_en IS NOT NULL AND LENGTH(NEW.description_en) > 0 THEN
        NEW.active_description = NEW.description_en;
    ELSIF NEW.description_jp IS NOT NULL THEN
        NEW.active_description = NEW.description_jp;
    END IF;
    
    -- 価格自動選択
    IF NEW.ebay_price_usd IS NOT NULL AND NEW.ebay_price_usd > 0 THEN
        NEW.active_price_usd = NEW.ebay_price_usd;
    ELSIF NEW.ebay_current_price_value IS NOT NULL THEN
        NEW.active_price_usd = NEW.ebay_current_price_value;
    END IF;
    
    -- 円価格設定
    IF NEW.price_jpy IS NOT NULL AND NEW.price_jpy > 0 THEN
        NEW.active_price_jpy = NEW.price_jpy;
    END IF;
    
    -- データソースフラグ更新
    NEW.has_scraped_data = (NEW.title_jp IS NOT NULL OR NEW.yahoo_url IS NOT NULL);
    NEW.has_ebay_api_data = (NEW.ebay_item_id IS NOT NULL OR NEW.ebay_title IS NOT NULL);
    NEW.has_manual_data = (NEW.title_en IS NOT NULL OR NEW.description_en IS NOT NULL);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- アクティブデータ自動更新トリガー
CREATE TRIGGER update_active_data_trigger
    BEFORE INSERT OR UPDATE ON unified_scraped_ebay_products
    FOR EACH ROW
    EXECUTE FUNCTION update_active_data();

-- ========================================
-- 🚀 権限・最終設定
-- ========================================

-- 権限設定
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "aritahiroaki";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "aritahiroaki";

-- ========================================
-- 📋 完成確認・統計表示
-- ========================================

DO $$
DECLARE
    main_columns INTEGER;
    log_columns INTEGER;
    history_columns INTEGER;
    total_indexes INTEGER;
    total_views INTEGER;
BEGIN
    -- テーブルカラム数確認
    SELECT COUNT(*) INTO main_columns FROM information_schema.columns WHERE table_name = 'unified_scraped_ebay_products';
    SELECT COUNT(*) INTO log_columns FROM information_schema.columns WHERE table_name = 'scraping_session_logs';
    SELECT COUNT(*) INTO history_columns FROM information_schema.columns WHERE table_name = 'product_editing_history';
    
    -- 統計情報取得
    SELECT COUNT(*) INTO total_indexes FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'unified_%';
    SELECT COUNT(*) INTO total_views FROM information_schema.views WHERE table_schema = 'public' AND (table_name LIKE '%_report' OR table_name LIKE '%_summary' OR table_name LIKE '%ready%');
    
    -- 結果表示
    RAISE NOTICE '';
    RAISE NOTICE '🔥 ===============================================';
    RAISE NOTICE '🎯 Yahoo スクレイピング + eBay API統合DB構築完了！';
    RAISE NOTICE '🔥 ===============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 テーブル構築状況:';
    RAISE NOTICE '  ✅ unified_scraped_ebay_products: % カラム (メインテーブル)', main_columns;
    RAISE NOTICE '  ✅ scraping_session_logs: % カラム (セッションログ)', log_columns;
    RAISE NOTICE '  ✅ product_editing_history: % カラム (編集履歴)', history_columns;
    RAISE NOTICE '';
    RAISE NOTICE '⚡ システム統計:';
    RAISE NOTICE '  🔍 専用インデックス数: %', total_indexes;
    RAISE NOTICE '  👁️ 分析ビュー数: %', total_views;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 統合機能:';
    RAISE NOTICE '  ✅ Yahoo スクレイピング 21項目完全対応';
    RAISE NOTICE '  ✅ eBay API 80項目以上完全統合';
    RAISE NOTICE '  ✅ 重複防止ハッシュシステム';
    RAISE NOTICE '  ✅ 自動アクティブデータ選択';
    RAISE NOTICE '  ✅ 棚卸しシステム連携準備';
    RAISE NOTICE '  ✅ 編集履歴・セッションログ';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 次のステップ:';
    RAISE NOTICE '  1. SELECT * FROM scraping_quality_report; -- スクレイピング品質確認';
    RAISE NOTICE '  2. SELECT * FROM integration_status_summary; -- 統合状況確認';
    RAISE NOTICE '  3. SELECT * FROM products_ready_for_editing LIMIT 10; -- 編集対象確認';
    RAISE NOTICE '';
END
$$;
