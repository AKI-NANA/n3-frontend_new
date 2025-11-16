-- ============================================================
-- NAGANO-3 v2.0 完全統合データ同期システム - 簡易版
-- inventory_products テーブルなしバージョン
-- Supabase SQL Editorで直接実行可能
-- ============================================================
-- 対応テーブル: products, yahoo_scraped_products のみ
-- ============================================================

-- ============================================================
-- 1. 共通ヘルパー関数: title_en を決定
-- ============================================================
CREATE OR REPLACE FUNCTION get_title_en(
    p_english_title TEXT,
    p_title TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(p_english_title, p_title);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_title_en IS '英語タイトルの優先順位: english_title → title';


-- ============================================================
-- 2. 共通ヘルパー関数: profit計算
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_profit_values(
    p_current_price NUMERIC,
    p_cost_price NUMERIC,
    OUT profit_amount NUMERIC,
    OUT profit_margin NUMERIC
) AS $$
BEGIN
    profit_amount := COALESCE(p_current_price, 0) - COALESCE(p_cost_price, 0);
    
    IF COALESCE(p_current_price, 0) > 0 THEN
        profit_margin := (profit_amount / p_current_price) * 100;
    ELSE
        profit_margin := 0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_profit_values IS '利益金額と利益率を統一的に計算';


-- ============================================================
-- 3. products → products_master 同期トリガー関数
-- ============================================================
CREATE OR REPLACE FUNCTION sync_products_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_title_en TEXT;
    v_profit_amount NUMERIC;
    v_profit_margin NUMERIC;
    v_category TEXT;
    v_condition_name TEXT;
BEGIN
    -- title_en の決定
    v_title_en := get_title_en(NEW.english_title, NEW.title);
    
    -- profit 計算
    SELECT * INTO v_profit_amount, v_profit_margin 
    FROM calculate_profit_values(NEW.price_usd, NEW.cost_price);
    
    -- category/condition の取得
    v_category := COALESCE(NEW.category_name, 'Uncategorized');
    v_condition_name := COALESCE(NEW.condition, 'Unknown');
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO products_master (
            source_system, source_id, title, title_en,
            current_price, cost_price, profit_amount, profit_margin,
            category, condition_name, workflow_status, approval_status,
            listing_status, listing_price, inventory_quantity,
            gallery_images, created_at, updated_at
        ) VALUES (
            'products', NEW.id::TEXT, NEW.title, v_title_en,
            NEW.price_usd, COALESCE(NEW.cost_price, 0), v_profit_amount, v_profit_margin,
            v_category, v_condition_name,
            COALESCE(NEW.status, 'draft'), 'pending',
            CASE WHEN NEW.ready_to_list THEN 'ready' ELSE 'not_listed' END,
            NEW.price_usd, COALESCE(NEW.stock_quantity, 0),
            COALESCE(NEW.images, '[]'::jsonb), NEW.created_at, NEW.updated_at
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE products_master SET
            title = NEW.title,
            title_en = v_title_en,
            current_price = NEW.price_usd,
            cost_price = COALESCE(NEW.cost_price, 0),
            profit_amount = v_profit_amount,
            profit_margin = v_profit_margin,
            category = v_category,
            condition_name = v_condition_name,
            workflow_status = COALESCE(NEW.status, 'draft'),
            listing_status = CASE WHEN NEW.ready_to_list THEN 'ready' ELSE 'not_listed' END,
            listing_price = NEW.price_usd,
            inventory_quantity = COALESCE(NEW.stock_quantity, 0),
            gallery_images = COALESCE(NEW.images, '[]'::jsonb),
            updated_at = NEW.updated_at
        WHERE source_system = 'products' AND source_id = NEW.id::TEXT;
        
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM products_master 
        WHERE source_system = 'products' AND source_id = OLD.id::TEXT;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 4. yahoo_scraped_products → products_master 同期トリガー関数
-- ============================================================
CREATE OR REPLACE FUNCTION sync_yahoo_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_title_en TEXT;
    v_profit_amount NUMERIC;
    v_profit_margin NUMERIC;
    v_category TEXT;
BEGIN
    -- title_en の決定
    v_title_en := get_title_en(NEW.english_title, NEW.title);
    
    -- profit 計算
    SELECT * INTO v_profit_amount, v_profit_margin 
    FROM calculate_profit_values(NEW.price_usd, 0);
    
    -- category の取得
    v_category := COALESCE(NEW.category_name, 'Uncategorized');
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO products_master (
            source_system, source_id, title, title_en,
            current_price, cost_price, profit_amount, profit_margin,
            category, workflow_status, approval_status,
            listing_status, listing_price, inventory_quantity,
            created_at, updated_at
        ) VALUES (
            'yahoo_scraped_products', NEW.id::TEXT, NEW.title, v_title_en,
            NEW.price_usd, 0, v_profit_amount, v_profit_margin,
            v_category, COALESCE(NEW.status, 'scraped'), COALESCE(NEW.approval_status, 'pending'),
            'not_listed', NEW.price_usd, COALESCE(NEW.current_stock, 0),
            NEW.created_at, NEW.updated_at
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE products_master SET
            title = NEW.title,
            title_en = v_title_en,
            current_price = NEW.price_usd,
            profit_amount = v_profit_amount,
            profit_margin = v_profit_margin,
            category = v_category,
            workflow_status = COALESCE(NEW.status, 'scraped'),
            approval_status = COALESCE(NEW.approval_status, 'pending'),
            listing_price = NEW.price_usd,
            inventory_quantity = COALESCE(NEW.current_stock, 0),
            updated_at = NEW.updated_at
        WHERE source_system = 'yahoo_scraped_products' AND source_id = NEW.id::TEXT;
        
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped_products' AND source_id = OLD.id::TEXT;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 5. トリガー作成 (既存を削除してから作成)
-- ============================================================

-- products テーブルのトリガー
DROP TRIGGER IF EXISTS trg_sync_products_to_master ON products;
CREATE TRIGGER trg_sync_products_to_master
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_products_to_master();

-- yahoo_scraped_products テーブルのトリガー
DROP TRIGGER IF EXISTS trg_sync_yahoo_to_master ON yahoo_scraped_products;
CREATE TRIGGER trg_sync_yahoo_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_to_master();


-- ============================================================
-- 6. 逆方向同期: products_master → 各テーブル
-- ============================================================
CREATE OR REPLACE FUNCTION sync_master_to_sources()
RETURNS TRIGGER AS $$
BEGIN
    -- products テーブルへの逆同期
    IF NEW.source_system = 'products' THEN
        UPDATE products SET
            title = NEW.title,
            english_title = NEW.title_en,
            price_usd = NEW.current_price,
            cost_price = NEW.cost_price,
            status = NEW.workflow_status,
            ready_to_list = (NEW.listing_status = 'ready'),
            stock_quantity = NEW.inventory_quantity,
            updated_at = NEW.updated_at
        WHERE id::TEXT = NEW.source_id;
        
    -- yahoo_scraped_products テーブルへの逆同期
    ELSIF NEW.source_system = 'yahoo_scraped_products' THEN
        UPDATE yahoo_scraped_products SET
            title = NEW.title,
            english_title = NEW.title_en,
            price_usd = NEW.current_price,
            status = NEW.workflow_status,
            approval_status = NEW.approval_status,
            current_stock = NEW.inventory_quantity,
            updated_at = NEW.updated_at
        WHERE id::TEXT = NEW.source_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 逆同期トリガー
DROP TRIGGER IF EXISTS trg_sync_master_to_sources ON products_master;
CREATE TRIGGER trg_sync_master_to_sources
    AFTER UPDATE ON products_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_master_to_sources();


-- ============================================================
-- 7. 初回データ移行 (既存データを products_master へ)
-- ============================================================

-- products からの移行
INSERT INTO products_master (
    source_system, source_id, title, title_en,
    current_price, cost_price, profit_amount, profit_margin,
    category, condition_name, workflow_status, approval_status,
    listing_status, listing_price, inventory_quantity,
    gallery_images, created_at, updated_at
)
SELECT 
    'products' AS source_system,
    p.id::TEXT AS source_id,
    p.title,
    COALESCE(p.english_title, p.title) AS title_en,
    p.price_usd AS current_price,
    COALESCE(p.cost_price, 0) AS cost_price,
    (p.price_usd - COALESCE(p.cost_price, 0)) AS profit_amount,
    CASE 
        WHEN p.price_usd > 0 THEN ((p.price_usd - COALESCE(p.cost_price, 0)) / p.price_usd) * 100
        ELSE 0 
    END AS profit_margin,
    COALESCE(p.category_name, 'Uncategorized') AS category,
    COALESCE(p.condition, 'Unknown') AS condition_name,
    COALESCE(p.status, 'draft') AS workflow_status,
    'pending' AS approval_status,
    CASE WHEN p.ready_to_list THEN 'ready' ELSE 'not_listed' END AS listing_status,
    p.price_usd AS listing_price,
    COALESCE(p.stock_quantity, 0) AS inventory_quantity,
    COALESCE(p.images, '[]'::jsonb) AS gallery_images,
    p.created_at,
    p.updated_at
FROM products p
ON CONFLICT (source_system, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    current_price = EXCLUDED.current_price,
    updated_at = EXCLUDED.updated_at;

-- yahoo_scraped_products からの移行
INSERT INTO products_master (
    source_system, source_id, title, title_en,
    current_price, cost_price, profit_amount, profit_margin,
    category, workflow_status, approval_status,
    listing_status, listing_price, inventory_quantity,
    created_at, updated_at
)
SELECT 
    'yahoo_scraped_products' AS source_system,
    y.id::TEXT AS source_id,
    y.title,
    COALESCE(y.english_title, y.title) AS title_en,
    y.price_usd AS current_price,
    0 AS cost_price,
    y.price_usd AS profit_amount,
    100 AS profit_margin,
    COALESCE(y.category_name, 'Uncategorized') AS category,
    COALESCE(y.status, 'scraped') AS workflow_status,
    COALESCE(y.approval_status, 'pending') AS approval_status,
    'not_listed' AS listing_status,
    y.price_usd AS listing_price,
    COALESCE(y.current_stock, 0) AS inventory_quantity,
    y.created_at,
    y.updated_at
FROM yahoo_scraped_products y
ON CONFLICT (source_system, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    current_price = EXCLUDED.current_price,
    updated_at = EXCLUDED.updated_at;


-- ============================================================
-- 8. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '簡易版同期システム設定完了';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✓ ヘルパー関数作成完了';
    RAISE NOTICE '✓ 同期トリガー関数作成完了 (products, yahoo_scraped_products)';
    RAISE NOTICE '✓ トリガー登録完了';
    RAISE NOTICE '✓ 逆方向同期設定完了';
    RAISE NOTICE '✓ 初回データ移行完了';
    RAISE NOTICE '';
    RAISE NOTICE 'inventory_products テーブルは除外されました';
    RAISE NOTICE '====================================';
END $$;
