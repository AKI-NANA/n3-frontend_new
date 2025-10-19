-- メルカリ対応 複数仕入れ先在庫管理システム データベース構築
-- 既存システムに追加するテーブル構成

-- ===============================================
-- 複数仕入れ先商品管理テーブル（メイン）
-- ===============================================
CREATE TABLE IF NOT EXISTS supplier_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- プラットフォーム情報
    platform VARCHAR(20) NOT NULL COMMENT 'yahoo, mercari, rakuten, amazon',
    platform_product_id VARCHAR(100) NOT NULL COMMENT 'プラットフォーム側の商品ID',
    source_url TEXT NOT NULL COMMENT '商品URL',
    
    -- 商品基本情報
    product_title VARCHAR(500) NOT NULL COMMENT '商品タイトル',
    condition_type VARCHAR(50) COMMENT '商品状態（新品、中古美品等）',
    purchase_price DECIMAL(10,2) NOT NULL COMMENT '仕入れ価格',
    expected_selling_price DECIMAL(10,2) DEFAULT NULL COMMENT '販売予定価格',
    
    -- 在庫情報
    current_stock INT DEFAULT 1 COMMENT '現在の在庫数',
    monitoring_enabled BOOLEAN DEFAULT true COMMENT '監視有効フラグ',
    
    -- 商品詳細情報
    seller_info VARCHAR(200) COMMENT '出品者情報',
    description TEXT COMMENT '商品説明',
    images JSON COMMENT '商品画像URL配列',
    additional_data JSON COMMENT 'プラットフォーム固有データ',
    
    -- 検証・監視用
    title_hash VARCHAR(64) COMMENT 'タイトルハッシュ（変更検知用）',
    url_status VARCHAR(20) DEFAULT 'active' COMMENT 'active, dead, changed, sold',
    last_verified_at TIMESTAMP NULL COMMENT '最終確認日時',
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_platform_monitoring (platform, monitoring_enabled),
    INDEX idx_platform_product_id (platform, platform_product_id),
    INDEX idx_url_status (url_status),
    INDEX idx_updated_at (updated_at),
    UNIQUE KEY unique_platform_url (platform, source_url(100)) -- URL重複防止
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='複数仕入れ先対応商品管理テーブル';

-- ===============================================
-- 在庫管理統合テーブル（既存システム拡張）
-- ===============================================
CREATE TABLE IF NOT EXISTS inventory_management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL COMMENT 'supplier_products.id',
    
    -- 仕入れ先情報
    source_platform VARCHAR(20) NOT NULL COMMENT 'yahoo, mercari, rakuten',
    source_url TEXT NOT NULL,
    source_product_id VARCHAR(100),
    
    -- 現在の在庫・価格情報
    current_stock INT DEFAULT 0,
    current_price DECIMAL(10,2) DEFAULT 0.00,
    
    -- 商品検証
    title_hash VARCHAR(64) COMMENT 'タイトルのハッシュ値',
    url_status VARCHAR(20) DEFAULT 'active' COMMENT 'active, dead, changed',
    last_verified_at TIMESTAMP NULL,
    
    -- システム管理
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_product_monitoring (product_id, monitoring_enabled),
    INDEX idx_source_platform (source_platform),
    INDEX idx_updated_at (updated_at),
    INDEX idx_url_status (url_status),
    
    FOREIGN KEY (product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='統合在庫管理テーブル';

-- ===============================================
-- 在庫履歴テーブル（価格・在庫変動追跡）
-- ===============================================
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    
    -- 変更前後の値
    previous_stock INT,
    new_stock INT,
    previous_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    
    -- 変更詳細
    change_type VARCHAR(20) NOT NULL COMMENT 'stock_change, price_change, both, sold_out',
    change_source VARCHAR(20) NOT NULL COMMENT 'yahoo, mercari, manual',
    change_reason TEXT COMMENT '変更理由',
    
    -- システム情報
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_product_time (product_id, created_at DESC),
    INDEX idx_change_type (change_type, created_at DESC),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='在庫・価格変更履歴テーブル';

-- ===============================================
-- プラットフォーム固有データテーブル（メルカリ用）
-- ===============================================
CREATE TABLE IF NOT EXISTS mercari_product_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_product_id INT NOT NULL,
    
    -- メルカリ固有情報
    mercari_item_id VARCHAR(20) UNIQUE NOT NULL,
    seller_rating DECIMAL(3,2) DEFAULT NULL COMMENT '出品者評価',
    seller_review_count INT DEFAULT NULL COMMENT '出品者レビュー数',
    shipping_method VARCHAR(100) COMMENT '配送方法',
    shipping_cost VARCHAR(50) COMMENT '送料負担',
    shipping_duration VARCHAR(50) COMMENT '発送までの日数',
    
    -- カテゴリ情報
    category_main VARCHAR(100) COMMENT 'メインカテゴリ',
    category_sub VARCHAR(100) COMMENT 'サブカテゴリ',
    category_detail VARCHAR(100) COMMENT '詳細カテゴリ',
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_supplier_product (supplier_product_id),
    UNIQUE KEY unique_mercari_item (mercari_item_id),
    
    FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='メルカリ商品詳細情報テーブル';

-- ===============================================
-- 商品マスターテーブル（統合管理用・オプション）
-- ===============================================
CREATE TABLE IF NOT EXISTS product_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 統合商品情報
    master_name VARCHAR(500) NOT NULL COMMENT '統合商品名',
    master_category VARCHAR(100) COMMENT '統合カテゴリ',
    brand VARCHAR(100) COMMENT 'ブランド名',
    model VARCHAR(100) COMMENT '型番',
    
    -- 商品識別
    product_fingerprint VARCHAR(64) UNIQUE COMMENT '商品指紋（重複判定用）',
    
    -- ビジネス情報
    target_profit_margin DECIMAL(5,2) DEFAULT 20.00 COMMENT '目標利益率(%)',
    min_selling_price DECIMAL(10,2) COMMENT '最低販売価格',
    
    -- システム管理
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_fingerprint (product_fingerprint),
    INDEX idx_category (master_category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='商品マスターテーブル（統合管理用）';

-- ===============================================
-- 商品関連付けテーブル（マスター商品と仕入れ先商品の紐付け）
-- ===============================================
CREATE TABLE IF NOT EXISTS product_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    master_product_id INT NOT NULL,
    supplier_product_id INT NOT NULL,
    
    -- 関連付け情報
    relationship_type VARCHAR(20) DEFAULT 'same_product' COMMENT 'same_product, variant, related',
    confidence_score DECIMAL(3,2) DEFAULT 1.00 COMMENT '関連度スコア',
    verified_by VARCHAR(20) DEFAULT 'system' COMMENT 'system, manual',
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_master_product (master_product_id),
    INDEX idx_supplier_product (supplier_product_id),
    UNIQUE KEY unique_relationship (master_product_id, supplier_product_id),
    
    FOREIGN KEY (master_product_id) REFERENCES product_master(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='商品関連付けテーブル';

-- ===============================================
-- 処理キューテーブル（非同期処理用）
-- ===============================================
CREATE TABLE IF NOT EXISTS processing_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- キュー情報
    task_type VARCHAR(50) NOT NULL COMMENT 'scraping, inventory_check, price_update',
    priority INT DEFAULT 5 COMMENT '優先度（1-10、数字が小さいほど高優先）',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, processing, completed, failed',
    
    -- タスクデータ
    target_url TEXT,
    platform VARCHAR(20),
    payload JSON COMMENT 'タスク固有のデータ',
    
    -- 実行情報
    attempts INT DEFAULT 0 COMMENT '実行試行回数',
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    
    -- スケジュール
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_status_priority (status, priority),
    INDEX idx_platform_status (platform, status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_task_type (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='処理キューテーブル';

-- ===============================================
-- エラーログテーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- エラー情報
    error_type VARCHAR(50) NOT NULL COMMENT 'scraping_error, database_error, validation_error',
    error_level VARCHAR(20) DEFAULT 'ERROR' COMMENT 'INFO, WARNING, ERROR, CRITICAL',
    error_message TEXT NOT NULL,
    error_details JSON COMMENT '詳細情報',
    
    -- 関連情報
    platform VARCHAR(20),
    product_id INT NULL,
    url TEXT,
    
    -- システム情報
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_error_type_level (error_type, error_level),
    INDEX idx_platform_error (platform, created_at DESC),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='エラーログテーブル';

-- ===============================================
-- ビュー: 統合在庫管理ビュー
-- ===============================================
CREATE OR REPLACE VIEW unified_inventory_view AS
SELECT 
    sp.id,
    sp.platform,
    sp.product_title,
    sp.condition_type,
    sp.purchase_price,
    sp.expected_selling_price,
    sp.current_stock,
    sp.monitoring_enabled,
    sp.url_status,
    sp.last_verified_at,
    CASE 
        WHEN sp.expected_selling_price > 0 
        THEN ROUND(((sp.expected_selling_price - sp.purchase_price) / sp.purchase_price * 100), 2)
        ELSE NULL 
    END as profit_margin_percent,
    sp.created_at,
    sp.updated_at
FROM supplier_products sp
WHERE sp.monitoring_enabled = true
ORDER BY sp.updated_at DESC;

-- ===============================================
-- ビュー: プラットフォーム別在庫サマリー
-- ===============================================
CREATE OR REPLACE VIEW platform_inventory_summary AS
SELECT 
    platform,
    COUNT(*) as total_products,
    SUM(CASE WHEN url_status = 'active' THEN 1 ELSE 0 END) as active_products,
    SUM(CASE WHEN url_status = 'sold' THEN 1 ELSE 0 END) as sold_products,
    SUM(current_stock) as total_stock,
    AVG(purchase_price) as avg_purchase_price,
    SUM(purchase_price * current_stock) as total_inventory_value,
    COUNT(CASE WHEN monitoring_enabled = true THEN 1 END) as monitored_products
FROM supplier_products
GROUP BY platform;

-- ===============================================
-- ストアドプロシージャ: 在庫状況更新
-- ===============================================
DELIMITER //

CREATE PROCEDURE UpdateInventoryStatus(
    IN p_product_id INT,
    IN p_new_stock INT,
    IN p_new_price DECIMAL(10,2),
    IN p_change_source VARCHAR(20)
)
BEGIN
    DECLARE v_old_stock INT DEFAULT 0;
    DECLARE v_old_price DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_change_type VARCHAR(20);
    
    -- 現在の値を取得
    SELECT current_stock, purchase_price 
    INTO v_old_stock, v_old_price
    FROM supplier_products 
    WHERE id = p_product_id;
    
    -- 変更タイプを判定
    IF v_old_stock != p_new_stock AND v_old_price != p_new_price THEN
        SET v_change_type = 'both';
    ELSEIF v_old_stock != p_new_stock THEN
        SET v_change_type = 'stock_change';
    ELSEIF v_old_price != p_new_price THEN
        SET v_change_type = 'price_change';
    ELSE
        SET v_change_type = 'no_change';
    END IF;
    
    -- 商品情報を更新
    IF v_change_type != 'no_change' THEN
        UPDATE supplier_products 
        SET 
            current_stock = p_new_stock,
            purchase_price = p_new_price,
            last_verified_at = NOW(),
            updated_at = NOW()
        WHERE id = p_product_id;
        
        -- 履歴を記録
        INSERT INTO stock_history (
            product_id, previous_stock, new_stock, 
            previous_price, new_price, change_type, 
            change_source, created_at
        ) VALUES (
            p_product_id, v_old_stock, p_new_stock,
            v_old_price, p_new_price, v_change_type,
            p_change_source, NOW()
        );
        
        -- inventory_management も更新
        UPDATE inventory_management 
        SET 
            current_stock = p_new_stock,
            current_price = p_new_price,
            last_verified_at = NOW(),
            updated_at = NOW()
        WHERE product_id = p_product_id;
    END IF;
    
END//

DELIMITER ;

-- ===============================================
-- 初期データ
-- ===============================================

-- サンプル商品（テスト用）
INSERT IGNORE INTO supplier_products (
    platform, platform_product_id, source_url, product_title, 
    condition_type, purchase_price, current_stock
) VALUES 
('mercari', 'sample001', 'https://jp.mercari.com/item/sample001', 
 'テスト商品 - ポケモンカード', '新品、未使用', 1000.00, 1),
('yahoo', 'sample002', 'https://auctions.yahoo.co.jp/sample002', 
 'テスト商品 - ポケモンカード', '中古', 800.00, 1);

-- 設定完了メッセージ
SELECT 'メルカリ対応データベース構築完了' as status, NOW() as completed_at;