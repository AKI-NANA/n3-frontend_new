-- ============================================
-- 各関数の定義内容を確認（mystical参照チェック）
-- ============================================

-- 1. sync_ebay_inventory_to_products_master の定義確認
SELECT 
    'sync_ebay_inventory_to_products_master' as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_ebay_inventory_to_products_master';

-- 2. sync_inventory_master_to_products_master の定義確認
SELECT 
    'sync_inventory_master_to_products_master' as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_inventory_master_to_products_master';

-- 3. sync_research_to_products_master の定義確認
SELECT 
    'sync_research_to_products_master' as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_research_to_products_master';

-- 4. sync_yahoo_to_products_master の定義確認
SELECT 
    'sync_yahoo_to_products_master' as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_yahoo_to_products_master';
