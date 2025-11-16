-- ===================================================================
-- HTS学習システム Phase 2-B: products_masterテーブル拡張
-- ===================================================================
-- 作成日: 2025-01-14
-- 目的: HTSスコア・Gemini統合フィールドを追加
-- ===================================================================

-- 1. HTS学習システム用カラム追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS hts_score INTEGER,
ADD COLUMN IF NOT EXISTS hts_confidence VARCHAR(20) CHECK (hts_confidence IN ('very_high', 'high', 'medium', 'low', 'uncertain')),
ADD COLUMN IF NOT EXISTS hts_source VARCHAR(50) CHECK (hts_source IN ('learning', 'category_master', 'brand_master', 'material_pattern', 'official')),
ADD COLUMN IF NOT EXISTS origin_country_hint TEXT;

-- 2. Gemini統合用カラム追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS hts_keywords TEXT,
ADD COLUMN IF NOT EXISTS market_research_summary TEXT,
ADD COLUMN IF NOT EXISTS market_score INTEGER CHECK (market_score >= 0 AND market_score <= 100);

-- 3. インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_hts_score ON products_master(hts_score);
CREATE INDEX IF NOT EXISTS idx_hts_confidence ON products_master(hts_confidence);
CREATE INDEX IF NOT EXISTS idx_market_score ON products_master(market_score);

-- 4. コメント追加
COMMENT ON COLUMN products_master.hts_score IS 'HTSコードの信頼度スコア（0-1000）。学習済み=900+、マスター推定=700-899、検索結果=0-699';
COMMENT ON COLUMN products_master.hts_confidence IS 'HTSコードの信頼度レベル: very_high（学習済み）、high（マスター推定）、medium（検索結果）、low/uncertain（要確認）';
COMMENT ON COLUMN products_master.hts_source IS 'HTSコードの取得元: learning（学習データ）、category_master（カテゴリー推定）、brand_master（ブランド推定）、material_pattern（素材パターン）、official（公式検索）';
COMMENT ON COLUMN products_master.origin_country_hint IS '原産国候補（カンマ区切り）例: 日本(JP),中国(CN),アメリカ(US)';
COMMENT ON COLUMN products_master.hts_keywords IS 'Gemini生成のHTSキーワード（カンマ区切り）例: trading cards, collectible, pokemon';
COMMENT ON COLUMN products_master.market_research_summary IS 'Gemini生成の市場調査サマリー';
COMMENT ON COLUMN products_master.market_score IS 'Gemini生成の市場適合スコア（0-100）';

-- ===================================================================
-- 実行確認
-- ===================================================================
-- 以下のクエリで新しいカラムを確認できます:
-- 
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'products_master' 
--   AND column_name IN ('hts_score', 'hts_confidence', 'hts_source', 'hts_keywords', 'market_score')
-- ORDER BY ordinal_position;
