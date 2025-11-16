-- ====================================================================
-- 在庫管理と価格変動の統合システム - データベースマイグレーション（修正版）
-- ====================================================================
-- 作成日: 2025-11-02
-- 修正日: 2025-11-03
-- 目的: 在庫監視と価格変動を統合管理するためのテーブル構造を作成
-- ====================================================================

-- ====================================================================
-- 1. 価格戦略ルールテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR(50) NOT NULL, 
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_applied_at TIMESTAMP,
  applied_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_enabled ON pricing_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON pricing_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON pricing_rules(type);

COMMENT ON TABLE pricing_rules IS '価格戦略ルール：自動価格調整のロジックを定義';

-- ====================================================================
-- 2. 価格変動履歴テーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS price_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  ebay_listing_id VARCHAR(50),
  change_type VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(50),
  old_source_price_jpy DECIMAL(10,2),
  new_source_price_jpy DECIMAL(10,2),
  source_price_diff DECIMAL(10,2),
  old_ebay_price_usd DECIMAL(10,2),
  new_ebay_price_usd DECIMAL(10,2),
  ebay_price_diff DECIMAL(10,2),
  old_profit_usd DECIMAL(10,2),
  new_profit_usd DECIMAL(10,2),
  profit_diff DECIMAL(10,2),
  old_profit_margin DECIMAL(5,2),
  new_profit_margin DECIMAL(5,2),
  applied_rule_id UUID REFERENCES pricing_rules(id),
  applied_rule_name VARCHAR(100),
  shipping_policy_changed BOOLEAN DEFAULT FALSE,
  old_shipping_policy_id VARCHAR(50),
  new_shipping_policy_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  auto_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  applied_at TIMESTAMP,
  approved_by VARCHAR(100),
  error_message TEXT,
  FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_changes_product ON price_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_status ON price_changes(status);
CREATE INDEX IF NOT EXISTS idx_price_changes_created ON price_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_changes_ebay_listing ON price_changes(ebay_listing_id);

COMMENT ON TABLE price_changes IS '価格変動履歴：価格変更の記録と承認管理';

-- ====================================================================
-- 3. スコアリングデータテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  ebay_listing_id VARCHAR(50),
  view_count INTEGER DEFAULT 0,
  watcher_count INTEGER DEFAULT 0,
  days_listed INTEGER DEFAULT 0,
  competitor_count INTEGER DEFAULT 0,
  market_inventory INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  performance_score INTEGER,
  rank VARCHAR(1),
  action_taken VARCHAR(50),
  action_reason TEXT,
  calculated_at TIMESTAMP DEFAULT NOW(),
  next_calculation_at TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_scores_product ON product_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_product_scores_rank ON product_scores(rank);
CREATE INDEX IF NOT EXISTS idx_product_scores_score ON product_scores(performance_score DESC);

COMMENT ON TABLE product_scores IS 'パフォーマンススコア：商品の販売パフォーマンスを評価';

-- ====================================================================
-- 4. 統合変動データテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS unified_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  ebay_listing_id VARCHAR(50),
  change_category VARCHAR(20) NOT NULL,
  inventory_change JSONB,
  price_change JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  auto_applied BOOLEAN DEFAULT FALSE,
  inventory_change_id UUID,
  price_change_id UUID REFERENCES price_changes(id),
  detected_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  applied_to_ebay_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_unified_changes_product ON unified_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_unified_changes_status ON unified_changes(status);
CREATE INDEX IF NOT EXISTS idx_unified_changes_category ON unified_changes(change_category);
CREATE INDEX IF NOT EXISTS idx_unified_changes_detected ON unified_changes(detected_at DESC);

COMMENT ON TABLE unified_changes IS '統合変動データ：在庫と価格の変動を一元管理';

-- ====================================================================
-- 5. products_master テーブルの拡張
-- ====================================================================

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS inventory_monitoring_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inventory_check_frequency VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS last_inventory_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_inventory_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS inventory_monitoring_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pricing_rules_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS active_pricing_rule_id UUID REFERENCES pricing_rules(id),
ADD COLUMN IF NOT EXISTS min_profit_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_price_adjust_percent DECIMAL(5,2) DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS current_performance_score INTEGER,
ADD COLUMN IF NOT EXISTS current_rank VARCHAR(1);

CREATE INDEX IF NOT EXISTS idx_products_inventory_monitoring ON products_master(inventory_monitoring_enabled);
CREATE INDEX IF NOT EXISTS idx_products_pricing_rules ON products_master(pricing_rules_enabled);
CREATE INDEX IF NOT EXISTS idx_products_next_check ON products_master(next_inventory_check);

COMMENT ON COLUMN products_master.inventory_monitoring_enabled IS '在庫監視有効フラグ';
COMMENT ON COLUMN products_master.inventory_check_frequency IS '監視頻度：hourly/every_3h/every_6h/daily/weekly';

-- ====================================================================
-- 6. デフォルトルールの挿入
-- ====================================================================

INSERT INTO pricing_rules (name, description, type, enabled, priority, conditions, actions)
VALUES (
  '最低利益確保ストッパー',
  '価格調整時に最低利益額を確保するための必須ルール',
  'minimum_profit',
  true,
  999,
  '{"min_profit_usd": 10}',
  '{"enforce_minimum": true, "stop_if_below": true}'
) ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (name, description, type, enabled, priority, conditions, actions)
VALUES (
  '最安値追従（基本）',
  'eBayの最安値に追従しつつ、最低利益を確保',
  'follow_lowest',
  false,
  100,
  '{"marketplace": ["ebay"], "min_profit_margin": 15}',
  '{"adjust_type": "match_lowest", "adjust_value": 0, "min_profit_usd": 10}'
) ON CONFLICT DO NOTHING;

INSERT INTO pricing_rules (name, description, type, enabled, priority, conditions, actions)
VALUES (
  '最安値より5%安く',
  '最安値より5%安い価格で出品して競争力を確保',
  'follow_lowest',
  false,
  90,
  '{"marketplace": ["ebay"]}',
  '{"adjust_type": "percentage", "adjust_value": -5, "min_profit_usd": 10}'
) ON CONFLICT DO NOTHING;

-- ====================================================================
-- 7. ビューの作成
-- ====================================================================

CREATE OR REPLACE VIEW inventory_monitoring_targets AS
SELECT 
  p.*,
  ps.performance_score,
  ps.rank,
  CASE 
    WHEN p.next_inventory_check IS NULL THEN true
    WHEN p.next_inventory_check <= NOW() THEN true
    ELSE false
  END as should_check_now
FROM products_master p
LEFT JOIN product_scores ps ON p.id = ps.product_id
WHERE p.inventory_monitoring_enabled = true
  AND p.store_url IS NOT NULL
ORDER BY p.next_inventory_check ASC NULLS FIRST;

CREATE OR REPLACE VIEW pending_changes AS
SELECT 
  uc.*,
  p.sku,
  p.title,
  p.store_url as source_url
FROM unified_changes uc
JOIN products_master p ON uc.product_id = p.id
WHERE uc.status = 'pending'
ORDER BY uc.detected_at DESC;

CREATE OR REPLACE VIEW price_changes_summary AS
SELECT 
  DATE(created_at) as date,
  change_type,
  status,
  COUNT(*) as count,
  SUM(CASE WHEN auto_applied THEN 1 ELSE 0 END) as auto_applied_count,
  AVG(ABS(ebay_price_diff)) as avg_price_change_usd,
  SUM(ABS(profit_diff)) as total_profit_impact
FROM price_changes
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), change_type, status
ORDER BY date DESC, change_type;

-- ====================================================================
-- 8. トリガー関数の作成
-- ====================================================================

-- updated_atの自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- pricing_rulesテーブルのトリガー
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 9. 検証クエリ
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ テーブル作成確認';
  RAISE NOTICE '========================================';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_rules') THEN
    RAISE NOTICE '  ✓ pricing_rules';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'price_changes') THEN
    RAISE NOTICE '  ✓ price_changes';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_scores') THEN
    RAISE NOTICE '  ✓ product_scores';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_changes') THEN
    RAISE NOTICE '  ✓ unified_changes';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 1 完了';
  RAISE NOTICE '';
END $$;

SELECT 
  name,
  type,
  enabled,
  priority,
  description
FROM pricing_rules
ORDER BY priority DESC;
