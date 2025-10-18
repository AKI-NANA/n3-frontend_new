-- ============================================
-- vero_brand_rulesテーブルにcategoryカラムを追加
-- ============================================

-- ステップ1: categoryカラムを追加
ALTER TABLE vero_brand_rules 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- ステップ2: 既存データにカテゴリを推測して設定
UPDATE vero_brand_rules
SET category = CASE
    -- 高級ブランド
    WHEN brand_name IN ('Louis Vuitton', 'Gucci', 'Chanel', 'Hermes', 'Cartier', 'Fendi', 'Tiffany', 'Yves Saint Laurent', 'Prada', 'Burberry') 
        THEN 'luxury_brand'
    
    -- スポーツブランド
    WHEN brand_name IN ('Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance', 'Reebok', 'Asics', 'Mizuno')
        THEN 'sports_brand'
    
    -- 時計
    WHEN brand_name IN ('Rolex', 'SEIKO', 'CITIZEN', 'CASIO', 'Omega', 'TAG Heuer')
        THEN 'watch'
    
    -- カメラ
    WHEN brand_name IN ('Tamron', 'Canon', 'Nikon', 'Sony', 'Leica', 'Fujifilm', 'Olympus', 'Pentax')
        THEN 'camera'
    
    -- コーチ等のファッションブランド
    WHEN brand_name IN ('Coach', 'Michael Kors', 'Kate Spade')
        THEN 'fashion_brand'
    
    -- テクノロジー
    WHEN brand_name IN ('Apple', 'Samsung', 'Microsoft', 'Sony')
        THEN 'tech_brand'
    
    -- アウトドア
    WHEN brand_name IN ('Arc''teryx', 'Columbia', 'The North Face', 'Patagonia')
        THEN 'outdoor'
    
    -- その他
    ELSE 'general'
END
WHERE category = 'general' OR category IS NULL;

-- ステップ3: 確認
SELECT 
    category as "カテゴリ",
    COUNT(*) as "ブランド数",
    array_agg(brand_name ORDER BY brand_name LIMIT 5) as "サンプルブランド"
FROM vero_brand_rules
GROUP BY category
ORDER BY COUNT(*) DESC;

-- ステップ4: 全ブランド確認
SELECT 
    '✅ カテゴリカラム追加完了' as status,
    COUNT(*) as total_brands,
    COUNT(DISTINCT category) as category_count
FROM vero_brand_rules;
