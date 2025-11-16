-- HTS（Harmonized Tariff Schedule）関連カラムを追加
-- products_masterテーブルに必要なHTSカラムを追加

-- 既存カラムの確認と追加
DO $$ 
BEGIN
  -- hts_code カラム（HTSコード本体）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_code'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_code TEXT;
    COMMENT ON COLUMN products_master.hts_code IS 'HTS分類コード（例: 3926.20.4000）10桁';
  END IF;

  -- hts_description カラム（HTSコードの説明）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_description'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_description TEXT;
    COMMENT ON COLUMN products_master.hts_description IS 'HTSコードの商品説明（例: Articles of apparel and clothing accessories）';
  END IF;

  -- hts_duty_rate カラム（関税率）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_duty_rate'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_duty_rate TEXT;
    COMMENT ON COLUMN products_master.hts_duty_rate IS 'HTS関税率（例: Free, 5.3%）';
  END IF;

  -- hts_confidence カラム（推定信頼度）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'hts_confidence'
  ) THEN
    ALTER TABLE products_master ADD COLUMN hts_confidence TEXT CHECK (hts_confidence IN ('high', 'medium', 'low', 'uncertain'));
    COMMENT ON COLUMN products_master.hts_confidence IS 'HTS推定の信頼度（high/medium/low/uncertain）';
  END IF;

  -- origin_country カラム（原産国）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'origin_country'
  ) THEN
    ALTER TABLE products_master ADD COLUMN origin_country TEXT;
    COMMENT ON COLUMN products_master.origin_country IS '原産国コード（例: JP, CN, US）';
  END IF;

  -- origin_country_duty_rate カラム（原産国別関税率）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'origin_country_duty_rate'
  ) THEN
    ALTER TABLE products_master ADD COLUMN origin_country_duty_rate TEXT;
    COMMENT ON COLUMN products_master.origin_country_duty_rate IS '原産国別の関税率';
  END IF;

  -- material カラム（素材）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'material'
  ) THEN
    ALTER TABLE products_master ADD COLUMN material TEXT;
    COMMENT ON COLUMN products_master.material IS '商品の素材（例: Cotton, Polyester）';
  END IF;

  -- material_duty_rate カラム（素材別関税率）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'material_duty_rate'
  ) THEN
    ALTER TABLE products_master ADD COLUMN material_duty_rate TEXT;
    COMMENT ON COLUMN products_master.material_duty_rate IS '素材別の関税率';
  END IF;

  RAISE NOTICE 'HTS関連カラムの追加が完了しました';
END $$;

-- インデックスの作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_master_hts_code ON products_master(hts_code);
CREATE INDEX IF NOT EXISTS idx_products_master_origin_country ON products_master(origin_country);
CREATE INDEX IF NOT EXISTS idx_products_master_hts_confidence ON products_master(hts_confidence);

COMMENT ON INDEX idx_products_master_hts_code IS 'HTSコードでの検索を高速化';
COMMENT ON INDEX idx_products_master_origin_country IS '原産国での検索を高速化';
COMMENT ON INDEX idx_products_master_hts_confidence IS '信頼度での絞り込みを高速化';
