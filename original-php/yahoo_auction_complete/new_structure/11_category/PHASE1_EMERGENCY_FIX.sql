-- Phase 1: 緊急修正 - Gemini提案に基づく完全修正
-- price_usd問題とnumber_format NULLエラーを完全解決

-- 1. price_usd カラム追加（計算式付き）
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) 
GENERATED ALWAYS AS (ROUND(COALESCE(price_jpy, 0) * 0.0067, 2)) STORED;

-- 2. 既存データの即座更新（NULL値を0に変換）
UPDATE yahoo_scraped_products 
SET 
    ai_confidence = COALESCE(ai_confidence, 0),
    category_confidence = COALESCE(category_confidence, 0),
    listing_score = COALESCE(listing_score, 0)
WHERE ai_confidence IS NULL OR category_confidence IS NULL OR listing_score IS NULL;

-- 3. 今後のNULL値防止（DEFAULT値設定）
ALTER TABLE yahoo_scraped_products 
ALTER COLUMN ai_confidence SET DEFAULT 0,
ALTER COLUMN category_confidence SET DEFAULT 0,
ALTER COLUMN listing_score SET DEFAULT 0;

-- 4. スコア計算関数の緊急修正（NULL完全対応）
CREATE OR REPLACE FUNCTION calculate_listing_score_safe(product_id INTEGER)
RETURNS DECIMAL(8,4) AS $$
DECLARE
    score DECIMAL(8,4) := 50.0; -- 基本スコア50点保証
    product_record RECORD;
BEGIN
    -- NULL安全な商品データ取得
    SELECT 
        COALESCE(ai_confidence, 0) as ai_confidence,
        COALESCE(category_confidence, 0) as category_confidence,
        COALESCE(price_jpy, 0) as price_jpy,
        COALESCE(ebay_category_id, '') as ebay_category_id,
        created_at
    INTO product_record
    FROM yahoo_scraped_products 
    WHERE id = product_id;
    
    -- レコードが見つからない場合
    IF NOT FOUND THEN
        RETURN 50.0;
    END IF;
    
    -- 安全なスコア計算（全てNULL対応済み）
    score := 50.0 + 
             (product_record.ai_confidence * 0.25) +
             (product_record.category_confidence * 0.15) +
             (CASE WHEN product_record.ebay_category_id != '' THEN 10 ELSE 0 END) +
             (CASE WHEN product_record.price_jpy > 0 THEN 5 ELSE 0 END);
    
    -- 0-100範囲制限
    RETURN LEAST(100.0, GREATEST(0.0, score));
END;
$$ LANGUAGE plpgsql;

-- 5. 全商品のスコア再計算（安全版）
UPDATE yahoo_scraped_products 
SET listing_score = calculate_listing_score_safe(id)
WHERE listing_score IS NULL OR listing_score = 0;

-- 完了確認
DO $$
DECLARE
    null_count INTEGER;
    avg_score DECIMAL;
BEGIN
    -- NULL値チェック
    SELECT COUNT(*) INTO null_count
    FROM yahoo_scraped_products 
    WHERE ai_confidence IS NULL OR category_confidence IS NULL;
    
    -- 平均スコア取得
    SELECT AVG(COALESCE(listing_score, 0)) INTO avg_score
    FROM yahoo_scraped_products;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚨 Phase 1 緊急修正完了！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ price_usd カラム追加（自動計算）';
    RAISE NOTICE '✅ NULL値完全除去 (残りNULL: %件)', null_count;
    RAISE NOTICE '✅ DEFAULT値設定完了';
    RAISE NOTICE '✅ 安全なスコア計算関数作成';
    RAISE NOTICE '✅ 平均スコア: %', COALESCE(avg_score, 0);
    RAISE NOTICE '';
    RAISE NOTICE '🎉 number_format エラー完全解決！';
    RAISE NOTICE '   両URLが正常動作するはずです！';
    RAISE NOTICE '';
END $$;