-- USA基準送料内包戦略用データベース拡張
-- 既存 shipping_rules テーブルにUSA基準コスト追加

ALTER TABLE shipping_rules ADD COLUMN usa_base_cost REAL DEFAULT 0.0;
ALTER TABLE shipping_rules ADD COLUMN price_inclusion_policy TEXT DEFAULT 'separate';
ALTER TABLE shipping_rules ADD COLUMN regional_adjustment REAL DEFAULT 1.0;

-- 価格帯別ポリシーテーブル新規作成
CREATE TABLE IF NOT EXISTS price_tier_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tier_name TEXT NOT NULL,
    price_min REAL NOT NULL,
    price_max REAL NOT NULL,
    inclusion_strategy TEXT NOT NULL, -- 'full', 'partial', 'free'
    partial_amount REAL DEFAULT 0.0,
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- デフォルト価格帯ポリシー挿入
INSERT INTO price_tier_policies (tier_name, price_min, price_max, inclusion_strategy, partial_amount) VALUES
('低価格帯', 0.0, 50.0, 'full', 0.0),
('中価格帯', 50.0, 200.0, 'partial', 10.0),
('高価格帯', 200.0, 9999.0, 'free', 0.0);

-- USA基準送料データ挿入用テーブル
CREATE TABLE IF NOT EXISTS usa_base_shipping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight_min REAL NOT NULL,
    weight_max REAL NOT NULL,
    base_cost_usd REAL NOT NULL,
    service_type TEXT DEFAULT 'standard',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- デフォルトUSA基準送料データ
INSERT INTO usa_base_shipping (weight_min, weight_max, base_cost_usd, service_type) VALUES
(0.0, 0.5, 12.50, 'economy'),
(0.0, 0.5, 18.00, 'standard'),
(0.0, 0.5, 28.00, 'express'),
(0.5, 1.0, 16.00, 'economy'),
(0.5, 1.0, 24.00, 'standard'),
(0.5, 1.0, 35.00, 'express'),
(1.0, 2.0, 22.00, 'economy'),
(1.0, 2.0, 32.00, 'standard'),
(1.0, 2.0, 48.00, 'express'),
(2.0, 5.0, 38.00, 'economy'),
(2.0, 5.0, 55.00, 'standard'),
(2.0, 5.0, 80.00, 'express');
