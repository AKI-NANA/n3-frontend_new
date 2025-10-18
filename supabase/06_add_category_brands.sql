-- ============================================
-- カテゴリ別VeROブランド追加
-- ゴルフ・カメラ・時計・USA製品等
-- ============================================

-- ゴルフブランド
INSERT INTO vero_brand_rules (brand_name, brand_name_ja, keywords, force_used_condition, recommended_condition, category, notes, violation_count, is_active) VALUES
('Titleist', 'タイトリスト', ARRAY['Titleist', 'titleist', 'TITLEIST', 'タイトリスト'], false, 'LIKE_NEW', 'golf', 'ゴルフ: 世界的ゴルフブランド', 0, true),
('Callaway', 'キャロウェイ', ARRAY['Callaway', 'callaway', 'CALLAWAY', 'キャロウェイ'], false, 'LIKE_NEW', 'golf', 'ゴルフ: 人気ゴルフクラブメーカー', 0, true),
('TaylorMade', 'テーラーメイド', ARRAY['TaylorMade', 'taylormade', 'TAYLORMADE', 'テーラーメイド'], false, 'LIKE_NEW', 'golf', 'ゴルフ: 世界的ゴルフブランド', 0, true),
('Ping', 'ピン', ARRAY['Ping', 'ping', 'PING', 'ピン'], false, 'LIKE_NEW', 'golf', 'ゴルフ: カスタムフィッティングで有名', 0, true),
('Mizuno', 'ミズノ', ARRAY['Mizuno', 'mizuno', 'MIZUNO', 'ミズノ'], false, 'LIKE_NEW', 'golf', 'ゴルフ/スポーツ: 日本の総合スポーツメーカー', 0, true)
ON CONFLICT (brand_name) DO NOTHING;

-- カメラ・レンズブランド
INSERT INTO vero_brand_rules (brand_name, brand_name_ja, keywords, force_used_condition, recommended_condition, category, notes, violation_count, is_active) VALUES
('Leica', 'ライカ', ARRAY['Leica', 'leica', 'LEICA', 'ライカ'], true, 'LIKE_NEW', 'camera', 'カメラ: 高級カメラブランド。並行輸入注意', 0, true),
('Zeiss', 'ツァイス', ARRAY['Zeiss', 'zeiss', 'ZEISS', 'Carl Zeiss', 'ツァイス', 'カールツァイス'], true, 'LIKE_NEW', 'camera', 'カメラ: 高級レンズメーカー', 0, true),
('Hasselblad', 'ハッセルブラッド', ARRAY['Hasselblad', 'hasselblad', 'HASSELBLAD', 'ハッセルブラッド'], true, 'LIKE_NEW', 'camera', 'カメラ: 中判カメラの最高峰', 0, true),
('Fujifilm', '富士フイルム', ARRAY['Fujifilm', 'fujifilm', 'FUJIFILM', 'Fuji', '富士フイルム', 'フジフィルム'], false, 'LIKE_NEW', 'camera', 'カメラ: 日本の写真・光学メーカー', 0, true),
('Olympus', 'オリンパス', ARRAY['Olympus', 'olympus', 'OLYMPUS', 'オリンパス'], false, 'LIKE_NEW', 'camera', 'カメラ: 日本の光学機器メーカー', 0, true),
('Pentax', 'ペンタックス', ARRAY['Pentax', 'pentax', 'PENTAX', 'ペンタックス'], false, 'LIKE_NEW', 'camera', 'カメラ: 日本の光学機器メーカー', 0, true)
ON CONFLICT (brand_name) DO NOTHING;

-- 時計ブランド
INSERT INTO vero_brand_rules (brand_name, brand_name_ja, keywords, force_used_condition, recommended_condition, category, notes, violation_count, is_active) VALUES
('Omega', 'オメガ', ARRAY['Omega', 'omega', 'OMEGA', 'オメガ'], true, 'LIKE_NEW', 'watch', '時計: スイス高級時計ブランド', 0, true),
('TAG Heuer', 'タグホイヤー', ARRAY['TAG Heuer', 'tag heuer', 'TAG HEUER', 'タグホイヤー', 'タグ・ホイヤー'], true, 'LIKE_NEW', 'watch', '時計: スイス高級時計ブランド', 0, true),
('Breitling', 'ブライトリング', ARRAY['Breitling', 'breitling', 'BREITLING', 'ブライトリング'], true, 'LIKE_NEW', 'watch', '時計: スイス高級時計ブランド', 0, true),
('IWC', 'IWC', ARRAY['IWC', 'iwc', 'International Watch Company'], true, 'LIKE_NEW', 'watch', '時計: スイス高級時計ブランド', 0, true),
('Panerai', 'パネライ', ARRAY['Panerai', 'panerai', 'PANERAI', 'パネライ'], true, 'LIKE_NEW', 'watch', '時計: イタリア高級時計ブランド', 0, true),
('Audemars Piguet', 'オーデマピゲ', ARRAY['Audemars Piguet', 'audemars piguet', 'AUDEMARS PIGUET', 'AP', 'オーデマピゲ'], true, 'LIKE_NEW', 'watch', '時計: スイス最高級時計ブランド', 0, true),
('Patek Philippe', 'パテックフィリップ', ARRAY['Patek Philippe', 'patek philippe', 'PATEK PHILIPPE', 'パテックフィリップ', 'パテック'], true, 'LIKE_NEW', 'watch', '時計: スイス最高級時計ブランド', 0, true),
('G-Shock', 'Gショック', ARRAY['G-Shock', 'g-shock', 'G-SHOCK', 'Gショック', 'ジーショック'], false, 'NEW', 'watch', '時計: カシオの人気シリーズ', 0, true)
ON CONFLICT (brand_name) DO NOTHING;

-- USA製品・アメリカンブランド
INSERT INTO vero_brand_rules (brand_name, brand_name_ja, keywords, force_used_condition, recommended_condition, category, notes, violation_count, is_active) VALUES
('Harley-Davidson', 'ハーレーダビッドソン', ARRAY['Harley-Davidson', 'harley-davidson', 'HARLEY-DAVIDSON', 'Harley', 'ハーレー', 'ハーレーダビッドソン'], true, 'LIKE_NEW', 'motorcycle', 'バイク: アメリカのオートバイメーカー', 0, true),
('Levi''s', 'リーバイス', ARRAY['Levi''s', 'levis', 'LEVI''S', 'Levi', 'リーバイス'], false, 'LIKE_NEW', 'fashion', 'ファッション: アメリカのデニムブランド', 0, true),
('Ralph Lauren', 'ラルフローレン', ARRAY['Ralph Lauren', 'ralph lauren', 'RALPH LAUREN', 'Polo', 'ラルフローレン', 'ポロ'], true, 'LIKE_NEW', 'fashion', 'ファッション: アメリカ高級ブランド', 0, true),
('Tommy Hilfiger', 'トミーヒルフィガー', ARRAY['Tommy Hilfiger', 'tommy hilfiger', 'TOMMY HILFIGER', 'トミーヒルフィガー', 'トミー'], false, 'LIKE_NEW', 'fashion', 'ファッション: アメリカンカジュアル', 0, true),
('Oakley', 'オークリー', ARRAY['Oakley', 'oakley', 'OAKLEY', 'オークリー'], false, 'LIKE_NEW', 'sports_gear', 'スポーツ: アメリカのサングラスブランド', 0, true),
('Ray-Ban', 'レイバン', ARRAY['Ray-Ban', 'ray-ban', 'RAY-BAN', 'RayBan', 'レイバン'], true, 'LIKE_NEW', 'fashion_accessory', 'ファッション: アメリカのサングラスブランド', 0, true),
('Zippo', 'ジッポ', ARRAY['Zippo', 'zippo', 'ZIPPO', 'ジッポ', 'ジッポー'], false, 'LIKE_NEW', 'lifestyle', 'ライター: アメリカのライターブランド', 0, true)
ON CONFLICT (brand_name) DO NOTHING;

-- 音響機器ブランド
INSERT INTO vero_brand_rules (brand_name, brand_name_ja, keywords, force_used_condition, recommended_condition, category, notes, violation_count, is_active) VALUES
('Bose', 'ボーズ', ARRAY['Bose', 'bose', 'BOSE', 'ボーズ'], true, 'LIKE_NEW', 'audio', 'オーディオ: アメリカの音響機器メーカー', 0, true),
('JBL', 'JBL', ARRAY['JBL', 'jbl'], false, 'LIKE_NEW', 'audio', 'オーディオ: アメリカのスピーカーブランド', 0, true),
('Beats', 'ビーツ', ARRAY['Beats', 'beats', 'BEATS', 'Beats by Dre', 'ビーツ'], true, 'LIKE_NEW', 'audio', 'オーディオ: Apple傘下のヘッドホンブランド', 0, true),
('Sennheiser', 'ゼンハイザー', ARRAY['Sennheiser', 'sennheiser', 'SENNHEISER', 'ゼンハイザー'], false, 'LIKE_NEW', 'audio', 'オーディオ: ドイツの音響機器メーカー', 0, true),
('Audio-Technica', 'オーディオテクニカ', ARRAY['Audio-Technica', 'audio-technica', 'AUDIO-TECHNICA', 'オーディオテクニカ'], false, 'LIKE_NEW', 'audio', 'オーディオ: 日本の音響機器メーカー', 0, true)
ON CONFLICT (brand_name) DO NOTHING;

-- 楽器ブランド
INSERT INTO vero_brand_rules (brand_name, brand_name_ja, keywords, force_used_condition, recommended_condition, category, notes, violation_count, is_active) VALUES
('Gibson', 'ギブソン', ARRAY['Gibson', 'gibson', 'GIBSON', 'ギブソン'], true, 'LIKE_NEW', 'musical_instrument', '楽器: アメリカのギターブランド', 0, true),
('Fender', 'フェンダー', ARRAY['Fender', 'fender', 'FENDER', 'フェンダー'], true, 'LIKE_NEW', 'musical_instrument', '楽器: アメリカのギターブランド', 0, true),
('Yamaha', 'ヤマハ', ARRAY['Yamaha', 'yamaha', 'YAMAHA', 'ヤマハ'], false, 'LIKE_NEW', 'musical_instrument', '楽器: 日本の総合楽器メーカー', 0, true),
('Roland', 'ローランド', ARRAY['Roland', 'roland', 'ROLAND', 'ローランド'], false, 'LIKE_NEW', 'musical_instrument', '楽器: 日本の電子楽器メーカー', 0, true),
('Korg', 'コルグ', ARRAY['Korg', 'korg', 'KORG', 'コルグ'], false, 'LIKE_NEW', 'musical_instrument', '楽器: 日本の電子楽器メーカー', 0, true)
ON CONFLICT (brand_name) DO NOTHING;

-- 結果確認
SELECT 
    '✅ カテゴリ別ブランド追加完了' as status,
    COUNT(*) as total_brands
FROM vero_brand_rules;

-- カテゴリ別集計
SELECT 
    category as "カテゴリ",
    COUNT(*) as "ブランド数",
    COUNT(CASE WHEN force_used_condition THEN 1 END) as "新品禁止",
    array_agg(brand_name ORDER BY brand_name) FILTER (WHERE brand_name IS NOT NULL) as "ブランドリスト"
FROM vero_brand_rules
GROUP BY category
ORDER BY COUNT(*) DESC;
