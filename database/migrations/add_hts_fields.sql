-- database/migrations/add_hts_fields.sql
-- HTS分類・関税情報フィールドの追加
-- 実行日: 2025-01-14

-- products_masterテーブルにHTS関連カラムを追加
-- ※ 既に存在する場合はエラーにならないようIF NOT EXISTSを使用

DO $$
BEGIN
  -- material (素材)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'material'
  ) THEN
    ALTER TABLE products_master ADD COLUMN material TEXT;
    COMMENT ON COLUMN products_master.material IS '商品の主要な素材（例: Cotton, Plastic, Metal）';
  END IF;

  -- origin_country (原産国)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'origin_country'
  ) THEN
    ALTER TABLE products_master ADD COLUMN origin_country TEXT;
    COMMENT ON COLUMN products_master.origin_country IS '原産国コード（ISO 3166-1 alpha-2、例: JP, CN, US）';
  END IF;

  -- hts_code (HTSコード)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_code'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_code TEXT;
    COMMENT ON COLUMN products_master.hts_code IS '10桁のHTSコード（例: 9504.90.3000）';
  END IF;

  -- hts_description (HTS説明)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_description'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_description TEXT;
    COMMENT ON COLUMN products_master.hts_description IS 'HTSコードの商品説明';
  END IF;

  -- hts_duty_rate (HTS関税率)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_duty_rate'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_duty_rate DECIMAL(10, 4);
    COMMENT ON COLUMN products_master.hts_duty_rate IS 'HTS関税率（小数、例: 0.06 = 6%）';
  END IF;

  -- hts_confidence (推定精度)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_confidence'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_confidence TEXT;
    COMMENT ON COLUMN products_master.hts_confidence IS 'HTS推定精度（uncertain/low/medium/high）';
  END IF;

  -- origin_country_duty_rate (原産国関税率)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'origin_country_duty_rate'
  ) THEN
    ALTER TABLE products_master ADD COLUMN origin_country_duty_rate DECIMAL(10, 4);
    COMMENT ON COLUMN products_master.origin_country_duty_rate IS '原産国に基づく追加関税率';
  END IF;

  -- material_duty_rate (素材関税率)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'material_duty_rate'
  ) THEN
    ALTER TABLE products_master ADD COLUMN material_duty_rate DECIMAL(10, 4);
    COMMENT ON COLUMN products_master.material_duty_rate IS '素材に基づく追加関税率';
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
  RAISE NOTICE '✅ HTS関連フィールドのマイグレーション完了';
  RAISE NOTICE '   追加されたカラム:';
  RAISE NOTICE '     - material (TEXT)';
  RAISE NOTICE '     - origin_country (TEXT)';
  RAISE NOTICE '     - hts_code (TEXT)';
  RAISE NOTICE '     - hts_description (TEXT)';
  RAISE NOTICE '     - hts_duty_rate (DECIMAL)';
  RAISE NOTICE '     - hts_confidence (TEXT)';
  RAISE NOTICE '     - origin_country_duty_rate (DECIMAL)';
  RAISE NOTICE '     - material_duty_rate (DECIMAL)';
  RAISE NOTICE '   インデックス作成完了';
END $$;
