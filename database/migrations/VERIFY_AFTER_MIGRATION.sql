-- 最後の完了メッセージは削除しました
-- Supabaseで実行後、以下のクエリで確認してください：

-- デフォルトルールの確認
SELECT 
  name,
  type,
  enabled,
  priority,
  description
FROM pricing_rules
ORDER BY priority DESC;

-- 在庫監視対象商品数の確認
SELECT 
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE inventory_monitoring_enabled = true) as monitoring_enabled,
  COUNT(*) FILTER (WHERE pricing_rules_enabled = true) as pricing_enabled
FROM products_master;
