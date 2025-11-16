-- ============================================
-- 完全版リアルタイム自動同期システム（修正版）
-- ============================================
-- 実際に存在する4テーブルのみ対応
-- INSERT/UPDATE/DELETE 全対応
-- ============================================

-- ============================================
-- 1. yahoo_scraped_products 完全同期
-- ============================================

CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT時
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system,
            source_id,
            sku,
            title,
            title_en,
            purchase_price_jpy,
            primary_image_url,
            images,
            image_urls,
            category,
            condition,
            scraped_data,
            approval_status,
            workflow_status,
            created_at,
            updated_at
        )
        VALUES (
            'yahoo_scraped',
            COALESCE(NEW.id::text, NEW.item_id),
            NEW.sku,
            NEW.title,
            NEW.title_en,
            NEW.current_price,
            COALESCE(
                NEW.image_url,
                CASE WHEN NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 
                     THEN NEW.images->0->>'url' 
                     ELSE NULL END
            ),
            NEW.images,
            CASE 
                WHEN NEW.image_url IS NOT NULL THEN jsonb_build_array(NEW.image_url)
                ELSE '[]'::jsonb
            END,
            NEW.category,
            NEW.condition,
            jsonb_strip_nulls(jsonb_build_object(
                'item_id', NEW.item_id,
                'url', NEW.url,
                'seller_id', NEW.seller_id,
                'bid_count', NEW.bid_count,
                'end_date', NEW.end_date
            )),
            COALESCE(NEW.approval_status, 'pending'),
            'scraped',
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    END IF;
    
    -- UPDATE時
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title,
            title_en = NEW.title_en,
            purchase_price_jpy = NEW.current_price,
            primary_image_url = COALESCE(
                NEW.image_url,
                CASE WHEN NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 
                     THEN NEW.images->0->>'url' 
                     ELSE NULL END
            ),
            images = NEW.images,
            category = NEW.category,
            condition = NEW.condition,
            approval_status = COALESCE(NEW.approval_status, 'pending'),
            scraped_data = jsonb_strip_nulls(jsonb_build_object(
                'item_id', NEW.item_id,
                'url', NEW.url,
                'seller_id', NEW.seller_id,
                'bid_count', NEW.bid_count,
                'end_date', NEW.end_date
            )),
            updated_at = NOW(),
            synced_at = NOW()
        WHERE source_system = 'yahoo_scraped' 
        AND source_id = COALESCE(NEW.id::text, NEW.item_id);
        RETURN NEW;
    END IF;
    
    -- DELETE時
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped' 
        AND source_id = COALESCE(OLD.id::text, OLD.item_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 既存トリガーを削除して再作成
DROP TRIGGER IF EXISTS trigger_sync_yahoo_to_master ON yahoo_scraped_products;
CREATE TRIGGER trigger_sync_yahoo_to_master
    AFTER INSERT OR UPDATE OR DELETE
    ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_to_products_master();

-- ============================================
-- 2. inventory_master 完全同期
-- ============================================

CREATE OR REPLACE FUNCTION sync_inventory_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system,
            source_id,
            sku,
            title,
            description,
            category,
            purchase_price_usd,
            primary_image_url,
            approval_status,
            workflow_status,
            created_at,
            updated_at
        )
        VALUES (
            'inventory',
            NEW.id::text,
            NEW.sku,
            COALESCE(NEW.product_name, NEW.name),
            NEW.description,
            NEW.category,
            COALESCE(NEW.price_usd, NEW.price),
            NEW.image_url,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.status, 'in_stock'),
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = COALESCE(NEW.product_name, NEW.name),
            description = NEW.description,
            category = NEW.category,
            purchase_price_usd = COALESCE(NEW.price_usd, NEW.price),
            primary_image_url = NEW.image_url,
            approval_status = COALESCE(NEW.approval_status, 'pending'),
            workflow_status = COALESCE(NEW.status, 'in_stock'),
            updated_at = NOW(),
            synced_at = NOW()
        WHERE source_system = 'inventory' 
        AND source_id = NEW.id::text;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'inventory' 
        AND source_id = OLD.id::text;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_inventory_to_master ON inventory_master;
CREATE TRIGGER trigger_sync_inventory_to_master
    AFTER INSERT OR UPDATE OR DELETE
    ON inventory_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_inventory_to_products_master();

-- ============================================
-- 3. ebay_inventory 完全同期
-- ============================================

CREATE OR REPLACE FUNCTION sync_ebay_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system,
            source_id,
            sku,
            title,
            purchase_price_usd,
            primary_image_url,
            category,
            ebay_api_data,
            approval_status,
            workflow_status,
            created_at,
            updated_at
        )
        VALUES (
            'ebay',
            COALESCE(NEW.id::text, NEW.item_id),
            NEW.sku,
            NEW.title,
            COALESCE(NEW.current_price, NEW.buy_it_now_price),
            COALESCE(
                NEW.primary_picture_url,
                CASE WHEN NEW.picture_urls IS NOT NULL AND jsonb_array_length(NEW.picture_urls) > 0 
                     THEN NEW.picture_urls->>0 
                     ELSE NULL END
            ),
            NEW.category_name,
            jsonb_build_object(
                'item_id', NEW.item_id,
                'listing_type', NEW.listing_type,
                'listing_status', NEW.listing_status,
                'seller_info', NEW.seller_info
            ),
            COALESCE(NEW.listing_status, 'active'),
            'listed',
            COALESCE(NEW.created_at, NEW.updated_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title,
            purchase_price_usd = COALESCE(NEW.current_price, NEW.buy_it_now_price),
            primary_image_url = COALESCE(
                NEW.primary_picture_url,
                CASE WHEN NEW.picture_urls IS NOT NULL AND jsonb_array_length(NEW.picture_urls) > 0 
                     THEN NEW.picture_urls->>0 
                     ELSE NULL END
            ),
            category = NEW.category_name,
            ebay_api_data = jsonb_build_object(
                'item_id', NEW.item_id,
                'listing_type', NEW.listing_type,
                'listing_status', NEW.listing_status,
                'seller_info', NEW.seller_info
            ),
            approval_status = COALESCE(NEW.listing_status, 'active'),
            updated_at = NOW(),
            synced_at = NOW()
        WHERE source_system = 'ebay' 
        AND source_id = COALESCE(NEW.id::text, NEW.item_id);
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'ebay' 
        AND source_id = COALESCE(OLD.id::text, OLD.item_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_ebay_to_master ON ebay_inventory;
CREATE TRIGGER trigger_sync_ebay_to_master
    AFTER INSERT OR UPDATE OR DELETE
    ON ebay_inventory
    FOR EACH ROW
    EXECUTE FUNCTION sync_ebay_to_products_master();

-- ============================================
-- 4. research_products_master 完全同期
-- ============================================

CREATE OR REPLACE FUNCTION sync_research_to_products_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            source_system,
            source_id,
            sku,
            title,
            title_en,
            description,
            category,
            purchase_price_jpy,
            purchase_price_usd,
            recommended_price_usd,
            profit_amount_usd,
            profit_margin_percent,
            final_score,
            primary_image_url,
            images,
            approval_status,
            workflow_status,
            created_at,
            updated_at
        )
        VALUES (
            'research',
            NEW.id::text,
            NEW.sku,
            NEW.title,
            NEW.title_en,
            NEW.description,
            NEW.category,
            NEW.purchase_price_jpy,
            NEW.purchase_price_usd,
            NEW.recommended_price_usd,
            NEW.profit_amount_usd,
            NEW.profit_margin_percent,
            NEW.final_score,
            NEW.primary_image_url,
            NEW.images,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.workflow_status, 'research'),
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO NOTHING;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title,
            title_en = NEW.title_en,
            description = NEW.description,
            category = NEW.category,
            purchase_price_jpy = NEW.purchase_price_jpy,
            purchase_price_usd = NEW.purchase_price_usd,
            recommended_price_usd = NEW.recommended_price_usd,
            profit_amount_usd = NEW.profit_amount_usd,
            profit_margin_percent = NEW.profit_margin_percent,
            final_score = NEW.final_score,
            primary_image_url = NEW.primary_image_url,
            images = NEW.images,
            approval_status = COALESCE(NEW.approval_status, 'pending'),
            workflow_status = COALESCE(NEW.workflow_status, 'research'),
            updated_at = NOW(),
            synced_at = NOW()
        WHERE source_system = 'research' 
        AND source_id = NEW.id::text;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'research' 
        AND source_id = OLD.id::text;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_research_to_master ON research_products_master;
CREATE TRIGGER trigger_sync_research_to_master
    AFTER INSERT OR UPDATE OR DELETE
    ON research_products_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_research_to_products_master();

-- ============================================
-- 5. 動作確認
-- ============================================

-- トリガー確認クエリ
SELECT 
    event_object_table,
    COUNT(*) as trigger_count,
    string_agg(DISTINCT event_manipulation, ', ' ORDER BY event_manipulation) as events
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'yahoo_scraped_products',
    'inventory_master',
    'ebay_inventory',
    'research_products_master'
)
GROUP BY event_object_table
ORDER BY event_object_table;

-- 各テーブルのレコード数確認
SELECT 
    'yahoo_scraped_products' as source_table,
    COUNT(*) as record_count
FROM yahoo_scraped_products
UNION ALL
SELECT 
    'inventory_master',
    COUNT(*)
FROM inventory_master
UNION ALL
SELECT 
    'ebay_inventory',
    COUNT(*)
FROM ebay_inventory
UNION ALL
SELECT 
    'research_products_master',
    COUNT(*)
FROM research_products_master
UNION ALL
SELECT 
    'products_master (統合)',
    COUNT(*)
FROM products_master
ORDER BY source_table;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ リアルタイム自動同期システム構築完了';
    RAISE NOTICE '============================================';
    RAISE NOTICE '対象テーブル (4テーブル):';
    RAISE NOTICE '  - yahoo_scraped_products';
    RAISE NOTICE '  - inventory_master';
    RAISE NOTICE '  - ebay_inventory';
    RAISE NOTICE '  - research_products_master';
    RAISE NOTICE '';
    RAISE NOTICE '同期タイミング: INSERT/UPDATE/DELETE 即座';
    RAISE NOTICE '同期先: products_master (統合マスターテーブル)';
    RAISE NOTICE '============================================';
END $$;
