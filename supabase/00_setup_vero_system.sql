-- ============================================
-- Supabase SQL Editor用: VeROシステムセットアップ（完全版）
-- 既存テーブル構造に合わせて調整
-- ============================================

-- 1. yahoo_scraped_products にVeRO関連カラムを追加
ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS is_vero_brand BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vero_brand_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS vero_risk_level VARCHAR(20),
ADD COLUMN IF NOT EXISTS recommended_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS vero_notes TEXT,
ADD COLUMN IF NOT EXISTS vero_checked_at TIMESTAMP WITH TIME ZONE;

-- 2. vero_brand_rules テーブル作成
CREATE TABLE IF NOT EXISTS vero_brand_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(255) NOT NULL UNIQUE,
    brand_name_ja VARCHAR(255),
    keywords TEXT[],
    force_used_condition BOOLEAN DEFAULT false,
    recommended_condition VARCHAR(50) DEFAULT 'LIKE_NEW',
    restricted_regions TEXT[],
    vero_participant_profile_url TEXT,
    auto_flag BOOLEAN DEFAULT true,
    notes TEXT,
    violation_count INTEGER DEFAULT 0,
    last_violation_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. vero_scraped_violations テーブル作成
CREATE TABLE IF NOT EXISTS vero_scraped_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id VARCHAR(50) UNIQUE,
    title TEXT,
    violation_date TIMESTAMP WITH TIME ZONE,
    violation_type VARCHAR(100),
    rights_owner VARCHAR(255),
    policy_id VARCHAR(100),
    removal_reason TEXT,
    seller_id VARCHAR(100),
    category VARCHAR(255),
    brand_detected VARCHAR(255),
    raw_data JSONB,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_vero_brand ON yahoo_scraped_products(is_vero_brand) WHERE is_vero_brand = true;
CREATE INDEX IF NOT EXISTS idx_products_vero_brand_name ON yahoo_scraped_products(vero_brand_name) WHERE vero_brand_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vero_scraped_item_id ON vero_scraped_violations(item_id);
CREATE INDEX IF NOT EXISTS idx_vero_rules_brand ON vero_brand_rules(brand_name);
CREATE INDEX IF NOT EXISTS idx_vero_rules_active ON vero_brand_rules(is_active) WHERE is_active = true;

-- 5. VeROブランドルールの初期データ
INSERT INTO vero_brand_rules (
    brand_name, brand_name_ja, keywords, force_used_condition, 
    recommended_condition, notes, violation_count
) VALUES
-- Top 5 VeRO違反ブランド（実績データ 2020-2021）
('Tamron', 'タムロン', ARRAY['tamron', 'タムロン'], true, 'LIKE_NEW', 
 '【最重要】VeRO違反第1位。新品・中古関わらず削除対象。特定地域（主にヨーロッパ）では全面禁止', 150),
('Adidas', 'アディダス', ARRAY['adidas', 'アディダス', 'three stripes'], true, 'LIKE_NEW', 
 'VeRO違反第2位。新品出品は要注意。3本ラインロゴも対象', 120),
('Nike', 'ナイキ', ARRAY['nike', 'ナイキ', 'swoosh'], true, 'LIKE_NEW', 
 'VeRO違反第3位。新品出品は要注意。スウッシュロゴも対象', 110),
('Okatsune', '岡恒', ARRAY['okatsune', '岡恒'], true, 'LIKE_NEW', 
 '園芸用刃物メーカー。VeRO違反第4位。日本ブランドだが要注意', 95),
('Coach', 'コーチ', ARRAY['coach', 'コーチ'], true, 'LIKE_NEW', 
 'VeRO違反第5位。高級ブランド。新品出品は要注意', 85),

-- 時計メーカー（警告頻発ブランド）
('SEIKO', 'セイコー', ARRAY['seiko', 'セイコー'], true, 'LIKE_NEW', 
 '【警告頻発】時計メーカーは特に注意。新品は必ずLIKE_NEWで出品。各国輸入規制あり', 50),
('CITIZEN', 'シチズン', ARRAY['citizen', 'シチズン'], true, 'LIKE_NEW', 
 '【警告頻発】時計メーカーは特に注意。新品は必ずLIKE_NEWで出品', 45),
('CASIO', 'カシオ', ARRAY['casio', 'カシオ', 'g-shock'], true, 'LIKE_NEW', 
 '【警告頻発】時計メーカーは特に注意。G-SHOCKも対象。新品は必ずLIKE_NEWで出品', 40),

-- 特定地域禁止ブランド（主にヨーロッパ）
('OLYMPUS', 'オリンパス', ARRAY['olympus', 'オリンパス'], true, 'LIKE_NEW', 
 '特定地域（主にヨーロッパ）での禁止ブランド。カメラ機器', 30),
('FUJIFILM', '富士フィルム', ARRAY['fujifilm', 'fuji', '富士フィルム', 'フジフィルム'], true, 'LIKE_NEW', 
 '特定地域（主にヨーロッパ）での禁止ブランド。カメラ・フィルム', 28),
('UNIQLO', 'ユニクロ', ARRAY['uniqlo', 'ユニクロ'], true, 'LIKE_NEW', 
 '特定地域での禁止ブランド。アパレル', 25),

-- その他重要ブランド
('SUZUKI', 'スズキ（楽器）', ARRAY['suzuki musical', 'suzuki instrument', 'スズキ 楽器'], true, 'LIKE_NEW', 
 '楽器メーカー。新品出品注意。自動車のスズキとは別', 20),
('SONY', 'ソニー', ARRAY['sony', 'ソニー', 'playstation'], true, 'LIKE_NEW', 
 '電子機器メーカー。新品出品注意。PlayStationも対象', 35),
('Nikon', 'ニコン', ARRAY['nikon', 'ニコン'], true, 'LIKE_NEW', 
 'カメラメーカー。新品出品注意。レンズも対象', 32),
('Canon', 'キヤノン', ARRAY['canon', 'キヤノン', 'キャノン'], true, 'LIKE_NEW', 
 'カメラメーカー。新品出品注意', 30),

-- ファッションブランド
('CELINE', 'セリーヌ', ARRAY['celine', 'セリーヌ'], true, 'LIKE_NEW', 
 '高級ファッションブランド。特定地域での禁止', 22),
('Marc Jacobs', 'マークジェイコブス', ARRAY['marc jacobs', 'マークジェイコブス'], true, 'LIKE_NEW', 
 'ファッションブランド。特定地域での禁止', 20),
('Lululemon', 'ルルレモン', ARRAY['lululemon', 'ルルレモン'], true, 'LIKE_NEW', 
 'スポーツアパレル。特定地域での禁止', 18),

-- キャラクター・エンターテイメント
('PEANUTS', 'ピーナッツ', ARRAY['peanuts', 'snoopy', 'スヌーピー'], true, 'LIKE_NEW', 
 'キャラクター商品（スヌーピー）。特定地域での禁止', 15),
('KAWS', 'カウズ', ARRAY['kaws', 'カウズ'], true, 'LIKE_NEW', 
 'アート作品・キャラクター。特定地域での禁止', 12),

-- その他
('Holbein', 'ホルベイン', ARRAY['holbein', 'ホルベイン'], true, 'LIKE_NEW', 
 '画材メーカー。特定地域での禁止', 10),
('Shu Uemura', 'シュウウエムラ', ARRAY['shu uemura', 'シュウウエムラ'], true, 'LIKE_NEW', 
 '化粧品ブランド。特定地域での禁止', 8)
ON CONFLICT (brand_name) DO NOTHING;

-- 6. VeROビュー作成（シンプル版 - 存在するカラムのみ使用）
CREATE OR REPLACE VIEW vero_flagged_products AS
SELECT 
    p.id,
    p.title,
    p.is_vero_brand,
    p.vero_brand_name,
    p.vero_risk_level,
    p.recommended_condition,
    p.vero_notes,
    p.vero_checked_at,
    p.created_at,
    r.brand_name,
    r.brand_name_ja,
    r.force_used_condition,
    r.notes as brand_notes,
    r.violation_count,
    r.recommended_condition as brand_recommended_condition
FROM yahoo_scraped_products p
INNER JOIN vero_brand_rules r ON p.vero_brand_name = r.brand_name
WHERE p.is_vero_brand = true
ORDER BY p.created_at DESC;

-- 7. VeRO統計ビュー作成（シンプル版）
CREATE OR REPLACE VIEW vero_statistics AS
SELECT 
    vero_brand_name,
    COUNT(*) as product_count,
    vero_risk_level,
    recommended_condition,
    MIN(created_at) as first_flagged,
    MAX(created_at) as last_flagged
FROM yahoo_scraped_products
WHERE is_vero_brand = true
GROUP BY vero_brand_name, vero_risk_level, recommended_condition
ORDER BY product_count DESC;

-- 8. ブランド違反カウント更新用の関数
CREATE OR REPLACE FUNCTION increment_brand_violation(brand_name TEXT)
RETURNS void AS $$
BEGIN
    UPDATE vero_brand_rules
    SET violation_count = violation_count + 1,
        last_violation_date = NOW(),
        updated_at = NOW()
    WHERE vero_brand_rules.brand_name = increment_brand_violation.brand_name;
END;
$$ LANGUAGE plpgsql;

-- 9. VeROブランドチェック用の関数
CREATE OR REPLACE FUNCTION check_vero_brand(product_title TEXT, product_description TEXT)
RETURNS TABLE(
    is_vero BOOLEAN,
    brand_name VARCHAR(255),
    brand_name_ja VARCHAR(255),
    recommended_condition VARCHAR(50),
    force_used_condition BOOLEAN,
    notes TEXT,
    violation_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as is_vero,
        r.brand_name,
        r.brand_name_ja,
        r.recommended_condition,
        r.force_used_condition,
        r.notes,
        r.violation_count
    FROM vero_brand_rules r
    WHERE r.is_active = true
    AND (
        -- キーワード配列のいずれかが商品タイトルまたは説明文に含まれる
        EXISTS (
            SELECT 1 FROM unnest(r.keywords) kw
            WHERE LOWER(product_title || ' ' || COALESCE(product_description, '')) LIKE '%' || LOWER(kw) || '%'
        )
    )
    ORDER BY r.violation_count DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10. テストデータ確認用クエリ
DO $$
DECLARE
    brand_count INTEGER;
    violation_total INTEGER;
BEGIN
    SELECT COUNT(*), SUM(violation_count) INTO brand_count, violation_total
    FROM vero_brand_rules;
    
    RAISE NOTICE '✅ VeROシステムのセットアップが完了しました！';
    RAISE NOTICE '登録ブランド数: %', brand_count;
    RAISE NOTICE '累計違反回数: %', violation_total;
    RAISE NOTICE '';
    RAISE NOTICE 'Top 5 VeRO違反ブランド:';
END $$;

-- Top 5を表示
SELECT 
    ROW_NUMBER() OVER (ORDER BY violation_count DESC) as rank,
    brand_name as "ブランド名",
    brand_name_ja as "日本語名",
    violation_count as "違反回数",
    CASE 
        WHEN force_used_condition THEN '禁止'
        ELSE '許可'
    END as "新品出品",
    recommended_condition as "推奨コンディション"
FROM vero_brand_rules
WHERE is_active = true
ORDER BY violation_count DESC
LIMIT 5;

-- セットアップ完了メッセージ
SELECT 
    '🎉 VeROシステムのセットアップが完了しました！' as message,
    (SELECT COUNT(*) FROM vero_brand_rules) as "登録ブランド数",
    (SELECT SUM(violation_count) FROM vero_brand_rules) as "累計違反回数";
