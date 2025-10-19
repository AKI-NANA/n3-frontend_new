-- 拡張プラットフォーム対応データベースマイグレーション
-- 新規5プラットフォーム（ポケモンセンター、ヨドバシ、モノタロウ、駿河屋、オフモール）対応

-- ================================================
-- プラットフォーム固有データ汎用テーブル
-- ================================================
CREATE TABLE IF NOT EXISTS platform_specific_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_product_id INT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    data_key VARCHAR(100) NOT NULL,
    data_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_product_platform (supplier_product_id, platform),
    INDEX idx_data_key (data_key),
    
    FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='プラットフォーム固有データ汎用テーブル';

-- ================================================
-- スクレイピング実行ログ拡張
-- ================================================
CREATE TABLE IF NOT EXISTS scraping_execution_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    source_url TEXT NOT NULL,
    execution_status VARCHAR(20) NOT NULL COMMENT 'success, failed, partial',
    product_id INT DEFAULT NULL,
    error_message TEXT,
    execution_time_ms INT,
    retry_count INT DEFAULT 0,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_platform_status (platform, execution_status),
    INDEX idx_executed_at (executed_at),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='スクレイピング実行ログ';

-- ================================================
-- プラットフォーム別設定テーブル
-- ================================================
CREATE TABLE IF NOT EXISTS platform_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    request_delay INT DEFAULT 2000 COMMENT 'リクエスト間隔（ミリ秒）',
    max_retries INT DEFAULT 3,
    timeout INT DEFAULT 30,
    user_agent TEXT,
    proxy_enabled BOOLEAN DEFAULT false,
    custom_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='プラットフォーム別設定';

-- ================================================
-- 初期データ挿入
-- ================================================
INSERT INTO platform_configurations (platform, display_name, base_url, request_delay, max_retries) VALUES
('pokemon_center', 'ポケモンセンター', 'https://www.pokemoncenter-online.com', 2000, 5),
('yodobashi', 'ヨドバシ', 'https://www.yodobashi.com', 2000, 5),
('monotaro', 'モノタロウ', 'https://www.monotaro.com', 2500, 5),
('surugaya', '駿河屋', 'https://www.suruga-ya.jp', 2000, 5),
('offmall', 'オフモール', 'https://netmall.hardoff.co.jp', 2000, 5)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    base_url = VALUES(base_url),
    request_delay = VALUES(request_delay),
    max_retries = VALUES(max_retries);

-- ================================================
-- 既存テーブルへのインデックス最適化
-- ================================================

-- supplier_products テーブルのインデックス追加
ALTER TABLE supplier_products 
ADD INDEX IF NOT EXISTS idx_platform_status (platform, url_status),
ADD INDEX IF NOT EXISTS idx_created_at (created_at),
ADD INDEX IF NOT EXISTS idx_price (purchase_price);

-- ================================================
-- プラットフォーム統計ビュー
-- ================================================
CREATE OR REPLACE VIEW v_platform_statistics AS
SELECT 
    platform,
    COUNT(*) as total_products,
    SUM(CASE WHEN url_status = 'available' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN url_status = 'sold_out' THEN 1 ELSE 0 END) as sold_out_count,
    SUM(CASE WHEN url_status = 'dead' THEN 1 ELSE 0 END) as dead_count,
    AVG(purchase_price) as avg_price,
    MIN(purchase_price) as min_price,
    MAX(purchase_price) as max_price,
    SUM(purchase_price) as total_inventory_value,
    MAX(created_at) as last_product_added,
    MAX(last_verified_at) as last_verification
FROM supplier_products
GROUP BY platform;

-- ================================================
-- 在庫アラート用ビュー
-- ================================================
CREATE OR REPLACE VIEW v_inventory_alerts AS
SELECT 
    sp.id,
    sp.platform,
    sp.product_title,
    sp.purchase_price,
    sp.url_status,
    sp.last_verified_at,
    DATEDIFF(NOW(), sp.last_verified_at) as days_since_verification,
    CASE 
        WHEN sp.url_status = 'sold_out' THEN 'SOLD_OUT'
        WHEN sp.url_status = 'dead' THEN 'DEAD_LINK'
        WHEN DATEDIFF(NOW(), sp.last_verified_at) > 7 THEN 'NEEDS_VERIFICATION'
        ELSE 'OK'
    END as alert_status
FROM supplier_products sp
WHERE 
    sp.monitoring_enabled = true
    AND (
        sp.url_status IN ('sold_out', 'dead')
        OR DATEDIFF(NOW(), sp.last_verified_at) > 7
    );

-- ================================================
-- ストアドプロシージャ: 在庫確認実行
-- ================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_check_inventory(
    IN p_product_id INT
)
BEGIN
    DECLARE v_platform VARCHAR(20);
    DECLARE v_url TEXT;
    
    -- 商品情報取得
    SELECT platform, source_url INTO v_platform, v_url
    FROM supplier_products
    WHERE id = p_product_id;
    
    -- 最終確認日時更新
    UPDATE supplier_products
    SET last_verified_at = NOW()
    WHERE id = p_product_id;
    
    -- ログ記録
    INSERT INTO scraping_execution_logs (
        platform, 
        source_url, 
        execution_status, 
        product_id
    ) VALUES (
        v_platform,
        v_url,
        'initiated',
        p_product_id
    );
    
    SELECT 
        id,
        platform,
        product_title,
        purchase_price,
        url_status,
        last_verified_at
    FROM supplier_products
    WHERE id = p_product_id;
END //

DELIMITER ;

-- ================================================
-- トリガー: 商品追加時のログ記録
-- ================================================
DELIMITER //

CREATE TRIGGER IF NOT EXISTS trg_supplier_products_after_insert
AFTER INSERT ON supplier_products
FOR EACH ROW
BEGIN
    INSERT INTO scraping_execution_logs (
        platform,
        source_url,
        execution_status,
        product_id
    ) VALUES (
        NEW.platform,
        NEW.source_url,
        'success',
        NEW.id
    );
END //

DELIMITER ;

-- ================================================
-- インデックス統計更新
-- ================================================
ANALYZE TABLE supplier_products;
ANALYZE TABLE platform_specific_data;
ANALYZE TABLE scraping_execution_logs;
ANALYZE TABLE platform_configurations;

-- ================================================
-- 完了メッセージ
-- ================================================
SELECT '拡張プラットフォームマイグレーション完了' as status,
       NOW() as completed_at;