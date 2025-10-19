-- ゴルフサイト群対応データベースマイグレーション
-- 13プラットフォーム追加対応

-- ================================================
-- ゴルフ商品専用データテーブル
-- ================================================
CREATE TABLE IF NOT EXISTS golf_product_specifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_product_id INT NOT NULL,
    
    -- クラブ基本情報
    club_type VARCHAR(50) COMMENT 'ドライバー、FW、UT、アイアン等',
    brand VARCHAR(100) COMMENT 'メーカー名',
    model VARCHAR(200) COMMENT 'モデル名',
    
    -- クラブスペック
    loft DECIMAL(4,1) COMMENT 'ロフト角',
    flex VARCHAR(20) COMMENT 'R, S, SR, X, L等',
    shaft_name VARCHAR(200) COMMENT 'シャフト名',
    club_length DECIMAL(5,2) COMMENT 'クラブ長さ(inch)',
    club_weight INT COMMENT 'クラブ重量(g)',
    
    -- グリップ・その他
    grip_type VARCHAR(100) COMMENT 'グリップタイプ',
    grip_condition VARCHAR(50) COMMENT 'グリップ状態',
    head_volume INT COMMENT 'ヘッド体積(cc)',
    
    -- 状態詳細
    condition_rank VARCHAR(10) COMMENT 'A+, A, B, C等',
    condition_detail TEXT COMMENT '詳細状態説明',
    
    -- 付属品
    accessories TEXT COMMENT '付属品情報',
    has_headcover BOOLEAN DEFAULT false,
    has_wrench BOOLEAN DEFAULT false,
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_supplier_product (supplier_product_id),
    INDEX idx_club_type (club_type),
    INDEX idx_brand (brand),
    INDEX idx_flex (flex),
    INDEX idx_condition_rank (condition_rank),
    
    FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ゴルフクラブ仕様詳細テーブル';

-- ================================================
-- プラットフォーム設定追加
-- ================================================
INSERT INTO platform_configurations (platform, display_name, base_url, request_delay, max_retries, custom_config) VALUES
('mercari_shops', 'メルカリショップス', 'https://mercari-shops.com', 2500, 5, '{"category": "フリマ"}'),
('golf_kids', 'ゴルフキッズ', 'https://shop.golfkids.co.jp', 2000, 5, '{"category": "ゴルフ"}'),
('golf_partner', 'ゴルフパートナー', 'https://www.golfpartner.jp', 2000, 5, '{"category": "ゴルフ"}'),
('alpen_golf5', 'アルペン・ゴルフ5', 'https://store.alpen-group.jp', 2000, 5, '{"category": "ゴルフ"}'),
('golf_effort', 'ゴルフエフォート', 'https://golfeffort.com', 2000, 5, '{"category": "ゴルフ"}'),
('y_golf_reuse', 'Yゴルフリユース', 'https://y-golf-reuse.com', 2000, 5, '{"category": "ゴルフ"}'),
('niki_golf', 'ニキゴルフ', 'https://www.nikigolf.co.jp', 2000, 5, '{"category": "ゴルフ"}'),
('reonard', 'レオナード', 'https://reonard.com', 2000, 5, '{"category": "ゴルフ"}'),
('stst_used', 'STST中古', 'https://www.stst-used.jp', 2000, 5, '{"category": "ゴルフ"}'),
('after_golf', 'アフターゴルフ', 'https://www.aftergolf.net', 2000, 5, '{"category": "ゴルフ"}'),
('golf_kace', 'ゴルフケース', 'https://ec.golf-kace.com', 2000, 5, '{"category": "ゴルフ"}')
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    base_url = VALUES(base_url),
    request_delay = VALUES(request_delay),
    custom_config = VALUES(custom_config);

-- ================================================
-- カテゴリ別統計ビュー
-- ================================================
CREATE OR REPLACE VIEW v_category_statistics AS
SELECT 
    JSON_UNQUOTE(JSON_EXTRACT(pc.custom_config, '$.category')) as category,
    COUNT(DISTINCT sp.id) as total_products,
    COUNT(DISTINCT sp.platform) as platform_count,
    SUM(CASE WHEN sp.url_status = 'available' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN sp.url_status = 'sold_out' THEN 1 ELSE 0 END) as sold_out_count,
    AVG(sp.purchase_price) as avg_price,
    SUM(sp.purchase_price) as total_value
FROM supplier_products sp
JOIN platform_configurations pc ON sp.platform = pc.platform
GROUP BY category;

-- ================================================
-- ゴルフクラブ検索用ビュー
-- ================================================
CREATE OR REPLACE VIEW v_golf_clubs_search AS
SELECT 
    sp.id,
    sp.platform,
    sp.product_title,
    sp.purchase_price,
    sp.url_status,
    sp.condition_type,
    gps.club_type,
    gps.brand,
    gps.model,
    gps.loft,
    gps.flex,
    gps.shaft_name,
    gps.condition_rank,
    sp.source_url,
    sp.created_at
FROM supplier_products sp
LEFT JOIN golf_product_specifications gps ON sp.id = gps.supplier_product_id
WHERE sp.platform IN (
    'golf_kids', 'golf_partner', 'alpen_golf5', 'golf_effort',
    'y_golf_reuse', 'niki_golf', 'reonard', 'stst_used',
    'after_golf', 'golf_kace', 'second_street'
);

-- ================================================
-- ゴルフクラブ在庫アラートビュー
-- ================================================
CREATE OR REPLACE VIEW v_golf_inventory_alerts AS
SELECT 
    sp.id,
    sp.platform,
    pc.display_name as platform_name,
    sp.product_title,
    gps.brand,
    gps.model,
    gps.club_type,
    sp.purchase_price,
    sp.url_status,
    DATEDIFF(NOW(), sp.last_verified_at) as days_unverified,
    CASE 
        WHEN sp.url_status = 'sold_out' THEN 'SOLD_OUT'
        WHEN sp.url_status = 'dead' THEN 'DEAD_LINK'
        WHEN DATEDIFF(NOW(), sp.last_verified_at) > 7 THEN 'NEEDS_CHECK'
        WHEN sp.purchase_price < 5000 AND sp.url_status = 'available' THEN 'LOW_PRICE_ALERT'
        ELSE 'OK'
    END as alert_type,
    sp.source_url
FROM supplier_products sp
LEFT JOIN golf_product_specifications gps ON sp.id = gps.supplier_product_id
JOIN platform_configurations pc ON sp.platform = pc.platform
WHERE JSON_UNQUOTE(JSON_EXTRACT(pc.custom_config, '$.category')) = 'ゴルフ'
    AND sp.monitoring_enabled = true;

-- ================================================
-- ストアドプロシージャ: ゴルフクラブ検索
-- ================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_search_golf_clubs(
    IN p_club_type VARCHAR(50),
    IN p_brand VARCHAR(100),
    IN p_flex VARCHAR(20),
    IN p_min_price DECIMAL(10,2),
    IN p_max_price DECIMAL(10,2),
    IN p_status VARCHAR(20),
    IN p_limit INT
)
BEGIN
    SELECT 
        sp.id,
        sp.platform,
        sp.product_title,
        sp.purchase_price,
        sp.url_status,
        gps.club_type,
        gps.brand,
        gps.model,
        gps.loft,
        gps.flex,
        gps.condition_rank,
        sp.source_url
    FROM supplier_products sp
    LEFT JOIN golf_product_specifications gps ON sp.id = gps.supplier_product_id
    WHERE 1=1
        AND (p_club_type IS NULL OR gps.club_type = p_club_type)
        AND (p_brand IS NULL OR gps.brand LIKE CONCAT('%', p_brand, '%'))
        AND (p_flex IS NULL OR gps.flex = p_flex)
        AND (p_min_price IS NULL OR sp.purchase_price >= p_min_price)
        AND (p_max_price IS NULL OR sp.purchase_price <= p_max_price)
        AND (p_status IS NULL OR sp.url_status = p_status)
    ORDER BY sp.created_at DESC
    LIMIT p_limit;
END //

DELIMITER ;

-- ================================================
-- ストアドプロシージャ: ゴルフクラブ仕様登録
-- ================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_register_golf_specs(
    IN p_product_id INT,
    IN p_club_type VARCHAR(50),
    IN p_brand VARCHAR(100),
    IN p_model VARCHAR(200),
    IN p_loft DECIMAL(4,1),
    IN p_flex VARCHAR(20),
    IN p_shaft_name VARCHAR(200),
    IN p_condition_rank VARCHAR(10)
)
BEGIN
    INSERT INTO golf_product_specifications (
        supplier_product_id,
        club_type,
        brand,
        model,
        loft,
        flex,
        shaft_name,
        condition_rank
    ) VALUES (
        p_product_id,
        p_club_type,
        p_brand,
        p_model,
        p_loft,
        p_flex,
        p_shaft_name,
        p_condition_rank
    )
    ON DUPLICATE KEY UPDATE
        club_type = VALUES(club_type),
        brand = VALUES(brand),
        model = VALUES(model),
        loft = VALUES(loft),
        flex = VALUES(flex),
        shaft_name = VALUES(shaft_name),
        condition_rank = VALUES(condition_rank),
        updated_at = CURRENT_TIMESTAMP;
        
    SELECT LAST_INSERT_ID() as specs_id;
END //

DELIMITER ;

-- ================================================
-- トリガー: ゴルフ商品追加時の自動処理
-- ================================================
DELIMITER //

CREATE TRIGGER IF NOT EXISTS trg_golf_product_after_insert
AFTER INSERT ON supplier_products
FOR EACH ROW
BEGIN
    DECLARE v_category VARCHAR(50);
    
    -- プラットフォームのカテゴリ取得
    SELECT JSON_UNQUOTE(JSON_EXTRACT(custom_config, '$.category'))
    INTO v_category
    FROM platform_configurations
    WHERE platform = NEW.platform;
    
    -- ゴルフカテゴリの場合、仕様テーブルのレコード作成
    IF v_category = 'ゴルフ' THEN
        INSERT INTO golf_product_specifications (supplier_product_id)
        VALUES (NEW.id);
    END IF;
END //

DELIMITER ;

-- ================================================
-- フルテキスト検索インデックス（ゴルフ商品用）
-- ================================================
ALTER TABLE golf_product_specifications
ADD FULLTEXT INDEX ft_golf_search (brand, model, shaft_name, condition_detail);

-- ================================================
-- パフォーマンス最適化インデックス
-- ================================================
ALTER TABLE supplier_products
ADD INDEX IF NOT EXISTS idx_platform_category (platform, url_status, purchase_price);

-- ================================================
-- 統計情報更新
-- ================================================
ANALYZE TABLE supplier_products;
ANALYZE TABLE golf_product_specifications;
ANALYZE TABLE platform_configurations;

-- ================================================
-- サンプルデータ（テスト用）
-- ================================================
-- INSERT INTO supplier_products (platform, product_title, purchase_price, source_url) VALUES
-- ('golf_partner', 'テーラーメイド SIM2 ドライバー 10.5° S', 35000, 'https://www.golfpartner.jp/shop/used/test1'),
-- ('golf_kids', 'キャロウェイ EPIC SPEED アイアン 5-PW R', 45000, 'https://shop.golfkids.co.jp/products/test1');

-- ================================================
-- 完了メッセージ
-- ================================================
SELECT 'ゴルフサイト群マイグレーション完了' as status,
       COUNT(*) as new_platforms_count
FROM platform_configurations
WHERE platform IN (
    'mercari_shops', 'golf_kids', 'golf_partner', 'alpen_golf5',
    'golf_effort', 'y_golf_reuse', 'niki_golf', 'reonard',
    'stst_used', 'after_golf', 'golf_kace'
);