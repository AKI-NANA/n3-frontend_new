-- =========================================
-- products_master 統合マスターテーブル設定
-- =========================================

-- 1. products_master テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS products_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本情報
    sku TEXT,
    title TEXT,
    title_en TEXT,
    description TEXT,
    
    -- 価格情報
    purchase_price_jpy NUMERIC(10,2),
    recommended_price_usd NUMERIC(10,2),
    profit_amount_usd NUMERIC(10,2),
    profit_margin_percent NUMERIC(5,2),
    
    -- 利益情報（最安出品時）
    lowest_price_profit_usd NUMERIC(10,2),
    lowest_price_profit_margin NUMERIC(5,2),
    
    -- スコア
    final_score INTEGER,
    category_score INTEGER,
    competition_score INTEGER,
    profit_score INTEGER,
    
    -- 商品情報
    condition TEXT,
    category TEXT,
    source TEXT,
    source_system TEXT, -- 'products', 'yahoo_scraped', 'inventory', 'ebay', 'research'
    source_table TEXT,  -- 元テーブル名
    source_id TEXT,     -- 元テーブルのID
    
    -- 画像
    images JSONB,
    image_urls TEXT[],
    primary_image_url TEXT,
    
    -- JSONBデータ（拡張情報）
    listing_data JSONB,
    scraped_data JSONB,
    ebay_api_data JSONB,
    
    -- ステータス
    approval_status TEXT DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    target_marketplaces TEXT[],
    listing_priority TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ユニーク制約（source_system + source_id の組み合わせ）
    UNIQUE(source_system, source_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_master_source ON products_master(source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_products_master_approval ON products_master(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_master_updated ON products_master(updated_at DESC);

-- 2. 既存の products データを products_master にコピー
INSERT INTO products_master (
    id, sku, title, title_en, description,
    purchase_price_jpy, recommended_price_usd,
    profit_amount_usd, profit_margin_percent,
    lowest_price_profit_usd, lowest_price_profit_margin,
    final_score, category_score, competition_score, profit_score,
    condition, category, source,
    source_system, source_table, source_id,
    images, image_urls, primary_image_url,
    listing_data, scraped_data, ebay_api_data,
    approval_status, approved_at,
    target_marketplaces, listing_priority,
    created_at, updated_at
)
SELECT 
    id, sku, title, title_en, description,
    purchase_price_jpy, recommended_price_usd,
    profit_amount_usd, profit_margin_percent,
    lowest_price_profit_usd, lowest_price_profit_margin,
    final_score, category_score, competition_score, profit_score,
    condition, category, source,
    'products' as source_system,
    'products' as source_table,
    id::text as source_id,
    images, image_urls, primary_image_url,
    listing_data, scraped_data, ebay_api_data,
    approval_status, approved_at,
    target_marketplaces, listing_priority,
    created_at, updated_at
FROM products
ON CONFLICT (source_system, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = NOW();

-- 3. リアルタイム同期トリガー関数を作成
CREATE OR REPLACE FUNCTION sync_products_to_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'products' AND source_id = OLD.id::text;
        RETURN OLD;
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        INSERT INTO products_master (
            id, sku, title, title_en, description,
            purchase_price_jpy, recommended_price_usd,
            profit_amount_usd, profit_margin_percent,
            final_score, condition, category, source,
            source_system, source_table, source_id,
            images, listing_data, approval_status,
            created_at, updated_at
        ) VALUES (
            NEW.id, NEW.sku, NEW.title, NEW.title_en, NEW.description,
            NEW.purchase_price_jpy, NEW.recommended_price_usd,
            NEW.profit_amount_usd, NEW.profit_margin_percent,
            NEW.final_score, NEW.condition, NEW.category, NEW.source,
            'products', 'products', NEW.id::text,
            NEW.images, NEW.listing_data, NEW.approval_status,
            NEW.created_at, NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            recommended_price_usd = EXCLUDED.recommended_price_usd,
            profit_amount_usd = EXCLUDED.profit_amount_usd,
            approval_status = EXCLUDED.approval_status,
            updated_at = NOW();
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. トリガーを作成
DROP TRIGGER IF EXISTS trigger_sync_products_to_master ON products;
CREATE TRIGGER trigger_sync_products_to_master
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_products_to_master();
