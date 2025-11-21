-- ===================================================
-- SEOマネージャー用テーブル作成マイグレーション
-- Phase 7: eBay SEO/リスティング健全性マネージャー V1.0
-- ===================================================

-- 1. marketplace_listings テーブル（存在しない場合のみ作成）
-- マーケットプレイス（eBay, Amazon, Shopee等）へのリスティング情報を格納

CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    category VARCHAR(255),
    marketplace VARCHAR(50) NOT NULL DEFAULT 'ebay',
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, ended, paused

    -- リスティング詳細
    listing_url TEXT,
    price_usd DECIMAL(10, 2),
    quantity_available INTEGER DEFAULT 0,

    -- SEO健全性指標
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    watch_count INTEGER DEFAULT 0,

    -- 日付
    listed_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    last_view_at TIMESTAMP WITH TIME ZONE,
    last_sale_at TIMESTAMP WITH TIME ZONE,

    -- フラグ
    needs_price_revision BOOLEAN DEFAULT FALSE,
    revision_requested_at TIMESTAMP WITH TIME ZONE,

    -- 標準タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- インデックス用制約
    CONSTRAINT marketplace_listings_sku_marketplace_unique UNIQUE (sku, marketplace)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_marketplace ON marketplace_listings(marketplace);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_listed_at ON marketplace_listings(listed_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_views_count ON marketplace_listings(views_count);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_sales_count ON marketplace_listings(sales_count);

-- 2. seo_manager_actions テーブル
-- SEOマネージャーで実行されたアクションの履歴を記録

CREATE TABLE IF NOT EXISTS seo_manager_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

    -- アクション詳細
    action_type VARCHAR(50) NOT NULL, -- end_listing, price_revision, promotion
    reason TEXT,
    previous_value JSONB,
    new_value JSONB,

    -- 実行情報
    executed_by VARCHAR(255), -- ユーザーID or システム名
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 結果
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- 標準タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_seo_manager_actions_listing_id ON seo_manager_actions(listing_id);
CREATE INDEX IF NOT EXISTS idx_seo_manager_actions_action_type ON seo_manager_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_seo_manager_actions_executed_at ON seo_manager_actions(executed_at);

-- 3. トリガー関数：updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at
    BEFORE UPDATE ON marketplace_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. サンプルデータ挿入（開発環境用）
-- 実際の環境では、既存のリスティングデータをインポートする

INSERT INTO marketplace_listings (
    sku, title, category, marketplace, status,
    price_usd, views_count, sales_count, listed_at
) VALUES
    ('TEST-001', '人気商品 - ワイヤレスイヤホン', '電子機器', 'ebay', 'active', 29.99, 1500, 50, NOW() - INTERVAL '30 days'),
    ('TEST-002', '中堅商品 - 限定スニーカー', 'ファッション', 'ebay', 'active', 89.99, 800, 5, NOW() - INTERVAL '60 days'),
    ('TEST-003', '要注意 - アニメフィギュア A', 'ホビー', 'ebay', 'active', 49.99, 100, 0, NOW() - INTERVAL '120 days'),
    ('TEST-004', '死に筋 - ポスター B', 'アート', 'ebay', 'active', 19.99, 10, 0, NOW() - INTERVAL '200 days'),
    ('TEST-005', '潜在力あり - ドローン部品', '電子機器', 'ebay', 'active', 39.99, 500, 0, NOW() - INTERVAL '45 days'),
    ('TEST-006', '安定商品 - Tシャツ X', 'ファッション', 'ebay', 'active', 24.99, 600, 15, NOW() - INTERVAL '90 days')
ON CONFLICT (sku, marketplace) DO NOTHING;

-- ===================================================
-- マイグレーション完了
-- ===================================================
