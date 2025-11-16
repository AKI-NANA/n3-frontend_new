-- ========================================
-- Phase 2: Gemini分析テーブル作成
-- ========================================

CREATE TABLE IF NOT EXISTS gemini_analysis (
    id SERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- 入力データ
    input_prompt TEXT NOT NULL,
    
    -- 出力データ
    rewritten_title_en TEXT,
    rewritten_description_en TEXT,
    detected_material TEXT,
    detected_origin_country TEXT,
    
    -- HTS候補1（最も信頼度が高い）
    hts_candidate_1 TEXT,
    hts_confidence_1 DECIMAL(5,2) CHECK (hts_confidence_1 >= 0 AND hts_confidence_1 <= 100),
    hts_reason_1 TEXT,
    
    -- HTS候補2
    hts_candidate_2 TEXT,
    hts_confidence_2 DECIMAL(5,2) CHECK (hts_confidence_2 >= 0 AND hts_confidence_2 <= 100),
    hts_reason_2 TEXT,
    
    -- HTS候補3
    hts_candidate_3 TEXT,
    hts_confidence_3 DECIMAL(5,2) CHECK (hts_confidence_3 >= 0 AND hts_confidence_3 <= 100),
    hts_reason_3 TEXT,
    
    -- ユーザー選択
    user_selected_hts TEXT,
    user_confirmed BOOLEAN DEFAULT FALSE,
    
    -- メタデータ
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 重複防止
    UNIQUE(product_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_gemini_product_id ON gemini_analysis(product_id);
CREATE INDEX IF NOT EXISTS idx_gemini_selected_hts ON gemini_analysis(user_selected_hts);
CREATE INDEX IF NOT EXISTS idx_gemini_confirmed ON gemini_analysis(user_confirmed);
CREATE INDEX IF NOT EXISTS idx_gemini_analyzed_at ON gemini_analysis(analyzed_at);

-- コメント
COMMENT ON TABLE gemini_analysis IS 'Gemini AIによるHTS分類と英語リライト結果';
COMMENT ON COLUMN gemini_analysis.product_id IS '商品ID（products.id）';
COMMENT ON COLUMN gemini_analysis.input_prompt IS 'Geminiに送信したプロンプト';
COMMENT ON COLUMN gemini_analysis.rewritten_title_en IS 'eBay用英語タイトル（80文字以内）';
COMMENT ON COLUMN gemini_analysis.rewritten_description_en IS 'eBay用英語説明文';
COMMENT ON COLUMN gemini_analysis.detected_material IS '検出された素材';
COMMENT ON COLUMN gemini_analysis.detected_origin_country IS '検出された原産国コード';
COMMENT ON COLUMN gemini_analysis.hts_candidate_1 IS 'HTS候補1（最有力）';
COMMENT ON COLUMN gemini_analysis.hts_confidence_1 IS '信頼度1（0-100%）';
COMMENT ON COLUMN gemini_analysis.hts_reason_1 IS '判定理由1';
COMMENT ON COLUMN gemini_analysis.user_selected_hts IS 'ユーザーが選択したHTSコード';
COMMENT ON COLUMN gemini_analysis.user_confirmed IS 'ユーザー確認済みフラグ';

-- ========================================
-- トリガー: Gemini分析結果をproductsに同期
-- ========================================

CREATE OR REPLACE FUNCTION sync_gemini_to_products()
RETURNS TRIGGER AS $$
BEGIN
    -- ユーザーがHTSを選択・確認した場合のみproductsを更新
    IF NEW.user_confirmed = TRUE AND NEW.user_selected_hts IS NOT NULL THEN
        UPDATE products
        SET
            title_en = COALESCE(NEW.rewritten_title_en, title_en),
            description_en = COALESCE(NEW.rewritten_description_en, description_en),
            material = COALESCE(NEW.detected_material, material),
            origin_country = COALESCE(NEW.detected_origin_country, origin_country),
            hts_code = NEW.user_selected_hts,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_sync_gemini_data ON gemini_analysis;

CREATE TRIGGER trigger_sync_gemini_data
AFTER INSERT OR UPDATE ON gemini_analysis
FOR EACH ROW
WHEN (NEW.user_confirmed = TRUE)
EXECUTE FUNCTION sync_gemini_to_products();

-- ========================================
-- 動作確認用クエリ
-- ========================================

-- テーブル確認
SELECT 
    'gemini_analysis' AS table_name,
    COUNT(*) AS row_count,
    COUNT(CASE WHEN user_confirmed = TRUE THEN 1 END) AS confirmed_count
FROM gemini_analysis;

-- トリガー確認
SELECT 
    tgname AS trigger_name,
    tgenabled AS is_enabled,
    'gemini_analysis' AS table_name
FROM pg_trigger
WHERE tgname = 'trigger_sync_gemini_data';
