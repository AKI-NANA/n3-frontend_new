-- ============================================================================
-- 既存のSKU生成システムを活用した修正
-- ============================================================================
-- 既に存在する関数:
-- - generate_public_sku(id, store_code)
-- - generate_master_key_v3(...)
-- - auto_generate_dual_keys()
-- ============================================================================

-- ============================================================================
-- STEP 1: 現在のトリガー状況を確認
-- ============================================================================
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND (
        event_object_table = 'products_master'
        OR event_object_table = 'products'
        OR trigger_name LIKE '%sku%'
    )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- STEP 2: products_master に auto_generate_dual_keys トリガーを追加
-- ============================================================================

-- 既存のトリガーを削除（もしあれば）
DROP TRIGGER IF EXISTS trigger_auto_generate_dual_keys ON products_master;

-- 新しいトリガーを作成
CREATE TRIGGER trigger_auto_generate_dual_keys
    BEFORE INSERT OR UPDATE ON products_master
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_dual_keys();

COMMENT ON TRIGGER trigger_auto_generate_dual_keys ON products_master IS 
'SKUとmaster_keyを自動生成';

-- ============================================================================
-- STEP 3: 既存データにSKUとmaster_keyを生成
-- ============================================================================

-- SKUがNULLのレコードに生成
UPDATE products_master
SET sku = generate_public_sku(id, 'N')
WHERE sku IS NULL OR sku = '';

-- master_keyがNULLのレコードに生成
UPDATE products_master
SET master_key = generate_master_key_v3(
    id,
    'ST',
    CASE source_system
        WHEN 'yahoo' THEN 'YAH'
        WHEN 'ebay' THEN 'EBY'
        WHEN 'inventory_master' THEN 'INV'
        WHEN 'research' THEN 'RSH'
        ELSE 'GEN'
    END,
    category,
    condition_name,
    'EBY',
    'JP',
    COALESCE(weight_g, 0),
    COALESCE(current_price, 0)::text
)
WHERE master_key IS NULL OR master_key = '';

-- ============================================================================
-- STEP 4: source_system別のプレフィックスでSKU再生成（YAH-502882形式）
-- ============================================================================

-- YAHOOシステム用: YAH-502882 形式
UPDATE products_master
SET sku = 'YAH-' || source_id
WHERE source_system = 'yahoo'
    AND source_id IS NOT NULL;

-- eBayシステム用: EBY-{id} 形式
UPDATE products_master
SET sku = 'EBY-' || source_id
WHERE source_system = 'ebay'
    AND source_id IS NOT NULL;

-- inventory_master用: INV-{id} 形式
UPDATE products_master
SET sku = 'INV-' || source_id
WHERE source_system = 'inventory_master'
    AND source_id IS NOT NULL;

-- products用: PRD-{id} 形式
UPDATE products_master
SET sku = 'PRD-' || source_id
WHERE source_system = 'products'
    AND source_id IS NOT NULL;

-- research用: RSH-{id} 形式
UPDATE products_master
SET sku = 'RSH-' || source_id
WHERE source_system = 'research'
    AND source_id IS NOT NULL;

-- ============================================================================
-- STEP 5: トリガー関数を更新（シンプルなSKU生成ロジックを追加）
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_master_key TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- シンプルなSKU生成: YAH-{source_id}
        v_sku := 'YAH-' || NEW.id::TEXT;
        
        -- マスターキー生成（既存関数を使用）
        v_master_key := generate_master_key_v3(
            NEW.id,
            'ST',
            'YAH',
            NEW.category,
            NEW.condition_name,
            'EBY',
            'JP',
            0,
            COALESCE(NEW.current_price, 0)::text
        );
        
        INSERT INTO products_master (
            sku,
            master_key,
            source_system,
            source_id,
            source_table,
            title,
            description,
            current_price,
            currency,
            category,
            condition_name,
            primary_image_url,
            gallery_images,
            workflow_status,
            approval_status,
            created_at,
            updated_at
        )
        VALUES (
            v_sku,
            v_master_key,
            'yahoo',
            NEW.id::TEXT,
            'yahoo_scraped_products',
            NEW.title,
            NEW.description,
            NEW.current_price,
            'JPY',
            NEW.category,
            NEW.condition_name,
            NEW.image_url,
            NEW.images,
            'scraped',
            'pending',
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (source_system, source_id)
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            current_price = EXCLUDED.current_price,
            category = EXCLUDED.category,
            condition_name = EXCLUDED.condition_name,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            updated_at = EXCLUDED.updated_at;
            
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title,
            description = NEW.description,
            current_price = NEW.current_price,
            category = NEW.category,
            condition_name = NEW.condition_name,
            primary_image_url = NEW.image_url,
            gallery_images = NEW.images,
            updated_at = NEW.updated_at
        WHERE source_system = 'yahoo'
        AND source_id = NEW.id::TEXT;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master
        WHERE source_system = 'yahoo'
        AND source_id = OLD.id::TEXT;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: 他のトリガー関数も同様に更新
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_ebay_inventory_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_source_id TEXT;
BEGIN
    v_source_id := COALESCE(NEW.item_id, NEW.id::TEXT);
    v_sku := 'EBY-' || v_source_id;
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO products_master (
            sku,
            source_system,
            source_id,
            source_table,
            title,
            description,
            current_price,
            listing_status,
            ebay_item_id,
            inventory_quantity,
            workflow_status,
            approval_status,
            created_at,
            updated_at
        )
        VALUES (
            v_sku,
            'ebay',
            v_source_id,
            'ebay_inventory',
            NEW.title,
            NEW.description,
            NEW.price_usd,
            COALESCE(NEW.listing_status, 'listed'),
            NEW.item_id,
            COALESCE(NEW.quantity, 1),
            'listed',
            'approved',
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (source_system, source_id)
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            current_price = EXCLUDED.current_price,
            listing_status = EXCLUDED.listing_status,
            inventory_quantity = EXCLUDED.inventory_quantity,
            updated_at = EXCLUDED.updated_at;
            
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title,
            description = NEW.description,
            current_price = NEW.price_usd,
            listing_status = COALESCE(NEW.listing_status, 'listed'),
            ebay_item_id = NEW.item_id,
            inventory_quantity = COALESCE(NEW.quantity, 1),
            updated_at = NEW.updated_at
        WHERE source_system = 'ebay'
        AND source_id = v_source_id;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master
        WHERE source_system = 'ebay'
        AND source_id = COALESCE(OLD.item_id, OLD.id::TEXT);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: 検証
-- ============================================================================

-- SKU生成状況を確認
SELECT 
    source_system,
    source_table,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(master_key) as with_master_key,
    COUNT(*) - COUNT(sku) as missing_sku
FROM products_master
GROUP BY source_system, source_table
ORDER BY total DESC;

-- SKUサンプル確認
SELECT 
    id,
    sku,
    master_key,
    source_system,
    source_id,
    LEFT(title, 40) as title_preview
FROM products_master
ORDER BY created_at DESC
LIMIT 10;

-- YAH-形式のSKU確認
SELECT 
    sku,
    source_system,
    source_id,
    title
FROM products_master
WHERE source_system = 'yahoo'
LIMIT 5;
