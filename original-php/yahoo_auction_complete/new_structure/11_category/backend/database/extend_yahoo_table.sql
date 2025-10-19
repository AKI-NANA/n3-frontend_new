--
-- Yahoo Auction テーブル拡張 - eBayカテゴリーシステム統合
-- ファイル: extend_yahoo_table.sql
-- Phase 1: データベース構築・確認 (優先度: 🔴 最高)
--

-- yahoo_scraped_products テーブルの拡張
-- eBayカテゴリー情報カラム追加

-- 既存テーブル確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'yahoo_scraped_products';

-- カラムが既に存在するかチェック
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'yahoo_scraped_products' 
AND column_name IN ('ebay_category_id', 'ebay_category_name', 'category_confidence', 'item_specifics', 'ebay_fees_data');

-- eBayカテゴリー関連カラム追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS ebay_category_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100),
ADD COLUMN IF NOT EXISTS item_specifics TEXT,
ADD COLUMN IF NOT EXISTS ebay_fees_data JSONB,
ADD COLUMN IF NOT EXISTS estimated_ebay_price_usd DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS estimated_profit_usd DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS profit_margin_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20),
ADD COLUMN IF NOT EXISTS category_detected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_fee_calculated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_notes TEXT,
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_ebay_category 
ON yahoo_scraped_products(ebay_category_id);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_processing_status 
ON yahoo_scraped_products(processing_status);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_category_confidence 
ON yahoo_scraped_products(category_confidence);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_estimated_profit 
ON yahoo_scraped_products(estimated_profit_usd);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_detected_at 
ON yahoo_scraped_products(category_detected_at);

-- 処理ステータスの制約追加
ALTER TABLE yahoo_scraped_products 
ADD CONSTRAINT check_processing_status 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'manual_review', 'approved', 'rejected'));

-- リスクレベルの制約追加
ALTER TABLE yahoo_scraped_products 
ADD CONSTRAINT check_risk_level 
CHECK (risk_level IN ('LOW', 'LOW-MEDIUM', 'MEDIUM', 'MEDIUM-HIGH', 'HIGH') OR risk_level IS NULL);

-- データベース機能強化
-- トリガー関数: category_detected_at自動更新
CREATE OR REPLACE FUNCTION update_category_detected_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ebay_category_id IS NOT NULL AND OLD.ebay_category_id IS NULL THEN
        NEW.category_detected_at = NOW();
    END IF;
    
    -- 処理ステータス自動更新
    IF NEW.ebay_category_id IS NOT NULL AND NEW.processing_status = 'pending' THEN
        NEW.processing_status = 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_update_category_timestamp ON yahoo_scraped_products;
CREATE TRIGGER trigger_update_category_timestamp
    BEFORE UPDATE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_detected_timestamp();

-- 利益計算ヘルパー関数
CREATE OR REPLACE FUNCTION calculate_profit_metrics(
    p_yahoo_price_jpy DECIMAL(12,2),
    p_ebay_price_usd DECIMAL(12,2),
    p_total_fees_usd DECIMAL(12,2) DEFAULT 0,
    p_exchange_rate DECIMAL(8,2) DEFAULT 150.0
) RETURNS TABLE (
    profit_usd DECIMAL(12,2),
    profit_margin_percent DECIMAL(5,2),
    roi_percent DECIMAL(5,2),
    risk_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY SELECT 
        (p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) as profit_usd,
        CASE 
            WHEN p_ebay_price_usd > 0 THEN 
                ROUND((((p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) / p_ebay_price_usd) * 100)::numeric, 2)
            ELSE 0 
        END as profit_margin_percent,
        CASE 
            WHEN (p_yahoo_price_jpy / p_exchange_rate) > 0 THEN 
                ROUND((((p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) / (p_yahoo_price_jpy / p_exchange_rate)) * 100)::numeric, 2)
            ELSE 0 
        END as roi_percent,
        CASE 
            WHEN (p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) < 0 THEN 'HIGH'
            WHEN ((p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) / p_ebay_price_usd) * 100 < 10 THEN 'MEDIUM-HIGH'
            WHEN ((p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) / p_ebay_price_usd) * 100 < 20 THEN 'MEDIUM'
            WHEN ((p_ebay_price_usd - (p_yahoo_price_jpy / p_exchange_rate) - p_total_fees_usd) / p_ebay_price_usd) * 100 < 30 THEN 'LOW-MEDIUM'
            ELSE 'LOW'
        END as risk_level;
END;
$$ LANGUAGE plpgsql;

-- 統計情報ビュー
CREATE OR REPLACE VIEW v_yahoo_category_stats AS
SELECT 
    ebay_category_name,
    ebay_category_id,
    COUNT(*) as product_count,
    AVG(category_confidence) as avg_confidence,
    AVG(estimated_profit_usd) as avg_profit_usd,
    AVG(profit_margin_percent) as avg_profit_margin,
    COUNT(CASE WHEN estimated_profit_usd > 0 THEN 1 END) as profitable_count,
    COUNT(CASE WHEN risk_level IN ('LOW', 'LOW-MEDIUM') THEN 1 END) as low_risk_count,
    MIN(category_detected_at) as first_detected,
    MAX(category_detected_at) as last_detected
FROM yahoo_scraped_products 
WHERE ebay_category_id IS NOT NULL
GROUP BY ebay_category_name, ebay_category_id
ORDER BY product_count DESC;

-- 未処理商品ビュー
CREATE OR REPLACE VIEW v_unprocessed_yahoo_products AS
SELECT 
    id,
    title,
    price_jpy,
    description,
    created_at,
    CASE 
        WHEN price_jpy IS NULL THEN 'NO_PRICE'
        WHEN title IS NULL OR title = '' THEN 'NO_TITLE'
        WHEN description IS NULL OR description = '' THEN 'NO_DESCRIPTION'
        ELSE 'READY'
    END as readiness_status
FROM yahoo_scraped_products 
WHERE ebay_category_id IS NULL
ORDER BY created_at DESC;

-- 高利益商品ビュー
CREATE OR REPLACE VIEW v_high_profit_products AS
SELECT 
    id,
    title,
    price_jpy,
    estimated_ebay_price_usd,
    estimated_profit_usd,
    profit_margin_percent,
    risk_level,
    ebay_category_name,
    category_confidence
FROM yahoo_scraped_products 
WHERE estimated_profit_usd > 10 
AND profit_margin_percent > 20
AND risk_level IN ('LOW', 'LOW-MEDIUM')
ORDER BY estimated_profit_usd DESC;

-- サンプルデータ更新（既存データがある場合の初期化）
UPDATE yahoo_scraped_products 
SET processing_status = 'pending'
WHERE ebay_category_id IS NULL AND processing_status IS NULL;

UPDATE yahoo_scraped_products 
SET processing_status = 'completed'
WHERE ebay_category_id IS NOT NULL AND processing_status IS NULL;

-- 処理統計
DO $$
DECLARE
    total_products INTEGER;
    processed_products INTEGER;
    unprocessed_products INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_products FROM yahoo_scraped_products;
    SELECT COUNT(*) INTO processed_products FROM yahoo_scraped_products WHERE ebay_category_id IS NOT NULL;
    SELECT COUNT(*) INTO unprocessed_products FROM yahoo_scraped_products WHERE ebay_category_id IS NULL;
    
    RAISE NOTICE '=== Yahoo Auction テーブル拡張完了 ===';
    RAISE NOTICE '総商品数: %', total_products;
    RAISE NOTICE '処理済み商品数: %', processed_products;
    RAISE NOTICE '未処理商品数: %', unprocessed_products;
    RAISE NOTICE 'テーブル拡張・インデックス・ビュー作成完了';
END $$;
