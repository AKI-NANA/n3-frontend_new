-- 原産国に関税率を追加

-- 1. origin_countriesテーブルに関税率カラムを追加
ALTER TABLE origin_countries
ADD COLUMN IF NOT EXISTS tariff_rate DECIMAL(5, 4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS section301 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tariff_notes TEXT;

-- 2. Section 301対象国（中国）の関税率を設定
UPDATE origin_countries
SET 
  tariff_rate = 0.25,
  section301 = true,
  tariff_notes = 'Section 301 Additional Tariff: 25%'
WHERE code = 'CN';

-- 3. その他の主要国の関税率を設定（通常は0%、HTSコードで決まる）
UPDATE origin_countries
SET 
  tariff_rate = 0.0,
  section301 = false,
  tariff_notes = 'Tariff determined by HTS code'
WHERE code IN ('JP', 'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU');

-- 4. USMCA対象国（関税優遇）
UPDATE origin_countries
SET 
  tariff_rate = 0.0,
  section301 = false,
  tariff_notes = 'USMCA: Duty-free or reduced tariff'
WHERE code IN ('US', 'CA', 'MX');

-- 5. EU諸国（通常関税）
UPDATE origin_countries
SET 
  tariff_rate = 0.0,
  section301 = false,
  tariff_notes = 'Tariff determined by HTS code'
WHERE code IN ('GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'NO', 'CH', 'IE', 'PT', 'GR', 'PL', 'CZ', 'HU', 'RO');

-- 6. アジア諸国
UPDATE origin_countries
SET 
  tariff_rate = 0.0,
  section301 = false,
  tariff_notes = 'Tariff determined by HTS code'
WHERE code IN ('JP', 'KR', 'TW', 'HK', 'SG', 'TH', 'MY', 'ID', 'VN', 'PH', 'IN');

-- 7. その他の国（ベトナム等、一部優遇措置あり）
UPDATE origin_countries
SET 
  tariff_rate = 0.0,
  section301 = false,
  tariff_notes = 'GSP or NTR: Reduced tariff possible'
WHERE code IN ('VN', 'BD', 'PK', 'LK');

-- 8. 確認用クエリ
SELECT 
  code,
  name,
  name_ja,
  ROUND(tariff_rate * 100, 2) as tariff_percent,
  section301,
  tariff_notes
FROM origin_countries
WHERE active = true
ORDER BY 
  section301 DESC,
  tariff_rate DESC,
  name;

-- 9. 関税率別の統計
SELECT 
  ROUND(tariff_rate * 100, 2) as tariff_percent,
  section301,
  COUNT(*) as count,
  STRING_AGG(code, ', ' ORDER BY code) as countries
FROM origin_countries
WHERE active = true
GROUP BY tariff_rate, section301
ORDER BY tariff_rate DESC;

-- 10. ビュー作成（フロントエンドで使いやすく）
CREATE OR REPLACE VIEW origin_countries_with_tariff AS
SELECT 
  code,
  name,
  name_ja,
  tariff_rate,
  ROUND(tariff_rate * 100, 2) as tariff_percent,
  section301,
  tariff_notes,
  active,
  -- 表示用ラベル
  name || ' (' || ROUND(tariff_rate * 100, 2) || '%)' as display_name,
  name_ja || ' (' || ROUND(tariff_rate * 100, 2) || '%)' as display_name_ja
FROM origin_countries
WHERE active = true
ORDER BY 
  section301 DESC,
  tariff_rate DESC,
  name;

-- 11. サンプルクエリ
-- フロントエンドで使用するクエリ例
SELECT * FROM origin_countries_with_tariff;

-- 関税率でフィルタリング
SELECT * FROM origin_countries_with_tariff
WHERE tariff_rate = 0.25;  -- Section 301のみ

-- Section 301対象国のみ
SELECT * FROM origin_countries_with_tariff
WHERE section301 = true;
