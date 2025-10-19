-- Supabase用 スコアリングシステム データベーススキーマ
-- Supabase SQL Editorで実行

-- 1. product_scores テーブル
CREATE TABLE IF NOT EXISTS product_scores (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    
    -- 総合スコア（10,000点満点）
    total_score NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    priority_rank INTEGER,
    score_percentile NUMERIC(5, 2),
    
    -- 収益性指標（2,500点満点）
    profit_amount_score NUMERIC(8, 2) DEFAULT 0,
    profit_rate_score NUMERIC(8, 2) DEFAULT 0,
    roi_score NUMERIC(8, 2) DEFAULT 0,
    
    -- 市場分析指標（2,000点満点）
    market_size_score NUMERIC(8, 2) DEFAULT 0,
    competition_count_score NUMERIC(8, 2) DEFAULT 0,
    competition_advantage_score NUMERIC(8, 2) DEFAULT 0,
    category_popularity_score NUMERIC(8, 2) DEFAULT 0,
    
    -- 商品特性指標（1,500点満点）
    rarity_score NUMERIC(8, 2) DEFAULT 0,
    discontinued_score NUMERIC(8, 2) DEFAULT 0,
    originality_score NUMERIC(8, 2) DEFAULT 0,
    set_bonus_score NUMERIC(8, 2) DEFAULT 0,
    model_popularity_score NUMERIC(8, 2) DEFAULT 0,
    
    -- 販売実績指標（1,500点満点）
    sold_count_score NUMERIC(8, 2) DEFAULT 0,
    view_count_score NUMERIC(8, 2) DEFAULT 0,
    watcher_count_score NUMERIC(8, 2) DEFAULT 0,
    sell_through_rate_score NUMERIC(8, 2) DEFAULT 0,
    
    -- 将来性・トレンド指標（1,000点満点）
    price_trend_score NUMERIC(8, 2) DEFAULT 0,
    future_appreciation_score NUMERIC(8, 2) DEFAULT 0,
    stock_depletion_score NUMERIC(8, 2) DEFAULT 0,
    restock_risk_score NUMERIC(8, 2) DEFAULT 0,
    
    -- 商品状態・仕入れ（1,000点満点）
    condition_score NUMERIC(8, 2) DEFAULT 0,
    sourcing_ease_score NUMERIC(8, 2) DEFAULT 0,
    repeat_potential_score NUMERIC(8, 2) DEFAULT 0,
    inventory_type_score NUMERIC(8, 2) DEFAULT 0,
    
    -- AI総合評価（500点満点）
    ai_overall_score NUMERIC(8, 2) DEFAULT 0,
    ai_confidence_score NUMERIC(8, 2) DEFAULT 0,
    
    -- 生データ
    profit_amount NUMERIC(10, 2),
    profit_rate NUMERIC(5, 2),
    roi NUMERIC(5, 2),
    competitor_count INTEGER,
    lowest_competitor_price NUMERIC(10, 2),
    expected_sale_price NUMERIC(10, 2),
    
    -- 外部API取得データ
    ebay_sold_30d INTEGER DEFAULT 0,
    ebay_sold_90d INTEGER DEFAULT 0,
    ebay_active_listings INTEGER DEFAULT 0,
    ebay_view_count INTEGER DEFAULT 0,
    ebay_watcher_count INTEGER DEFAULT 0,
    amazon_rank INTEGER,
    amazon_availability TEXT,
    google_trend_score INTEGER DEFAULT 0,
    
    -- AI分析結果
    ai_analysis_text TEXT,
    product_characteristics TEXT,
    market_position TEXT,
    risk_factors TEXT,
    opportunity_factors TEXT,
    
    -- メタ情報
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    data_freshness_score NUMERIC(5, 2) DEFAULT 100,
    calculation_version TEXT DEFAULT '1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id)
);

-- インデックス作成
CREATE INDEX idx_product_scores_total_score ON product_scores(total_score DESC);
CREATE INDEX idx_product_scores_priority_rank ON product_scores(priority_rank);
CREATE INDEX idx_product_scores_product_id ON product_scores(product_id);
CREATE INDEX idx_product_scores_last_calculated ON product_scores(last_calculated_at DESC);

-- RLS（Row Level Security）有効化
ALTER TABLE product_scores ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーに読み取り権限
CREATE POLICY "Enable read access for all users" ON product_scores
    FOR SELECT USING (true);

-- 認証済みユーザーに書き込み権限
CREATE POLICY "Enable insert for authenticated users" ON product_scores
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON product_scores
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. external_market_data テーブル
CREATE TABLE IF NOT EXISTS external_market_data (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    data_source TEXT NOT NULL,
    
    -- eBayデータ
    ebay_active_listings INTEGER,
    ebay_sold_listings_30d INTEGER,
    ebay_sold_listings_90d INTEGER,
    ebay_avg_price NUMERIC(10, 2),
    ebay_min_price NUMERIC(10, 2),
    ebay_max_price NUMERIC(10, 2),
    ebay_avg_shipping NUMERIC(8, 2),
    ebay_view_count INTEGER,
    ebay_watcher_count INTEGER,
    
    -- Amazonデータ
    amazon_rank INTEGER,
    amazon_price NUMERIC(10, 2),
    amazon_availability TEXT,
    amazon_review_count INTEGER,
    amazon_rating NUMERIC(3, 2),
    amazon_prime_eligible BOOLEAN,
    
    -- トレンドデータ
    google_trend_value INTEGER,
    social_mention_count INTEGER,
    
    -- SellerSpriteデータ
    sellersprite_competition_level TEXT,
    sellersprite_market_size TEXT,
    sellersprite_monthly_sales INTEGER,
    sellersprite_search_volume INTEGER,
    
    -- メタ情報
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    data_quality_score INTEGER DEFAULT 100,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_data_product_id ON external_market_data(product_id);
CREATE INDEX idx_market_data_source ON external_market_data(data_source);
CREATE INDEX idx_market_data_retrieved ON external_market_data(retrieved_at DESC);

ALTER TABLE external_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON external_market_data
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON external_market_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. price_history テーブル
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    platform TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    condition TEXT,
    currency TEXT DEFAULT 'USD',
    sold_date TIMESTAMPTZ,
    seller_info TEXT,
    shipping_cost NUMERIC(8, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_price_history_platform ON price_history(platform);
CREATE INDEX idx_price_history_sold_date ON price_history(sold_date DESC);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON price_history
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON price_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. stock_depletion_tracking テーブル
CREATE TABLE IF NOT EXISTS stock_depletion_tracking (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    
    -- 在庫データ
    total_available_count INTEGER NOT NULL,
    ebay_count INTEGER DEFAULT 0,
    amazon_count INTEGER DEFAULT 0,
    other_platform_count INTEGER DEFAULT 0,
    
    -- 変動データ
    change_from_previous INTEGER,
    change_rate NUMERIC(5, 2),
    depletion_velocity NUMERIC(8, 2),
    
    -- 予測データ
    estimated_stockout_date DATE,
    stockout_probability NUMERIC(5, 2),
    
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_depletion_product_id ON stock_depletion_tracking(product_id);
CREATE INDEX idx_stock_depletion_checked ON stock_depletion_tracking(checked_at DESC);

ALTER TABLE stock_depletion_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON stock_depletion_tracking
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON stock_depletion_tracking
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. ai_evaluation_criteria テーブル
CREATE TABLE IF NOT EXISTS ai_evaluation_criteria (
    id BIGSERIAL PRIMARY KEY,
    criterion_name TEXT NOT NULL UNIQUE,
    criterion_category TEXT NOT NULL,
    max_points NUMERIC(6, 2) NOT NULL DEFAULT 50,
    evaluation_prompt TEXT NOT NULL,
    weight NUMERIC(3, 2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_criteria_category ON ai_evaluation_criteria(criterion_category);
CREATE INDEX idx_ai_criteria_active ON ai_evaluation_criteria(is_active, display_order);

ALTER TABLE ai_evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON ai_evaluation_criteria
    FOR SELECT USING (true);

-- AI評価基準の初期データ
INSERT INTO ai_evaluation_criteria (criterion_name, criterion_category, max_points, evaluation_prompt, display_order) VALUES
('独自性評価', '商品特性', 50, '商品の独自性・差別化要素を0-50点で評価してください。カスタム品、限定品、特殊仕様などを考慮。', 1),
('ターゲット明確性', '市場分析', 50, 'ターゲット顧客層の明確さを0-50点で評価してください。ニッチ市場、明確なユースケースを持つほど高得点。', 2),
('市場ポジショニング', '市場分析', 50, '市場でのポジショニングの良さを0-50点で評価してください。競合との差別化、価格帯の妥当性を考慮。', 3),
('リスク評価', 'リスク分析', 50, 'リスク要因の少なさを0-50点で評価してください（少ないほど高得点）。再販リスク、トレンド依存、法的リスクなどを考慮。', 4),
('成長機会', '将来性', 50, '成長機会の大きさを0-50点で評価してください。市場拡大、認知度向上、新規顧客層開拓の可能性を考慮。', 5),
('ブランド力', '商品特性', 50, 'ブランド力・認知度を0-50点で評価してください。有名ブランド、コレクターズアイテムなどは高得点。', 6),
('トレンド適合性', '将来性', 50, '季節性・トレンド適合性を0-50点で評価してください。現在のトレンドとの一致度、流行の持続性を考慮。', 7),
('販売ポテンシャル', '総合評価', 50, '総合的な販売ポテンシャルを0-50点で評価してください。上記全要素を統合した総合判断。', 8)
ON CONFLICT (criterion_name) DO NOTHING;

-- 6. scoring_system_config テーブル
CREATE TABLE IF NOT EXISTS scoring_system_config (
    id BIGSERIAL PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    config_type TEXT DEFAULT 'string',
    description TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scoring_system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON scoring_system_config
    FOR SELECT USING (true);

-- システム設定の初期データ
INSERT INTO scoring_system_config (config_key, config_value, config_type, description) VALUES
('score_calculation_version', '1.0', 'string', 'スコア計算ロジックのバージョン'),
('auto_update_enabled', 'true', 'boolean', '自動スコア更新の有効/無効'),
('update_interval_hours', '24', 'integer', 'スコア自動更新間隔（時間）'),
('ai_analysis_enabled', 'false', 'boolean', 'AI分析の有効/無効'),
('external_api_timeout_seconds', '30', 'integer', '外部API取得タイムアウト（秒）'),
('min_score_for_listing', '5000.00', 'decimal', '出品推奨の最低スコア'),
('score_cache_duration_minutes', '60', 'integer', 'スコアキャッシュ有効期間（分）')
ON CONFLICT (config_key) DO NOTHING;

-- 7. ビュー作成
CREATE OR REPLACE VIEW v_product_score_ranking AS
SELECT 
    ps.*,
    ROW_NUMBER() OVER (ORDER BY ps.total_score DESC, ps.profit_amount DESC, ps.created_at ASC) AS rank
FROM 
    product_scores ps
ORDER BY 
    ps.total_score DESC;

-- 8. updated_at自動更新用関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER update_product_scores_updated_at 
    BEFORE UPDATE ON product_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_criteria_updated_at 
    BEFORE UPDATE ON ai_evaluation_criteria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at 
    BEFORE UPDATE ON scoring_system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Supabase Edge Function用のヘルパー関数

-- スコアランキング取得関数
CREATE OR REPLACE FUNCTION get_score_ranking(
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    product_id BIGINT,
    total_score NUMERIC,
    profit_amount NUMERIC,
    profit_rate NUMERIC,
    competitor_count INTEGER,
    priority_rank BIGINT,
    last_calculated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.product_id,
        ps.total_score,
        ps.profit_amount,
        ps.profit_rate,
        ps.competitor_count,
        ROW_NUMBER() OVER (ORDER BY ps.total_score DESC, ps.profit_amount DESC, ps.created_at ASC) AS priority_rank,
        ps.last_calculated_at
    FROM product_scores ps
    ORDER BY ps.total_score DESC, ps.profit_amount DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 統計情報取得関数
CREATE OR REPLACE FUNCTION get_scoring_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_products', (SELECT COUNT(*) FROM product_scores),
        'avg_score', (SELECT ROUND(AVG(total_score)::NUMERIC, 2) FROM product_scores),
        'max_score', (SELECT MAX(total_score) FROM product_scores),
        'min_score', (SELECT MIN(total_score) FROM product_scores),
        'rank_distribution', (
            SELECT json_agg(rank_dist)
            FROM (
                SELECT 
                    CASE 
                        WHEN total_score >= 9000 THEN 'S'
                        WHEN total_score >= 8000 THEN 'A'
                        WHEN total_score >= 7000 THEN 'B'
                        WHEN total_score >= 6000 THEN 'C'
                        WHEN total_score >= 5000 THEN 'D'
                        ELSE 'E'
                    END AS rank,
                    COUNT(*) AS count
                FROM product_scores
                GROUP BY rank
                ORDER BY rank
            ) rank_dist
        ),
        'last_updated', (SELECT MAX(last_calculated_at) FROM product_scores)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE product_scores IS 'Supabase用: 商品スコアリングメインテーブル（10,000点満点）';
COMMENT ON TABLE external_market_data IS 'Supabase用: 外部マーケットデータ';
COMMENT ON TABLE price_history IS 'Supabase用: 価格履歴追跡';
COMMENT ON TABLE stock_depletion_tracking IS 'Supabase用: 在庫枯渇追跡';
COMMENT ON TABLE ai_evaluation_criteria IS 'Supabase用: AI評価基準マスタ';
COMMENT ON TABLE scoring_system_config IS 'Supabase用: スコアリングシステム設定';