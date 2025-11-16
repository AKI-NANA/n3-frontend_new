-- ============================================================================
-- NAGANO-3 完全修正スクリプト - SKU統一とデータ整合性
-- ============================================================================
-- 問題: 13件中12件がSKU形式不正
-- 原因: トリガー関数にSKU生成ロジックが欠けている
-- 解決: トリガー関数を修正し、既存データも修正
-- ============================================================================

-- ============================================================================
-- STEP 1: 既存データのSKUを正しい形式に修正
-- ============================================================================

-- yahoo_scraped_products → YAH-{source_id}
UPDATE products_master
SET sku = 'YAH-' || source_id
WHERE source_system = 'yahoo_scraped_products'
  AND source_id IS NOT NULL;

-- products → PRD-{source_id} または既存SKUを維持
UPDATE products_master pm
SET sku = COALESCE(
    (SELECT p.sku FROM products p WHERE p.id::TEXT = pm.source_id),
    'PRD-' || pm.source_id
)
WHERE pm.source_system = 'products'
  AND pm.source_id IS NOT NULL;

-- ebay_inventory → EBY-{source_id}
UPDATE products_master
SET sku = 'EBY-' || source_id
WHERE source_system = 'ebay'
  AND source_id IS NOT NULL;

-- inventory_master → INV-{source_id}
UPDATE products_master
SET sku = 'INV-' || source_id
WHERE source_system = 'inventory_master'
  AND source_id IS NOT NULL;

-- research → RSH-{source_id}
UPDATE products_master
SET sku = 'RSH-' || source_id
WHERE source_system = 'research'
  AND source_id IS NOT NULL;

-- ============================================================================
-- STEP 2: source_table カラムを埋める
-- ============================================================================

UPDATE products_master
SET source_table = CASE source_system
    WHEN 'yahoo_scraped_products' THEN 'yahoo_scraped_products'
    WHEN 'yahoo' THEN 'yahoo_scraped_products'
    WHEN 'ebay' THEN 'ebay_inventory'
    WHEN 'inventory_master' THEN 'inventory_master'
    WHEN 'products' THEN 'products'
    WHEN 'research' THEN 'research_products_master'
    ELSE source_system
END
WHERE source_table IS NULL;

-- ============================================================================
-- STEP 3: トリガー関数を完全に書き直し（SKU生成含む）
-- ============================================================================

-- -------------------
-- Yahoo → products_master
-- -------------------
CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- SKU生成: YAH-{id}
        v_sku := 'YAH-' || NEW.id::TEXT;
        
        INSERT INTO products_master (
            sku,
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
            'yahoo_scraped_products',
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
            sku = EXCLUDED.sku,
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
        WHERE source_system = 'yahoo_scraped_products'
        AND source_id = NEW.id::TEXT;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master
        WHERE source_system = 'yahoo_scraped_products'
        AND source_id = OLD.id::TEXT;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- -------------------
-- eBay → products_master
-- -------------------
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
            sku = EXCLUDED.sku,
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

-- -------------------
-- inventory_master → products_master
-- -------------------
CREATE OR REPLACE FUNCTION sync_inventory_master_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_source_id TEXT;
BEGIN
    v_source_id := COALESCE(NEW.unique_id, NEW.id::TEXT);
    v_sku := 'INV-' || v_source_id;
    
    IF (TG_OP = 'INSERT') THEN
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
            sku = EXCLUDED.sku,
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

-- -------------------
-- products → products_master
-- -------------------
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
        -- productsテーブルのSKUを優先、なければ生成
        v_sku := COALESCE(NEW.sku, 'PRD-' || NEW.id::TEXT);
        
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

-- -------------------
-- research → products_master
-- -------------------
CREATE OR REPLACE FUNCTION sync_research_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
BEGIN
    v_sku := 'RSH-' || NEW.id::TEXT;
    
    IF (TG_OP = 'INSERT') THEN
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
            sku = EXCLUDED.sku,
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
-- STEP 4: listing_history のSKU同期を修正
-- ============================================================================

-- products_master_id カラムを追加（まだなければ）
ALTER TABLE listing_history
ADD COLUMN IF NOT EXISTS products_master_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_listing_history_products_master_id
ON listing_history(products_master_id);

-- SKUベースで products_master_id を設定
UPDATE listing_history lh
SET products_master_id = pm.id
FROM products_master pm
WHERE lh.sku = pm.sku
  AND lh.products_master_id IS NULL;

-- listing_historyのSKU同期トリガーを強化
CREATE OR REPLACE FUNCTION set_listing_history_sku()
RETURNS TRIGGER AS $$
BEGIN
    -- product_id (UUID) から products テーブルの SKU を取得
    IF NEW.product_id IS NOT NULL THEN
        SELECT sku INTO NEW.sku
        FROM products
        WHERE id = NEW.product_id;
    END IF;
    
    -- SKUから products_master_id を取得
    IF NEW.sku IS NOT NULL AND NEW.products_master_id IS NULL THEN
        SELECT id INTO NEW.products_master_id
        FROM products_master
        WHERE sku = NEW.sku;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: 検証
-- ============================================================================

-- SKU形式別集計（修正後）
SELECT 
    CASE 
        WHEN sku LIKE 'YAH-%' THEN '✅ YAH-* (correct)'
        WHEN sku LIKE 'EBY-%' THEN '✅ EBY-* (correct)'
        WHEN sku LIKE 'INV-%' THEN '✅ INV-* (correct)'
        WHEN sku LIKE 'PRD-%' THEN '✅ PRD-* (correct)'
        WHEN sku LIKE 'RSH-%' THEN '✅ RSH-* (correct)'
        ELSE '❌ Invalid'
    END as sku_format,
    COUNT(*) as count
FROM products_master
GROUP BY 1
ORDER BY count DESC;

-- source_table状況
SELECT 
    source_system,
    source_table,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as missing_sku
FROM products_master
GROUP BY source_system, source_table
ORDER BY total DESC;

-- 最新データのSKU確認
SELECT 
    id,
    sku,
    source_system,
    source_id,
    source_table,
    LEFT(title, 40) as title
FROM products_master
ORDER BY updated_at DESC
LIMIT 10;

-- listing_history の整合性
SELECT 
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(products_master_id) as with_pm_id,
    COUNT(*) - COUNT(sku) as missing_sku
FROM listing_history;

-- ============================================================================
-- 完了
-- ============================================================================
SELECT 
    '✅ SKU統一完了！' as status,
    'すべてのトリガーにSKU生成ロジックを追加' as action1,
    '既存データのSKUを正しい形式に修正' as action2,
    'source_tableカラムを埋めた' as action3,
    'listing_historyとの連携を強化' as action4,
    NOW() as completed_at;
