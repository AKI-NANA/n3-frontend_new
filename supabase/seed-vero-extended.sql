-- =====================================================
-- VeRO (Verified Rights Owner) 拡張データベース
-- eBay知的財産保護プログラム対応
-- =====================================================

-- VeRO違反タイプの拡張
INSERT INTO filter_keywords (keyword, type, priority, category, mall_name, description, is_active) VALUES

-- =====================================================
-- 1. 高頻度VeRO指摘ブランド（実績データに基づく）
-- =====================================================

-- Tamron Co., Ltd. (最多指摘ブランド #1)
('Tamron', 'VERO', 'HIGH', 'camera_lens', 'ebay', 'タムロン - VeRO指摘最多ブランド。カメラレンズメーカー。並行輸入品の取り締まりが厳格', true),
('TAMRON', 'VERO', 'HIGH', 'camera_lens', 'ebay', 'タムロン（大文字表記）', true),
('タムロン', 'VERO', 'HIGH', 'camera_lens', 'ebay', 'タムロン（日本語）', true),

-- Adidas AG (指摘頻度 #2)
('adidas', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アディダス - VeRO指摘頻度第2位。スポーツアパレル', true),
('Adidas', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アディダス（正式表記）', true),
('ADIDAS', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アディダス（大文字）', true),
('アディダス', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アディダス（日本語）', true),
('Three Stripes', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アディダスの3本ライン商標', true),

-- Nike, Inc. (指摘頻度 #3)
('Nike', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'ナイキ - VeRO指摘頻度第3位', true),
('NIKE', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'ナイキ（大文字）', true),
('ナイキ', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'ナイキ（日本語）', true),
('Swoosh', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'ナイキのスウッシュロゴ', true),
('Just Do It', 'VERO', 'MEDIUM', 'sports_apparel', 'ebay', 'ナイキのスローガン', true),

-- Okatsune Co., Ltd. (指摘頻度 #4)
('Okatsune', 'VERO', 'HIGH', 'garden_tools', 'ebay', '岡恒 - 園芸用刃物メーカー。VeRO指摘頻度第4位', true),
('岡恒', 'VERO', 'HIGH', 'garden_tools', 'ebay', '岡恒（日本語）', true),
('OKATSUNE', 'VERO', 'HIGH', 'garden_tools', 'ebay', '岡恒（大文字）', true),

-- Coach, Inc. (指摘頻度 #5)
('Coach', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'コーチ - VeRO指摘頻度第5位。高級ブランド', true),
('COACH', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'コーチ（大文字）', true),
('コーチ', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'コーチ（日本語）', true),

-- =====================================================
-- 2. 高級ブランド - VeRO登録企業
-- =====================================================

-- ファッション・アパレル
('Louis Vuitton', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'ルイ・ヴィトン - 偽造品取り締まり最厳格', true),
('LV', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'ルイ・ヴィトン略称', true),
('ルイヴィトン', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'ルイ・ヴィトン（日本語）', true),
('Gucci', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'グッチ - VeRO厳格対応', true),
('グッチ', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'グッチ（日本語）', true),
('Chanel', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'シャネル - VeRO厳格対応', true),
('CHANEL', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'シャネル（大文字）', true),
('シャネル', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'シャネル（日本語）', true),
('Hermès', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'エルメス - VeRO厳格対応', true),
('Hermes', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'エルメス（アクセント無し）', true),
('エルメス', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'エルメス（日本語）', true),
('Prada', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'プラダ', true),
('プラダ', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'プラダ（日本語）', true),
('Burberry', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'バーバリー', true),
('バーバリー', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'バーバリー（日本語）', true),
('Fendi', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'フェンディ', true),
('フェンディ', 'VERO', 'HIGH', 'luxury_brand', 'ebay', 'フェンディ（日本語）', true),

-- 高級時計ブランド
('Rolex', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'ロレックス - 各国輸入規制あり・VeRO厳格', true),
('ROLEX', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'ロレックス（大文字）', true),
('ロレックス', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'ロレックス（日本語）', true),
('Cartier', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'カルティエ', true),
('カルティエ', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'カルティエ（日本語）', true),
('Omega', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'オメガ', true),
('オメガ', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'オメガ（日本語）', true),
('Tag Heuer', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'タグ・ホイヤー', true),
('タグホイヤー', 'VERO', 'HIGH', 'luxury_watch', 'ebay', 'タグ・ホイヤー（日本語）', true),

-- =====================================================
-- 3. スポーツ・アウトドアブランド
-- =====================================================

('The North Face', 'VERO', 'HIGH', 'outdoor_brand', 'ebay', 'ザ・ノース・フェイス', true),
('ノースフェイス', 'VERO', 'HIGH', 'outdoor_brand', 'ebay', 'ノース・フェイス（日本語）', true),
('Patagonia', 'VERO', 'HIGH', 'outdoor_brand', 'ebay', 'パタゴニア', true),
('パタゴニア', 'VERO', 'HIGH', 'outdoor_brand', 'ebay', 'パタゴニア（日本語）', true),
('Columbia', 'VERO', 'MEDIUM', 'outdoor_brand', 'ebay', 'コロンビア', true),
('コロンビア', 'VERO', 'MEDIUM', 'outdoor_brand', 'ebay', 'コロンビア（日本語）', true),
('Under Armour', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アンダーアーマー', true),
('アンダーアーマー', 'VERO', 'HIGH', 'sports_apparel', 'ebay', 'アンダーアーマー（日本語）', true),
('Puma', 'VERO', 'MEDIUM', 'sports_apparel', 'ebay', 'プーマ', true),
('プーマ', 'VERO', 'MEDIUM', 'sports_apparel', 'ebay', 'プーマ（日本語）', true),

-- =====================================================
-- 4. テクノロジー・エレクトロニクス
-- =====================================================

('Apple', 'VERO', 'HIGH', 'electronics', 'ebay', 'アップル - 厳格なVeRO対応', true),
('アップル', 'VERO', 'HIGH', 'electronics', 'ebay', 'アップル（日本語）', true),
('iPhone', 'VERO', 'HIGH', 'electronics', 'ebay', 'iPhone - Apple製品', true),
('iPad', 'VERO', 'HIGH', 'electronics', 'ebay', 'iPad - Apple製品', true),
('AirPods', 'VERO', 'HIGH', 'electronics', 'ebay', 'AirPods - Apple製品', true),
('MacBook', 'VERO', 'HIGH', 'electronics', 'ebay', 'MacBook - Apple製品', true),
('Sony', 'VERO', 'MEDIUM', 'electronics', 'ebay', 'ソニー', true),
('ソニー', 'VERO', 'MEDIUM', 'electronics', 'ebay', 'ソニー（日本語）', true),
('Canon', 'VERO', 'MEDIUM', 'camera', 'ebay', 'キヤノン', true),
('キヤノン', 'VERO', 'MEDIUM', 'camera', 'ebay', 'キヤノン（日本語）', true),
('Nikon', 'VERO', 'MEDIUM', 'camera', 'ebay', 'ニコン', true),
('ニコン', 'VERO', 'MEDIUM', 'camera', 'ebay', 'ニコン（日本語）', true),

-- =====================================================
-- 5. VeRO違反パターン検出キーワード
-- =====================================================

-- Replica（レプリカ）関連
('replica', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'レプリカ - 使用禁止ワード', true),
('Replica', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'レプリカ（大文字始まり）', true),
('REPLICA', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'レプリカ（全て大文字）', true),
('レプリカ', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'レプリカ（日本語）', true),
('fake', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'フェイク - 使用禁止', true),
('Fake', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'フェイク（大文字始まり）', true),
('フェイク', 'VERO', 'HIGH', 'prohibited_term', 'ebay', 'フェイク（日本語）', true),
('counterfeit', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '偽造品 - 使用禁止', true),
('偽造品', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '偽造品（日本語）', true),
('偽物', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '偽物（日本語）', true),
('imitation', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '模造品 - 使用禁止', true),
('模造品', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '模造品（日本語）', true),
('copy', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'コピー - 文脈に注意', true),
('コピー', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'コピー（日本語）', true),

-- Novelty（ノベルティ）関連
('novelty', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'ノベルティ - 使用禁止ワード', true),
('Novelty', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'ノベルティ（大文字始まり）', true),
('ノベルティ', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'ノベルティ（日本語）', true),

-- Junk（ジャンク）関連
('junk', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'ジャンク - 責任逃れとみなされる', true),
('Junk', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'ジャンク（大文字始まり）', true),
('ジャンク', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', 'ジャンク（日本語）', true),

-- 責任逃れフレーズ
('no guarantee', 'VERO', 'HIGH', 'prohibited_phrase', 'ebay', '保証なし - 使用禁止フレーズ', true),
('not responsible', 'VERO', 'HIGH', 'prohibited_phrase', 'ebay', '責任を負いません - 禁止', true),
('as-is', 'VERO', 'MEDIUM', 'prohibited_phrase', 'ebay', '現状渡し - 文脈に注意', true),
('authenticity unknown', 'VERO', 'HIGH', 'prohibited_phrase', 'ebay', '真贋不明 - 使用禁止', true),
('cannot guarantee authentic', 'VERO', 'HIGH', 'prohibited_phrase', 'ebay', '真正性を保証できない - 禁止', true),

-- Unauthorized（無許可）関連
('unauthorized', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '無許可 - VeRO違反可能性', true),
('無許可', 'VERO', 'HIGH', 'prohibited_term', 'ebay', '無許可（日本語）', true),
('unofficial', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', '非公式 - 注意が必要', true),
('非公式', 'VERO', 'MEDIUM', 'prohibited_term', 'ebay', '非公式（日本語）', true),

-- =====================================================
-- 6. 並行輸入（Parallel Import）関連
-- =====================================================

('parallel import', 'VERO', 'MEDIUM', 'parallel_import', 'ebay', '並行輸入 - 配送先制限に注意', true),
('並行輸入', 'VERO', 'MEDIUM', 'parallel_import', 'ebay', '並行輸入（日本語）', true),
('grey market', 'VERO', 'MEDIUM', 'parallel_import', 'ebay', 'グレーマーケット - 並行輸入品', true),
('グレーマーケット', 'VERO', 'MEDIUM', 'parallel_import', 'ebay', 'グレーマーケット（日本語）', true),
('import', 'VERO', 'LOW', 'parallel_import', 'ebay', '輸入 - 文脈による', true),
('輸入品', 'VERO', 'LOW', 'parallel_import', 'ebay', '輸入品（日本語）', true),

-- =====================================================
-- 7. 日本固有のブランド・メーカー（VeRO登録企業）
-- =====================================================

-- 刃物・工具メーカー
('貝印', 'VERO', 'MEDIUM', 'japanese_brand', 'ebay', '貝印 - 刃物メーカー', true),
('KAI', 'VERO', 'MEDIUM', 'japanese_brand', 'ebay', '貝印（英語表記）', true),
('藤次郎', 'VERO', 'MEDIUM', 'japanese_brand', 'ebay', '藤次郎 - 包丁メーカー', true),
('Tojiro', 'VERO', 'MEDIUM', 'japanese_brand', 'ebay', '藤次郎（英語表記）', true),

-- アニメ・キャラクター関連
('Pokemon', 'VERO', 'HIGH', 'character', 'ebay', 'ポケモン - VeRO登録', true),
('ポケモン', 'VERO', 'HIGH', 'character', 'ebay', 'ポケモン（日本語）', true),
('Studio Ghibli', 'VERO', 'HIGH', 'character', 'ebay', 'スタジオジブリ', true),
('ジブリ', 'VERO', 'HIGH', 'character', 'ebay', 'ジブリ（日本語）', true),
('Hello Kitty', 'VERO', 'HIGH', 'character', 'ebay', 'ハローキティ - サンリオ', true),
('ハローキティ', 'VERO', 'HIGH', 'character', 'ebay', 'ハローキティ（日本語）', true),
('キティちゃん', 'VERO', 'HIGH', 'character', 'ebay', 'キティちゃん（愛称）', true),

-- =====================================================
-- 8. VeRO違反の典型的パターン
-- =====================================================

-- 画像関連違反
('stock photo', 'VERO', 'HIGH', 'image_violation', 'ebay', 'ストック写真使用 - VeRO違反', true),
('catalog image', 'VERO', 'HIGH', 'image_violation', 'ebay', 'カタログ画像使用 - 違反', true),
('official image', 'VERO', 'HIGH', 'image_violation', 'ebay', '公式画像無断使用 - 違反', true),

-- 商品状態に関する誤解を招く表現
('100% authentic', 'VERO', 'LOW', 'authenticity_claim', 'ebay', '100%本物 - 証明書必須', true),
('guaranteed authentic', 'VERO', 'LOW', 'authenticity_claim', 'ebay', '真正性保証 - 証明書必須', true),
('本物保証', 'VERO', 'LOW', 'authenticity_claim', 'ebay', '本物保証（日本語） - 証明必須', true);

-- =====================================================
-- VeRO統計・履歴テーブルの作成
-- =====================================================

-- VeRO違反履歴テーブル
CREATE TABLE IF NOT EXISTS vero_violation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL, -- 'Replica', 'Parallel Import', 'Unauthorized', etc.
    brand_name VARCHAR(255),
    detected_keywords TEXT,
    violation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    action_taken VARCHAR(100), -- 'removed', 'modified', 'appealed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VeROブランド監視リスト
CREATE TABLE IF NOT EXISTS vero_brand_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(255) NOT NULL UNIQUE,
    brand_name_ja VARCHAR(255),
    vero_participant_id VARCHAR(100),
    strictness_level VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'EXTREME'
    category VARCHAR(100),
    parallel_import_allowed BOOLEAN DEFAULT false,
    restricted_regions TEXT[], -- 販売禁止地域の配列
    notes TEXT,
    last_violation_date TIMESTAMP WITH TIME ZONE,
    violation_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_vero_violation_product ON vero_violation_history(product_id);
CREATE INDEX IF NOT EXISTS idx_vero_violation_date ON vero_violation_history(violation_date DESC);
CREATE INDEX IF NOT EXISTS idx_vero_violation_type ON vero_violation_history(violation_type);
CREATE INDEX IF NOT EXISTS idx_vero_brand_strictness ON vero_brand_watchlist(strictness_level);
CREATE INDEX IF NOT EXISTS idx_vero_brand_category ON vero_brand_watchlist(category);

-- VeROブランド監視リストの初期データ
INSERT INTO vero_brand_watchlist (brand_name, brand_name_ja, strictness_level, category, parallel_import_allowed, violation_count) VALUES
('Tamron Co., Ltd.', 'タムロン', 'EXTREME', 'camera_lens', false, 150),
('Adidas AG', 'アディダス', 'EXTREME', 'sports_apparel', false, 120),
('Nike, Inc.', 'ナイキ', 'EXTREME', 'sports_apparel', false, 110),
('Okatsune Co., Ltd.', '岡恒', 'HIGH', 'garden_tools', false, 95),
('Coach, Inc.', 'コーチ', 'EXTREME', 'luxury_brand', false, 85),
('Louis Vuitton', 'ルイ・ヴィトン', 'EXTREME', 'luxury_brand', false, 200),
('Gucci', 'グッチ', 'EXTREME', 'luxury_brand', false, 180),
('Chanel', 'シャネル', 'EXTREME', 'luxury_brand', false, 175),
('Rolex', 'ロレックス', 'EXTREME', 'luxury_watch', false, 160),
('Apple Inc.', 'アップル', 'EXTREME', 'electronics', false, 140);

COMMENT ON TABLE vero_violation_history IS 'VeRO違反の履歴を記録';
COMMENT ON TABLE vero_brand_watchlist IS 'VeRO参加ブランドの監視リスト';
COMMENT ON COLUMN vero_brand_watchlist.strictness_level IS '取り締まりの厳格度: LOW < MEDIUM < HIGH < EXTREME';
COMMENT ON COLUMN vero_brand_watchlist.parallel_import_allowed IS '並行輸入品の販売が許可されているか';
COMMENT ON COLUMN vero_brand_watchlist.restricted_regions IS '販売が制限されている地域のリスト';
