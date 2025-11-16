-- ============================================================================
-- NAGANO-3 SKU自動生成とトリガー修正
-- ============================================================================
-- 目的: すべてのソーステーブルからproducts_masterへのデータ同期時に
--       SKUを自動生成し、マスターキーとして機能させる
-- ============================================================================

-- ============================================================================
-- STEP 1: SKU生成関数を作成
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_sku(
    p_source_system TEXT,
    p_source_id TEXT,
    p_title TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_sku TEXT;
    v_counter INTEGER;
BEGIN
    -- ソースシステムごとのプレフィックス
    CASE p_source_system
        WHEN 'yahoo' THEN v_prefix := 'YAH';
        WHEN 'ebay' THEN v_prefix := 'EBY';
        WHEN 'inventory_master' THEN v_prefix := 'INV';
        WHEN 'products' THEN v_prefix := 'PRD';
        WHEN 'research' THEN v_prefix := 'RSH';
        ELSE v_prefix := 'GEN';
    END CASE;
    
    -- SKU生成: PREFIX-SOURCE_ID
    -- 例: YAH-502882, EBY-12345, INV-001
    v_sku := v_prefix || '-' || p_source_id;
    
    -- 既に存在する場合はサフィックスを追加
    v_counter := 0;
    WHILE EXISTS (SELECT 1 FROM products_master WHERE sku = v_sku) LOOP
        v_counter := v_counter + 1;
        v_sku := v_prefix || '-' || p_source_id || '-' || v_counter;
    END LOOP;
    
    RETURN v_sku;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_sku IS 'ソースシステムとIDからユニークなSKUを生成';

-- ============================================================================
-- STEP 2: 既存のトリガー関数を修正（SKU含む）
-- ============================================================================

-- -------------------------
-- Yahoo → products_master
-- -------------------------
CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- SKU生成
        v_sku := generate_sku('yahoo', NEW.id::TEXT, NEW.title);
        
        INSERT INTO products_master (
            sku,                          -- ✅ SKU追加
            source_system, 
            source_id, 
            source_table,                 -- ✅ 追加
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
            v_sku,                        -- ✅ SKU
            'yahoo',
            NEW.id::TEXT,
            'yahoo_scraped_products',     -- ✅ ソーステーブル名
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

-- -------------------------
-- eBay → products_master
-- -------------------------
CREATE OR REPLACE FUNCTION sync_ebay_inventory_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_source_id TEXT;
BEGIN
    v_source_id := COALESCE(NEW.item_id, NEW.id::TEXT);
    
    IF (TG_OP = 'INSERT') THEN
        v_sku := generate_sku('ebay', v_source_id, NEW.title);
        
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

-- -------------------------
-- inventory_master → products_master
-- -------------------------
CREATE OR REPLACE FUNCTION sync_inventory_master_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_source_id TEXT;
BEGIN
    v_source_id := COALESCE(NEW.unique_id, NEW.id::TEXT);
    
    IF (TG_OP = 'INSERT') THEN
        v_sku := generate_sku('inventory_master', v_source_id, NEW.product_name);
        
        INSERT INTO products_master (
            sku,
            source_system, 
            source_id,
            source_table,
            title, 
            description,
            current_price, 
            suggested_price, 
            cost_price,
            category, 
            condition_name,
            inventory_quantity, 
            primary_image_url, 
            gallery_images,
            workflow_status, 
            approval_status,
            created_at, 
            updated_at
        )
        VALUES (
            v_sku,
            'inventory_master',
            v_source_id,
            'inventory_master',
            NEW.product_name,
            NEW.notes,
            NEW.selling_price,
            NEW.selling_price,
            NEW.cost_price,
            NEW.category,
            NEW.condition_name,
            COALESCE(NEW.physical_quantity, NEW.listing_quantity, 1),
            CASE 
                WHEN NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 
                THEN NEW.images->0->>'url'
                ELSE NULL
            END,
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
            cost_price = EXCLUDED.cost_price,
            inventory_quantity = EXCLUDED.inventory_quantity,
            updated_at = EXCLUDED.updated_at;
            
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.product_name,
            description = NEW.notes,
            current_price = NEW.selling_price,
            suggested_price = NEW.selling_price,
            cost_price = NEW.cost_price,
            category = NEW.category,
            condition_name = NEW.condition_name,
            inventory_quantity = COALESCE(NEW.physical_quantity, NEW.listing_quantity, 1),
            primary_image_url = CASE 
                WHEN NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 
                THEN NEW.images->0->>'url'
                ELSE NULL
            END,
            gallery_images = NEW.images,
            updated_at = NEW.updated_at
        WHERE source_system = 'inventory_master' 
        AND source_id = v_source_id;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'inventory_master' 
        AND source_id = COALESCE(OLD.unique_id, OLD.id::TEXT);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- -------------------------
-- products → products_master
-- -------------------------
CREATE OR REPLACE FUNCTION sync_products_to_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'products' AND source_id = OLD.id::TEXT;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- productsテーブルからのSKUを優先使用
        v_sku := COALESCE(NEW.sku, generate_sku('products', NEW.id::TEXT, NEW.title));
        
        INSERT INTO products_master (
            sku,
            source_system,
            source_id,
            source_table,
            title,
            description,
            current_price,
            cost_price,
            profit_amount,
            profit_margin,
            primary_image_url,
            gallery_images,
            category,
            condition_name,
            workflow_status,
            approval_status,
            ai_confidence_score,
            listing_price,
            created_at,
            updated_at
        ) VALUES (
            v_sku,
            'products',
            NEW.id::TEXT,
            'products',
            NEW.title,
            NEW.html_description,
            COALESCE(NEW.price_usd, NEW.ddu_price_usd, 0),
            COALESCE(NEW.cost_price, NEW.acquired_price_jpy / 150.0, 0),
            COALESCE(NEW.profit_amount_usd, NEW.profit_amount, 0),
            COALESCE(NEW.profit_margin, NEW.sm_profit_margin, 0),
            CASE 
                WHEN NEW.image_urls IS NOT NULL AND array_length(NEW.image_urls, 1) > 0 
                THEN NEW.image_urls[1]
                ELSE NULL 
            END,
            NEW.images,
            NEW.category_name,
            NEW.condition,
            'edited',
            COALESCE(NEW.status, 'pending'),
            COALESCE(NEW.listing_score, 0),
            COALESCE(NEW.price_usd, NEW.ddu_price_usd, 0),
            NEW.created_at,
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            current_price = EXCLUDED.current_price,
            cost_price = EXCLUDED.cost_price,
            profit_amount = EXCLUDED.profit_amount,
            profit_margin = EXCLUDED.profit_margin,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            category = EXCLUDED.category,
            condition_name = EXCLUDED.condition_name,
            approval_status = EXCLUDED.approval_status,
            ai_confidence_score = EXCLUDED.ai_confidence_score,
            listing_price = EXCLUDED.listing_price,
            updated_at = NOW();
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- -------------------------
-- research_products_master → products_master
-- -------------------------
CREATE OR REPLACE FUNCTION sync_research_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_sku := generate_sku('research', NEW.id::TEXT, NEW.title);
        
        INSERT INTO products_master (
            sku,
            source_system, 
            source_id,
            source_table,
            title,
            current_price, 
            category, 
            category_id, 
            condition_name,
            primary_image_url, 
            ebay_item_id, 
            shipping_cost,
            seller,
            workflow_status, 
            approval_status,
            created_at, 
            updated_at
        )
        VALUES (
            v_sku,
            'research',
            NEW.id::TEXT,
            'research_products_master',
            NEW.title,
            NEW.current_price,
            NEW.category_name,
            NEW.category_id,
            NEW.condition,
            NEW.primary_image_url,
            NEW.ebay_item_id,
            NEW.shipping_cost,
            NEW.seller_username,
            'scraped',
            'pending',
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (source_system, source_id) 
        DO UPDATE SET
            title = EXCLUDED.title,
            current_price = EXCLUDED.current_price,
            category = EXCLUDED.category,
            updated_at = EXCLUDED.updated_at;
            
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        UPDATE products_master SET
            title = NEW.title,
            current_price = NEW.current_price,
            category = NEW.category_name,
            category_id = NEW.category_id,
            condition_name = NEW.condition,
            primary_image_url = NEW.primary_image_url,
            ebay_item_id = NEW.ebay_item_id,
            shipping_cost = NEW.shipping_cost,
            seller = NEW.seller_username,
            updated_at = NEW.updated_at
        WHERE source_system = 'research' 
        AND source_id = NEW.id::TEXT;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'research' 
        AND source_id = OLD.id::TEXT;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: 既存データにSKUを追加
-- ============================================================================
UPDATE products_master
SET sku = generate_sku(source_system, source_id, title)
WHERE sku IS NULL;

-- ============================================================================
-- STEP 4: 検証
-- ============================================================================
SELECT 
    source_table,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as missing_sku
FROM products_master
GROUP BY source_table
ORDER BY total DESC;

-- SKUサンプル確認
SELECT 
    id,
    sku,
    source_system,
    source_id,
    LEFT(title, 40) as title_preview
FROM products_master
ORDER BY created_at DESC
LIMIT 10;
