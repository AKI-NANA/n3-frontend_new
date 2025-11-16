-- ============================================================================
-- NAGANO-3 データベース包括的修正スクリプト
-- ============================================================================
-- 問題: 
--   1. listing_history.product_id (UUID) → products.id (UUID) 外部キー制約
--   2. しかし実際のデータは products_master (INTEGER ID) にある
--   3. listing_history.sku が NULL のレコードが多数存在
--
-- 解決策:
--   1. 外部キー制約を削除
--   2. SKUベースでデータを同期
--   3. トリガーでSKUを自動管理
-- ============================================================================

-- ============================================================================
-- STEP 1: 現状確認
-- ============================================================================
SELECT 
    'listing_history' as table_name,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as null_sku,
    COUNT(product_id) as with_product_id
FROM listing_history;

-- ============================================================================
-- STEP 2: 外部キー制約を確認
-- ============================================================================
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'listing_history'
    AND constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- STEP 3: 外部キー制約を削除
-- ============================================================================
-- listing_history → products の外部キー制約を削除
DO $$ 
DECLARE
    fk_constraint RECORD;
BEGIN
    FOR fk_constraint IN 
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'listing_history'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%product%'
    LOOP
        EXECUTE format('ALTER TABLE listing_history DROP CONSTRAINT IF EXISTS %I', fk_constraint.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', fk_constraint.constraint_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: listing_history.sku を products.sku から更新
-- ============================================================================
-- product_id (UUID) を使って products テーブルから sku を取得
UPDATE listing_history lh
SET sku = p.sku
FROM products p
WHERE lh.product_id = p.id
    AND lh.sku IS NULL
    AND p.sku IS NOT NULL;

-- 更新件数を確認
SELECT 
    COUNT(*) as updated_from_products
FROM listing_history lh
JOIN products p ON lh.product_id = p.id
WHERE lh.sku = p.sku;

-- ============================================================================
-- STEP 5: listing_history に products_master_id カラムを追加
-- ============================================================================
-- INTEGER型のproduct_idを保持するための新カラム
ALTER TABLE listing_history
ADD COLUMN IF NOT EXISTS products_master_id INTEGER;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_listing_history_products_master_id
ON listing_history(products_master_id);

COMMENT ON COLUMN listing_history.products_master_id IS 'products_master.id への参照 (INTEGER型)';

-- ============================================================================
-- STEP 6: SKUベースで products_master_id を設定
-- ============================================================================
UPDATE listing_history lh
SET products_master_id = pm.id
FROM products_master pm
WHERE lh.sku = pm.sku
    AND lh.products_master_id IS NULL
    AND pm.sku IS NOT NULL;

-- 更新結果を確認
SELECT 
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(products_master_id) as with_pm_id,
    COUNT(*) - COUNT(products_master_id) as missing_pm_id
FROM listing_history;

-- ============================================================================
-- STEP 7: トリガー作成 - listing_history INSERT/UPDATE時にSKUを自動設定
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_listing_history_sku()
RETURNS TRIGGER AS $$
BEGIN
    -- product_id (UUID) から products.sku を取得
    IF NEW.product_id IS NOT NULL AND (NEW.sku IS NULL OR NEW.sku = '') THEN
        SELECT sku INTO NEW.sku
        FROM products
        WHERE id = NEW.product_id;
    END IF;
    
    -- sku が設定されている場合、products_master_id を設定
    IF NEW.sku IS NOT NULL AND NEW.sku != '' AND NEW.products_master_id IS NULL THEN
        SELECT id INTO NEW.products_master_id
        FROM products_master
        WHERE sku = NEW.sku;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS trigger_sync_listing_history_sku ON listing_history;
CREATE TRIGGER trigger_sync_listing_history_sku
    BEFORE INSERT OR UPDATE ON listing_history
    FOR EACH ROW
    EXECUTE FUNCTION sync_listing_history_sku();

COMMENT ON FUNCTION sync_listing_history_sku() IS 'listing_history の sku と products_master_id を自動同期';

-- ============================================================================
-- STEP 8: トリガー作成 - products_master の SKU 更新を listing_history に反映
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_products_master_sku_to_listing_history()
RETURNS TRIGGER AS $$
BEGIN
    -- SKUが変更された場合、listing_historyを更新
    IF NEW.sku IS DISTINCT FROM OLD.sku THEN
        UPDATE listing_history
        SET sku = NEW.sku
        WHERE products_master_id = NEW.id;
        
        RAISE NOTICE 'Updated listing_history.sku for products_master.id=%', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS trigger_sync_products_master_sku ON products_master;
CREATE TRIGGER trigger_sync_products_master_sku
    AFTER UPDATE ON products_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_products_master_sku_to_listing_history();

COMMENT ON FUNCTION sync_products_master_sku_to_listing_history() IS 'products_master.sku の変更を listing_history に反映';

-- ============================================================================
-- STEP 9: 検証クエリ
-- ============================================================================

-- 最終結果を確認
SELECT 
    '🎯 Final Status' as status,
    COUNT(*) as total_records,
    COUNT(sku) as with_sku,
    COUNT(product_id) as with_product_id_uuid,
    COUNT(products_master_id) as with_products_master_id,
    COUNT(*) - COUNT(sku) as missing_sku,
    ROUND(100.0 * COUNT(sku) / NULLIF(COUNT(*), 0), 2) as sku_coverage_percent
FROM listing_history;

-- SKUベースでの結合テスト
SELECT 
    lh.id as lh_id,
    lh.sku as lh_sku,
    lh.products_master_id,
    pm.id as pm_id,
    pm.sku as pm_sku,
    CASE 
        WHEN lh.sku = pm.sku THEN '✅ SKU_MATCH'
        ELSE '❌ MISMATCH'
    END as match_status
FROM listing_history lh
LEFT JOIN products_master pm ON lh.products_master_id = pm.id
LIMIT 10;

-- まだskuがNULLのレコードを確認
SELECT 
    lh.id,
    lh.product_id,
    lh.sku,
    lh.products_master_id,
    p.sku as products_sku,
    pm.sku as products_master_sku
FROM listing_history lh
LEFT JOIN products p ON lh.product_id = p.id
LEFT JOIN products_master pm ON lh.products_master_id = pm.id
WHERE lh.sku IS NULL
LIMIT 10;

-- ============================================================================
-- STEP 10: フロントエンド用クエリの例
-- ============================================================================

-- ✅ 正しい方法: SKUベースでproducts_masterと結合
SELECT 
    lh.id,
    lh.sku,
    lh.marketplace,
    lh.account,
    lh.listing_id,
    lh.status,
    lh.listed_at,
    pm.id as product_id,
    pm.title,
    pm.title_en
FROM listing_history lh
LEFT JOIN products_master pm ON lh.sku = pm.sku
WHERE lh.sku = 'DJI-001'
ORDER BY lh.listed_at DESC
LIMIT 5;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
SELECT 
    '✅ Database schema fixed!' as message,
    'listing_history now uses SKU-based relations with products_master' as details,
    'Triggers automatically sync SKU changes' as automation;
