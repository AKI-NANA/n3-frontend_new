-- 既存のebay_fulfillment_policiesテーブル構造を確認
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'ebay_fulfillment_policies'
ORDER BY ordinal_position;
