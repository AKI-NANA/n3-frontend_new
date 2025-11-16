-- database/migrations/003_add_tariff_data.sql
-- HTS判別・市場調査フィールドの追加
-- 実行日: 2025-01-14

-- products_masterテーブルに5つの新規カラムを追加
-- ※ 既に存在する場合はエラーにならないようIF NOT EXISTSを使用

DO $$
BEGIN
  -- 1. hts_code (HTSコード)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_code'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_code TEXT;
    COMMENT ON COLUMN products_master.hts_code IS '10桁のHTSコード（例: 9504.90.3000）';
  END IF;

  -- 2. origin_country (原産国)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'origin_country'
  ) THEN
    ALTER TABLE products_master ADD COLUMN origin_country TEXT;
    COMMENT ON COLUMN products_master.origin_country IS '原産国コード（ISO 3166-1 alpha-2、例: JP, CN, US）';
  END IF;

  -- 3. material (素材)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'material'
  ) THEN
    ALTER TABLE products_master ADD COLUMN material TEXT;
    COMMENT ON COLUMN products_master.material IS '商品の主要な素材（例: Cotton, Plastic, Metal）';
  END IF;

  -- 4. rewritten_english_title (リライト英語タイトル)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'rewritten_english_title'
  ) THEN
    ALTER TABLE products_master ADD COLUMN rewritten_english_title TEXT;
    COMMENT ON COLUMN products_master.rewritten_english_title IS 'AIでリライトされたSEO最適化英語タイトル';
  END IF;

  -- 5. market_research_summary (市場調査結果)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'market_research_summary'
  ) THEN
    ALTER TABLE products_master ADD COLUMN market_research_summary TEXT;
    COMMENT ON COLUMN products_master.market_research_summary IS 'AIによる市場調査結果サマリー（競合分析、価格帯、需要等）';
  END IF;

END $$;

-- インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_products_hts_code 
  ON products_master(hts_code) 
  WHERE hts_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_origin_country 
  ON products_master(origin_country) 
  WHERE origin_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_material 
  ON products_master(material) 
  WHERE material IS NOT NULL;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ HTS判別・市場調査フィールドのマイグレーション完了';
  RAISE NOTICE '   追加されたカラム:';
  RAISE NOTICE '     1. hts_code (TEXT) - HTSコード';
  RAISE NOTICE '     2. origin_country (TEXT) - 原産国';
  RAISE NOTICE '     3. material (TEXT) - 素材';
  RAISE NOTICE '     4. rewritten_english_title (TEXT) - リライトタイトル';
  RAISE NOTICE '     5. market_research_summary (TEXT) - 市場調査サマリー';
  RAISE NOTICE '   インデックス作成完了';
END $$;
