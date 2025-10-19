-- Shopee出品管理システム用データベース設計
-- 既存eBayシステムとの統合対応

-- Shopee API認証情報テーブル
CREATE TABLE shopee_api_credentials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country_code VARCHAR(3) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    partner_id BIGINT NOT NULL,
    partner_key VARCHAR(255) NOT NULL,
    shop_id BIGINT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    api_base_url VARCHAR(255) DEFAULT 'https://partner.shopeemobile.com',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_country_active (country_code, is_active)
);

-- Shopee商品管理テーブル
CREATE TABLE shopee_products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(100) NOT NULL,
    country VARCHAR(3) NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    item_name_ja VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    local_price DECIMAL(10,2), -- 現地通貨での価格
    local_currency VARCHAR(3),
    stock INT NOT NULL DEFAULT 0,
    category_id INT NOT NULL,
    shopee_item_id BIGINT,
    shopee_status VARCHAR(50) DEFAULT 'pending', -- pending, active, inactive, error
    weight DECIMAL(8,2) DEFAULT 0,
    brand VARCHAR(200),
    description TEXT,
    image_urls JSON,
    
    -- eBay連携
    ebay_product_id INT,
    ebay_item_id BIGINT,
    sync_with_ebay BOOLEAN DEFAULT FALSE,
    
    -- 管理情報
    listing_date DATETIME,
    last_sync_at DATETIME,
    error_summary TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_by VARCHAR(100), -- 実行ユーザー
    
    INDEX idx_operation_type (operation_type),
    INDEX idx_started_date (started_at)
);

-- 在庫同期履歴テーブル
CREATE TABLE inventory_sync_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(100) NOT NULL,
    country VARCHAR(3) NOT NULL,
    shopee_item_id BIGINT NOT NULL,
    old_stock INT,
    new_stock INT NOT NULL,
    sync_source ENUM('csv', 'api', 'manual', 'auto') NOT NULL,
    sync_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    error_message TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sku_country (sku, country),
    INDEX idx_sync_date (synced_at),
    INDEX idx_status (sync_status)
);

-- 為替レート管理テーブル
CREATE TABLE exchange_rates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(12,6) NOT NULL,
    rate_source VARCHAR(50) DEFAULT 'manual', -- manual, api, bank
    effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    effective_to DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_currency_pair_date (from_currency, to_currency, effective_from),
    INDEX idx_active_rates (is_active, effective_from)
);

-- Shopee商品パフォーマンス追跡テーブル
CREATE TABLE shopee_product_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shopee_product_id INT NOT NULL,
    country VARCHAR(3) NOT NULL,
    shopee_item_id BIGINT NOT NULL,
    
    -- 販売データ
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    orders INT DEFAULT 0,
    sold_quantity INT DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    
    -- 在庫データ
    current_stock INT DEFAULT 0,
    stock_alert_threshold INT DEFAULT 10,
    
    -- 日付データ
    data_date DATE NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_product_date (shopee_product_id, data_date),
    INDEX idx_country_date (country, data_date),
    INDEX idx_performance (orders DESC, revenue DESC),
    
    FOREIGN KEY (shopee_product_id) REFERENCES shopee_products(id) ON DELETE CASCADE
);

-- エラーログテーブル
CREATE TABLE system_error_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    error_type VARCHAR(100) NOT NULL,
    error_level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'error',
    module VARCHAR(100), -- shopee_api, csv_processor, ebay_integration等
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context_data JSON, -- エラー発生時のコンテキスト情報
    user_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME,
    resolved_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_error_type (error_type),
    INDEX idx_error_level (error_level),
    INDEX idx_created_date (created_at),
    INDEX idx_resolved_status (resolved)
);

-- 国別設定テーブル
CREATE TABLE shopee_country_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country_code VARCHAR(3) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    currency_symbol VARCHAR(10),
    timezone VARCHAR(50),
    
    -- 手数料設定
    commission_rate DECIMAL(5,2) DEFAULT 5.00, -- パーセント
    payment_processing_fee DECIMAL(5,2) DEFAULT 2.00,
    withdrawal_fee DECIMAL(5,2) DEFAULT 1.00,
    
    -- 運用設定
    auto_listing_enabled BOOLEAN DEFAULT TRUE,
    auto_inventory_sync BOOLEAN DEFAULT TRUE,
    min_stock_threshold INT DEFAULT 5,
    max_daily_listings INT DEFAULT 100,
    
    -- 価格設定
    price_markup_percent DECIMAL(5,2) DEFAULT 0, -- 価格マークアップ率
    min_profit_margin DECIMAL(5,2) DEFAULT 10.00, -- 最小利益率
    
    -- 配送設定  
    default_processing_days INT DEFAULT 3,
    domestic_shipping_days INT DEFAULT 5,
    international_shipping_days INT DEFAULT 14,
    
    is_active BOOLEAN DEFAULT TRUE,
    priority_order INT DEFAULT 1, -- 出品優先順位
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active_priority (is_active, priority_order)
);

-- 初期データ投入
INSERT INTO shopee_country_settings (
    country_code, country_name, currency_code, currency_symbol, timezone,
    commission_rate, payment_processing_fee, withdrawal_fee, priority_order
) VALUES 
('SG', 'Singapore', 'SGD', 'Smessage TEXT,
    status ENUM('draft', 'pending', 'active', 'inactive', 'error') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_sku_country (sku, country),
    INDEX idx_shopee_item_id (shopee_item_id),
    INDEX idx_ebay_product (ebay_product_id),
    INDEX idx_status (status),
    INDEX idx_country_status (country, status),
    
    FOREIGN KEY (ebay_product_id) REFERENCES ebay_products(id) ON DELETE SET NULL
);

-- Shopee API呼び出しログ
CREATE TABLE shopee_api_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country VARCHAR(3) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(20) DEFAULT 'POST',
    request_data JSON,
    response_data JSON,
    status ENUM('success', 'error', 'timeout') NOT NULL,
    execution_time DECIMAL(8,3), -- 実行時間（秒）
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_country_endpoint (country, endpoint),
    INDEX idx_status_date (status, created_at),
    INDEX idx_created_date (created_at)
);

-- カテゴリマッピングテーブル（eBay ⇔ Shopee）
CREATE TABLE category_mappings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ebay_category_id INT NOT NULL,
    ebay_category_name VARCHAR(200),
    shopee_country VARCHAR(3) NOT NULL,
    shopee_category_id INT NOT NULL,
    shopee_category_name VARCHAR(200),
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- マッピング信頼度
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_ebay_shopee (ebay_category_id, shopee_country),
    INDEX idx_shopee_category (shopee_country, shopee_category_id)
);

-- 一括操作履歴テーブル
CREATE TABLE bulk_operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('listing', 'inventory_update', 'price_update', 'status_update') NOT NULL,
    operation_method ENUM('csv', 'api', 'manual') NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    successful_items INT NOT NULL DEFAULT 0,
    failed_items INT NOT NULL DEFAULT 0,
    target_countries JSON, -- 対象国のリスト
    file_path VARCHAR(500), -- アップロードファイルパス（CSV等）
    execution_details JSON, -- 実行結果詳細
    error_, 'Asia/Singapore', 5.50, 2.90, 0.50, 1),
('MY', 'Malaysia', 'MYR', 'RM', 'Asia/Kuala_Lumpur', 5.00, 2.50, 1.00, 2),
('TH', 'Thailand', 'THB', '฿', 'Asia/Bangkok', 4.50, 2.00, 1.00, 3),
('PH', 'Philippines', 'PHP', '₱', 'Asia/Manila', 5.00, 3.00, 1.50, 4),
('ID', 'Indonesia', 'IDR', 'Rp', 'Asia/Jakarta', 5.50, 2.50, 1.00, 5),
('VN', 'Vietnam', 'VND', '₫', 'Asia/Ho_Chi_Minh', 6.00, 3.00, 1.50, 6),
('TW', 'Taiwan', 'TWD', 'NTmessage TEXT,
    status ENUM('draft', 'pending', 'active', 'inactive', 'error') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_sku_country (sku, country),
    INDEX idx_shopee_item_id (shopee_item_id),
    INDEX idx_ebay_product (ebay_product_id),
    INDEX idx_status (status),
    INDEX idx_country_status (country, status),
    
    FOREIGN KEY (ebay_product_id) REFERENCES ebay_products(id) ON DELETE SET NULL
);

-- Shopee API呼び出しログ
CREATE TABLE shopee_api_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country VARCHAR(3) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(20) DEFAULT 'POST',
    request_data JSON,
    response_data JSON,
    status ENUM('success', 'error', 'timeout') NOT NULL,
    execution_time DECIMAL(8,3), -- 実行時間（秒）
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_country_endpoint (country, endpoint),
    INDEX idx_status_date (status, created_at),
    INDEX idx_created_date (created_at)
);

-- カテゴリマッピングテーブル（eBay ⇔ Shopee）
CREATE TABLE category_mappings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ebay_category_id INT NOT NULL,
    ebay_category_name VARCHAR(200),
    shopee_country VARCHAR(3) NOT NULL,
    shopee_category_id INT NOT NULL,
    shopee_category_name VARCHAR(200),
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- マッピング信頼度
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_ebay_shopee (ebay_category_id, shopee_country),
    INDEX idx_shopee_category (shopee_country, shopee_category_id)
);

-- 一括操作履歴テーブル
CREATE TABLE bulk_operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('listing', 'inventory_update', 'price_update', 'status_update') NOT NULL,
    operation_method ENUM('csv', 'api', 'manual') NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    successful_items INT NOT NULL DEFAULT 0,
    failed_items INT NOT NULL DEFAULT 0,
    target_countries JSON, -- 対象国のリスト
    file_path VARCHAR(500), -- アップロードファイルパス（CSV等）
    execution_details JSON, -- 実行結果詳細
    error_, 'Asia/Taipei', 4.00, 2.00, 0.50, 7);

-- 初期為替レートデータ
INSERT INTO exchange_rates (from_currency, to_currency, exchange_rate, rate_source) VALUES
('JPY', 'SGD', 0.0087, 'manual'),
('JPY', 'MYR', 0.0290, 'manual'),
('JPY', 'THB', 0.2380, 'manual'),
('JPY', 'PHP', 0.3700, 'manual'),
('JPY', 'IDR', 100.0000, 'manual'),
('JPY', 'VND', 158.0000, 'manual'),
('JPY', 'TWD', 0.2080, 'manual');

-- 基本カテゴリマッピング（サンプル）
INSERT INTO category_mappings (ebay_category_id, ebay_category_name, shopee_country, shopee_category_id, shopee_category_name, is_verified) VALUES
(9355, 'Electronics > Phones', 'SG', 100001, 'Mobile & Gadgets', TRUE),
(1059, 'Fashion > Clothing', 'SG', 100002, 'Women\'s Apparel', TRUE),
(11450, 'Home & Garden', 'SG', 100003, 'Home & Living', TRUE),
(26395, 'Health & Beauty', 'SG', 100004, 'Health & Beauty', TRUE),
(550, 'Art > Collectibles', 'SG', 100005, 'Hobbies & Collections', TRUE);

-- 複製して他国用も作成
INSERT INTO category_mappings (ebay_category_id, ebay_category_name, shopee_country, shopee_category_id, shopee_category_name, is_verified)
SELECT ebay_category_id, ebay_category_name, 'MY', shopee_category_id, shopee_category_name, is_verified 
FROM category_mappings WHERE shopee_country = 'SG';

INSERT INTO category_mappings (ebay_category_id, ebay_category_name, shopee_country, shopee_category_id, shopee_category_name, is_verified)
SELECT ebay_category_id, ebay_category_name, 'TH', shopee_category_id, shopee_category_name, is_verified 
FROM category_mappings WHERE shopee_country = 'SG';

INSERT INTO category_mappings (ebay_category_id, ebay_category_name, shopee_country, shopee_category_id, shopee_category_name, is_verified)
SELECT ebay_category_id, ebay_category_name, 'PH', shopee_category_id, shopee_category_name, is_verified 
FROM category_mappings WHERE shopee_country = 'SG';

-- 便利な管理用ビュー
CREATE VIEW v_shopee_product_summary AS
SELECT 
    sp.id,
    sp.sku,
    sp.country,
    sp.item_name,
    sp.price,
    sp.local_price,
    sp.stock,
    sp.status,
    sp.shopee_item_id,
    sp.listing_date,
    ep.title as ebay_title,
    ep.price as ebay_price,
    scs.country_name,
    scs.currency_symbol
FROM shopee_products sp
LEFT JOIN ebay_products ep ON sp.ebay_product_id = ep.id
LEFT JOIN shopee_country_settings scs ON sp.country = scs.country_code
WHERE sp.status != 'draft';

-- 在庫アラートビュー
CREATE VIEW v_low_stock_alerts AS
SELECT 
    sp.sku,
    sp.country,
    sp.item_name,
    sp.stock as current_stock,
    scs.min_stock_threshold,
    sp.updated_at as last_stock_update,
    DATEDIFF(NOW(), sp.updated_at) as days_since_update
FROM shopee_products sp
JOIN shopee_country_settings scs ON sp.country = scs.country_code
WHERE sp.status = 'active' 
    AND sp.stock <= scs.min_stock_threshold
ORDER BY sp.stock ASC, days_since_update DESC;

-- エラー統計ビュー
CREATE VIEW v_error_statistics AS
SELECT 
    DATE(created_at) as error_date,
    error_level,
    module,
    COUNT(*) as error_count,
    COUNT(CASE WHEN resolved = TRUE THEN 1 END) as resolved_count,
    AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as avg_resolution_time_minutes
FROM system_error_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), error_level, module
ORDER BY error_date DESC, error_count DESC;

-- パフォーマンス統計ビュー
CREATE VIEW v_country_performance AS
SELECT 
    spp.country,
    scs.country_name,
    COUNT(DISTINCT spp.shopee_product_id) as active_products,
    SUM(spp.views) as total_views,
    SUM(spp.orders) as total_orders,
    SUM(spp.sold_quantity) as total_sold,
    SUM(spp.revenue) as total_revenue,
    AVG(spp.views / NULLIF(COUNT(DISTINCT spp.shopee_product_id), 0)) as avg_views_per_product,
    (SUM(spp.orders) / NULLIF(SUM(spp.views), 0)) * 100 as conversion_rate_percent
FROM shopee_product_performance spp
JOIN shopee_country_settings scs ON spp.country = scs.country_code
WHERE spp.data_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY spp.country, scs.country_name
ORDER BY total_revenue DESC;

-- インデックス最適化
CREATE INDEX idx_shopee_products_performance ON shopee_products(country, status, updated_at);
CREATE INDEX idx_api_logs_performance ON shopee_api_logs(country, status, created_at);
CREATE INDEX idx_bulk_operations_search ON bulk_operations(operation_type, started_at);

-- ストアドプロシージャ：在庫一括更新
DELIMITER //
CREATE PROCEDURE UpdateShopeeInventory(
    IN p_sku VARCHAR(100),
    IN p_new_stock INT,
    IN p_target_country VARCHAR(3),
    IN p_sync_source VARCHAR(20)
)
BEGIN
    DECLARE v_affected_rows INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        INSERT INTO system_error_logs (error_type, error_level, module, error_message)
        VALUES ('inventory_update', 'error', 'stored_procedure', 
                CONCAT('在庫更新失敗 SKU:', p_sku, ' Country:', p_target_country));
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 在庫更新
    IF p_target_country IS NULL THEN
        UPDATE shopee_products 
        SET stock = p_new_stock, updated_at = NOW()
        WHERE sku = p_sku AND status = 'active';
    ELSE
        UPDATE shopee_products 
        SET stock = p_new_stock, updated_at = NOW()
        WHERE sku = p_sku AND country = p_target_country AND status = 'active';
    END IF;
    
    SET v_affected_rows = ROW_COUNT();
    
    -- 履歴記録
    INSERT INTO inventory_sync_history (sku, country, shopee_item_id, new_stock, sync_source, sync_status)
    SELECT sku, country, shopee_item_id, p_new_stock, p_sync_source, 'success'
    FROM shopee_products 
    WHERE sku = p_sku 
      AND (p_target_country IS NULL OR country = p_target_country)
      AND status = 'active';
    
    COMMIT;
    
    SELECT v_affected_rows as affected_products;
END //
DELIMITER ;

-- ストアドプロシージャ：パフォーマンス集計
DELIMITER //
CREATE PROCEDURE GenerateCountryReport(
    IN p_country VARCHAR(3),
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        'Country Summary' as report_section,
        scs.country_name,
        COUNT(DISTINCT sp.id) as total_products,
        COUNT(DISTINCT CASE WHEN sp.status = 'active' THEN sp.id END) as active_products,
        AVG(sp.stock) as avg_stock_level,
        SUM(CASE WHEN sp.stock <= scs.min_stock_threshold THEN 1 ELSE 0 END) as low_stock_items
    FROM shopee_products sp
    JOIN shopee_country_settings scs ON sp.country = scs.country_code
    WHERE sp.country = p_country
    
    UNION ALL
    
    SELECT 
        'Performance Data' as report_section,
        'Sales Performance',
        SUM(spp.orders),
        SUM(spp.sold_quantity),
        AVG(spp.revenue),
        MAX(spp.revenue)
    FROM shopee_product_performance spp
    WHERE spp.country = p_country 
      AND spp.data_date BETWEEN p_start_date AND p_end_date
    
    UNION ALL
    
    SELECT 
        'API Health' as report_section,
        'API Call Statistics',
        COUNT(*),
        COUNT(CASE WHEN sal.status = 'success' THEN 1 END),
        AVG(sal.execution_time),
        COUNT(CASE WHEN sal.status = 'error' THEN 1 END)
    FROM shopee_api_logs sal
    WHERE sal.country = p_country 
      AND DATE(sal.created_at) BETWEEN p_start_date AND p_end_date;
END //
DELIMITER ;message TEXT,
    status ENUM('draft', 'pending', 'active', 'inactive', 'error') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_sku_country (sku, country),
    INDEX idx_shopee_item_id (shopee_item_id),
    INDEX idx_ebay_product (ebay_product_id),
    INDEX idx_status (status),
    INDEX idx_country_status (country, status),
    
    FOREIGN KEY (ebay_product_id) REFERENCES ebay_products(id) ON DELETE SET NULL
);

-- Shopee API呼び出しログ
CREATE TABLE shopee_api_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    country VARCHAR(3) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(20) DEFAULT 'POST',
    request_data JSON,
    response_data JSON,
    status ENUM('success', 'error', 'timeout') NOT NULL,
    execution_time DECIMAL(8,3), -- 実行時間（秒）
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_country_endpoint (country, endpoint),
    INDEX idx_status_date (status, created_at),
    INDEX idx_created_date (created_at)
);

-- カテゴリマッピングテーブル（eBay ⇔ Shopee）
CREATE TABLE category_mappings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ebay_category_id INT NOT NULL,
    ebay_category_name VARCHAR(200),
    shopee_country VARCHAR(3) NOT NULL,
    shopee_category_id INT NOT NULL,
    shopee_category_name VARCHAR(200),
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- マッピング信頼度
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_ebay_shopee (ebay_category_id, shopee_country),
    INDEX idx_shopee_category (shopee_country, shopee_category_id)
);

-- 一括操作履歴テーブル
CREATE TABLE bulk_operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('listing', 'inventory_update', 'price_update', 'status_update') NOT NULL,
    operation_method ENUM('csv', 'api', 'manual') NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    successful_items INT NOT NULL DEFAULT 0,
    failed_items INT NOT NULL DEFAULT 0,
    target_countries JSON, -- 対象国のリスト
    file_path VARCHAR(500), -- アップロードファイルパス（CSV等）
    execution_details JSON, -- 実行結果詳細
    error_