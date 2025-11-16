-- yahoo_scraped_products のトリガーを一時的に無効化
-- 手動同期APIを使用するため

-- 既存のトリガーを削除（エラーを無視）
DROP TRIGGER IF EXISTS sync_yahoo_to_master_trigger ON yahoo_scraped_products CASCADE;
DROP TRIGGER IF EXISTS trg_sync_yahoo_to_master ON yahoo_scraped_products CASCADE;
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_products ON yahoo_scraped_products CASCADE;

-- 確認
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'yahoo_scraped_products';
