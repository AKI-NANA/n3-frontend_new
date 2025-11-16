-- SupabaseのSQL Editorで実行してください
-- products_masterテーブルのRLSポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable read access for all users" ON products_master;
DROP POLICY IF EXISTS "Enable insert for all users" ON products_master;
DROP POLICY IF EXISTS "Enable update for all users" ON products_master;
DROP POLICY IF EXISTS "Enable delete for all users" ON products_master;

-- 新しいポリシーを作成（全アクセス許可）
CREATE POLICY "Enable all access for all users" 
ON products_master 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'products_master';
