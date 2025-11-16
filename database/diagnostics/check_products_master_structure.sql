-- products_masterテーブルの完全な構造確認

-- 1. 全カラムをリスト
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- 2. price関連のカラムを検索
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'products_master'
  AND column_name ILIKE '%price%'
ORDER BY column_name;

-- 3. テーブル定義を確認
SELECT 
  'Table: products_master' as info,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'products_master';
