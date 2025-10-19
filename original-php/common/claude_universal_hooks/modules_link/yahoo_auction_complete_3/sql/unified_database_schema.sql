-- =====================================================
-- Yahoo Auction Tool 統合データベース設計
-- 実装日: 2025-09-10
-- =====================================================

-- 1. 商品マスターテーブル（中央管理）
CREATE TABLE IF NOT EXISTS product_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_sku VARCHAR(100) UNIQUE NOT NULL,
    
    -- 基本情報
    product_name_jp TEXT,
    product_name_en TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    model_number VARCHAR(100),
    condition_type VARCHAR(50) DEFAULT 'new',
    
    -- 価格情報
    purchase_price_jpy NUMERIC(10,2),
    selling_price_usd NUMERIC(10,2),
    current_market_price_jpy NUMERIC(10,2),
    
    -- ステータス管理
    product_status VARCHAR(50) DEFAULT 'active', -- active, inactive, discontinued
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_master_sku ON product_master (master_sku);
CREATE INDEX IF NOT EXISTS idx_product_status ON product_master (product_status);

-- 2. スクレイピングデータテーブル（拡張）
CREATE TABLE IF NOT EXISTS scraped_product_data (
    id SERIAL PRIMARY KEY,
    master_sku VARCHAR(100), -- NULL許可（自動生成時）
    
    -- スクレイピング元情報
    source_platform VARCHAR(50) NOT NULL, -- yahoo, mercari, amazon, etc.
    source_item_id VARCHAR(100),
    source_url TEXT,
    
    -- 取得データ
    scraped_title TEXT,
    scraped_price_jpy INTEGER,
    scraped_description TEXT,
    scraped_images JSON,
    scraped_seller_info JSON,
    
    -- 重複検出用
    title_hash VARCHAR(64), -- タイトルのハッシュ値
    content_fingerprint VARCHAR(64), -- 商品内容の指紋
    
    -- 在庫・商品情報
    available_quantity INTEGER DEFAULT 0,
    shipping_info JSON,
    
    -- 重複管理
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_group_id UUID, -- 重複商品のグループID
    merge_status VARCHAR(20) DEFAULT 'pending', -- pending, merged, ignored
    
    -- メタデータ
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 制約
    UNIQUE(source_platform, source_item_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_scraped_master_sku ON scraped_product_data (master_sku);
CREATE INDEX IF NOT EXISTS idx_scraped_platform ON scraped_product_data (source_platform);
CREATE INDEX IF NOT EXISTS idx_scraped_title_hash ON scraped_product_data (title_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_duplicate_group ON scraped_product_data (duplicate_group_id);

-- 3. eBay出品管理テーブル（統合）
CREATE TABLE IF NOT EXISTS ebay_listing_data (
    id SERIAL PRIMARY KEY,
    master_sku VARCHAR(100),
    
    -- eBay情報
    ebay_item_id VARCHAR(50) UNIQUE,
    ebay_category_id VARCHAR(20),
    
    -- 出品情報
    listing_title TEXT,
    listing_description TEXT,
    listing_price_usd NUMERIC(10,2),
    listing_quantity INTEGER DEFAULT 1,
    
    -- ステータス管理
    listing_status VARCHAR(50) DEFAULT 'draft', -- draft, active, ended, sold
    listing_format VARCHAR(20) DEFAULT 'fixed_price', -- fixed_price, auction
    
    -- 出品設定
    listing_duration INTEGER DEFAULT 30, -- days
    auto_relist BOOLEAN DEFAULT FALSE,
    
    -- API連携データ
    ebay_api_response JSON,
    
    -- メタデータ
    listed_at TIMESTAMP,
    ended_at TIMESTAMP,
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_master_sku ON ebay_listing_data (master_sku);
CREATE INDEX IF NOT EXISTS idx_ebay_item_id ON ebay_listing_data (ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_ebay_status ON ebay_listing_data (listing_status);

-- 4. 在庫管理テーブル（統合・並行処理対応）
CREATE TABLE IF NOT EXISTS inventory_management (
    id SERIAL PRIMARY KEY,
    master_sku VARCHAR(100),
    
    -- 在庫タイプ管理
    inventory_type VARCHAR(50) DEFAULT 'physical', -- physical, dropship, hybrid
    management_system VARCHAR(100), -- 管理システム識別（複数システム対応）
    
    -- 在庫情報
    physical_stock INTEGER DEFAULT 0, -- 実在庫数
    reserved_stock INTEGER DEFAULT 0, -- 予約済み在庫
    dropship_stock INTEGER DEFAULT 999, -- ドロップシップ在庫（仮想）
    available_stock INTEGER DEFAULT 0, -- 計算フィールド
    
    -- 在庫設定
    minimum_stock_level INTEGER DEFAULT 1,
    maximum_stock_level INTEGER DEFAULT 100,
    reorder_point INTEGER DEFAULT 5,
    auto_reorder BOOLEAN DEFAULT FALSE,
    
    -- 在庫状態
    stock_status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock
    last_stock_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stock_check_frequency INTEGER DEFAULT 60, -- minutes
    
    -- 並行処理制御
    lock_version INTEGER DEFAULT 0, -- 楽観的ロック
    last_modified_by VARCHAR(100), -- 最終更新システム
    is_locked BOOLEAN DEFAULT FALSE, -- 排他制御
    locked_by VARCHAR(100), -- ロック取得システム
    locked_at TIMESTAMP,
    
    -- 在庫変動ログ用
    stock_change_reason VARCHAR(100),
    previous_stock INTEGER,
    
    -- メタデータ
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CHECK (physical_stock >= 0),
    CHECK (reserved_stock >= 0)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_inventory_master_sku ON inventory_management (master_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_management (stock_status);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_management (inventory_type);
CREATE INDEX IF NOT EXISTS idx_inventory_system ON inventory_management (management_system);

-- 5. 価格監視テーブル
CREATE TABLE IF NOT EXISTS price_monitoring (
    id SERIAL PRIMARY KEY,
    master_sku VARCHAR(100),
    
    -- 価格履歴
    monitored_price_jpy NUMERIC(10,2),
    previous_price_jpy NUMERIC(10,2),
    price_change_amount NUMERIC(10,2),
    price_change_percentage NUMERIC(5,2),
    
    -- 監視設定
    price_alert_threshold NUMERIC(5,2) DEFAULT 10.0, -- %
    is_monitoring_active BOOLEAN DEFAULT TRUE,
    
    -- メタデータ
    price_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_sent_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_price_master_sku ON price_monitoring (master_sku);
CREATE INDEX IF NOT EXISTS idx_price_monitoring_active ON price_monitoring (is_monitoring_active);

-- 6. 商品承認キューテーブル（拡張）
CREATE TABLE IF NOT EXISTS approval_workflow (
    id SERIAL PRIMARY KEY,
    master_sku VARCHAR(100),
    
    -- 承認情報
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, reviewing
    approval_stage VARCHAR(50) DEFAULT 'initial', -- initial, price_check, listing_ready
    
    -- AI判定
    ai_recommendation VARCHAR(50), -- approve, reject, review_required
    ai_confidence_score NUMERIC(3,2), -- 0.00-1.00
    ai_risk_factors JSON,
    
    -- 人的判定
    human_reviewer VARCHAR(100),
    human_decision VARCHAR(50),
    review_notes TEXT,
    
    -- 優先度
    priority_score INTEGER DEFAULT 0,
    urgency_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- メタデータ
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_approval_master_sku ON approval_workflow (master_sku);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_workflow (approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_priority ON approval_workflow (priority_score);

-- 7. データ統合ビュー（商品の全情報を統合表示）
CREATE OR REPLACE VIEW product_unified_view AS
SELECT 
    pm.master_sku,
    pm.product_name_jp,
    pm.product_name_en,
    pm.category,
    pm.product_status,
    
    -- スクレイピングデータ（最新）
    spd.source_platform,
    spd.scraped_price_jpy,
    spd.available_quantity as scraped_quantity,
    spd.last_verified_at,
    
    -- eBay出品情報
    eld.ebay_item_id,
    eld.listing_status,
    eld.listing_price_usd,
    eld.listing_quantity,
    
    -- 在庫情報
    im.physical_stock,
    im.available_stock,
    im.stock_status,
    
    -- 価格監視
    pmon.monitored_price_jpy as current_market_price,
    pmon.price_change_percentage,
    
    -- 承認状況
    aw.approval_status,
    aw.ai_recommendation
    
FROM product_master pm
LEFT JOIN scraped_product_data spd ON pm.master_sku = spd.master_sku AND spd.is_active = TRUE
LEFT JOIN ebay_listing_data eld ON pm.master_sku = eld.master_sku AND eld.listing_status = 'active'
LEFT JOIN inventory_management im ON pm.master_sku = im.master_sku
LEFT JOIN price_monitoring pmon ON pm.master_sku = pmon.master_sku
LEFT JOIN approval_workflow aw ON pm.master_sku = aw.master_sku AND aw.approval_status IN ('pending', 'reviewing');

-- 8. 自動更新トリガー
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- タイムスタンプ自動更新
DROP TRIGGER IF EXISTS trigger_product_master_updated_at ON product_master;
CREATE TRIGGER trigger_product_master_updated_at
    BEFORE UPDATE ON product_master
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_inventory_updated_at ON inventory_management;
CREATE TRIGGER trigger_inventory_updated_at
    BEFORE UPDATE ON inventory_management
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 9. 在庫ステータス自動更新関数
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.available_stock <= 0 THEN
        NEW.stock_status = 'out_of_stock';
    ELSIF NEW.available_stock <= NEW.minimum_stock_level THEN
        NEW.stock_status = 'low_stock';
    ELSE
        NEW.stock_status = 'in_stock';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_status_update ON inventory_management;
CREATE TRIGGER trigger_inventory_status_update
    BEFORE UPDATE ON inventory_management
    FOR EACH ROW EXECUTE FUNCTION update_stock_status();

-- 10. 価格変動アラート関数
CREATE OR REPLACE FUNCTION check_price_alerts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.monitored_price_jpy IS NOT NULL AND OLD.monitored_price_jpy IS NOT NULL THEN
        NEW.previous_price_jpy = OLD.monitored_price_jpy;
        NEW.price_change_amount = NEW.monitored_price_jpy - OLD.monitored_price_jpy;
        NEW.price_change_percentage = 
            ((NEW.monitored_price_jpy - OLD.monitored_price_jpy) / OLD.monitored_price_jpy) * 100;
        
        -- アラート条件チェック
        IF ABS(NEW.price_change_percentage) > NEW.price_alert_threshold THEN
            NEW.alert_sent_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_price_change_alert ON price_monitoring;
CREATE TRIGGER trigger_price_change_alert
    BEFORE UPDATE ON price_monitoring
    FOR EACH ROW EXECUTE FUNCTION check_price_alerts();

-- 11. 重複検出・統合処理関数
CREATE OR REPLACE FUNCTION detect_duplicates()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    existing_sku VARCHAR(100);
BEGIN
    -- スクレイピングデータと既存eBayデータの重複検出
    FOR rec IN 
        SELECT s.id, s.scraped_title, s.source_platform, s.source_item_id,
               e.ebay_item_id, e.listing_title, e.master_sku as existing_sku
        FROM scraped_product_data s
        LEFT JOIN ebay_listing_data e ON similarity(s.scraped_title, e.listing_title) > 0.8
        WHERE s.master_sku IS NULL AND s.merge_status = 'pending'
    LOOP
        IF rec.existing_sku IS NOT NULL THEN
            -- 既存商品と統合
            UPDATE scraped_product_data 
            SET master_sku = rec.existing_sku, 
                is_duplicate = TRUE,
                merge_status = 'merged'
            WHERE id = rec.id;
        ELSE
            -- 新規商品として登録
            existing_sku := 'AUTO-' || rec.source_platform || '-' || rec.source_item_id;
            
            INSERT INTO product_master (master_sku, product_name_jp)
            VALUES (existing_sku, rec.scraped_title)
            ON CONFLICT (master_sku) DO NOTHING;
            
            UPDATE scraped_product_data 
            SET master_sku = existing_sku,
                merge_status = 'merged'
            WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 12. 在庫計算関数（複数システム対応）
CREATE OR REPLACE FUNCTION calculate_available_stock(sku VARCHAR(100))
RETURNS INTEGER AS $$
DECLARE
    total_physical INTEGER := 0;
    total_reserved INTEGER := 0;
    total_dropship INTEGER := 0;
    result INTEGER;
BEGIN
    -- 物理在庫の合計
    SELECT COALESCE(SUM(physical_stock), 0), COALESCE(SUM(reserved_stock), 0)
    INTO total_physical, total_reserved
    FROM inventory_management 
    WHERE master_sku = sku AND inventory_type IN ('physical', 'hybrid');
    
    -- ドロップシップ在庫
    SELECT COALESCE(MIN(dropship_stock), 0)
    INTO total_dropship
    FROM inventory_management 
    WHERE master_sku = sku AND inventory_type IN ('dropship', 'hybrid');
    
    -- 最終在庫数計算
    result := GREATEST(total_physical - total_reserved, 0) + total_dropship;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 13. 在庫同期処理（楽観的ロック対応）
CREATE OR REPLACE FUNCTION sync_inventory_safe(
    sku VARCHAR(100), 
    new_stock INTEGER, 
    system_name VARCHAR(100),
    change_reason VARCHAR(100) DEFAULT 'sync_update'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_version INTEGER;
    update_success BOOLEAN := FALSE;
BEGIN
    -- 楽観的ロック確認
    SELECT lock_version INTO current_version
    FROM inventory_management 
    WHERE master_sku = sku AND management_system = system_name;
    
    -- 在庫更新（バージョン確認付き）
    UPDATE inventory_management 
    SET physical_stock = new_stock,
        previous_stock = physical_stock,
        stock_change_reason = change_reason,
        lock_version = lock_version + 1,
        last_modified_by = system_name,
        updated_at = CURRENT_TIMESTAMP
    WHERE master_sku = sku 
      AND management_system = system_name 
      AND lock_version = current_version;
    
    GET DIAGNOSTICS update_success = ROW_COUNT;
    
    RETURN update_success > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 既存データ移行処理
-- =====================================================

-- inventory_products から product_master へのデータ移行
INSERT INTO product_master (master_sku, product_name_jp, product_name_en, purchase_price_jpy, selling_price_usd)
SELECT 
    sku,
    product_name,
    product_name_en,
    purchase_price,
    selling_price
FROM inventory_products
ON CONFLICT (master_sku) DO NOTHING;

-- inventory_products から inventory_management へのデータ移行
INSERT INTO inventory_management (master_sku, inventory_type, management_system, physical_stock)
SELECT 
    sku,
    'physical',
    'manual_inventory',
    1 -- デフォルト在庫数
FROM inventory_products
ON CONFLICT DO NOTHING;

-- サンプル商品の追加
INSERT INTO product_master (master_sku, product_name_jp, product_name_en, category) VALUES
('YAT-SAMPLE-001', 'サンプル商品1', 'Sample Product 1', 'Electronics'),
('YAT-SAMPLE-002', 'サンプル商品2', 'Sample Product 2', 'Fashion')
ON CONFLICT (master_sku) DO NOTHING;

-- 確認用コメント
-- データベース統合完了確認SQL
-- SELECT COUNT(*) as product_master_count FROM product_master;
-- SELECT COUNT(*) as inventory_management_count FROM inventory_management;
-- SELECT * FROM product_unified_view LIMIT 5;