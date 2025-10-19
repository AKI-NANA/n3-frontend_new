-- eBayカテゴリー自動判定システム Stage 2実装用
-- ブートストラップ利益率データベース
-- 循環依存解決のための初期データセット

-- 既存テーブル削除（存在する場合）
DROP TABLE IF EXISTS category_profit_bootstrap CASCADE;
DROP TABLE IF EXISTS category_profit_actual CASCADE;

-- ブートストラップ利益率テーブル作成
CREATE TABLE category_profit_bootstrap (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    avg_profit_margin DECIMAL(5,2) NOT NULL,  -- 25.00 = 25%
    volume_level VARCHAR(10) NOT NULL,        -- high/medium/low
    risk_level VARCHAR(10) NOT NULL,          -- low/medium/high  
    confidence_level DECIMAL(3,2) DEFAULT 0.7, -- データ信頼度 0.0-1.0
    data_source VARCHAR(50) DEFAULT 'industry_average',
    market_demand VARCHAR(10) DEFAULT 'medium', -- high/medium/low
    competition_level VARCHAR(10) DEFAULT 'medium', -- high/medium/low
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_volume_level CHECK (volume_level IN ('high', 'medium', 'low')),
    CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high')),
    CONSTRAINT valid_market_demand CHECK (market_demand IN ('high', 'medium', 'low')),
    CONSTRAINT valid_competition_level CHECK (competition_level IN ('high', 'medium', 'low')),
    CONSTRAINT valid_confidence_level CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
    CONSTRAINT valid_profit_margin CHECK (avg_profit_margin >= 0.0 AND avg_profit_margin <= 100.0)
);

-- 実データ蓄積テーブル（将来のAI学習用）
CREATE TABLE category_profit_actual (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    product_id INTEGER NOT NULL,
    yahoo_price_jpy INTEGER NOT NULL,
    ebay_sold_price_usd DECIMAL(10,2),
    actual_profit_usd DECIMAL(10,2),
    profit_margin DECIMAL(5,2),
    sale_date DATE NOT NULL,
    processing_fees DECIMAL(8,2) DEFAULT 0.00,
    shipping_costs DECIMAL(8,2) DEFAULT 0.00,
    days_to_sell INTEGER,
    view_count INTEGER,
    watcher_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_category_profit_bootstrap_category ON category_profit_bootstrap(category_id);
CREATE INDEX idx_category_profit_bootstrap_volume ON category_profit_bootstrap(volume_level);
CREATE INDEX idx_category_profit_bootstrap_risk ON category_profit_bootstrap(risk_level);
CREATE INDEX idx_category_profit_actual_category ON category_profit_actual(category_id);
CREATE INDEX idx_category_profit_actual_date ON category_profit_actual(sale_date);
CREATE INDEX idx_category_profit_actual_margin ON category_profit_actual(profit_margin);

-- 初期ブートストラップデータ投入（主要カテゴリー）
INSERT INTO category_profit_bootstrap (category_id, avg_profit_margin, volume_level, risk_level, confidence_level, market_demand, competition_level) VALUES
-- エレクトロニクス（高需要、高競争）
('293', 25.0, 'high', 'low', 0.85, 'high', 'high'),      -- Cell Phones & Smartphones
('625', 18.0, 'medium', 'medium', 0.75, 'medium', 'medium'), -- Cameras & Photo  
('11232', 20.0, 'medium', 'medium', 0.70, 'medium', 'medium'), -- Digital Cameras
('175672', 15.0, 'high', 'low', 0.80, 'high', 'high'),   -- Computers/Tablets
('1425', 22.0, 'high', 'medium', 0.75, 'high', 'medium'), -- Laptops & Netbooks

-- ゲーム（高需要、中競争）
('139973', 22.0, 'high', 'low', 0.90, 'high', 'medium'), -- Video Games
('14339', 25.0, 'medium', 'medium', 0.70, 'medium', 'medium'), -- Video Game Consoles
('1249', 24.0, 'high', 'low', 0.85, 'high', 'medium'), -- Video Games & Consoles

-- トレーディングカード（超高利益）
('58058', 40.0, 'high', 'low', 0.95, 'high', 'low'),     -- Sports Trading Cards
('183454', 45.0, 'high', 'low', 0.95, 'high', 'low'),    -- Non-Sport Trading Cards (Pokemon等)
('888', 35.0, 'high', 'medium', 0.85, 'high', 'medium'), -- Trading Card Games
('64482', 42.0, 'high', 'low', 0.90, 'high', 'low'),     -- Trading Cards (parent)

-- ファッション（高利益、高需要）
('11450', 30.0, 'high', 'medium', 0.75, 'high', 'high'), -- Clothing, Shoes & Accessories
('11462', 35.0, 'high', 'medium', 0.70, 'high', 'high'), -- Women's Clothing
('1059', 30.0, 'high', 'medium', 0.70, 'high', 'high'),  -- Men's Clothing

-- 時計・ジュエリー（高額、高リスク）
('14324', 20.0, 'medium', 'high', 0.60, 'medium', 'high'), -- Jewelry & Watches
('31387', 18.0, 'medium', 'high', 0.55, 'medium', 'high'), -- Watches, Parts & Accessories

-- 楽器（高利益、中需要）
('619', 28.0, 'medium', 'medium', 0.80, 'medium', 'low'), -- Musical Instruments & Gear

-- 本・メディア（低利益、高ボリューム）
('267', 15.0, 'high', 'low', 0.85, 'medium', 'medium'),   -- Books, Movies & Music
('1295', 12.0, 'high', 'low', 0.90, 'medium', 'low'),     -- Books & Magazines
('11232', 18.0, 'medium', 'low', 0.80, 'medium', 'medium'), -- Movies & TV

-- おもちゃ・ホビー（季節変動）
('220', 28.0, 'high', 'medium', 0.75, 'high', 'medium'),  -- Toys & Hobbies
('10181', 25.0, 'medium', 'medium', 0.70, 'medium', 'medium'), -- Action Figures

-- 車・バイク（高額、専門知識必要）
('6000', 12.0, 'low', 'high', 0.50, 'low', 'medium'),     -- eBay Motors

-- スポーツ用品
('888', 22.0, 'medium', 'medium', 0.70, 'medium', 'medium'), -- Sporting Goods

-- 美容・健康
('26395', 25.0, 'high', 'low', 0.80, 'high', 'medium'),   -- Health & Beauty

-- 日本特有（高利益、低競争）
('99992', 50.0, 'high', 'low', 0.90, 'high', 'low'),      -- Anime & Manga
('99991', 35.0, 'medium', 'medium', 0.75, 'medium', 'low'), -- Japanese Traditional Items

-- ビジネス・産業（専門的）
('12576', 15.0, 'low', 'high', 0.60, 'low', 'low'),       -- Business & Industrial

-- コイン・紙幣（専門知識必要）
('11116', 25.0, 'low', 'high', 0.50, 'low', 'medium'),    -- Coins & Paper Money

-- その他・未分類（デフォルト）
('99999', 20.0, 'low', 'high', 0.50, 'low', 'high');      -- Other/Unclassified

-- サンプル実データ投入（テスト用）
INSERT INTO category_profit_actual (category_id, product_id, yahoo_price_jpy, ebay_sold_price_usd, actual_profit_usd, profit_margin, sale_date, days_to_sell, view_count) VALUES
-- 実際の取引例（サンプルデータ）
('293', 1, 80000, 650.00, 120.00, 18.46, '2025-09-15', 5, 45),  -- iPhone売却例
('625', 2, 45000, 320.00, 78.00, 24.38, '2025-09-14', 8, 23),   -- カメラ売却例
('58058', 3, 5000, 120.00, 85.00, 70.83, '2025-09-13', 2, 67);  -- トレカ売却例

-- ブートストラップデータ統計ビュー作成
CREATE VIEW bootstrap_stats AS
SELECT 
    risk_level,
    volume_level,
    COUNT(*) as category_count,
    ROUND(AVG(avg_profit_margin), 2) as avg_profit,
    ROUND(MIN(avg_profit_margin), 2) as min_profit,
    ROUND(MAX(avg_profit_margin), 2) as max_profit,
    ROUND(AVG(confidence_level), 2) as avg_confidence
FROM category_profit_bootstrap
GROUP BY risk_level, volume_level
ORDER BY avg_profit DESC;

-- 利益ポテンシャル計算関数
CREATE OR REPLACE FUNCTION calculate_profit_potential(
    p_category_id VARCHAR(20),
    p_yahoo_price DECIMAL(10,2)
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_profit_data RECORD;
    v_base_potential DECIMAL(5,2);
    v_price_multiplier DECIMAL(3,2) := 1.0;
    v_final_potential DECIMAL(5,2);
BEGIN
    -- ブートストラップデータ取得
    SELECT 
        avg_profit_margin,
        volume_level,
        risk_level,
        confidence_level
    INTO v_profit_data
    FROM category_profit_bootstrap 
    WHERE category_id = p_category_id;
    
    -- データが存在しない場合はデフォルト値
    IF NOT FOUND THEN
        RETURN 20.0;
    END IF;
    
    v_base_potential := v_profit_data.avg_profit_margin;
    
    -- 価格帯による調整
    CASE 
        WHEN p_yahoo_price > 1000 THEN v_price_multiplier := 0.9;  -- 高額商品
        WHEN p_yahoo_price < 100 THEN v_price_multiplier := 1.1;   -- 低額商品
        ELSE v_price_multiplier := 1.0;
    END CASE;
    
    -- ボリューム・リスク調整
    CASE v_profit_data.volume_level
        WHEN 'high' THEN v_price_multiplier := v_price_multiplier * 1.1;
        WHEN 'low' THEN v_price_multiplier := v_price_multiplier * 0.9;
    END CASE;
    
    CASE v_profit_data.risk_level
        WHEN 'low' THEN v_price_multiplier := v_price_multiplier * 1.1;
        WHEN 'high' THEN v_price_multiplier := v_price_multiplier * 0.8;
    END CASE;
    
    v_final_potential := v_base_potential * v_price_multiplier * v_profit_data.confidence_level;
    
    -- 0-100範囲に制限
    RETURN GREATEST(0, LEAST(100, v_final_potential));
END;
$$ LANGUAGE plpgsql;

-- 完了通知
DO $$
BEGIN
    RAISE NOTICE '=== ブートストラップデータベース構築完了 ===';
    RAISE NOTICE '✅ category_profit_bootstrap テーブル作成';
    RAISE NOTICE '✅ category_profit_actual テーブル作成'; 
    RAISE NOTICE '✅ 初期ブートストラップデータ % 件投入', (SELECT COUNT(*) FROM category_profit_bootstrap);
    RAISE NOTICE '✅ サンプル実データ % 件投入', (SELECT COUNT(*) FROM category_profit_actual);
    RAISE NOTICE '✅ 利益ポテンシャル計算関数作成';
    RAISE NOTICE '✅ Stage 2実装準備完了！';
    RAISE NOTICE '';
    RAISE NOTICE 'テスト用SQL:';
    RAISE NOTICE 'SELECT * FROM bootstrap_stats;';
    RAISE NOTICE 'SELECT calculate_profit_potential(''293'', 500.00);';
END $$;