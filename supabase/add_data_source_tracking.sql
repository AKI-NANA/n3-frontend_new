-- ================================================
-- データソース追跡とサンプルデータ管理システム
-- ================================================

-- 1. data_sourceカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'data_source'
    ) THEN
        ALTER TABLE products ADD COLUMN data_source VARCHAR(50) DEFAULT 'manual';
        COMMENT ON COLUMN products.data_source IS 'データソース: sample, scraped, api, calculated, manual';
    END IF;
END $$;

-- 2. データソースタイプのENUM的な制約
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_data_source_check'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_data_source_check 
        CHECK (data_source IN ('sample', 'scraped', 'api', 'calculated', 'manual', 'tool'));
    END IF;
END $$;

-- 3. tool_processedカラムを追加（どのツールで処理されたか）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'tool_processed'
    ) THEN
        ALTER TABLE products ADD COLUMN tool_processed JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN products.tool_processed IS 'ツール処理履歴: {category: true, shipping: true, profit: true, html: true, mirror: true}';
    END IF;
END $$;

-- 4. 既存のサンプルデータにdata_source='sample'をマーク
UPDATE products 
SET data_source = 'sample'
WHERE data_source IS NULL 
  OR data_source = 'manual'
  AND (
    -- 条件: 価格がnullまたはEnglish Titleがnull
    price_jpy IS NULL 
    OR price_usd IS NULL 
    OR english_title IS NULL
  );

-- 5. 現在のデータソース分布を確認
SELECT 
    data_source,
    COUNT(*) as count,
    STRING_AGG(DISTINCT sku, ', ') as sample_skus
FROM products 
GROUP BY data_source
ORDER BY count DESC;

-- 6. テーブル構造の確認（デバッグ用）
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 7. サンプルデータ詳細表示
SELECT 
    id,
    sku,
    title,
    data_source,
    tool_processed,
    price_jpy,
    price_usd,
    english_title,
    image_count,
    html_applied,
    created_at
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ データソース追跡システムを追加しました';
  RAISE NOTICE '📊 data_source カラム: sample, scraped, api, calculated, manual, tool';
  RAISE NOTICE '🔧 tool_processed カラム: ツール処理履歴をJSONBで記録';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. UIでdata_sourceに応じて色分け表示';
  RAISE NOTICE '2. サンプルデータは黄色、実データは緑色など';
  RAISE NOTICE '3. ツール処理済みフィールドには✅マーク表示';
END $$;
