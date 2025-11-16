-- 市場調査データフィールド追加マイグレーション
-- AI解析によるスコアリング精度向上のため

-- ============================================================================
-- 概要: productsテーブルのlisting_data JSONBカラムに
--       市場調査データ構造を追加
-- ============================================================================

BEGIN;

-- 1. listing_dataカラムが存在しない場合は作成
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'listing_data'
    ) THEN
        ALTER TABLE products ADD COLUMN listing_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. ai_market_research構造のデフォルト値を設定する関数を作成
CREATE OR REPLACE FUNCTION initialize_market_research_data()
RETURNS TRIGGER AS $$
BEGIN
    -- listing_dataがNULLまたは空の場合、デフォルト構造を設定
    IF NEW.listing_data IS NULL OR NEW.listing_data = '{}'::jsonb THEN
        NEW.listing_data = jsonb_build_object(
            'ai_market_research', jsonb_build_object(
                -- 将来性/需要予測 (F)
                'f_price_premium', 0,
                'f_price_premium_detail', jsonb_build_object(
                    'msrp', NULL,
                    'current_avg_price', NULL,
                    'mercari_avg', NULL,
                    'yahoo_avg', NULL,
                    'shortage_keywords', '[]'::jsonb
                ),
                'f_community_score', 0,
                'f_community_detail', jsonb_build_object(
                    'reddit_mentions', 0,
                    'twitter_mentions', 0,
                    'sentiment', 'neutral',
                    'key_discussions', '[]'::jsonb
                ),
                'f_historical_surge', NULL,
                
                -- 供給量/市場飽和度 (C/S)
                'c_supply_japan', 0,
                'c_supply_detail', jsonb_build_object(
                    'mercari', 0,
                    'yahoo_auction', 0,
                    'amazon', 0,
                    'other', 0
                ),
                'c_supply_trend', 'unknown',
                's_flag_discontinued', 'unknown',
                's_discontinued_source', NULL,
                
                -- 必須情報
                'hts_code', NULL,
                'hts_description', NULL,
                'origin_country', 'UNKNOWN',
                'origin_source', NULL,
                'customs_rate', 0,
                
                -- データ完全性チェック
                'data_completion', jsonb_build_object(
                    'basic_info', false,
                    'market_price', false,
                    'community', false,
                    'supply', false,
                    'discontinued', false,
                    'hts', false,
                    'origin', false
                ),
                
                -- メタデータ
                'last_updated', NULL,
                'ai_analysis_version', '1.0'
            )
        );
    -- listing_dataが存在するが、ai_market_researchがない場合のみ追加
    ELSIF NOT (NEW.listing_data ? 'ai_market_research') THEN
        NEW.listing_data = NEW.listing_data || jsonb_build_object(
            'ai_market_research', jsonb_build_object(
                'f_price_premium', 0,
                'f_price_premium_detail', jsonb_build_object(
                    'msrp', NULL,
                    'current_avg_price', NULL,
                    'mercari_avg', NULL,
                    'yahoo_avg', NULL,
                    'shortage_keywords', '[]'::jsonb
                ),
                'f_community_score', 0,
                'f_community_detail', jsonb_build_object(
                    'reddit_mentions', 0,
                    'twitter_mentions', 0,
                    'sentiment', 'neutral',
                    'key_discussions', '[]'::jsonb
                ),
                'f_historical_surge', NULL,
                'c_supply_japan', 0,
                'c_supply_detail', jsonb_build_object(
                    'mercari', 0,
                    'yahoo_auction', 0,
                    'amazon', 0,
                    'other', 0
                ),
                'c_supply_trend', 'unknown',
                's_flag_discontinued', 'unknown',
                's_discontinued_source', NULL,
                'hts_code', NULL,
                'hts_description', NULL,
                'origin_country', 'UNKNOWN',
                'origin_source', NULL,
                'customs_rate', 0,
                'data_completion', jsonb_build_object(
                    'basic_info', false,
                    'market_price', false,
                    'community', false,
                    'supply', false,
                    'discontinued', false,
                    'hts', false,
                    'origin', false
                ),
                'last_updated', NULL,
                'ai_analysis_version', '1.0'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. トリガーを作成（INSERTとUPDATE時に実行）
DROP TRIGGER IF EXISTS ensure_market_research_data ON products;
CREATE TRIGGER ensure_market_research_data
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION initialize_market_research_data();

-- 4. 既存レコードにデフォルト構造を追加（バッチ更新）
-- 注意: 大量データの場合は時間がかかる可能性があります
UPDATE products
SET listing_data = COALESCE(listing_data, '{}'::jsonb) || jsonb_build_object(
    'ai_market_research', jsonb_build_object(
        'f_price_premium', 0,
        'f_price_premium_detail', jsonb_build_object(
            'msrp', NULL,
            'current_avg_price', NULL,
            'mercari_avg', NULL,
            'yahoo_avg', NULL,
            'shortage_keywords', '[]'::jsonb
        ),
        'f_community_score', 0,
        'f_community_detail', jsonb_build_object(
            'reddit_mentions', 0,
            'twitter_mentions', 0,
            'sentiment', 'neutral',
            'key_discussions', '[]'::jsonb
        ),
        'f_historical_surge', NULL,
        'c_supply_japan', 0,
        'c_supply_detail', jsonb_build_object(
            'mercari', 0,
            'yahoo_auction', 0,
            'amazon', 0,
            'other', 0
        ),
        'c_supply_trend', 'unknown',
        's_flag_discontinued', 'unknown',
        's_discontinued_source', NULL,
        'hts_code', NULL,
        'hts_description', NULL,
        'origin_country', 'UNKNOWN',
        'origin_source', NULL,
        'customs_rate', 0,
        'data_completion', jsonb_build_object(
            'basic_info', false,
            'market_price', false,
            'community', false,
            'supply', false,
            'discontinued', false,
            'hts', false,
            'origin', false
        ),
        'last_updated', NULL,
        'ai_analysis_version', '1.0'
    )
)
WHERE NOT (listing_data ? 'ai_market_research');

-- 5. インデックス作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_market_research_premium 
    ON products ((listing_data->'ai_market_research'->>'f_price_premium'));

CREATE INDEX IF NOT EXISTS idx_products_market_research_supply 
    ON products ((listing_data->'ai_market_research'->>'c_supply_japan'));

CREATE INDEX IF NOT EXISTS idx_products_market_research_discontinued 
    ON products ((listing_data->'ai_market_research'->>'s_flag_discontinued'));

CREATE INDEX IF NOT EXISTS idx_products_market_research_origin 
    ON products ((listing_data->'ai_market_research'->>'origin_country'));

-- 6. 検証用ビュー作成（開発・デバッグ用）
CREATE OR REPLACE VIEW v_products_market_research AS
SELECT 
    p.id,
    p.sku,
    p.title,
    (p.listing_data->'ai_market_research'->>'f_price_premium')::numeric AS premium_rate,
    (p.listing_data->'ai_market_research'->>'f_community_score')::integer AS community_score,
    (p.listing_data->'ai_market_research'->>'c_supply_japan')::integer AS supply_count,
    p.listing_data->'ai_market_research'->>'c_supply_trend' AS supply_trend,
    p.listing_data->'ai_market_research'->>'s_flag_discontinued' AS discontinued_status,
    p.listing_data->'ai_market_research'->>'origin_country' AS origin_country,
    (p.listing_data->'ai_market_research'->>'customs_rate')::numeric AS customs_rate,
    p.listing_data->'ai_market_research'->'data_completion' AS data_completion_flags,
    p.listing_data->'ai_market_research'->>'last_updated' AS last_ai_update
FROM products p
WHERE p.listing_data ? 'ai_market_research';

COMMIT;

-- ============================================================================
-- 使用例
-- ============================================================================

-- 市場調査データの取得
-- SELECT * FROM v_products_market_research WHERE premium_rate > 150;

-- プレミア率が高く、供給量が少ない商品を検索
-- SELECT * FROM v_products_market_research 
-- WHERE premium_rate > 200 AND supply_count < 50;

-- 廃盤商品でコミュニティスコアが高い商品
-- SELECT * FROM v_products_market_research 
-- WHERE discontinued_status = 'discontinued' AND community_score >= 7;

-- ============================================================================
-- ロールバック用SQL（必要に応じて実行）
-- ============================================================================

-- DROP TRIGGER IF EXISTS ensure_market_research_data ON products;
-- DROP FUNCTION IF EXISTS initialize_market_research_data();
-- DROP VIEW IF EXISTS v_products_market_research;
-- DROP INDEX IF EXISTS idx_products_market_research_premium;
-- DROP INDEX IF EXISTS idx_products_market_research_supply;
-- DROP INDEX IF EXISTS idx_products_market_research_discontinued;
-- DROP INDEX IF EXISTS idx_products_market_research_origin;

-- 既存データからai_market_researchを削除（注意: データ損失）
-- UPDATE products SET listing_data = listing_data - 'ai_market_research';
