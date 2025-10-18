-- =====================================================
-- VeRO対応: 商品テーブルの拡張
-- =====================================================

-- yahoo_scraped_products テーブルにVeRO関連カラムを追加
ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS is_vero_brand BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vero_brand_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS vero_risk_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
ADD COLUMN IF NOT EXISTS recommended_condition VARCHAR(50), -- 'NEW', 'LIKE_NEW', 'USED'
ADD COLUMN IF NOT EXISTS vero_notes TEXT,
ADD COLUMN IF NOT EXISTS vero_checked_at TIMESTAMP WITH TIME ZONE;

-- VeRO履歴スクレイピング記録テーブル
CREATE TABLE IF NOT EXISTS vero_scraped_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(50) UNIQUE, -- eBayアイテムID
    title TEXT,
    violation_date TIMESTAMP WITH TIME ZONE,
    violation_type VARCHAR(100), -- 'VeRO: Replica', 'VeRO: Parallel Import', etc.
    rights_owner VARCHAR(255), -- 権利所有者名
    policy_id VARCHAR(100),
    removal_reason TEXT,
    seller_id VARCHAR(100),
    category VARCHAR(255),
    brand_detected VARCHAR(255),
    raw_data JSONB, -- 元データ全体を保存
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VeROブランド自動判定ルール
CREATE TABLE IF NOT EXISTS vero_brand_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(255) NOT NULL,
    brand_name_ja VARCHAR(255),
    keywords TEXT[], -- 検出用キーワード配列
    force_used_condition BOOLEAN DEFAULT false, -- 新品出品を禁止するか
    recommended_condition VARCHAR(50) DEFAULT 'LIKE_NEW',
    restricted_regions TEXT[], -- 販売禁止地域
    vero_participant_profile_url TEXT,
    auto_flag BOOLEAN DEFAULT true, -- 自動フラグ付けを有効化
    notes TEXT,
    violation_count INTEGER DEFAULT 0,
    last_violation_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_vero_brand ON yahoo_scraped_products(is_vero_brand) WHERE is_vero_brand = true;
CREATE INDEX IF NOT EXISTS idx_products_vero_risk ON yahoo_scraped_products(vero_risk_level);
CREATE INDEX IF NOT EXISTS idx_vero_scraped_item_id ON vero_scraped_violations(item_id);
CREATE INDEX IF NOT EXISTS idx_vero_scraped_date ON vero_scraped_violations(violation_date DESC);
CREATE INDEX IF NOT EXISTS idx_vero_scraped_owner ON vero_scraped_violations(rights_owner);
CREATE INDEX IF NOT EXISTS idx_vero_rules_brand ON vero_brand_rules(brand_name);

-- VeROブランドルールの初期データ投入
INSERT INTO vero_brand_rules (
    brand_name, brand_name_ja, keywords, force_used_condition, 
    recommended_condition, notes, violation_count
) VALUES
-- Top 5 違反ブランド
('Tamron', 'タムロン', ARRAY['tamron', 'タムロン'], true, 'LIKE_NEW', 
 '【最重要】新品・中古関わらず削除対象。特定地域（主にヨーロッパ）では全面禁止', 150),
('Adidas', 'アディダス', ARRAY['adidas', 'アディダス'], true, 'LIKE_NEW', 
 'VeRO違反第2位。新品出品は要注意', 120),
('Nike', 'ナイキ', ARRAY['nike', 'ナイキ'], true, 'LIKE_NEW', 
 'VeRO違反第3位。新品出品は要注意', 110),
('Okatsune', '岡恒', ARRAY['okatsune', '岡恒'], true, 'LIKE_NEW', 
 '園芸用刃物メーカー。VeRO違反第4位', 95),
('Coach', 'コーチ', ARRAY['coach', 'コーチ'], true, 'LIKE_NEW', 
 'VeRO違反第5位。新品出品は要注意', 85),

-- 時計メーカー（特に注意）
('SEIKO', 'セイコー', ARRAY['seiko', 'セイコー'], true, 'LIKE_NEW', 
 '【警告頻発】時計メーカーは特に注意。新品は必ずLIKE_NEWで出品', 50),
('CITIZEN', 'シチズン', ARRAY['citizen', 'シチズン'], true, 'LIKE_NEW', 
 '【警告頻発】時計メーカーは特に注意。新品は必ずLIKE_NEWで出品', 45),
('CASIO', 'カシオ', ARRAY['casio', 'カシオ'], true, 'LIKE_NEW', 
 '【警告頻発】時計メーカーは特に注意。新品は必ずLIKE_NEWで出品', 40),

-- 特定地域禁止ブランド
('OLYMPUS', 'オリンパス', ARRAY['olympus', 'オリンパス'], true, 'LIKE_NEW', 
 '特定地域（主にヨーロッパ）での禁止ブランド', 30),
('FUJIFILM', '富士フィルム', ARRAY['fujifilm', 'fuji', '富士フィルム'], true, 'LIKE_NEW', 
 '特定地域（主にヨーロッパ）での禁止ブランド', 28),
('UNIQLO', 'ユニクロ', ARRAY['uniqlo', 'ユニクロ'], true, 'LIKE_NEW', 
 '特定地域での禁止ブランド', 25),

-- その他の楽器・電子機器メーカー
('SUZUKI', 'スズキ（楽器）', ARRAY['suzuki musical', 'suzuki instrument', 'スズキ 楽器'], true, 'LIKE_NEW', 
 '楽器メーカー。新品出品注意', 20),
('SONY', 'ソニー', ARRAY['sony', 'ソニー'], true, 'LIKE_NEW', 
 '電子機器メーカー。新品出品注意', 35),
('Nikon', 'ニコン', ARRAY['nikon', 'ニコン'], true, 'LIKE_NEW', 
 'カメラメーカー。新品出品注意', 32),

-- ファッションブランド
('CELINE', 'セリーヌ', ARRAY['celine', 'セリーヌ'], true, 'LIKE_NEW', 
 '特定地域での禁止ブランド', 22),
('Marc Jacobs', 'マークジェイコブス', ARRAY['marc jacobs', 'マークジェイコブス'], true, 'LIKE_NEW', 
 '特定地域での禁止ブランド', 20),
('Lululemon', 'ルルレモン', ARRAY['lululemon', 'ルルレモン'], true, 'LIKE_NEW', 
 '特定地域での禁止ブランド', 18),

-- その他
('PEANUTS', 'ピーナッツ', ARRAY['peanuts', 'snoopy', 'スヌーピー'], true, 'LIKE_NEW', 
 'キャラクター商品。特定地域での禁止', 15),
('KAWS', 'カウズ', ARRAY['kaws', 'カウズ'], true, 'LIKE_NEW', 
 'アート作品。特定地域での禁止', 12),
('Holbein', 'ホルベイン', ARRAY['holbein', 'ホルベイン'], true, 'LIKE_NEW', 
 '画材メーカー。特定地域での禁止', 10),
('Shu Uemura', 'シュウウエムラ', ARRAY['shu uemura', 'シュウウエムラ'], true, 'LIKE_NEW', 
 '化粧品ブランド。特定地域での禁止', 8);

-- VeROチェック用のビュー
CREATE OR REPLACE VIEW vero_flagged_products AS
SELECT 
    p.id,
    p.title,
    p.price,
    p.is_vero_brand,
    p.vero_brand_name,
    p.vero_risk_level,
    p.recommended_condition,
    p.final_judgment,
    p.created_at,
    r.force_used_condition,
    r.notes as vero_notes,
    r.violation_count
FROM yahoo_scraped_products p
LEFT JOIN vero_brand_rules r ON p.vero_brand_name = r.brand_name
WHERE p.is_vero_brand = true
ORDER BY p.created_at DESC;

-- VeRO統計ビュー
CREATE OR REPLACE VIEW vero_statistics AS
SELECT 
    vero_brand_name,
    COUNT(*) as product_count,
    vero_risk_level,
    recommended_condition,
    COUNT(*) FILTER (WHERE final_judgment = 'OK') as approved_count,
    COUNT(*) FILTER (WHERE final_judgment = 'NG') as rejected_count,
    COUNT(*) FILTER (WHERE final_judgment = 'PENDING') as pending_count
FROM yahoo_scraped_products
WHERE is_vero_brand = true
GROUP BY vero_brand_name, vero_risk_level, recommended_condition
ORDER BY product_count DESC;

COMMENT ON TABLE vero_scraped_violations IS 'eBayからスクレイピングしたVeRO違反履歴';
COMMENT ON TABLE vero_brand_rules IS 'VeROブランドの自動判定ルールと推奨出品条件';
COMMENT ON COLUMN vero_brand_rules.force_used_condition IS '新品出品を禁止し、LIKE_NEWでの出品を強制するか';
COMMENT ON COLUMN vero_brand_rules.recommended_condition IS '推奨される商品コンディション';
COMMENT ON VIEW vero_flagged_products IS 'VeROフラグが立った商品の一覧';
COMMENT ON VIEW vero_statistics IS 'VeROブランド別の統計情報';
