-- Migration: Create Dynamic Pricing related tables
-- Task D-2: Pricing_Strategy_Master および関連テーブルを新規作成

-- ===========================
-- 1. Pricing_Strategy_Master テーブル
-- ===========================

CREATE TABLE IF NOT EXISTS pricing_strategy_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_name VARCHAR(255) NOT NULL,
  strategy_type VARCHAR(100) NOT NULL,
  strategy_config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  applies_to_category VARCHAR(255),
  applies_to_sku_pattern VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  description TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_pricing_strategy_master_strategy_type
  ON pricing_strategy_master(strategy_type);

CREATE INDEX IF NOT EXISTS idx_pricing_strategy_master_enabled
  ON pricing_strategy_master(enabled);

CREATE INDEX IF NOT EXISTS idx_pricing_strategy_master_is_default
  ON pricing_strategy_master(is_default);

-- コメント
COMMENT ON TABLE pricing_strategy_master IS '価格戦略マスターテーブル - ダイナミックプライシングルールを定義';
COMMENT ON COLUMN pricing_strategy_master.strategy_type IS '戦略タイプ（follow_lowest_with_min_profit, seasonal_adjustment, など）';
COMMENT ON COLUMN pricing_strategy_master.strategy_config IS '戦略の詳細設定（JSONB）';
COMMENT ON COLUMN pricing_strategy_master.is_default IS 'デフォルト戦略として使用するか';
COMMENT ON COLUMN pricing_strategy_master.applies_to_category IS '適用対象のカテゴリ（NULL = 全カテゴリ）';
COMMENT ON COLUMN pricing_strategy_master.applies_to_sku_pattern IS '適用対象のSKUパターン（正規表現）';

-- ===========================
-- 2. Supplier_Master テーブル（仕入れ先マスター）
-- ===========================

CREATE TABLE IF NOT EXISTS supplier_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR(255) NOT NULL,
  supplier_code VARCHAR(100) UNIQUE,
  priority INTEGER DEFAULT 0,
  base_cost_multiplier DECIMAL(5,3) DEFAULT 1.000,
  shipping_cost_base_usd DECIMAL(10,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  stock_check_url TEXT,
  html_selector VARCHAR(500),
  check_frequency_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  notes TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_supplier_master_is_active
  ON supplier_master(is_active);

CREATE INDEX IF NOT EXISTS idx_supplier_master_priority
  ON supplier_master(priority);

-- コメント
COMMENT ON TABLE supplier_master IS '仕入れ先マスターテーブル - ルール9: 複数仕入れ元管理';
COMMENT ON COLUMN supplier_master.priority IS '優先順位（1が最優先）';
COMMENT ON COLUMN supplier_master.stock_check_url IS '在庫確認URL（HTML解析用）';
COMMENT ON COLUMN supplier_master.html_selector IS '在庫数を示すHTMLセレクター';

-- ===========================
-- 3. Supply_Chain_Monitoring テーブル
-- ===========================

CREATE TABLE IF NOT EXISTS supply_chain_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  supplier_id UUID REFERENCES supplier_master(id) ON DELETE CASCADE,
  stock_level INTEGER DEFAULT 0,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  next_check_at TIMESTAMP WITH TIME ZONE,
  check_status VARCHAR(50) DEFAULT 'pending', -- 'success', 'error', 'pending'
  error_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_supply_chain_monitoring_product_id
  ON supply_chain_monitoring(product_id);

CREATE INDEX IF NOT EXISTS idx_supply_chain_monitoring_sku
  ON supply_chain_monitoring(sku);

CREATE INDEX IF NOT EXISTS idx_supply_chain_monitoring_supplier_id
  ON supply_chain_monitoring(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supply_chain_monitoring_next_check_at
  ON supply_chain_monitoring(next_check_at);

-- コメント
COMMENT ON TABLE supply_chain_monitoring IS 'サプライチェーン監視テーブル - ルール8,9: 在庫切れ監視と複数仕入れ元';
COMMENT ON COLUMN supply_chain_monitoring.check_status IS 'チェック状態（success, error, pending）';

-- ===========================
-- 4. Html_Parse_Errors テーブル
-- ===========================

CREATE TABLE IF NOT EXISTS html_parse_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id VARCHAR(255) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES supplier_master(id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  sku VARCHAR(255),
  error_type VARCHAR(100) NOT NULL, -- 'selector_not_found', 'html_structure_changed', etc.
  error_message TEXT NOT NULL,
  error_details TEXT,
  html_snapshot TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_html_parse_errors_supplier_id
  ON html_parse_errors(supplier_id);

CREATE INDEX IF NOT EXISTS idx_html_parse_errors_product_id
  ON html_parse_errors(product_id);

CREATE INDEX IF NOT EXISTS idx_html_parse_errors_resolved
  ON html_parse_errors(resolved);

CREATE INDEX IF NOT EXISTS idx_html_parse_errors_occurred_at
  ON html_parse_errors(occurred_at DESC);

-- コメント
COMMENT ON TABLE html_parse_errors IS 'HTML解析エラーログ - ルール14: エラー追跡と表示';
COMMENT ON COLUMN html_parse_errors.error_type IS 'エラータイプ（selector_not_found, html_structure_changed, network_error, parsing_failed）';
COMMENT ON COLUMN html_parse_errors.html_snapshot IS 'エラー発生時のHTML（デバッグ用）';

-- 外部キー追加（supply_chain_monitoring.error_id → html_parse_errors.id）
ALTER TABLE supply_chain_monitoring
  ADD CONSTRAINT fk_supply_chain_monitoring_error_id
  FOREIGN KEY (error_id) REFERENCES html_parse_errors(id) ON DELETE SET NULL;

-- ===========================
-- 5. Performance_Score_History テーブル
-- ===========================

CREATE TABLE IF NOT EXISTS performance_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  score performance_score_enum NOT NULL,
  score_value INTEGER CHECK (score_value >= 0 AND score_value <= 100),
  factors JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_performance_score_history_product_id
  ON performance_score_history(product_id);

CREATE INDEX IF NOT EXISTS idx_performance_score_history_calculated_at
  ON performance_score_history(calculated_at DESC);

-- コメント
COMMENT ON TABLE performance_score_history IS 'パフォーマンススコア履歴 - ルール15: スコア変動追跡';
COMMENT ON COLUMN performance_score_history.factors IS 'スコア計算要因（JSONB: market_inventory_count, view_count, など）';

-- ===========================
-- 6. Price_Adjustment_Log テーブル
-- ===========================

CREATE TABLE IF NOT EXISTS price_adjustment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  old_price_usd DECIMAL(10,2),
  new_price_usd DECIMAL(10,2),
  adjustment_reason TEXT,
  strategy_type VARCHAR(100),
  strategy_config JSONB,
  adjusted_by VARCHAR(50) DEFAULT 'system', -- 'system' or 'manual'
  adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  marketplace VARCHAR(100)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_price_adjustment_log_product_id
  ON price_adjustment_log(product_id);

CREATE INDEX IF NOT EXISTS idx_price_adjustment_log_sku
  ON price_adjustment_log(sku);

CREATE INDEX IF NOT EXISTS idx_price_adjustment_log_adjusted_at
  ON price_adjustment_log(adjusted_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_adjustment_log_strategy_type
  ON price_adjustment_log(strategy_type);

-- コメント
COMMENT ON TABLE price_adjustment_log IS '価格調整履歴ログ - すべての価格変更を記録';
COMMENT ON COLUMN price_adjustment_log.adjustment_reason IS '調整理由（例: 最安値追従、季節調整、など）';
COMMENT ON COLUMN price_adjustment_log.adjusted_by IS '調整者（system: 自動, manual: 手動）';

-- ===========================
-- 7. Account_Health_Score テーブル（アカウント健全性）
-- ===========================

CREATE TABLE IF NOT EXISTS account_health_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id VARCHAR(255) NOT NULL,
  marketplace VARCHAR(100) NOT NULL,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  feedback_score INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  policy_violation_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, marketplace)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_account_health_score_account_id
  ON account_health_score(account_id);

CREATE INDEX IF NOT EXISTS idx_account_health_score_marketplace
  ON account_health_score(marketplace);

CREATE INDEX IF NOT EXISTS idx_account_health_score_health_score
  ON account_health_score(health_score);

-- コメント
COMMENT ON TABLE account_health_score IS 'アカウント健全性スコア - ルール2: スコア連動アクション';
COMMENT ON COLUMN account_health_score.health_score IS 'アカウント健全性スコア（0-100）';
COMMENT ON COLUMN account_health_score.warning_count IS 'eBay/Amazonからの警告数';

-- ===========================
-- 8. 外部キー制約の追加
-- ===========================

-- products_master.strategy_id → pricing_strategy_master.id
-- NOTE: products_master テーブルが既存の場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products_master') THEN
    ALTER TABLE products_master
      ADD CONSTRAINT fk_products_master_strategy_id
      FOREIGN KEY (strategy_id) REFERENCES pricing_strategy_master(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===========================
-- 9. 更新トリガーの作成
-- ===========================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを追加
CREATE TRIGGER update_pricing_strategy_master_updated_at BEFORE UPDATE ON pricing_strategy_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_master_updated_at BEFORE UPDATE ON supplier_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supply_chain_monitoring_updated_at BEFORE UPDATE ON supply_chain_monitoring FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_html_parse_errors_updated_at BEFORE UPDATE ON html_parse_errors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- 10. デフォルトデータの挿入
-- ===========================

-- デフォルト価格戦略（最安値追従）
INSERT INTO pricing_strategy_master (
  strategy_name,
  strategy_type,
  strategy_config,
  is_default,
  priority,
  enabled,
  description
) VALUES (
  'グローバルデフォルト: 最安値追従（最低利益確保）',
  'follow_lowest_with_min_profit',
  '{
    "strategy_type": "follow_lowest_with_min_profit",
    "min_profit_amount_usd": 5.00,
    "enable_stopper": true,
    "check_frequency_hours": 24
  }'::jsonb,
  true,
  1,
  true,
  'デフォルトの価格戦略: 最安値に追従しつつ、最低利益$5を確保'
) ON CONFLICT DO NOTHING;

-- サンプル仕入れ先
INSERT INTO supplier_master (
  supplier_name,
  supplier_code,
  priority,
  is_active,
  lead_time_days,
  notes
) VALUES
  ('Yahoo Auctions Japan', 'YAHOO_JP', 1, true, 7, 'メイン仕入れ先'),
  ('Mercari Japan', 'MERCARI_JP', 2, true, 5, 'バックアップ仕入れ先'),
  ('Rakuten', 'RAKUTEN_JP', 3, true, 3, '即納可能商品用')
ON CONFLICT DO NOTHING;
