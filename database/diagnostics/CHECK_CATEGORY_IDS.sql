-- SM分析なし商品のカテゴリID確認

-- パターン1: ebay_api_dataにカテゴリIDがある商品（SM分析なし）
SELECT 
  id,
  sku,
  COALESCE(title_en, title, (scraped_data->>'title')) as product_title,
  (ebay_api_data->>'category_id') as category_id,
  (ebay_api_data->>'category_name') as category_name,
  CASE 
    WHEN ebay_api_data->'listing_reference'->'referenceItems' IS NOT NULL 
    THEN jsonb_array_length(ebay_api_data->'listing_reference'->'referenceItems')
    ELSE 0
  END as mirror_items_count
FROM products_master
WHERE ebay_api_data IS NOT NULL
  AND (ebay_api_data->>'category_id') IS NOT NULL
ORDER BY 
  mirror_items_count ASC,
  id DESC
LIMIT 20;

-- パターン2: カテゴリIDがない商品
SELECT 
  id,
  sku,
  COALESCE(title_en, title, (scraped_data->>'title')) as product_title,
  (ebay_api_data->>'category_id') as category_id,
  (ebay_api_data->>'category_name') as category_name
FROM products_master
WHERE (ebay_api_data->>'category_id') IS NULL
  OR ebay_api_data IS NULL
LIMIT 10;

-- パターン3: 全体の統計
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN (ebay_api_data->>'category_id') IS NOT NULL THEN 1 END) as has_category_id,
  COUNT(CASE WHEN ebay_api_data->'listing_reference'->'referenceItems' IS NOT NULL THEN 1 END) as has_mirror_data,
  COUNT(CASE WHEN (ebay_api_data->>'category_id') IS NOT NULL 
         AND (ebay_api_data->'listing_reference'->'referenceItems' IS NULL 
              OR jsonb_array_length(ebay_api_data->'listing_reference'->'referenceItems') = 0) 
         THEN 1 END) as has_category_no_mirror
FROM products_master;
