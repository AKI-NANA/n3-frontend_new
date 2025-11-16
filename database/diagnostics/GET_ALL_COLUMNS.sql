-- ============================================
-- products_master の完全な構造を確認
-- ============================================

-- 全カラムをアルファベット順にリスト
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_master'
ORDER BY column_name;

-- 結果をコピーして教えてください
