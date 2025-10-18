-- ============================================
-- 全原産国の関税率設定
-- ============================================
--
-- 2025年トランプ関税（TRUMP_2025）を含む
-- 全ての国の追加関税率を設定
--

-- ============================================
-- Section 301: 中国 25%
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.2500,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'CN';

-- ============================================
-- TRUMP_2025: 中東諸国 17-25%
-- ============================================

-- UAE（アラブ首長国連邦）: 25%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.2500,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'AE';

-- イスラエル: 17%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.1700,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'IL';

-- サウジアラビア: 25%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.2500,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'SA';

-- トルコ: 25%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.2500,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'TR';

-- その他中東諸国（画像に表示されていないが、同様に設定）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.2500,  -- TRUMP_2025 デフォルト25%
  antidumping_rate = 0.0000
WHERE code IN ('IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'QA', 'SY', 'YE');

-- ============================================
-- TRUMP_2025: 南米諸国 25-50%
-- ============================================

-- アルゼンチン: 25%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.2500,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'AR';

-- ブラジル: 50%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.5000,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'BR';

-- チリ: 30%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.3000,  -- TRUMP_2025
  antidumping_rate = 0.0000
WHERE code = 'CL';

-- その他南米諸国
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.2500,  -- TRUMP_2025 デフォルト25%
  antidumping_rate = 0.0000
WHERE code IN ('CO', 'EC', 'PE', 'VE', 'UY', 'PY', 'BO');

-- ============================================
-- USMCA（関税優遇）: 米国・カナダ・メキシコ 0%
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN ('US', 'CA', 'MX');

-- ============================================
-- EU諸国: 0%（通常関税のみ）
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN (
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 
  'FI', 'NO', 'CH', 'IE', 'PT', 'GR', 'PL', 'CZ', 'HU', 'RO',
  'BG', 'HR', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU'
);

-- ============================================
-- アジア主要国: 0%（日本、韓国、台湾、香港、シンガポール）
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN ('JP', 'KR', 'TW', 'HK', 'SG');

-- ============================================
-- その他アジア諸国: 0-10%
-- ============================================

-- ベトナム: 0%（GSP優遇）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'VN';

-- タイ: 0%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'TH';

-- マレーシア: 0%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'MY';

-- インドネシア: 0%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'ID';

-- フィリピン: 0%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'PH';

-- インド: 10%（一部製品にアンチダンピング）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.1000,
  antidumping_rate = 0.0000
WHERE code = 'IN';

-- バングラデシュ: 0%（GSP優遇）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'BD';

-- パキスタン: 0%（GSP優遇）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'PK';

-- スリランカ: 0%（GSP優遇）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'LK';

-- ============================================
-- オセアニア: 0%
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN ('AU', 'NZ');

-- ============================================
-- アフリカ諸国: 0%（GSP優遇が多い）
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN (
  'ZA', 'EG', 'NG', 'KE', 'ET', 'TZ', 'UG', 'GH', 'MA', 'TN',
  'DZ', 'AO', 'SN', 'CI', 'CM', 'ZW', 'MG', 'BW', 'ZM', 'MW'
);

-- ============================================
-- ロシア・旧ソ連諸国: 制裁対象国
-- ============================================

-- ロシア: 35%（制裁関税）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.3500,  -- 制裁関税
  antidumping_rate = 0.0000
WHERE code = 'RU';

-- ベラルーシ: 35%（制裁関税）
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.3500,  -- 制裁関税
  antidumping_rate = 0.0000
WHERE code = 'BY';

-- その他旧ソ連諸国: 0%
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN ('UA', 'KZ', 'UZ', 'GE', 'AZ', 'AM', 'MD', 'TM', 'TJ', 'KG');

-- ============================================
-- その他全ての国: 0%（デフォルト）
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = COALESCE(base_tariff_rate, 0.0000),
  section301_rate = COALESCE(section301_rate, 0.0000),
  section232_rate = COALESCE(section232_rate, 0.0000),
  antidumping_rate = COALESCE(antidumping_rate, 0.0000)
WHERE 
  base_tariff_rate IS NULL 
  OR section301_rate IS NULL 
  OR section232_rate IS NULL 
  OR antidumping_rate IS NULL;

-- ============================================
-- 確認クエリ
-- ============================================

-- 関税率が設定された国の一覧
SELECT 
  code,
  name,
  name_ja,
  section301_rate,
  section232_rate,
  antidumping_rate,
  total_additional_tariff,
  ROUND((base_tariff_rate + total_additional_tariff) * 100, 2) as total_percent,
  CASE 
    WHEN section301_rate > 0 THEN 'Section 301'
    WHEN section232_rate > 0 THEN 'TRUMP_2025 / Section 232'
    WHEN antidumping_rate > 0 THEN 'Anti-dumping'
    ELSE 'No Additional Tariff'
  END as tariff_type
FROM public.origin_countries
WHERE active = true
ORDER BY total_additional_tariff DESC, name;

-- 統計
SELECT 
  CASE 
    WHEN total_additional_tariff = 0 THEN '0% (無関税)'
    WHEN total_additional_tariff <= 0.10 THEN '1-10%'
    WHEN total_additional_tariff <= 0.20 THEN '11-20%'
    WHEN total_additional_tariff <= 0.30 THEN '21-30%'
    WHEN total_additional_tariff <= 0.40 THEN '31-40%'
    ELSE '41%以上'
  END as tariff_range,
  COUNT(*) as country_count
FROM public.origin_countries
WHERE active = true
GROUP BY 
  CASE 
    WHEN total_additional_tariff = 0 THEN '0% (無関税)'
    WHEN total_additional_tariff <= 0.10 THEN '1-10%'
    WHEN total_additional_tariff <= 0.20 THEN '11-20%'
    WHEN total_additional_tariff <= 0.30 THEN '21-30%'
    WHEN total_additional_tariff <= 0.40 THEN '31-40%'
    ELSE '41%以上'
  END
ORDER BY MIN(total_additional_tariff);

-- 完了メッセージ
DO $$
DECLARE
  total_countries INTEGER;
  countries_with_tariff INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_countries FROM public.origin_countries WHERE active = true;
  SELECT COUNT(*) INTO countries_with_tariff FROM public.origin_countries 
    WHERE active = true AND total_additional_tariff > 0;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 全原産国の関税率設定完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '総国数: % 件', total_countries;
  RAISE NOTICE '追加関税あり: % 件', countries_with_tariff;
  RAISE NOTICE '追加関税なし: % 件', total_countries - countries_with_tariff;
  RAISE NOTICE '';
  RAISE NOTICE '主な追加関税対象国:';
  RAISE NOTICE '  - 中国 (CN): 25%% (Section 301)';
  RAISE NOTICE '  - ブラジル (BR): 50%% (TRUMP_2025)';
  RAISE NOTICE '  - ロシア (RU): 35%% (制裁関税)';
  RAISE NOTICE '  - UAE (AE): 25%% (TRUMP_2025)';
  RAISE NOTICE '  - サウジ (SA): 25%% (TRUMP_2025)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 準備完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
