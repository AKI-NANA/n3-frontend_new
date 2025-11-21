-- ================================================================
-- 多販路出品戦略管理システム - DBマイグレーション
-- ================================================================

-- ================================================================
-- 1. StrategyRules テーブル
-- ユーザーが設定する戦略ルールを格納
-- ================================================================
CREATE TABLE IF NOT EXISTS strategy_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('WHITELIST', 'BLACKLIST', 'PRICE_MIN', 'PRICE_MAX', 'CATEGORY_ACCOUNT_SPECIFIC')),
    platform_key VARCHAR(50),
    account_id INTEGER,
    target_category VARCHAR(100),
    min_price_jpy INTEGER,
    max_price_jpy INTEGER,
    M_factor DECIMAL(5, 2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_strategy_rules_platform ON strategy_rules(platform_key);
CREATE INDEX idx_strategy_rules_account ON strategy_rules(account_id);
CREATE INDEX idx_strategy_rules_category ON strategy_rules(target_category);
CREATE INDEX idx_strategy_rules_active ON strategy_rules(is_active);

-- ================================================================
-- 2. SalesHistory テーブル
-- 販売実績データを格納（実績ブースト計算用）
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_history (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    account_id INTEGER NOT NULL,
    sku VARCHAR(100) NOT NULL,
    sale_date TIMESTAMP NOT NULL,
    profit_margin DECIMAL(5, 4) NOT NULL, -- 例: 0.3000 = 30%
    days_to_sell INTEGER NOT NULL,
    sale_price_jpy INTEGER,
    cost_jpy INTEGER,
    profit_jpy INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_sales_history_platform_account ON sales_history(platform, account_id);
CREATE INDEX idx_sales_history_sku ON sales_history(sku);
CREATE INDEX idx_sales_history_sale_date ON sales_history(sale_date DESC);

-- ================================================================
-- 3. listing_data テーブルの拡張
-- （既存テーブルに新しいカラムを追加）
-- ================================================================
-- 既に listing_data テーブルが存在する場合、以下のカラムを追加

-- プラットフォーム情報
ALTER TABLE listing_data ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE listing_data ADD COLUMN IF NOT EXISTS account_id INTEGER;

-- 出品ステータス
ALTER TABLE listing_data ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT '下書き';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_listing_data_platform ON listing_data(platform);
CREATE INDEX IF NOT EXISTS idx_listing_data_account ON listing_data(account_id);
CREATE INDEX IF NOT EXISTS idx_listing_data_status ON listing_data(status);
CREATE INDEX IF NOT EXISTS idx_listing_data_sku_platform ON listing_data(sku, platform);

-- ================================================================
-- 4. products_master テーブルの拡張
-- （既存テーブルに新しいカラムを追加）
-- ================================================================
-- 戦略決定結果を格納するカラム

-- 推奨出品先
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS recommended_platform VARCHAR(50);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS recommended_account_id INTEGER;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS strategy_score INTEGER;

-- 戦略決定データ（JSON形式で全候補と理由を保存）
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS strategy_decision_data JSONB;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_master_recommended_platform ON products_master(recommended_platform);
CREATE INDEX IF NOT EXISTS idx_products_master_strategy_score ON products_master(strategy_score DESC);

-- ================================================================
-- 5. アカウントマスターテーブル（オプション）
-- 各プラットフォームのアカウント情報を管理
-- ================================================================
CREATE TABLE IF NOT EXISTS platform_accounts (
    account_id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_identifier VARCHAR(255), -- ユーザーID、ストアID等
    is_active BOOLEAN DEFAULT TRUE,
    specialized_categories TEXT[], -- 専門カテゴリー（配列）
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_platform_accounts_platform ON platform_accounts(platform);
CREATE INDEX idx_platform_accounts_active ON platform_accounts(is_active);

-- ================================================================
-- 6. サンプルデータの挿入（開発・テスト用）
-- ================================================================

-- サンプル戦略ルール
INSERT INTO strategy_rules (rule_name, rule_type, platform_key, target_category, M_factor)
VALUES
    ('eBayフィギュア特化', 'CATEGORY_ACCOUNT_SPECIFIC', 'ebay', 'フィギュア', 1.30),
    ('Amazon新品専門', 'CATEGORY_ACCOUNT_SPECIFIC', 'amazon', null, 1.10),
    ('低価格帯除外', 'PRICE_MIN', null, null, null)
ON CONFLICT DO NOTHING;

-- サンプルアカウント
INSERT INTO platform_accounts (platform, account_name, account_identifier, specialized_categories)
VALUES
    ('amazon', 'Amazon Main Account', 'amz-main-001', ARRAY['電化製品', '書籍']),
    ('amazon', 'Amazon Sub Account', 'amz-sub-002', ARRAY['ホーム＆キッチン']),
    ('ebay', 'eBay Figure Store', 'ebay-fig-001', ARRAY['フィギュア', 'トイ']),
    ('ebay', 'eBay General Store', 'ebay-gen-002', ARRAY[]::text[]),
    ('ebay', 'eBay Collectibles', 'ebay-col-003', ARRAY['レアアイテム', 'コレクション']),
    ('mercari', 'Mercari Account', 'mer-001', ARRAY[]::text[]),
    ('yahoo', 'Yahoo Auction Main', 'yah-001', ARRAY[]::text[]),
    ('rakuten', 'Rakuten Store', 'rak-001', ARRAY['新品家電']),
    ('shopee', 'Shopee SG', 'sho-001', ARRAY[]::text[]),
    ('shopee', 'Shopee TH', 'sho-002', ARRAY[]::text[]),
    ('walmart', 'Walmart Seller', 'wal-001', ARRAY['新品家電', '書籍'])
ON CONFLICT DO NOTHING;

-- ================================================================
-- 7. トリガー（updated_at自動更新）
-- ================================================================

-- strategy_rules の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_strategy_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_strategy_rules_updated_at
    BEFORE UPDATE ON strategy_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_strategy_rules_updated_at();

-- platform_accounts の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_platform_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_accounts_updated_at
    BEFORE UPDATE ON platform_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_accounts_updated_at();

-- ================================================================
-- 完了
-- ================================================================

COMMENT ON TABLE strategy_rules IS '出品戦略ルール管理テーブル';
COMMENT ON TABLE sales_history IS '販売実績履歴テーブル（実績ブースト計算用）';
COMMENT ON TABLE platform_accounts IS 'プラットフォームアカウント管理テーブル';
