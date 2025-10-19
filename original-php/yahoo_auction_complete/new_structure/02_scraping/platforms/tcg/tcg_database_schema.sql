-- ============================================
-- TCG商品統合データベーススキーマ
-- Yahoo Auction統合システム準拠設計
-- 既存在庫管理システム(10_zaiko)完全連携
-- ============================================

-- TCG商品マスタテーブル
CREATE TABLE IF NOT EXISTS tcg_products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    source_url TEXT NOT NULL,
    
    -- カード基本情報
    card_name VARCHAR(255) NOT NULL,
    card_number VARCHAR(50),
    set_name VARCHAR(255),
    rarity VARCHAR(50),
    
    -- 価格・在庫情報
    price DECIMAL(10,2) DEFAULT 0.00,
    stock_status VARCHAR(50) DEFAULT 'unknown',
    condition VARCHAR(50),
    
    -- TCGカテゴリ (MTG, Pokemon, Yugioh, etc)
    tcg_category VARCHAR(50) DEFAULT 'unknown',
    
    -- 商品詳細
    description TEXT,
    image_url TEXT,
    
    -- プラットフォーム固有データ（JSON形式）
    tcg_specific_data JSONB,
    
    -- タイムスタンプ
    scraped_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- ユニーク制約（プラットフォーム別商品ID）
    UNIQUE(product_id, platform)
);

-- インデックス作成
CREATE INDEX idx_tcg_platform ON tcg_products(platform);
CREATE INDEX idx_tcg_category ON tcg_products(tcg_category);
CREATE INDEX idx_tcg_card_name ON tcg_products(card_name);
CREATE INDEX idx_tcg_price ON tcg_products(price);
CREATE INDEX idx_tcg_stock_status ON tcg_products(stock_status);
CREATE INDEX idx_tcg_updated_at ON tcg_products(updated_at);
CREATE INDEX idx_tcg_source_url ON tcg_products(source_url);

-- ============================================
-- TCG価格履歴テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS tcg_price_history (
    id SERIAL PRIMARY KEY,
    tcg_product_id INTEGER REFERENCES tcg_products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    stock_status VARCHAR(50),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_product_time (tcg_product_id, recorded_at)
);

-- 価格履歴インデックス
CREATE INDEX idx_tcg_price_history_product ON tcg_price_history(tcg_product_id);
CREATE INDEX idx_tcg_price_history_time ON tcg_price_history(recorded_at);

-- ============================================
-- 在庫管理システム統合テーブル（既存システム拡張）
-- ============================================
-- 既存のinventory_managementテーブルにTCG対応カラム追加
ALTER TABLE inventory_management 
ADD COLUMN IF NOT EXISTS tcg_product_id INTEGER REFERENCES tcg_products(id),
ADD COLUMN IF NOT EXISTS tcg_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS card_name VARCHAR(255);

-- TCG在庫管理インデックス
CREATE INDEX IF NOT EXISTS idx_inventory_tcg_product ON inventory_management(tcg_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tcg_category ON inventory_management(tcg_category);

-- ============================================
-- TCGプラットフォーム統計ビュー
-- ============================================
CREATE OR REPLACE VIEW tcg_platform_stats AS
SELECT 
    platform,
    tcg_category,
    COUNT(*) as total_products,
    COUNT(CASE WHEN stock_status = 'in_stock' THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN stock_status = 'sold_out' THEN 1 END) as sold_out_count,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    MAX(updated_at) as last_updated
FROM tcg_products
GROUP BY platform, tcg_category;

-- ============================================
-- TCG価格変動検知ビュー
-- ============================================
CREATE OR REPLACE VIEW tcg_price_changes AS
SELECT 
    p.id,
    p.product_id,
    p.platform,
    p.card_name,
    p.price as current_price,
    h.price as previous_price,
    (p.price - h.price) as price_change,
    ROUND(((p.price - h.price) / NULLIF(h.price, 0) * 100), 2) as price_change_percent,
    p.updated_at as current_updated,
    h.recorded_at as previous_recorded
FROM tcg_products p
INNER JOIN LATERAL (
    SELECT price, recorded_at
    FROM tcg_price_history
    WHERE tcg_product_id = p.id
    ORDER BY recorded_at DESC
    LIMIT 1 OFFSET 1
) h ON true
WHERE p.price != h.price;

-- ============================================
-- TCGカード在庫アラートビュー
-- ============================================
CREATE OR REPLACE VIEW tcg_stock_alerts AS
SELECT 
    p.id,
    p.product_id,
    p.platform,
    p.card_name,
    p.price,
    p.stock_status,
    p.updated_at,
    i.monitoring_enabled,
    i.alert_threshold
FROM tcg_products p
INNER JOIN inventory_management i ON p.id = i.tcg_product_id
WHERE 
    i.monitoring_enabled = true
    AND (
        p.stock_status = 'in_stock' 
        OR (p.price <= i.alert_threshold AND p.stock_status != 'sold_out')
    );

-- ============================================
-- プラットフォーム別商品カウント関数
-- ============================================
CREATE OR REPLACE FUNCTION count_tcg_products_by_platform(platform_name VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count
    FROM tcg_products
    WHERE platform = platform_name;
    
    RETURN product_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 価格履歴記録トリガー
-- ============================================
CREATE OR REPLACE FUNCTION record_tcg_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 価格が変更された場合のみ履歴に記録
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO tcg_price_history (tcg_product_id, price, stock_status, recorded_at)
        VALUES (NEW.id, NEW.price, NEW.stock_status, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_tcg_price_history ON tcg_products;
CREATE TRIGGER trigger_tcg_price_history
    AFTER UPDATE ON tcg_products
    FOR EACH ROW
    EXECUTE FUNCTION record_tcg_price_change();

-- ============================================
-- 初期データ投入
-- ============================================

-- プラットフォームマスタ（参考用）
CREATE TABLE IF NOT EXISTS tcg_platforms (
    id SERIAL PRIMARY KEY,
    platform_id VARCHAR(50) UNIQUE NOT NULL,
    platform_name VARCHAR(100) NOT NULL,
    base_url TEXT,
    category VARCHAR(50),
    priority VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期プラットフォームデータ
INSERT INTO tcg_platforms (platform_id, platform_name, base_url, category, priority) VALUES
('singlestar', 'シングルスター', 'https://www.singlestar.jp', 'MTG', 'high'),
('hareruya_mtg', '晴れる屋MTG', 'https://www.hareruyamtg.com', 'MTG', 'high'),
('hareruya2', '晴れる屋2', 'https://www.hareruya2.com', 'Pokemon', 'high'),
('fullahead', 'フルアヘッド', 'https://pokemon-card-fullahead.com', 'Pokemon', 'high'),
('cardrush', 'カードラッシュ', 'https://www.cardrush-pokemon.jp', 'Pokemon', 'high'),
('yuyu_tei', '遊々亭', 'https://yuyu-tei.jp', 'Multi_TCG', 'high'),
('hareruya3', '晴れる屋3', 'https://www.hareruya3.com', 'Multi_TCG', 'medium'),
('furu1', '駿河屋', 'https://www.furu1.online', 'Multi_TCG', 'medium'),
('pokeca_net', 'ポケカネット', 'https://www.pokeca.net', 'Pokemon', 'medium'),
('dorasuta', 'ドラスタ', 'https://dorasuta.jp', 'Multi_TCG', 'medium'),
('snkrdunk', 'SNKRDUNK', 'https://snkrdunk.com', 'Pokemon', 'low')
ON CONFLICT (platform_id) DO NOTHING;

-- ============================================
-- データベースコメント
-- ============================================
COMMENT ON TABLE tcg_products IS 'TCG商品マスタ - 11プラットフォーム対応';
COMMENT ON TABLE tcg_price_history IS 'TCG価格履歴 - 価格変動追跡';
COMMENT ON TABLE tcg_platforms IS 'TCGプラットフォーム定義';
COMMENT ON VIEW tcg_platform_stats IS 'プラットフォーム別統計';
COMMENT ON VIEW tcg_price_changes IS '価格変動検知';
COMMENT ON VIEW tcg_stock_alerts IS '在庫アラート';

-- ============================================
-- パフォーマンス最適化設定
-- ============================================

-- 統計情報更新
ANALYZE tcg_products;
ANALYZE tcg_price_history;

-- バキューム設定
ALTER TABLE tcg_products SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE tcg_price_history SET (autovacuum_vacuum_scale_factor = 0.1);

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'TCG商品データベーススキーマ作成完了' AS status;