-- productsテーブルの競合価格・利益関連カラムを確認
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
AND (
    column_name LIKE '%compet%' 
    OR column_name LIKE '%profit%' 
    OR column_name LIKE '%research%'
    OR column_name LIKE '%lowest%'
)
ORDER BY column_name;
