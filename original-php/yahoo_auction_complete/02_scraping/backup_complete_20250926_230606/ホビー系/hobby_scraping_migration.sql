-- ========================================
-- ホビー系ECサイト統合スクレイピングシステム
-- データベースマイグレーション
-- 既存yahoo_scraped_products拡張版
-- ========================================

-- 1. 既存テーブルにカラム追加（存在しない場合のみ）
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT 'yahoo_auction',
ADD COLUMN IF NOT EXISTS source_item_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS scraped_data JSONB,
ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_monitored_at TIMESTAMP;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_source_platform ON yahoo_scraped_products(source_platform);
CREATE INDEX IF NOT EXISTS idx_source_item ON yahoo_scraped_products(source_platform, source_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_status ON yahoo_scraped_products(stock_status);
CREATE INDEX IF NOT EXISTS idx_monitoring ON yahoo_scraped_products(monitoring_enabled, last_monitored_at);

-- ユニーク制約追加（重複防止）
ALTER TABLE yahoo_scraped_products 
ADD CONSTRAINT unique_platform_item UNIQUE (source_platform, source_item_id);

-- 2. 価格変動履歴テーブル
CREATE TABLE IF NOT EXISTS price_change_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    change_amount DECIMAL(10,2),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_product_date ON price_change_history(product_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_change_percent ON price_change_history(change_percent);

-- 3. 在庫変動履歴テーブル
CREATE TABLE IF NOT EXISTS stock_change_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_quantity INTEGER,
    new_quantity INTEGER,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_product_date ON stock_change_history(product_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_status_change ON stock_change_history(old_status, new_status);

-- 4. プラットフォーム管理テーブル
CREATE TABLE IF NOT EXISTS scraping_platforms (
    id SERIAL PRIMARY KEY,
    platform_code VARCHAR(50) UNIQUE NOT NULL,
    platform_name VARCHAR(100) NOT NULL,
    platform_type VARCHAR(20) NOT NULL, -- 'marketplace', 'ec_site', 'official_store', 'hobby_shop'
    base_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    scraping_config JSONB,
    total_products INTEGER DEFAULT 0,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- プラットフォームデータ初期投入
INSERT INTO scraping_platforms (platform_code, platform_name, platform_type, base_url) VALUES
('yahoo_auction', 'Yahoo オークション', 'marketplace', 'https://auctions.yahoo.co.jp'),
('mercari', 'メルカリ', 'marketplace', 'https://jp.mercari.com'),
('takaratomy', 'タカラトミーモール', 'official_store', 'https://takaratomymall.jp'),
('bandai_hobby', 'バンダイホビーサイト', 'official_store', 'https://bandai-hobby.net'),
('premium_bandai', 'プレミアムバンダイ', 'official_store', 'https://p-bandai.jp'),
('nintendo_store', '任天堂公式ストア', 'official_store', 'https://store-jp.nintendo.com'),
('posthobby', 'ポストホビー', 'hobby_shop', 'https://www.posthobby.com'),
('kyd_store', 'KYDストア', 'hobby_shop', 'https://www.kyd-store.jp'),
('tamiya', 'タミヤ', 'manufacturer', 'https://www.tamiya.com/japan'),
('jumpcs', '集英社コミックストア', 'official_store', 'https://jumpcs.shueisha.co.jp'),
('toho_online', '東宝エンタテインメント', 'official_store', 'https://tohoentertainmentonline.com'),
('sofmap', 'ソフマップ', 'retailer', 'https://a.sofmap.com'),
('hiko7', 'ひこセブン', 'hobby_shop', 'https://www.hiko7.com'),
('toysapiens', 'トイサピエンス', 'hobby_shop', 'https://www.toysapiens.jp'),
('anime_store', 'アニメストア', 'ec_site', 'https://anime-store.jp')
ON CONFLICT (platform_code) DO NOTHING;

-- 5. スクレイピングバッチログテーブル
CREATE TABLE IF NOT EXISTS scraping_batch_logs (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50),
    batch_type VARCHAR(20), -- 'full_scan', 'incremental', 'monitoring'
    urls_count INTEGER,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    new_products_count INTEGER DEFAULT 0,
    updated_products_count INTEGER DEFAULT 0,
    execution_time_seconds INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20), -- 'running', 'success', 'failed', 'partial'
    error_log TEXT,
    
    FOREIGN KEY (platform) REFERENCES scraping_platforms(platform_code)
);

CREATE INDEX IF NOT EXISTS idx_batch_platform_date ON scraping_batch_logs(platform, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_status ON scraping_batch_logs(status, started_at DESC);

-- 6. スクレイピングエラーログテーブル
CREATE TABLE IF NOT EXISTS scraping_errors (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50),
    url TEXT,
    error_type VARCHAR(50), -- 'network', 'parsing', 'validation', 'database'
    error_message TEXT,
    http_status_code INTEGER,
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    FOREIGN KEY (platform) REFERENCES scraping_platforms(platform_code)
);

CREATE INDEX IF NOT EXISTS idx_error_platform ON scraping_errors(platform, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_unresolved ON scraping_errors(resolved, occurred_at DESC);

-- 7. 商品監視設定テーブル
CREATE TABLE IF NOT EXISTS product_monitoring (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    monitoring_type VARCHAR(20), -- 'price', 'stock', 'both'
    price_threshold_percent DECIMAL(5,2) DEFAULT 5.0,
    alert_enabled BOOLEAN DEFAULT true,
    check_interval_minutes INTEGER DEFAULT 60,
    last_checked_at TIMESTAMP,
    alert_email VARCHAR(255),
    alert_webhook_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monitoring_product ON product_monitoring(product_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_active ON product_monitoring(alert_enabled, last_checked_at);

-- 8. ビュー作成（統計・レポート用）

-- プラットフォーム別統計ビュー
CREATE OR REPLACE VIEW platform_statistics AS
SELECT 
    sp.platform_code,
    sp.platform_name,
    sp.platform_type,
    COUNT(ysp.id) as total_products,
    COUNT(CASE WHEN ysp.stock_status = 'in_stock' THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN ysp.stock_status = 'out_of_stock' THEN 1 END) as out_of_stock_count,
    COUNT(CASE WHEN ysp.monitoring_enabled = true THEN 1 END) as monitored_count,
    AVG(ysp.price) as avg_price,
    MAX(ysp.updated_at) as last_updated
FROM scraping_platforms sp
LEFT JOIN yahoo_scraped_products ysp ON sp.platform_code = ysp.source_platform
GROUP BY sp.platform_code, sp.platform_name, sp.platform_type;

-- 最近の価格変動サマリービュー
CREATE OR REPLACE VIEW recent_price_changes AS
SELECT 
    pch.id,
    pch.product_id,
    ysp.title,
    ysp.source_platform,
    pch.old_price,
    pch.new_price,
    pch.change_percent,
    pch.detected_at
FROM price_change_history pch
JOIN yahoo_scraped_products ysp ON pch.product_id = ysp.id
WHERE pch.detected_at >= NOW() - INTERVAL '7 days'
ORDER BY pch.detected_at DESC;

-- 最近の在庫変動サマリービュー
CREATE OR REPLACE VIEW recent_stock_changes AS
SELECT 
    sch.id,
    sch.product_id,
    ysp.title,
    ysp.source_platform,
    sch.old_status,
    sch.new_status,
    sch.old_quantity,
    sch.new_quantity,
    sch.detected_at
FROM stock_change_history sch
JOIN yahoo_scraped_products ysp ON sch.product_id = ysp.id
WHERE sch.detected_at >= NOW() - INTERVAL '7 days'
ORDER BY sch.detected_at DESC;

-- 9. トリガー関数（自動更新）

-- プラットフォーム商品数自動更新トリガー
CREATE OR REPLACE FUNCTION update_platform_product_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE scraping_platforms 
        SET total_products = total_products + 1,
            last_scraped_at = NOW()
        WHERE platform_code = NEW.source_platform;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE scraping_platforms 
        SET total_products = total_products - 1
        WHERE platform_code = OLD.source_platform;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_platform_count
AFTER INSERT OR DELETE ON yahoo_scraped_products
FOR EACH ROW EXECUTE FUNCTION update_platform_product_count();

-- 10. データクレンジング（既存データの修正）

-- 既存Yahoo商品にsource_platform設定
UPDATE yahoo_scraped_products 
SET source_platform = 'yahoo_auction',
    source_item_id = source_item_id
WHERE source_platform IS NULL OR source_platform = '';

-- 11. パフォーマンス最適化

-- VACUUM ANALYZE実行
VACUUM ANALYZE yahoo_scraped_products;
VACUUM ANALYZE price_change_history;
VACUUM ANALYZE stock_change_history;
VACUUM ANALYZE scraping_platforms;

-- ========================================
-- マイグレーション完了確認
-- ========================================

SELECT 
    'yahoo_scraped_products' as table_name, 
    COUNT(*) as record_count 
FROM yahoo_scraped_products
UNION ALL
SELECT 'scraping_platforms', COUNT(*) FROM scraping_platforms
UNION ALL
SELECT 'price_change_history', COUNT(*) FROM price_change_history
UNION ALL
SELECT 'stock_change_history', COUNT(*) FROM stock_change_history;

-- ========================================
-- セットアップ完了メッセージ
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ホビー系ECサイト統合スクレイピングシステム';
    RAISE NOTICE 'データベースマイグレーション完了';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ テーブル拡張完了';
    RAISE NOTICE '✓ インデックス作成完了';
    RAISE NOTICE '✓ ビュー作成完了';
    RAISE NOTICE '✓ トリガー設定完了';
    RAISE NOTICE '✓ プラットフォームデータ投入完了';
    RAISE NOTICE '========================================';
END $$;