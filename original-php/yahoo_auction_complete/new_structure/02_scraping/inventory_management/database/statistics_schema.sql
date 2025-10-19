-- 価格変動統計拡張テーブル

-- auto_price_update_history に統計カラム追加
ALTER TABLE auto_price_update_history 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'ebay',
ADD COLUMN IF NOT EXISTS change_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_price_jpy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_price_jpy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_price_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_price_usd DECIMAL(10,2);

-- 価格変動統計サマリーテーブル
CREATE TABLE IF NOT EXISTS price_change_statistics (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES yahoo_scraped_products(id),
    platform VARCHAR(50) DEFAULT 'ebay',
    total_changes INTEGER DEFAULT 0,
    max_price_jpy DECIMAL(10,2),
    min_price_jpy DECIMAL(10,2),
    max_price_usd DECIMAL(10,2),
    min_price_usd DECIMAL(10,2),
    current_price_jpy DECIMAL(10,2),
    current_price_usd DECIMAL(10,2),
    last_change_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_price_stats_product ON price_change_statistics(product_id);
CREATE INDEX IF NOT EXISTS idx_price_stats_platform ON price_change_statistics(platform);

-- モール別同期統計テーブル
CREATE TABLE IF NOT EXISTS platform_sync_statistics (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    sync_date DATE NOT NULL,
    total_products INTEGER DEFAULT 0,
    synced_products INTEGER DEFAULT 0,
    failed_products INTEGER DEFAULT 0,
    pending_products INTEGER DEFAULT 0,
    price_changes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, sync_date)
);

CREATE INDEX IF NOT EXISTS idx_platform_stats_date ON platform_sync_statistics(platform, sync_date);

COMMENT ON TABLE price_change_statistics IS '商品別価格変動統計';
COMMENT ON TABLE platform_sync_statistics IS 'モール別同期統計';

-- 統計更新関数
CREATE OR REPLACE FUNCTION update_price_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO price_change_statistics (
        product_id, platform, total_changes, 
        max_price_jpy, min_price_jpy, 
        max_price_usd, min_price_usd,
        current_price_jpy, current_price_usd,
        last_change_at, updated_at
    ) VALUES (
        NEW.product_id, 
        COALESCE(NEW.platform, 'ebay'),
        1,
        NEW.new_price_jpy,
        NEW.new_price_jpy,
        NEW.new_price_usd,
        NEW.new_price_usd,
        NEW.new_price_jpy,
        NEW.new_price_usd,
        NOW(),
        NOW()
    )
    ON CONFLICT (product_id, platform) DO UPDATE SET
        total_changes = price_change_statistics.total_changes + 1,
        max_price_jpy = GREATEST(price_change_statistics.max_price_jpy, NEW.new_price_jpy),
        min_price_jpy = LEAST(price_change_statistics.min_price_jpy, NEW.new_price_jpy),
        max_price_usd = GREATEST(price_change_statistics.max_price_usd, NEW.new_price_usd),
        min_price_usd = LEAST(price_change_statistics.min_price_usd, NEW.new_price_usd),
        current_price_jpy = NEW.new_price_jpy,
        current_price_usd = NEW.new_price_usd,
        last_change_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS update_price_stats_trigger ON auto_price_update_history;
CREATE TRIGGER update_price_stats_trigger
    AFTER INSERT ON auto_price_update_history
    FOR EACH ROW
    EXECUTE FUNCTION update_price_statistics();

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ 価格変動統計テーブル作成完了';
END $$;
