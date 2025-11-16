-- products_master テーブルのカラム確認SQL

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
  AND table_schema = 'public'
ORDER BY ordinal_position;
