-- ====================================================================
-- 個別商品ごとの価格戦略設定システム
-- ====================================================================
-- 作成日: 2025-11-02
-- 目的: グローバルデフォルト + 個別カスタマイズを可能にする
-- ====================================================================

-- ====================================================================
-- 1. グローバルデフォルト設定テーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS pricing_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_name VARCHAR(100) NOT NULL UNIQUE,
  
  -- 基本設定
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  
  -- 価格戦略
  strategy_type VARCHAR(50) DEFAULT 'minimum_profit',
  -- 'follow_lowest': 最安値追従
  -- 'price_difference': 差分維持
  -- 'minimum_profit': 最低利益確保
  -- 'seasonal': 季節変動
  -- 'none': 戦略なし
  
  -- 戦略パラメータ (JSON)
  strategy_params JSONB DEFAULT '{}',
  -- 例: {
  --   "min_profit_usd": 10,
  --   "price_adjust_percent": -5,
  --   "follow_competitor": true,
  --   "price_difference_usd": 5,
  --   "apply_above_lowest": true
  -- }
  
  -- 在庫管理設定
  out_of_stock_action VARCHAR(50) DEFAULT 'set_zero',
  -- 'set_zero': 在庫を0に設定
  -- 'pause_listing': 出品を一時停止
  -- 'end_listing': 出品を終了
  -- 'notify_only': 通知のみ
  
  -- 監視設定
  default_check_frequency VARCHAR(20) DEFAULT 'daily',
  -- 'hourly', 'every_3h', 'every_6h', 'daily', 'weekly'
  
  enable_price_monitoring BOOLEAN DEFAULT TRUE,
  enable_inventory_monitoring BOOLEAN DEFAULT TRUE,
  
  -- 通知設定
  notify_on_price_change BOOLEAN DEFAULT FALSE,
  notify_on_out_of_stock BOOLEAN DEFAULT TRUE,
  notification_email VARCHAR(255),
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- 説明
  description TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_pricing_defaults_enabled ON pricing_defaults(enabled);
CREATE INDEX IF NOT EXISTS idx_pricing_defaults_priority ON pricing_defaults(priority DESC);

-- コメント
COMMENT ON TABLE pricing_defaults IS 'グローバルデフォルト価格戦略設定';
COMMENT ON COLUMN pricing_defaults.strategy_type IS '価格戦略タイプ：follow_lowest/price_difference/minimum_profit/seasonal/none';
COMMENT ON COLUMN pricing_defaults.out_of_stock_action IS '在庫切れ時のアクション：set_zero/pause_listing/end_listing/notify_only';

-- ====================================================================
-- 2. products_master テーブルの拡張
-- ====================================================================

-- 個別価格戦略設定カラムを追加
ALTER TABLE products_master

-- 個別価格戦略設定
ADD COLUMN IF NOT EXISTS custom_pricing_strategy VARCHAR(50),
-- NULL = デフォルト使用
-- 'follow_lowest', 'price_difference', 'minimum_profit', 'seasonal', 'none'

ADD COLUMN IF NOT EXISTS custom_strategy_params JSONB DEFAULT '{}',
-- 商品固有の戦略パラメータ

ADD COLUMN IF NOT EXISTS custom_out_of_stock_action VARCHAR(50),
-- NULL = デフォルト使用
-- 'set_zero', 'pause_listing', 'end_listing', 'notify_only'

-- 個別監視設定
ADD COLUMN IF NOT EXISTS custom_check_frequency VARCHAR(20),
-- NULL = デフォルト使用
-- 'hourly', 'every_3h', 'every_6h', 'daily', 'weekly'

-- 設定の継承フラグ
ADD COLUMN IF NOT EXISTS use_default_pricing BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS use_default_inventory BOOLEAN DEFAULT TRUE,

-- 設定の上書き記録
ADD COLUMN IF NOT EXISTS pricing_overridden_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pricing_overridden_by VARCHAR(100),

-- 個別設定メモ
ADD COLUMN IF NOT EXISTS pricing_strategy_notes TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_products_custom_strategy ON products_master(custom_pricing_strategy);
CREATE INDEX IF NOT EXISTS idx_products_use_default_pricing ON products_master(use_default_pricing);
CREATE INDEX IF NOT EXISTS idx_products_use_default_inventory ON products_master(use_default_inventory);

-- コメント
COMMENT ON COLUMN products_master.custom_pricing_strategy IS '個別価格戦略（NULL=デフォルト使用）';
COMMENT ON COLUMN products_master.use_default_pricing IS 'TRUE=デフォルト価格戦略を使用、FALSE=個別設定を使用';
COMMENT ON COLUMN products_master.use_default_inventory IS 'TRUE=デフォルト在庫設定を使用、FALSE=個別設定を使用';

-- ====================================================================
-- 3. デフォルト設定の挿入
-- ====================================================================

-- グローバルデフォルト設定
INSERT INTO pricing_defaults (
  setting_name,
  strategy_type,
  strategy_params,
  out_of_stock_action,
  default_check_frequency,
  enable_price_monitoring,
  enable_inventory_monitoring,
  notify_on_out_of_stock,
  description
) VALUES (
  'global_default',
  'minimum_profit',
  '{
    "min_profit_usd": 10,
    "enforce_minimum": true,
    "max_adjust_percent": 20
  }',
  'set_zero',
  'daily',
  true,
  true,
  true,
  'すべての商品に適用されるデフォルト設定'
) ON CONFLICT (setting_name) DO UPDATE SET
  strategy_type = EXCLUDED.strategy_type,
  strategy_params = EXCLUDED.strategy_params,
  out_of_stock_action = EXCLUDED.out_of_stock_action,
  updated_at = NOW();

-- 最安値追従戦略のプリセット
INSERT INTO pricing_defaults (
  setting_name,
  enabled,
  priority,
  strategy_type,
  strategy_params,
  description
) VALUES (
  'preset_follow_lowest',
  false,
  50,
  'follow_lowest',
  '{
    "min_profit_usd": 10,
    "price_adjust_percent": 0,
    "follow_competitor": true,
    "max_adjust_percent": 20
  }',
  'プリセット: 最安値追従（最低利益確保）'
) ON CONFLICT (setting_name) DO NOTHING;

-- 差分維持戦略のプリセット
INSERT INTO pricing_defaults (
  setting_name,
  enabled,
  priority,
  strategy_type,
  strategy_params,
  description
) VALUES (
  'preset_price_difference',
  false,
  40,
  'price_difference',
  '{
    "min_profit_usd": 10,
    "price_difference_usd": -5,
    "apply_above_lowest": false
  }',
  'プリセット: 最安値より$5安く'
) ON CONFLICT (setting_name) DO NOTHING;

-- ====================================================================
-- 4. ビューの作成
-- ====================================================================

-- 商品の有効な価格戦略を取得するビュー
CREATE OR REPLACE VIEW product_effective_strategy AS
SELECT 
  p.id as product_id,
  p.sku,
  p.title,
  
  -- 有効な価格戦略
  CASE 
    WHEN p.use_default_pricing = FALSE AND p.custom_pricing_strategy IS NOT NULL 
    THEN p.custom_pricing_strategy
    ELSE pd.strategy_type
  END as effective_strategy,
  
  -- 有効な戦略パラメータ
  CASE 
    WHEN p.use_default_pricing = FALSE AND p.custom_strategy_params IS NOT NULL 
    THEN p.custom_strategy_params
    ELSE pd.strategy_params
  END as effective_params,
  
  -- 有効な在庫切れアクション
  CASE 
    WHEN p.use_default_inventory = FALSE AND p.custom_out_of_stock_action IS NOT NULL 
    THEN p.custom_out_of_stock_action
    ELSE pd.out_of_stock_action
  END as effective_out_of_stock_action,
  
  -- 有効な監視頻度
  CASE 
    WHEN p.use_default_inventory = FALSE AND p.custom_check_frequency IS NOT NULL 
    THEN p.custom_check_frequency
    ELSE pd.default_check_frequency
  END as effective_check_frequency,
  
  -- 設定のソース
  CASE 
    WHEN p.use_default_pricing = FALSE THEN 'custom'
    ELSE 'default'
  END as strategy_source,
  
  -- 個別設定フラグ
  p.use_default_pricing,
  p.use_default_inventory,
  
  -- 上書き情報
  p.pricing_overridden_at,
  p.pricing_overridden_by,
  p.pricing_strategy_notes

FROM products_master p
CROSS JOIN pricing_defaults pd
WHERE pd.setting_name = 'global_default';

COMMENT ON VIEW product_effective_strategy IS '商品の有効な価格戦略（デフォルト or 個別設定）';

-- デフォルト設定を使用している商品数のビュー
CREATE OR REPLACE VIEW pricing_strategy_stats AS
SELECT 
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE use_default_pricing = TRUE) as using_default,
  COUNT(*) FILTER (WHERE use_default_pricing = FALSE) as using_custom,
  COUNT(*) FILTER (WHERE custom_pricing_strategy = 'follow_lowest') as custom_follow_lowest,
  COUNT(*) FILTER (WHERE custom_pricing_strategy = 'price_difference') as custom_price_diff,
  COUNT(*) FILTER (WHERE custom_pricing_strategy = 'minimum_profit') as custom_min_profit,
  COUNT(*) FILTER (WHERE custom_pricing_strategy = 'none') as custom_no_strategy
FROM products_master
WHERE inventory_monitoring_enabled = TRUE;

COMMENT ON VIEW pricing_strategy_stats IS '価格戦略の使用状況統計';

-- ====================================================================
-- 5. トリガー関数の作成
-- ====================================================================

-- updated_atの自動更新
DROP TRIGGER IF EXISTS update_pricing_defaults_updated_at ON pricing_defaults;
CREATE TRIGGER update_pricing_defaults_updated_at
  BEFORE UPDATE ON pricing_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 個別設定を有効化した際のタイムスタンプ記録
CREATE OR REPLACE FUNCTION record_pricing_override()
RETURNS TRIGGER AS $$
BEGIN
  -- use_default_pricingがFALSEに変更された場合
  IF NEW.use_default_pricing = FALSE AND OLD.use_default_pricing = TRUE THEN
    NEW.pricing_overridden_at := NOW();
    -- pricing_overridden_byは外部から設定される想定
  END IF;
  
  -- use_default_pricingがTRUEに戻された場合
  IF NEW.use_default_pricing = TRUE AND OLD.use_default_pricing = FALSE THEN
    NEW.pricing_overridden_at := NULL;
    NEW.pricing_overridden_by := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_pricing_override ON products_master;
CREATE TRIGGER trigger_record_pricing_override
  BEFORE UPDATE ON products_master
  FOR EACH ROW
  WHEN (OLD.use_default_pricing IS DISTINCT FROM NEW.use_default_pricing)
  EXECUTE FUNCTION record_pricing_override();

-- ====================================================================
-- 6. 便利な関数の作成
-- ====================================================================

-- 商品の有効な戦略を取得する関数
CREATE OR REPLACE FUNCTION get_effective_strategy(p_product_id INTEGER)
RETURNS TABLE (
  strategy_type VARCHAR(50),
  strategy_params JSONB,
  out_of_stock_action VARCHAR(50),
  check_frequency VARCHAR(20),
  source VARCHAR(10)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    effective_strategy::VARCHAR(50),
    effective_params,
    effective_out_of_stock_action::VARCHAR(50),
    effective_check_frequency::VARCHAR(20),
    strategy_source::VARCHAR(10)
  FROM product_effective_strategy
  WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_effective_strategy IS '商品の有効な価格戦略を取得（個別設定 or デフォルト）';

-- デフォルト設定を一括適用する関数
CREATE OR REPLACE FUNCTION apply_default_to_all_products()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE products_master
  SET 
    use_default_pricing = TRUE,
    use_default_inventory = TRUE,
    pricing_overridden_at = NULL,
    pricing_overridden_by = NULL
  WHERE inventory_monitoring_enabled = TRUE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_default_to_all_products IS '全商品にデフォルト設定を適用';

-- ====================================================================
-- 7. 検証クエリ
-- ====================================================================

-- テーブルの存在確認
DO $$
BEGIN
  RAISE NOTICE '✓ テーブル作成確認';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_defaults') THEN
    RAISE NOTICE '  ✓ pricing_defaults テーブル作成済み';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'products_master' AND column_name = 'custom_pricing_strategy') THEN
    RAISE NOTICE '  ✓ products_master 拡張カラム追加済み';
  END IF;
END $$;

-- デフォルト設定の確認
SELECT 
  setting_name,
  strategy_type,
  strategy_params,
  out_of_stock_action,
  description
FROM pricing_defaults
ORDER BY priority DESC;

-- ビューの確認
SELECT * FROM pricing_strategy_stats;

-- サンプルデータでテスト（商品が存在する場合）
DO $$
DECLARE
  sample_product_id INTEGER;
  strategy_result RECORD;
BEGIN
  -- 最初の商品を取得
  SELECT id INTO sample_product_id
  FROM products_master
  LIMIT 1;
  
  IF sample_product_id IS NOT NULL THEN
    -- 有効な戦略を取得
    SELECT * INTO strategy_result
    FROM get_effective_strategy(sample_product_id);
    
    RAISE NOTICE '✓ サンプル商品（ID: %）の有効な戦略:', sample_product_id;
    RAISE NOTICE '  戦略タイプ: %', strategy_result.strategy_type;
    RAISE NOTICE '  ソース: %', strategy_result.source;
  END IF;
END $$;

-- ====================================================================
-- 完了メッセージ
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 個別価格戦略システム セットアップ完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたオブジェクト:';
  RAISE NOTICE '  - pricing_defaults テーブル';
  RAISE NOTICE '  - products_master 拡張カラム';
  RAISE NOTICE '  - product_effective_strategy ビュー';
  RAISE NOTICE '  - pricing_strategy_stats ビュー';
  RAISE NOTICE '  - get_effective_strategy() 関数';
  RAISE NOTICE '  - apply_default_to_all_products() 関数';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  1. デフォルト設定UI作成 (/settings/pricing-defaults)';
  RAISE NOTICE '  2. 編集モーダル拡張 (/tools/editing)';
  RAISE NOTICE '  3. 価格エンジンの戦略解決ロジック実装';
  RAISE NOTICE '';
END $$;
