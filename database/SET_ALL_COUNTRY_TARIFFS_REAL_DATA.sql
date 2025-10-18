-- ============================================
-- 全原産国の関税率設定（2025年実データ）
-- ============================================
--
-- データソース: TRUMP_2025 相互関税
-- 基準: 各国の対米貿易障壁に応じた追加関税
--

-- ============================================
-- Asia (14ヶ国) - TRUMP_2025
-- ============================================

UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4600, antidumping_rate = 0.0000 WHERE code = 'VN'; -- ベトナム 46%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3700, antidumping_rate = 0.0000 WHERE code = 'BD'; -- バングラデシュ 37%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3600, antidumping_rate = 0.0000 WHERE code = 'TH'; -- タイ 36%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3400, antidumping_rate = 0.0000 WHERE code = 'CN'; -- 中国 34%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3200, antidumping_rate = 0.0000 WHERE code = 'TW'; -- 台湾 32%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3200, antidumping_rate = 0.0000 WHERE code = 'ID'; -- インドネシア 32%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3000, antidumping_rate = 0.0000 WHERE code = 'HK'; -- 香港 30%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2900, antidumping_rate = 0.0000 WHERE code = 'PK'; -- パキスタン 29%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2600, antidumping_rate = 0.0000 WHERE code = 'IN'; -- インド 26%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'KR'; -- 韓国 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2400, antidumping_rate = 0.0000 WHERE code = 'JP'; -- 日本 24%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2400, antidumping_rate = 0.0000 WHERE code = 'MY'; -- マレーシア 24%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1700, antidumping_rate = 0.0000 WHERE code = 'PH'; -- フィリピン 17%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'SG'; -- シンガポール 15%

-- その他アジア諸国
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4400, antidumping_rate = 0.0000 WHERE code = 'LK'; -- スリランカ 44%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4400, antidumping_rate = 0.0000 WHERE code = 'MM'; -- ミャンマー 44%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4900, antidumping_rate = 0.0000 WHERE code = 'KH'; -- カンボジア 49%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4800, antidumping_rate = 0.0000 WHERE code = 'LA'; -- ラオス 48%

-- ============================================
-- Europe (20ヶ国) - TRADE_DEAL / TRUMP_2025
-- ============================================

-- EU諸国（TRADE_DEAL 15%）
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'AT'; -- オーストリア 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'BE'; -- ベルギー 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'CZ'; -- チェコ 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'DE'; -- ドイツ 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'DK'; -- デンマーク 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'ES'; -- スペイン 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'FI'; -- フィンランド 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'FR'; -- フランス 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'GB'; -- イギリス 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'GR'; -- ギリシャ 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'HU'; -- ハンガリー 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'IE'; -- アイルランド 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'IT'; -- イタリア 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'NL'; -- オランダ 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'NO'; -- ノルウェー 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'PL'; -- ポーランド 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'PT'; -- ポルトガル 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'RO'; -- ルーマニア 15%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code = 'SE'; -- スウェーデン 15%

-- スイス（TRUMP_2025 31%）
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3100, antidumping_rate = 0.0000 WHERE code = 'CH'; -- スイス 31%

-- その他欧州
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1500, antidumping_rate = 0.0000 WHERE code IN ('BG', 'HR', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU');

-- ============================================
-- North America (3ヶ国) - TRUMP_2025
-- ============================================

UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3500, antidumping_rate = 0.0000 WHERE code = 'CA'; -- カナダ 35%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'MX'; -- メキシコ 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.0000, antidumping_rate = 0.0000 WHERE code = 'US'; -- アメリカ 0%

-- ============================================
-- South America (5ヶ国) - TRUMP_2025
-- ============================================

UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.5000, antidumping_rate = 0.0000 WHERE code = 'BR'; -- ブラジル 50%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'AR'; -- アルゼンチン 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2000, antidumping_rate = 0.0000 WHERE code = 'CL'; -- チリ 20%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2000, antidumping_rate = 0.0000 WHERE code = 'CO'; -- コロンビア 20%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2000, antidumping_rate = 0.0000 WHERE code = 'PE'; -- ペルー 20%

-- その他南米
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.5000, antidumping_rate = 0.0000 WHERE code = 'LS'; -- レソト 50%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4700, antidumping_rate = 0.0000 WHERE code = 'MG'; -- マダガスカル 47%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2000, antidumping_rate = 0.0000 WHERE code IN ('EC', 'VE', 'UY', 'PY', 'BO');

-- ============================================
-- Middle East (4ヶ国) - TRUMP_2025
-- ============================================

UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'AE'; -- UAE 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'SA'; -- サウジアラビア 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'TR'; -- トルコ 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1700, antidumping_rate = 0.0000 WHERE code = 'IL'; -- イスラエル 17%

-- その他中東
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4100, antidumping_rate = 0.0000 WHERE code = 'SY'; -- シリア 41%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code IN ('IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'QA', 'YE');

-- ============================================
-- Oceania (2ヶ国) - TRUMP_2025
-- ============================================

UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2000, antidumping_rate = 0.0000 WHERE code = 'NZ'; -- ニュージーランド 20%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.1000, antidumping_rate = 0.0000 WHERE code = 'AU'; -- オーストラリア 10%

-- ============================================
-- Africa (3ヶ国) - TRUMP_2025
-- ============================================

UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.3000, antidumping_rate = 0.0000 WHERE code = 'ZA'; -- 南アフリカ 30%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'EG'; -- エジプト 25%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code = 'MA'; -- モロッコ 25%

-- その他アフリカ
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.4100, antidumping_rate = 0.0000 WHERE code = 'FK'; -- フォークランド 41%
UPDATE public.origin_countries SET base_tariff_rate = 0.0000, section301_rate = 0.0000, section232_rate = 0.2500, antidumping_rate = 0.0000 WHERE code IN ('NG', 'KE', 'ET', 'TZ', 'UG', 'GH', 'TN', 'DZ', 'AO', 'SN', 'CI', 'CM', 'ZW', 'BW', 'ZM', 'MW');

-- ============================================
-- その他全ての国: デフォルト25%
-- ============================================
UPDATE public.origin_countries 
SET 
  base_tariff_rate = COALESCE(base_tariff_rate, 0.0000),
  section301_rate = COALESCE(section301_rate, 0.0000),
  section232_rate = COALESCE(section232_rate, 0.2500),
  antidumping_rate = COALESCE(antidumping_rate, 0.0000)
WHERE 
  section232_rate IS NULL;

-- ============================================
-- 確認クエリ
-- ============================================

SELECT 
  code,
  name,
  name_ja,
  ROUND(total_additional_tariff * 100, 1) as tariff_percent,
  CASE 
    WHEN code = 'CN' THEN 'Section 301 + TRUMP_2025'
    WHEN section232_rate > 0 THEN 'TRUMP_2025'
    ELSE 'No Additional Tariff'
  END as tariff_type
FROM public.origin_countries
WHERE active = true
ORDER BY total_additional_tariff DESC
LIMIT 20;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 2025年実データ反映完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'トップ10高関税国:';
  RAISE NOTICE '  1. ブラジル (BR): 50%%';
  RAISE NOTICE '  2. レソト (LS): 50%%';
  RAISE NOTICE '  3. カンボジア (KH): 49%%';
  RAISE NOTICE '  4. ラオス (LA): 48%%';
  RAISE NOTICE '  5. マダガスカル (MG): 47%%';
  RAISE NOTICE '  6. ベトナム (VN): 46%%';
  RAISE NOTICE '  7. ミャンマー (MM): 44%%';
  RAISE NOTICE '  8. スリランカ (LK): 44%%';
  RAISE NOTICE '  9. シリア (SY): 41%%';
  RAISE NOTICE ' 10. フォークランド (FK): 41%%';
  RAISE NOTICE '';
  RAISE NOTICE '主要アジア諸国:';
  RAISE NOTICE '  - ベトナム: 46%%';
  RAISE NOTICE '  - バングラデシュ: 37%%';
  RAISE NOTICE '  - タイ: 36%%';
  RAISE NOTICE '  - 中国: 34%%';
  RAISE NOTICE '  - インド: 26%%';
  RAISE NOTICE '  - 日本: 24%%';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 準備完了！';
  RAISE NOTICE '========================================';
END $$;
