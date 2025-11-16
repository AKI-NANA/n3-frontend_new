-- ====================================================================
-- 在庫管理と価格変動の統合システム - データベースマイグレーション
-- ====================================================================
-- 作成日: 2025-11-02
-- 目的: 在庫監視と価格変動を統合管理するためのテーブル構造を作成
-- ====================================================================

-- ====================================================================
-- 1. 価格戦略ルールテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, 
  -- 'follow_lowest': 最安値追従
  -- 'seasonal': 季節変動
  -- 'competitor': 競合追従
  -- 'offer_strategy': オファー獲得戦略
  -- 'minimum_profit': 最低利益確保
  -- 'region_category': 地域・カテゴリ別調整
  
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- 数値が大きいほど優先度高
  
  -- 適用条件 (JSON)
  conditions JSONB DEFAULT '{}',
  -- 例: {
  --   "marketplace": ["ebay", "amazon"],
  --   "category": ["Trading Cards", "Cameras"],
  --   "min_profit_margin": 20,
  --   "max_price_jpy": 100000,
  --   "min_stock": 1
  -- }
  
  -- 実行アクション (JSON)
  actions JSONB DEFAULT '{}',
  -- 例: {
  --   "adjust_type": "percentage", // "percentage" or "fixed_amount"
  --   "adjust_value": -5, // -5% または -500円
  --   "apply_to": "ebay_price", // "ebay_price" or "source_price"
  --   "min_profit_usd": 10, // 最低利益額
  --   "max_adjust_percent": 10 // 最大調整幅
  -- }
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_applied_at TIMESTAMP,
  applied_count INTEGER DEFAULT 0
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_pricing_rules_enabled ON pricing_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON pricing_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON pricing_rules(type);

-- コメント
COMMENT ON TABLE pricing_rules IS '価格戦略ルール：自動価格調整のロジックを定義';
COMMENT ON COLUMN pricing_rules.type IS 'ルールタイプ：follow_lowest/seasonal/competitor/offer_strategy/minimum_profit/region_category';
COMMENT ON COLUMN pricing_rules.priority IS '優先度：数値が大きいほど優先的に適用';

-- ====================================================================
-- 2. 価格変動履歴テーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS price_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  ebay_listing_id VARCHAR(50),
  
  -- 変動情報
  change_type VARCHAR(50) NOT NULL,
  -- 'source_price': 仕入れ価格変動
  -- 'competitor_price': 競合価格変動
  -- 'auto_adjust': 自動調整
  -- 'manual_adjust': 手動調整
  -- 'seasonal_adjust': 季節調整
  
  trigger_type VARCHAR(50),
  -- 'inventory_monitoring': 在庫監視から
  -- 'pricing_rule': 価格ルールから
  -- 'manual': 手動実行
  -- 'cron': Cron自動実行
  
  -- 価格データ（仕入れ価格）
  old_source_price_jpy DECIMAL(10,2),
  new_source_price_jpy DECIMAL(10,2),
  source_price_diff DECIMAL(10,2), -- 差分
  
  -- 価格データ（eBay販売価格）
  old_ebay_price_usd DECIMAL(10,2),
  new_ebay_price_usd DECIMAL(10,2),
  ebay_price_diff DECIMAL(10,2), -- 差分
  
  -- 利益計算
  old_profit_usd DECIMAL(10,2),
  new_profit_usd DECIMAL(10,2),
  profit_diff DECIMAL(10,2),
  
  old_profit_margin DECIMAL(5,2),
  new_profit_margin DECIMAL(5,2),
  
  -- 適用ルール
  applied_rule_id UUID REFERENCES pricing_rules(id),
  applied_rule_name VARCHAR(100),
  
  -- 配送ポリシー変更
  shipping_policy_changed BOOLEAN DEFAULT FALSE,
  old_shipping_policy_id VARCHAR(50),
  new_shipping_policy_id VARCHAR(50),
  
  -- ステータス
  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending': 承認待ち
  -- 'approved': 承認済み
  -- 'applied': eBay反映済み
  -- 'rejected': 否認
  
  auto_applied BOOLEAN DEFAULT FALSE,
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  applied_at TIMESTAMP,
  approved_by VARCHAR(100),
  
  -- エラー情報
  error_message TEXT,
  
  FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_price_changes_product ON price_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_status ON price_changes(status);
CREATE INDEX IF NOT EXISTS idx_price_changes_created ON price_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_changes_ebay_listing ON price_changes(ebay_listing_id);

-- コメント
COMMENT ON TABLE price_changes IS '価格変動履歴：価格変更の記録と承認管理';
COMMENT ON COLUMN price_changes.change_type IS '変動タイプ：source_price/competitor_price/auto_adjust/manual_adjust/seasonal_adjust';
COMMENT ON COLUMN price_changes.status IS 'ステータス：pending/approved/applied/rejected';

-- ====================================================================
-- 3. スコアリングデータテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  ebay_listing_id VARCHAR(50),
  
  -- スコア要素（eBayから取得）
  view_count INTEGER DEFAULT 0,
  watcher_count INTEGER DEFAULT 0,
  days_listed INTEGER DEFAULT 0,
  
  -- スコア要素（市場データ）
  competitor_count INTEGER DEFAULT 0,
  market_inventory INTEGER DEFAULT 0,
  
  -- スコア要素（パフォーマンス）
  sold_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- 計算スコア
  performance_score INTEGER, -- 0-100
  rank VARCHAR(1), -- A, B, C, D, E
  -- A: 90-100 (優秀)
  -- B: 70-89 (良好)
  -- C: 50-69 (普通)
  -- D: 30-49 (要改善)
  -- E: 0-29 (低パフォーマンス)
  
  -- 自動アクション
  action_taken VARCHAR(50),
  -- 'price_increase': 値上げ
  -- 'price_decrease': 値下げ
  -- 'pause': 一時停止
  -- 'replace': 出品入替
  -- 'none': アクションなし
  
  action_reason TEXT,
  
  -- メタデータ
  calculated_at TIMESTAMP DEFAULT NOW(),
  next_calculation_at TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_product_scores_product ON product_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_product_scores_rank ON product_scores(rank);
CREATE INDEX IF NOT EXISTS idx_product_scores_score ON product_scores(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_scores_ebay_listing ON product_scores(ebay_listing_id);

-- コメント
COMMENT ON TABLE product_scores IS 'パフォーマンススコア：商品の販売パフォーマンスを評価';
COMMENT ON COLUMN product_scores.rank IS 'ランク：A(優秀)/B(良好)/C(普通)/D(要改善)/E(低パフォーマンス)';

-- ====================================================================
-- 4. 統合変動データテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS unified_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  ebay_listing_id VARCHAR(50),
  
  -- 変動カテゴリ
  change_category VARCHAR(20) NOT NULL,
  -- 'inventory': 在庫変動のみ
  -- 'price': 価格変動のみ
  -- 'both': 在庫と価格の両方
  -- 'page_error': ページエラー
  
  -- 在庫変動データ (JSON)
  inventory_change JSONB,
  -- 例: {
  --   "old_stock": 5,
  --   "new_stock": 3,
  --   "available": true,
  --   "page_exists": true,
  --   "page_status": "active"
  -- }
  
  -- 価格変動データ (JSON)
  price_change JSONB,
  -- 例: {
  --   "old_price_jpy": 10000,
  --   "new_price_jpy": 9500,
  --   "price_diff_jpy": -500,
  --   "recalculated_ebay_price_usd": 90.50,
  --   "profit_impact": -4.50
  -- }
  
  -- 処理ステータス
  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending': 未処理
  -- 'approved': 承認済み
  -- 'applied': 適用済み
  -- 'rejected': 拒否
  -- 'auto_applied': 自動適用済み
  
  auto_applied BOOLEAN DEFAULT FALSE,
  
  -- リンク
  inventory_change_id UUID, -- inventory_changes.id への参照
  price_change_id UUID REFERENCES price_changes(id),
  
  -- メタデータ
  detected_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  applied_to_ebay_at TIMESTAMP,
  
  -- エラー情報
  error_message TEXT,
  
  FOREIGN KEY (product_id) REFERENCES products_master(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_unified_changes_product ON unified_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_unified_changes_status ON unified_changes(status);
CREATE INDEX IF NOT EXISTS idx_unified_changes_category ON unified_changes(change_category);
CREATE INDEX IF NOT EXISTS idx_unified_changes_detected ON unified_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_changes_ebay_listing ON unified_changes(ebay_listing_id);

-- コメント
COMMENT ON TABLE unified_changes IS '統合変動データ：在庫と価格の変動を一元管理';
COMMENT ON COLUMN unified_changes.change_category IS '変動カテゴリ：inventory/price/both/page_error';

-- ====================================================================
-- 5. products_master テーブルの拡張
-- ====================================================================

-- 在庫監視関連カラム
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS inventory_monitoring_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inventory_check_frequency VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS last_inventory_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_inventory_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS inventory_monitoring_started_at TIMESTAMP;

-- 価格戦略関連カラム
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS pricing_rules_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS active_pricing_rule_id UUID REFERENCES pricing_rules(id),
ADD COLUMN IF NOT EXISTS min_profit_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_price_adjust_percent DECIMAL(5,2) DEFAULT 10.0;

-- パフォーマンス関連カラム
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS current_performance_score INTEGER,
ADD COLUMN IF NOT EXISTS current_rank VARCHAR(1);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_products_inventory_monitoring ON products_master(inventory_monitoring_enabled);
CREATE INDEX IF NOT EXISTS idx_products_pricing_rules ON products_master(pricing_rules_enabled);
CREATE INDEX IF NOT EXISTS idx_products_next_check ON products_master(next_inventory_check);

-- コメント
COMMENT ON COLUMN products_master.inventory_monitoring_enabled IS '在庫監視有効フラグ：スケジュール生成時または出品時に自動でtrue';
COMMENT ON COLUMN products_master.inventory_check_frequency IS '監視頻度：hourly/every_3h/every_6h/daily/weekly';
COMMENT ON COLUMN products_master.pricing_rules_enabled IS '価格ルール有効フラグ：自動価格調整を適用するか';
COMMENT ON COLUMN products_master.min_profit_usd IS '最低利益額（USD）：これを下回る価格調整は行わない';

-- ====================================================================
-- 6. デフォルトルールの挿入
-- ====================================================================

-- デフォルトルール1: 最低利益確保（必須）
INSERT INTO pricing_rules (name, description, type, enabled, priority, conditions, actions)
VALUES (
  '最低利益確保ストッパー',
  '価格調整時に最低利益額を確保するための必須ルール',
  'minimum_profit',
  true,
  999, -- 最高優先度
  '{"min_profit_usd": 10}',
  '{"enforce_minimum": true, "stop_if_below": true}'
) ON CONFLICT DO NOTHING;

-- デフォルトルール2: 最安値追従（基本戦略）
INSERT INTO pricing_rules (name, description, type, enabled, priority, conditions, actions)
VALUES (
  '最安値追従（基本）',
  'eBayの最安値に追従しつつ、最低利益を確保',
  'follow_lowest',
  false, -- デフォルトは無効
  100,
  '{"marketplace": ["ebay"], "min_profit_margin": 15}',
  '{"adjust_type": "match_lowest", "adjust_value": 0, "min_profit_usd": 10}'
) ON CONFLICT DO NOTHING;

-- デフォルトルール3: 価格差維持
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

-- 在庫監視対象商品のビュー
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

-- 未処理の変動データのビュー
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

-- 価格変動サマリービュー
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

-- スケジュール生成時に在庫監視を自動有効化
CREATE OR REPLACE FUNCTION enable_inventory_monitoring_on_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- scheduled_listing_date が設定されたら在庫監視を有効化
  IF NEW.scheduled_listing_date IS NOT NULL AND OLD.scheduled_listing_date IS NULL THEN
    NEW.inventory_monitoring_enabled := true;
    NEW.inventory_monitoring_started_at := NOW();
    -- 7日前から監視開始
    NEW.next_inventory_check := NEW.scheduled_listing_date - INTERVAL '7 days';
    
    -- 現在時刻が7日前より後なら、即座にチェック
    IF NEW.next_inventory_check < NOW() THEN
      NEW.next_inventory_check := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_enable_inventory_monitoring ON products_master;
CREATE TRIGGER trigger_enable_inventory_monitoring
  BEFORE UPDATE ON products_master
  FOR EACH ROW
  WHEN (NEW.scheduled_listing_date IS NOT NULL AND OLD.scheduled_listing_date IS NULL)
  EXECUTE FUNCTION enable_inventory_monitoring_on_schedule();

-- updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_atトリガーを追加
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 9. 検証クエリ
-- ====================================================================

-- テーブルの存在確認
DO $$
BEGIN
  RAISE NOTICE 'テーブル作成確認中...';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_rules') THEN
    RAISE NOTICE '✓ pricing_rules テーブル作成済み';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'price_changes') THEN
    RAISE NOTICE '✓ price_changes テーブル作成済み';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_scores') THEN
    RAISE NOTICE '✓ product_scores テーブル作成済み';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_changes') THEN
    RAISE NOTICE '✓ unified_changes テーブル作成済み';
  END IF;
END $$;

-- デフォルトルールの確認
SELECT 
  name,
  type,
  enabled,
  priority,
  description
FROM pricing_rules
ORDER BY priority DESC;

-- 在庫監視対象商品数の確認
SELECT 
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE inventory_monitoring_enabled = true) as monitoring_enabled,
  COUNT(*) FILTER (WHERE pricing_rules_enabled = true) as pricing_enabled
FROM products_master;
