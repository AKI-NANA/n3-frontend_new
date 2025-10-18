-- 原産国別関税率テーブル
-- USAは原産国ごとに異なる関税率を設定している

CREATE TABLE IF NOT EXISTS hs_codes_by_country (
  id SERIAL PRIMARY KEY,
  hs_code TEXT NOT NULL,
  origin_country TEXT NOT NULL,  -- JP, CN, DE, KR, etc.
  duty_rate NUMERIC(6,4) NOT NULL,  -- 関税率（例: 0.045 = 4.5%）
  special_program TEXT,  -- 'MFN', 'FTA', 'GSP', 'Section301'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hs_code, origin_country)
);

-- インデックス
CREATE INDEX idx_hs_country ON hs_codes_by_country(hs_code, origin_country);

-- サンプルデータ（カメラ三脚: 9006.91.0000）
INSERT INTO hs_codes_by_country (hs_code, origin_country, duty_rate, special_program, notes) VALUES
  ('9006.91.0000', 'JP', 0.045, 'MFN', '日本: 最惠国待遇'),
  ('9006.91.0000', 'CN', 0.2950, 'Section301', '中国: 基本4.5% + Section301 25%'),
  ('9006.91.0000', 'KR', 0.045, 'FTA', '韓国: 米韓FTA'),
  ('9006.91.0000', 'DE', 0.045, 'MFN', 'ドイツ: 最惠国待遇'),
  ('9006.91.0000', 'US', 0.000, 'Domestic', '米国製: 関税なし');

-- サンプルデータ（教育用器具: 9023.00.0000）
INSERT INTO hs_codes_by_country (hs_code, origin_country, duty_rate, special_program, notes) VALUES
  ('9023.00.0000', 'JP', 0.000, 'Free', '日本: 無税'),
  ('9023.00.0000', 'CN', 0.000, 'Free', '中国: 無税（Section301対象外）'),
  ('9023.00.0000', 'KR', 0.000, 'Free', '韓国: 無税'),
  ('9023.00.0000', 'DE', 0.000, 'Free', 'ドイツ: 無税');

COMMENT ON TABLE hs_codes_by_country IS 'USAの原産国別HTS関税率';
COMMENT ON COLUMN hs_codes_by_country.duty_rate IS '実効関税率（Section301等を含む最終税率）';
COMMENT ON COLUMN hs_codes_by_country.special_program IS 'MFN=最惠国, FTA=自由貿易協定, GSP=一般特恵, Section301=中国追加関税';
