-- ============================================
-- 古いトリガーと関数を完全削除してから再作成
-- ============================================

-- 既存の全トリガーを削除
DROP TRIGGER IF EXISTS trigger_sync_yahoo_to_master ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trigger_sync_inventory_to_master ON inventory_master;
DROP TRIGGER IF EXISTS trigger_sync_ebay_to_master ON ebay_inventory;
DROP TRIGGER IF EXISTS trigger_sync_research_to_master ON research_products_master;
DROP TRIGGER IF EXISTS trigger_sync_mystical_to_master ON mystical_japan_treasures_inventory;

-- 既存の全関数を削除
DROP FUNCTION IF EXISTS sync_yahoo_to_products_master() CASCADE;
DROP FUNCTION IF EXISTS sync_inventory_to_products_master() CASCADE;
DROP FUNCTION IF EXISTS sync_ebay_to_products_master() CASCADE;
DROP FUNCTION IF EXISTS sync_research_to_products_master() CASCADE;
DROP FUNCTION IF EXISTS sync_mystical_to_products_master() CASCADE;

-- 完全削除完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ 既存トリガーと関数を全て削除しました';
END $$;

-- ============================================
-- 新しいトリガーシステムを作成
-- ============================================

-- 1. yahoo_scraped_products
CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system, source_id, sku, title, title_en,
            purchase_price_jpy, primary_image_url, images, image_urls,
            category, condition, scraped_data, approval_status,
            workflow_status, created_at, updated_at
        )
        VALUES (
            'yahoo_scraped',
            COALESCE(NEW.id::text, NEW.item_id),
            NEW.sku, NEW.title, NEW.title_en, NEW.current_price,
            COALESCE(NEW.image_url, 
                CASE WHEN NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 
                THEN NEW.images->0->>'url' ELSE NULL END),
            NEW.images,
            CASE WHEN NEW.image_url IS NOT NULL THEN jsonb_build_array(NEW.image_url) ELSE '[]'::jsonb END,
            NEW.category, NEW.condition,
            jsonb_strip_nulls(jsonb_build_object('item_id', NEW.item_id, 'url', NEW.url)),
            COALESCE(NEW.approval_status, 'pending'), 'scraped',
            COALESCE(NEW.created_at, NOW()), NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title, title_en = NEW.title_en,
            purchase_price_jpy = NEW.current_price,
            approval_status = COALESCE(NEW.approval_status, 'pending'),
            updated_at = NOW(), synced_at = NOW()
        WHERE source_system = 'yahoo_scraped' AND source_id = COALESCE(NEW.id::text, NEW.item_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped' AND source_id = COALESCE(OLD.id::text, OLD.item_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_yahoo_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW EXECUTE FUNCTION sync_yahoo_to_products_master();

-- 2. inventory_master
CREATE OR REPLACE FUNCTION sync_inventory_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system, source_id, sku, title, description, category,
            purchase_price_usd, primary_image_url, approval_status,
            workflow_status, created_at, updated_at
        )
        VALUES (
            'inventory', NEW.id::text, NEW.sku,
            COALESCE(NEW.product_name, NEW.name),
            NEW.description, NEW.category,
            COALESCE(NEW.price_usd, NEW.price), NEW.image_url,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.status, 'in_stock'),
            COALESCE(NEW.created_at, NOW()), NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = COALESCE(NEW.product_name, NEW.name),
            description = NEW.description,
            updated_at = NOW(), synced_at = NOW()
        WHERE source_system = 'inventory' AND source_id = NEW.id::text;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master WHERE source_system = 'inventory' AND source_id = OLD.id::text;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_inventory_to_master
    AFTER INSERT OR UPDATE OR DELETE ON inventory_master
    FOR EACH ROW EXECUTE FUNCTION sync_inventory_to_products_master();

-- 3. ebay_inventory
CREATE OR REPLACE FUNCTION sync_ebay_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system, source_id, sku, title, purchase_price_usd,
            primary_image_url, category, approval_status, workflow_status,
            created_at, updated_at
        )
        VALUES (
            'ebay', COALESCE(NEW.id::text, NEW.item_id), NEW.sku, NEW.title,
            COALESCE(NEW.current_price, NEW.buy_it_now_price),
            COALESCE(NEW.primary_picture_url,
                CASE WHEN NEW.picture_urls IS NOT NULL AND jsonb_array_length(NEW.picture_urls) > 0 
                THEN NEW.picture_urls->>0 ELSE NULL END),
            NEW.category_name,
            COALESCE(NEW.listing_status, 'active'), 'listed',
            COALESCE(NEW.created_at, NOW()), NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title, updated_at = NOW(), synced_at = NOW()
        WHERE source_system = 'ebay' AND source_id = COALESCE(NEW.id::text, NEW.item_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master WHERE source_system = 'ebay' AND source_id = COALESCE(OLD.id::text, OLD.item_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_ebay_to_master
    AFTER INSERT OR UPDATE OR DELETE ON ebay_inventory
    FOR EACH ROW EXECUTE FUNCTION sync_ebay_to_products_master();

-- 4. research_products_master  
CREATE OR REPLACE FUNCTION sync_research_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system, source_id, sku, title, title_en, description,
            category, purchase_price_jpy, purchase_price_usd,
            recommended_price_usd, profit_amount_usd, profit_margin_percent,
            final_score, primary_image_url, images, approval_status,
            workflow_status, created_at, updated_at
        )
        VALUES (
            'research', NEW.id::text, NEW.sku, NEW.title, NEW.title_en,
            NEW.description, NEW.category, NEW.purchase_price_jpy,
            NEW.purchase_price_usd, NEW.recommended_price_usd,
            NEW.profit_amount_usd, NEW.profit_margin_percent,
            NEW.final_score, NEW.primary_image_url, NEW.images,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.workflow_status, 'research'),
            COALESCE(NEW.created_at, NOW()), NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title, updated_at = NOW(), synced_at = NOW()
        WHERE source_system = 'research' AND source_id = NEW.id::text;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master WHERE source_system = 'research' AND source_id = OLD.id::text;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_research_to_master
    AFTER INSERT OR UPDATE OR DELETE ON research_products_master
    FOR EACH ROW EXECUTE FUNCTION sync_research_to_products_master();

-- 確認
SELECT 
    event_object_table,
    COUNT(*) as trigger_count,
    string_agg(DISTINCT event_manipulation, ', ' ORDER BY event_manipulation) as events
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'yahoo_scraped_products', 'inventory_master',
    'ebay_inventory', 'research_products_master'
)
GROUP BY event_object_table
ORDER BY event_object_table;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ リアルタイム自動同期完了 (4テーブル)';
    RAISE NOTICE '============================================';
END $$;
