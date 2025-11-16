-- HTSキーワードマッピングテーブル
CREATE TABLE IF NOT EXISTS hts_keyword_mapping (
  id BIGSERIAL PRIMARY KEY,
  
  -- キーワード情報
  keyword TEXT NOT NULL,              -- 検索キーワード（例: "toy", "camera", "watch"）
  keyword_type TEXT NOT NULL,         -- キーワードタイプ: 'product', 'material', 'category', 'brand'
  
  -- HTS関連
  hts_number TEXT,                    -- 完全HTSコード（10桁）
  chapter_code TEXT,                  -- Chapterコード（2桁）
  heading_code TEXT,                  -- Headingコード（4桁）
  subheading_code TEXT,               -- Subheadingコード（6桁）
  
  -- メタ情報
  confidence_score DECIMAL(3,2) DEFAULT 0.50,  -- 信頼度スコア（0.0-1.0）
  priority INTEGER DEFAULT 0,         -- 優先度（高いほど優先）
  
  -- 追加情報
  notes TEXT,                         -- 備考
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  UNIQUE(keyword, keyword_type, hts_number),
  CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_hts_keyword_mapping_keyword ON hts_keyword_mapping(keyword);
CREATE INDEX IF NOT EXISTS idx_hts_keyword_mapping_type ON hts_keyword_mapping(keyword_type);
CREATE INDEX IF NOT EXISTS idx_hts_keyword_mapping_hts ON hts_keyword_mapping(hts_number);
CREATE INDEX IF NOT EXISTS idx_hts_keyword_mapping_chapter ON hts_keyword_mapping(chapter_code);

-- 初期データ
INSERT INTO hts_keyword_mapping (keyword, keyword_type, hts_number, chapter_code, heading_code, subheading_code, confidence_score, priority, notes)
VALUES
  -- カメラ関連
  ('camera', 'product', '9006.53.00.00', '90', '9006', '900653', 0.95, 10, 'Digital cameras'),
  ('digital camera', 'product', '9006.53.00.00', '90', '9006', '900653', 0.98, 12, 'Digital cameras (exact match)'),
  ('lens', 'product', '9002.11.60.00', '90', '9002', '900211', 0.90, 8, 'Camera lenses'),
  ('photography', 'category', '9006.53.00.00', '90', '9006', '900653', 0.85, 7, 'Photography equipment'),
  
  -- 時計関連
  ('watch', 'product', '9102.11.10.00', '91', '9102', '910211', 0.95, 10, 'Wristwatches, electrically operated'),
  ('wristwatch', 'product', '9102.11.10.00', '91', '9102', '910211', 0.98, 12, 'Wristwatches (exact match)'),
  ('clock', 'product', '9105.21.40.00', '91', '9105', '910521', 0.90, 8, 'Wall clocks'),
  
  -- 玩具関連
  ('toy', 'product', '9503.00.00.80', '95', '9503', '950300', 0.85, 7, 'Other toys'),
  ('doll', 'product', '9503.00.00.21', '95', '9503', '950300', 0.90, 9, 'Dolls'),
  ('puzzle', 'product', '9503.00.00.40', '95', '9503', '950300', 0.88, 8, 'Puzzles'),
  ('game', 'product', '9504.90.90.00', '95', '9504', '950490', 0.85, 7, 'Games'),
  
  -- 素材関連
  ('plastic', 'material', '3926.90.99.80', '39', '3926', '392690', 0.70, 5, 'Other articles of plastics'),
  ('metal', 'material', '8306.29.00.00', '83', '8306', '830629', 0.70, 5, 'Other statuettes and ornaments of base metal'),
  ('wood', 'material', '4421.90.97.00', '44', '4421', '442190', 0.70, 5, 'Other articles of wood'),
  ('cotton', 'material', '6307.90.98.85', '63', '6307', '630790', 0.70, 5, 'Other made up articles of textile'),
  
  -- ブランド例（カメラ）
  ('nikon', 'brand', '9006.53.00.00', '90', '9006', '900653', 0.85, 7, 'Nikon cameras'),
  ('canon', 'brand', '9006.53.00.00', '90', '9006', '900653', 0.85, 7, 'Canon cameras'),
  ('sony', 'brand', '9006.53.00.00', '90', '9006', '900653', 0.85, 7, 'Sony cameras')
ON CONFLICT (keyword, keyword_type, hts_number) DO NOTHING;

COMMENT ON TABLE hts_keyword_mapping IS 'HTSコード自動推定用のキーワードマッピングテーブル';
COMMENT ON COLUMN hts_keyword_mapping.keyword IS '検索キーワード（小文字推奨）';
COMMENT ON COLUMN hts_keyword_mapping.keyword_type IS 'product/material/category/brand';
COMMENT ON COLUMN hts_keyword_mapping.confidence_score IS '信頼度スコア 0.0-1.0';
COMMENT ON COLUMN hts_keyword_mapping.priority IS '優先度（高いほど優先）';
