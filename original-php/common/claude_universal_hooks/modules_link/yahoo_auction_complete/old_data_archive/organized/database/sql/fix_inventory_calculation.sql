-- 在庫計算修正スクリプト
-- available_stock の計算を修正

-- 在庫管理テーブルの available_stock を更新
UPDATE inventory_management 
SET available_stock = physical_stock - reserved_stock
WHERE available_stock != physical_stock - reserved_stock;

-- 統合ビューを再作成（計算ロジック修正）
DROP VIEW IF EXISTS product_unified_view;

CREATE VIEW product_unified_view AS
SELECT 
    pm.master_sku,
    pm.product_name_jp,
    pm.product_name_en,
    pm.category,
    pm.product_status,
    
    -- スクレイピングデータ（最新）
    spd.source_platform,
    spd.scraped_price_jpy,
    spd.available_quantity as scraped_quantity,
    spd.last_verified_at,
    
    -- eBay出品情報
    eld.ebay_item_id,
    eld.listing_status,
    eld.listing_price_usd,
    eld.listing_quantity,
    
    -- 在庫情報（計算修正）
    im.physical_stock,
    COALESCE(im.physical_stock - im.reserved_stock, 0) as available_stock,
    im.stock_status,
    
    -- 価格監視
    pmon.monitored_price_jpy as current_market_price,
    pmon.price_change_percentage,
    
    -- 承認状況
    aw.approval_status,
    aw.ai_recommendation
    
FROM product_master pm
LEFT JOIN scraped_product_data spd ON pm.master_sku = spd.master_sku AND spd.is_active = TRUE
LEFT JOIN ebay_listing_data eld ON pm.master_sku = eld.master_sku AND eld.listing_status = 'active'
LEFT JOIN inventory_management im ON pm.master_sku = im.master_sku
LEFT JOIN price_monitoring pmon ON pm.master_sku = pmon.master_sku
LEFT JOIN approval_workflow aw ON pm.master_sku = aw.master_sku AND aw.approval_status IN ('pending', 'reviewing');