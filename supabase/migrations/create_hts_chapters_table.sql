-- HTS Chapters マスターテーブル
-- Chapter（2桁）レベルの正式な説明を格納

CREATE TABLE IF NOT EXISTS hts_codes_chapters (
  id BIGSERIAL PRIMARY KEY,
  chapter_code TEXT NOT NULL UNIQUE, -- '01', '02', ..., '99'
  title_english TEXT NOT NULL, -- 英語の正式なChapter名
  title_japanese TEXT, -- 日本語のChapter名
  description_english TEXT, -- 英語の詳細説明
  description_japanese TEXT, -- 日本語の詳細説明
  notes TEXT, -- 追加のメモや注意事項
  section_number INTEGER, -- Section番号（1-21）
  section_title TEXT, -- Section名（例：SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS）
  sort_order INTEGER NOT NULL, -- 表示順序
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_hts_chapters_code ON hts_codes_chapters(chapter_code);
CREATE INDEX idx_hts_chapters_section ON hts_codes_chapters(section_number);
CREATE INDEX idx_hts_chapters_sort ON hts_codes_chapters(sort_order);

-- コメント追加
COMMENT ON TABLE hts_codes_chapters IS 'HTS分類のChapter（2桁）マスターテーブル';
COMMENT ON COLUMN hts_codes_chapters.chapter_code IS 'Chapter番号（01-99）';
COMMENT ON COLUMN hts_codes_chapters.section_number IS 'HTS Section番号（1-21）';

-- サンプルデータ挿入（Section I - Chapters 01-05）
INSERT INTO hts_codes_chapters (
  chapter_code, 
  title_english, 
  title_japanese,
  description_english,
  section_number,
  section_title,
  sort_order
) VALUES
  ('01', 'Live animals', '生きている動物', 'Live animals', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 1),
  ('02', 'Meat and edible meat offal', '肉及び食用のくず肉', 'Meat and edible meat offal', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 2),
  ('03', 'Fish and crustaceans, molluscs and other aquatic invertebrates', '魚並びに甲殻類、軟体動物及びその他の水棲無脊椎動物', 'Fish and crustaceans, molluscs and other aquatic invertebrates', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 3),
  ('04', 'Dairy produce; birds'' eggs; natural honey; edible products of animal origin, not elsewhere specified or included', '酪農品、鳥卵、天然はちみつ及び他の類に該当しない食用の動物性生産品', 'Dairy produce; birds'' eggs; natural honey; edible products of animal origin, not elsewhere specified or included', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 4),
  ('05', 'Products of animal origin, not elsewhere specified or included', '動物性生産品（他の類に該当しないもの）', 'Products of animal origin, not elsewhere specified or included', 1, 'SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS', 5)
ON CONFLICT (chapter_code) DO NOTHING;
