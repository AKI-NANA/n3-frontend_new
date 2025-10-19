-- 在庫管理システム 自動価格更新機能用テーブル

-- 1. 自動価格更新履歴テーブル
CREATE TABLE IF NOT EXISTS auto_price_update_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    old_price_jpy DECIMAL(10,2) NOT NULL,
    new_price_jpy DECIMAL(10,2) NOT NULL,
    new_price_usd DECIMAL(10,2) NOT NULL,
    ebay_item_id VARCHAR(50),
    calculation_details JSONB,
    update_source VARCHAR(50) DEFAULT 'auto_inventory_check',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE auto_price_update_history IS '自動価格更新履歴';
COMMENT ON COLUMN auto_price_update_history.calculation_details IS '利益計算の詳細情報';

CREATE INDEX IF NOT EXISTS idx_auto_price_product_created ON auto_price_update_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_price_ebay_item ON auto_price_update_history(ebay_item_id);

-- 2. listing_platforms テーブル作成（存在しない場合）
CREATE TABLE IF NOT EXISTS listing_platforms (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    platform_product_id VARCHAR(100),
    listing_url TEXT,
    listing_status VARCHAR(50) DEFAULT 'active',
    current_quantity INTEGER DEFAULT 1,
    listed_price DECIMAL(10,2),
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_status VARCHAR(20) DEFAULT 'pending',
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE listing_platforms IS '出品先プラットフォーム管理';
COMMENT ON COLUMN listing_platforms.sync_status IS 'synced, sync_failed, pending';
COMMENT ON COLUMN listing_platforms.last_sync_at IS '最終同期日時';

CREATE INDEX IF NOT EXISTS idx_listing_product ON listing_platforms(product_id);
CREATE INDEX IF NOT EXISTS idx_listing_platform ON listing_platforms(platform);
CREATE INDEX IF NOT EXISTS idx_listing_sync_status ON listing_platforms(sync_status, last_sync_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_unique ON listing_platforms(product_id, platform);

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ 自動価格更新システム用テーブル作成完了';
END $$;
