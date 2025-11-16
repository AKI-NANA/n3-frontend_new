-- AI商品データ強化システム用テーブル作成
-- 実行日: 2025-10-29

-- 1. hs_codes_by_country テーブル（HTSコードと原産国別の関税率）
CREATE TABLE IF NOT EXISTS hs_codes_by_country (
  id SERIAL PRIMARY KEY,
  hs_code TEXT NOT NULL,              -- 10桁HTSコード (例: 9006.91.0000)
  origin_country TEXT NOT NULL,       -- 原産国コード (JP, CN, DE, etc.)
  duty_rate NUMERIC(6,4) NOT NULL,    -- 関税率 (例: 0.2400 = 24%)
  special_program TEXT,               -- MFN, FTA, Section301, etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hs_code, origin_country)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_hs_country ON hs_codes_by_country(hs_code, origin_country);

-- サンプルデータ挿入（カメラ三脚のHTSコード）
INSERT INTO hs_codes_by_country (hs_code, origin_country, duty_rate, special_program, notes) VALUES
  ('9006.91.0000', 'JP', 0.2400, 'TRUMP_2025', 'Camera tripods and supports - Japan origin'),
  ('9006.91.0000', 'CN', 0.3400, 'TRUMP_2025', 'Camera tripods and supports - China origin'),
  ('9006.91.0000', 'DE', 0.1500, 'TRADE_DEAL', 'Camera tripods and supports - Germany origin'),
  ('9006.91.0000', 'KR', 0.2500, 'TRUMP_2025', 'Camera tripods and supports - Korea origin'),
  ('9006.91.0000', 'US', 0.0000, 'DOMESTIC', 'Camera tripods and supports - US origin')
ON CONFLICT (hs_code, origin_country) DO NOTHING;

-- 2. origin_countries テーブル（原産国マスターデータ）
CREATE TABLE IF NOT EXISTS origin_countries (
  code TEXT PRIMARY KEY,              -- 国コード (JP, CN, US, etc.)
  name TEXT NOT NULL,                 -- 英語名
  name_ja TEXT,                       -- 日本語名
  base_tariff_rate NUMERIC(6,4),      -- 基本関税率
  section301_rate NUMERIC(6,4),       -- Section 301追加関税
  section232_rate NUMERIC(6,4),       -- Section 232追加関税（TRUMP 2025）
  antidumping_rate NUMERIC(6,4),      -- アンチダンピング税
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 主要国の関税率データ挿入（TRUMP 2025年版）
INSERT INTO origin_countries (code, name, name_ja, base_tariff_rate, section301_rate, section232_rate, antidumping_rate, active) VALUES
  ('JP', 'Japan', '日本', 0.2400, 0.0000, 0.0000, 0.0000, true),
  ('CN', 'China', '中国', 0.2400, 0.1000, 0.0000, 0.0000, true),
  ('KR', 'South Korea', '韓国', 0.2500, 0.0000, 0.0000, 0.0000, true),
  ('DE', 'Germany', 'ドイツ', 0.1500, 0.0000, 0.0000, 0.0000, true),
  ('US', 'United States', 'アメリカ', 0.0000, 0.0000, 0.0000, 0.0000, true),
  ('TW', 'Taiwan', '台湾', 0.2200, 0.0000, 0.0000, 0.0000, true),
  ('VN', 'Vietnam', 'ベトナム', 0.1800, 0.0000, 0.0000, 0.0000, true),
  ('TH', 'Thailand', 'タイ', 0.1800, 0.0000, 0.0000, 0.0000, true),
  ('IN', 'India', 'インド', 0.2000, 0.0000, 0.0000, 0.0000, true),
  ('MX', 'Mexico', 'メキシコ', 0.0500, 0.0000, 0.0000, 0.0000, true)
ON CONFLICT (code) DO NOTHING;

-- 3. products テーブルへのカラム追加確認（既存テーブルに追加）
-- english_titleカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'english_title'
  ) THEN
    ALTER TABLE products ADD COLUMN english_title TEXT;
  END IF;
END $$;

-- listing_dataカラムが存在しない場合は追加（JOSNBタイプ）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'listing_data'
  ) THEN
    ALTER TABLE products ADD COLUMN listing_data JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- listing_dataにインデックスを作成（JSONB検索用）
CREATE INDEX IF NOT EXISTS idx_products_listing_data ON products USING GIN (listing_data);

-- 完了メッセージ
COMMENT ON TABLE hs_codes_by_country IS 'AI商品データ強化システム: HTSコードと原産国別の関税率';
COMMENT ON TABLE origin_countries IS 'AI商品データ強化システム: 原産国マスターデータ（TRUMP 2025関税含む）';
