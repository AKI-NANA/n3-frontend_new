-- productsテーブルの全カラムを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;
