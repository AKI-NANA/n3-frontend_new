-- enhanced_price_calculator_ui.php 用データベーステーブル作成
-- PostgreSQL用スクリプト

-- 高度利益計算履歴テーブル
CREATE TABLE IF NOT EXISTS enhanced_profit_calculations (
    id SERIAL PRIMARY KEY,
    yahoo_price DECIMAL(12,2) NOT NULL,
    sell_price DECIMAL(12,2) NOT NULL,
    shipping_cost DECIMAL(12,2) DEFAULT 0.00,
    ebay_site VARCHAR(50) DEFAULT 'ebay.com',
    category VARCHAR(50) DEFAULT 'electronics',
    profit_usd DECIMAL(12,2),
    profit_margin DECIMAL(8,2),
    roi DECIMAL(8,2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    item_title VARCHAR(500),
    exchange_rate DECIMAL(8,2),
    fees_total DECIMAL(12,2),
    notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_date ON enhanced_profit_calculations(calculated_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_profit ON enhanced_profit_calculations(profit_usd);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_category ON enhanced_profit_calculations(category);

-- サンプルデータ投入
INSERT INTO enhanced_profit_calculations 
    (yahoo_price, sell_price, shipping_cost, ebay_site, category, profit_usd, profit_margin, roi, item_title, exchange_rate, fees_total)
VALUES 
    (50000, 400.00, 25.00, 'ebay.com', 'electronics', 45.50, 15.2, 18.5, 'iPhone 14 Pro Sample', 150.0, 55.00),
    (30000, 250.00, 20.00, 'ebay.com', 'electronics', 28.20, 12.8, 16.2, 'Canon Camera Sample', 150.0, 35.30),
    (15000, 120.00, 15.00, 'ebay.com', 'collectibles', 18.75, 16.5, 22.1, 'Pokemon Card Sample', 150.0, 18.50)
ON CONFLICT DO NOTHING;

-- 確認クエリ
SELECT 
    COUNT(*) as total_records,
    MAX(calculated_at) as latest_calculation,
    AVG(profit_usd) as avg_profit
FROM enhanced_profit_calculations;

-- テーブル構造確認
\d enhanced_profit_calculations;
