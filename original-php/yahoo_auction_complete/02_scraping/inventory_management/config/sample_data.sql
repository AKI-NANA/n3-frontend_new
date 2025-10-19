-- ===============================================
-- 10_zaiko → 02_scraping 引き継ぎデータ仕様
-- ===============================================

-- 1. 出品済み商品抽出クエリ（基本）
SELECT 
    id as product_id,
    title,
    price as original_price,
    url as yahoo_url,
    ebay_item_id,
    created_at as scraped_at,
    updated_at as last_updated
FROM yahoo_scraped_products 
WHERE workflow_status = 'listed' 
  AND ebay_item_id IS NOT NULL 
  AND ebay_item_id != ''
ORDER BY updated_at DESC;

-- 2. 在庫管理用詳細データ（拡張）
SELECT 
    ysp.id as product_id,
    ysp.title,
    ysp.price as original_price,
    ysp.url as yahoo_url,
    ysp.ebay_item_id,
    ysp.category,
    ysp.description,
    ysp.images,
    ysp.created_at as scraped_at,
    ysp.updated_at as listing_completed_at,
    
    -- 出品先情報（08_listingから取得想定）
    'ebay' as listing_platform,
    ysp.ebay_item_id as platform_product_id,
    
    -- 在庫管理設定（デフォルト値）
    true as monitoring_enabled,
    'active' as monitoring_status,
    null as last_checked_at,
    null as price_alert_threshold
    
FROM yahoo_scraped_products ysp
WHERE ysp.workflow_status = 'listed' 
  AND ysp.ebay_item_id IS NOT NULL 
  AND ysp.ebay_item_id != ''
  -- 新規出品のみ（在庫管理未登録）
  AND ysp.id NOT IN (
      SELECT product_id 
      FROM inventory_management 
      WHERE product_id IS NOT NULL
  )
ORDER BY ysp.updated_at DESC;

-- 3. 監視対象商品一覧（定期チェック用）
SELECT 
    im.product_id,
    im.source_url as yahoo_url,
    im.current_price,
    im.monitoring_enabled,
    im.last_verified_at,
    ysp.title,
    ysp.ebay_item_id,
    
    -- 監視設定
    COALESCE(im.price_alert_threshold, 0.05) as price_change_threshold,
    COALESCE(im.check_interval_hours, 2) as check_interval
    
FROM inventory_management im
JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
WHERE im.monitoring_enabled = true
  AND im.url_status = 'active'
  AND ysp.workflow_status = 'listed'
ORDER BY im.last_verified_at ASC NULLS FIRST;

-- ===============================================
-- データ転送用JSON形式例
-- ===============================================

/*
{
  "listed_products": [
    {
      "product_id": 123,
      "title": "iPhone 14 Pro 128GB スペースブラック",
      "original_price": 98000,
      "yahoo_url": "https://page.auctions.yahoo.co.jp/jp/auction/abc123",
      "ebay_item_id": "123456789",
      "category": "携帯電話、スマートフォン",
      "scraped_at": "2025-09-20 10:30:00",
      "listing_completed_at": "2025-09-22 14:15:00",
      "monitoring_config": {
        "enabled": true,
        "price_threshold": 0.05,
        "check_interval": 2
      }
    }
  ],
  "monitoring_targets": [
    {
      "product_id": 123,
      "yahoo_url": "https://page.auctions.yahoo.co.jp/jp/auction/abc123",
      "current_price": 98000,
      "last_checked": null,
      "threshold": 0.05
    }
  ]
}
*/