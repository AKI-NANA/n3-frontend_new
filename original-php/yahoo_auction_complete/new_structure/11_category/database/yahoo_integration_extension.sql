--
-- Yahoo Auction → eBay 連携強化 テーブル拡張
-- 実行日: 2025-09-19
--

-- Yahoo Auctionテーブルにebay関連カラム追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS ebay_category_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100),
ADD COLUMN IF NOT EXISTS category_detection_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS ebay_processing_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS ebay_fees_data JSONB,
ADD COLUMN IF NOT EXISTS profit_calculation JSONB;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_ebay_category 
ON yahoo_scraped_products(ebay_category_id);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_confidence 
ON yahoo_scraped_products(category_confidence DESC);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_processing_date 
ON yahoo_scraped_products(ebay_processing_date DESC);

-- =============================================================================
-- サンプルデータ更新（テスト用）
-- =============================================================================

-- 既存のyahoo_scraped_productsにサンプルデータがない場合のテストデータ投入
INSERT INTO yahoo_scraped_products (
    title, price_jpy, description, yahoo_category, auction_id, seller_id, status
) VALUES 
('iPhone 14 Pro 128GB Space Black SIMフリー', 120000, '美品のiPhone 14 Pro。傷なし、バッテリー状態良好', '携帯電話、スマートフォン', 'test001', 'test_seller', 'active'),
('Canon EOS R6 Mark II ボディ', 280000, 'ミラーレス一眼カメラ。使用回数少なめ', 'カメラ、光学機器', 'test002', 'test_seller', 'active'),
('PlayStation 5 本体 CFI-2000A01', 60000, '新品未開封のPS5本体', 'ゲーム、おもちゃ', 'test003', 'test_seller', 'active'),
('ドラゴンボール 完全版 全34巻セット', 15000, '全巻セット。状態良好', '本、雑誌', 'test004', 'test_seller', 'active'),
('ROLEX サブマリーナ デイト 126610LN', 1500000, '正規品。2023年購入', '時計、アクセサリー', 'test005', 'test_seller', 'active')
ON CONFLICT (auction_id) DO NOTHING;

-- =============================================================================
-- 統計用ビュー作成
-- =============================================================================

CREATE OR REPLACE VIEW yahoo_ebay_integration_stats AS
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as processed_products,
    COUNT(CASE WHEN ebay_category_id IS NULL THEN 1 END) as pending_products,
    ROUND(
        COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as processing_percentage,
    ROUND(AVG(category_confidence), 1) as avg_confidence,
    COUNT(DISTINCT ebay_category_id) as unique_ebay_categories
FROM yahoo_scraped_products;

-- カテゴリー別処理統計ビュー
CREATE OR REPLACE VIEW category_processing_stats AS
SELECT 
    ysp.ebay_category_name,
    COUNT(*) as product_count,
    ROUND(AVG(ysp.category_confidence), 1) as avg_confidence,
    ROUND(AVG(ysp.price_jpy), 0) as avg_price_jpy,
    COUNT(CASE WHEN ysp.category_confidence >= 80 THEN 1 END) as high_confidence_count,
    MAX(ysp.ebay_processing_date) as last_processed
FROM yahoo_scraped_products ysp
WHERE ysp.ebay_category_id IS NOT NULL
GROUP BY ysp.ebay_category_name
ORDER BY product_count DESC;

-- =============================================================================
-- 便利な関数定義
-- =============================================================================

-- Yahoo商品の自動カテゴリー更新関数
CREATE OR REPLACE FUNCTION auto_categorize_yahoo_product(product_id INTEGER)
RETURNS TABLE(
    category_id VARCHAR(20),
    category_name VARCHAR(200),
    confidence INTEGER,
    method VARCHAR(50)
) AS $$
DECLARE
    product_title TEXT;
    product_price INTEGER;
    result_category_id VARCHAR(20);
    result_category_name VARCHAR(200);
    result_confidence INTEGER;
    result_method VARCHAR(50);
BEGIN
    -- 商品情報取得
    SELECT title, price_jpy INTO product_title, product_price
    FROM yahoo_scraped_products 
    WHERE id = product_id;
    
    -- 簡単なルールベース判定
    IF product_title ILIKE '%iphone%' OR product_title ILIKE '%android%' THEN
        result_category_id := '293';
        result_category_name := 'Cell Phones & Smartphones';
        result_confidence := 85;
        result_method := 'keyword_rule';
    ELSIF product_title ILIKE '%canon%' OR product_title ILIKE '%nikon%' OR product_title ILIKE '%カメラ%' THEN
        result_category_id := '625';
        result_category_name := 'Cameras & Photo';
        result_confidence := 80;
        result_method := 'keyword_rule';
    ELSIF product_title ILIKE '%book%' OR product_title ILIKE '%本%' OR product_title ILIKE '%漫画%' THEN
        result_category_id := '267';
        result_category_name := 'Books & Magazines';
        result_confidence := 75;
        result_method := 'keyword_rule';
    ELSE
        result_category_id := '99999';
        result_category_name := 'Other';
        result_confidence := 40;
        result_method := 'fallback';
    END IF;
    
    -- 結果更新
    UPDATE yahoo_scraped_products 
    SET 
        ebay_category_id = result_category_id,
        ebay_category_name = result_category_name,
        category_confidence = result_confidence,
        category_detection_method = result_method,
        ebay_processing_date = NOW()
    WHERE id = product_id;
    
    -- 結果返却
    category_id := result_category_id;
    category_name := result_category_name;
    confidence := result_confidence;
    method := result_method;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 完了報告
-- =============================================================================

DO $$
DECLARE
    total_products INTEGER;
    processed_products INTEGER;
    pending_products INTEGER;
BEGIN
    SELECT 
        total_products, processed_products, pending_products
    INTO 
        total_products, processed_products, pending_products
    FROM yahoo_ebay_integration_stats;
    
    RAISE NOTICE '=== Yahoo Auction eBay統合システム 拡張完了 ===';
    RAISE NOTICE '📊 総商品数: %', total_products;
    RAISE NOTICE '✅ 処理済み: %', processed_products;
    RAISE NOTICE '⏳ 未処理: %', pending_products;
    RAISE NOTICE '🔗 統合API: yahoo_integration_api.php 実装完了';
    RAISE NOTICE '🎯 Yahoo → eBay 自動判定システム稼働準備完了！';
END $$;