-- CPassゾーン表から抽出されたゾーン分類
-- 抽出日時: 2025-09-20

-- 既存の暫定データ削除
DELETE FROM country_zone_mapping WHERE pdf_source = 'pending_pdf_extraction';

-- 抽出されたゾーン分類投入
INSERT INTO country_zone_mapping (country_code, country_name_en, country_name_ja, zone_code, pdf_source) VALUES
('US', 'United States', 'アメリカ合衆国', 'zone1', 'DHL_ゾーン表.pdf'),
('CA', 'Canada', 'カナダ', 'zone1', 'DHL_ゾーン表.pdf'),
('UK', 'United Kingdom', 'イギリス', 'zone2', 'DHL_ゾーン表.pdf'),
('DE', 'Germany', 'ドイツ', 'zone2', 'DHL_ゾーン表.pdf'),
('FR', 'France', 'フランス', 'zone2', 'DHL_ゾーン表.pdf'),
('IT', 'Italy', 'イタリア', 'zone2', 'DHL_ゾーン表.pdf'),
('ES', 'Spain', 'スペイン', 'zone2', 'DHL_ゾーン表.pdf'),
('NL', 'Netherlands', 'オランダ', 'zone2', 'DHL_ゾーン表.pdf'),
('BE', 'Belgium', 'ベルギー', 'zone2', 'DHL_ゾーン表.pdf'),
('AU', 'Australia', 'オーストラリア', 'zone3', 'DHL_ゾーン表.pdf'),
('NZ', 'New Zealand', 'ニュージーランド', 'zone3', 'DHL_ゾーン表.pdf'),
('SG', 'Singapore', 'シンガポール', 'zone4', 'DHL_ゾーン表.pdf'),
('HK', 'Hong Kong', '香港', 'zone4', 'DHL_ゾーン表.pdf'),
('TW', 'Taiwan', '台湾', 'zone4', 'DHL_ゾーン表.pdf'),
('KR', 'South Korea', '韓国', 'zone4', 'DHL_ゾーン表.pdf'),
('TH', 'Thailand', 'タイ', 'zone4', 'DHL_ゾーン表.pdf'),
('MY', 'Malaysia', 'マレーシア', 'zone4', 'DHL_ゾーン表.pdf'),
('BR', 'Brazil', 'ブラジル', 'zone5', 'DHL_ゾーン表.pdf'),
('MX', 'Mexico', 'メキシコ', 'zone5', 'DHL_ゾーン表.pdf'),
('AR', 'Argentina', 'アルゼンチン', 'zone5', 'DHL_ゾーン表.pdf'),
('IN', 'India', 'インド', 'zone5', 'DHL_ゾーン表.pdf'),
('AE', 'United Arab Emirates', 'アラブ首長国連邦', 'zone5', 'DHL_ゾーン表.pdf'),
('ZA', 'South Africa', '南アフリカ', 'zone6', 'DHL_ゾーン表.pdf'),
('KE', 'Kenya', 'ケニア', 'zone6', 'DHL_ゾーン表.pdf'),
('NG', 'Nigeria', 'ナイジェリア', 'zone6', 'DHL_ゾーン表.pdf'),
('RU', 'Russia', 'ロシア', 'zone7', 'DHL_ゾーン表.pdf'),
('KZ', 'Kazakhstan', 'カザフスタン', 'zone7', 'DHL_ゾーン表.pdf'),
('MN', 'Mongolia', 'モンゴル', 'zone7', 'DHL_ゾーン表.pdf'),
('IS', 'Iceland', 'アイスランド', 'zone8', 'DHL_ゾーン表.pdf'),
('GL', 'Greenland', 'グリーンランド', 'zone8', 'DHL_ゾーン表.pdf'),
('MG', 'Madagascar', 'マダガスカル', 'zone8', 'DHL_ゾーン表.pdf');

-- 投入件数: 31 件
-- 抽出完了: CPass基準ゾーン分類
