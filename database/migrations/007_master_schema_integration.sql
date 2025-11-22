-- ============================================================================
-- 最終統合フェーズ: マスタースキーマ統合マイグレーション
-- ============================================================================
-- Phase 1-8の全テーブル定義を統合し、一度の実行でデータベース基盤を構築
--
-- 実行方法:
-- 1. Supabase Dashboard > SQL Editor を開く
-- 2. このファイルの内容を貼り付け
-- 3. 「RUN」をクリック
--
-- ============================================================================

-- ============================================================================
-- Phase 1: 受注管理 V2.0
-- ============================================================================

-- 注文テーブル V2.0（利益率・リスク分析強化版）
CREATE TABLE IF NOT EXISTS orders_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  order_number VARCHAR(100) UNIQUE NOT NULL,
  marketplace VARCHAR(50) NOT NULL, -- 'eBay', 'Amazon', 'Mercari', etc.
  marketplace_order_id VARCHAR(100),
  customer_id VARCHAR(100),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),

  -- 注文日時
  order_date TIMESTAMPTZ NOT NULL,
  payment_date TIMESTAMPTZ,

  -- 金額情報
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'JPY',

  -- Phase 1: 利益率分析
  cost_price DECIMAL(10, 2), -- 仕入れ原価
  selling_price DECIMAL(10, 2), -- 販売価格
  shipping_cost DECIMAL(10, 2), -- 配送コスト
  marketplace_fee DECIMAL(10, 2), -- モール手数料
  payment_fee DECIMAL(10, 2), -- 決済手数料
  profit_amount DECIMAL(10, 2), -- 利益額
  profit_rate DECIMAL(5, 2), -- 利益率（%）

  -- Phase 1: リスク分析
  risk_score INTEGER DEFAULT 0, -- 0-100のリスクスコア
  risk_factors JSONB DEFAULT '[]'::jsonb, -- リスク要因配列
  is_high_risk BOOLEAN DEFAULT false,

  -- ステータス
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid, refunded

  -- 商品情報
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- 商品配列

  -- 配送情報
  shipping_address JSONB,
  shipping_method VARCHAR(100),

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- インデックス
  CONSTRAINT orders_v2_profit_rate_check CHECK (profit_rate >= -100 AND profit_rate <= 100)
);

CREATE INDEX IF NOT EXISTS idx_orders_v2_order_date ON orders_v2(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_v2_marketplace ON orders_v2(marketplace);
CREATE INDEX IF NOT EXISTS idx_orders_v2_status ON orders_v2(status);
CREATE INDEX IF NOT EXISTS idx_orders_v2_profit_rate ON orders_v2(profit_rate);
CREATE INDEX IF NOT EXISTS idx_orders_v2_risk_score ON orders_v2(risk_score);

-- ============================================================================
-- Phase 2: 出荷管理
-- ============================================================================

-- 出荷キュータブル（配送最適化）
CREATE TABLE IF NOT EXISTS shipping_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 注文関連
  order_id UUID REFERENCES orders_v2(id) ON DELETE CASCADE,
  order_number VARCHAR(100) NOT NULL,

  -- 配送情報
  carrier VARCHAR(50) NOT NULL, -- 'ヤマト', '佐川', '郵便', etc.
  shipping_method VARCHAR(100), -- '宅急便', 'ネコポス', 'レターパック', etc.
  tracking_number VARCHAR(100),

  -- Phase 2: 遅延リスク分析
  estimated_ship_date DATE NOT NULL,
  actual_ship_date DATE,
  is_delayed_risk BOOLEAN DEFAULT false, -- 遅延リスクフラグ
  delay_hours INTEGER DEFAULT 0, -- 遅延時間数

  -- 優先度
  priority INTEGER DEFAULT 5, -- 1(最高) - 10(最低)
  urgency_level VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low

  -- ステータス
  status VARCHAR(50) DEFAULT 'pending', -- pending, packed, shipped, delivered, failed

  -- 梱包情報
  package_dimensions JSONB, -- {length, width, height, weight}
  package_type VARCHAR(50), -- 'box', 'envelope', 'tube', etc.

  -- Phase 2: コスト最適化
  shipping_cost DECIMAL(10, 2),
  optimal_carrier VARCHAR(50), -- AI推奨の最適配送業者
  cost_savings DECIMAL(10, 2), -- コスト削減額

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shipping_queue_order_id ON shipping_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_queue_status ON shipping_queue(status);
CREATE INDEX IF NOT EXISTS idx_shipping_queue_priority ON shipping_queue(priority);
CREATE INDEX IF NOT EXISTS idx_shipping_queue_estimated_ship_date ON shipping_queue(estimated_ship_date);

-- ============================================================================
-- Phase 4: 資金繰り予測
-- ============================================================================

-- キャッシュフロー予測テーブル
CREATE TABLE IF NOT EXISTS cashflow_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 期間
  forecast_date DATE NOT NULL UNIQUE,
  forecast_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'

  -- Phase 4: 収入予測
  expected_revenue DECIMAL(12, 2) DEFAULT 0, -- 予想売上
  confirmed_revenue DECIMAL(12, 2) DEFAULT 0, -- 確定売上
  pending_revenue DECIMAL(12, 2) DEFAULT 0, -- 保留中売上

  -- Phase 4: 支出予測
  expected_expenses DECIMAL(12, 2) DEFAULT 0, -- 予想支出
  fixed_costs DECIMAL(12, 2) DEFAULT 0, -- 固定費
  variable_costs DECIMAL(12, 2) DEFAULT 0, -- 変動費

  -- Phase 4: キャッシュポジション
  opening_balance DECIMAL(12, 2) DEFAULT 0, -- 期首残高
  closing_balance DECIMAL(12, 2) DEFAULT 0, -- 期末残高
  net_cashflow DECIMAL(12, 2) DEFAULT 0, -- 純キャッシュフロー

  -- Phase 4: リスク分析
  is_shortage_risk BOOLEAN DEFAULT false, -- 資金ショートリスク
  shortage_amount DECIMAL(12, 2) DEFAULT 0, -- 不足額
  risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical

  -- AI推奨アクション
  recommended_actions JSONB DEFAULT '[]'::jsonb,

  -- メタデータ
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashflow_forecast_date ON cashflow_forecast(forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_cashflow_forecast_month ON cashflow_forecast(forecast_month);
CREATE INDEX IF NOT EXISTS idx_cashflow_forecast_risk ON cashflow_forecast(is_shortage_risk, risk_level);

-- ============================================================================
-- Phase 6: 統合通信ハブ
-- ============================================================================

-- 統合メッセージテーブル（全モール一元管理）
CREATE TABLE IF NOT EXISTS unified_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- メッセージ基本情報
  marketplace VARCHAR(50) NOT NULL, -- 'eBay', 'Amazon', 'Mercari', etc.
  marketplace_message_id VARCHAR(200) UNIQUE NOT NULL,
  thread_id VARCHAR(200),

  -- 送受信情報
  direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
  from_user VARCHAR(255),
  to_user VARCHAR(255),

  -- Phase 6: メッセージ内容
  subject VARCHAR(500),
  body TEXT NOT NULL,
  message_type VARCHAR(50), -- 'question', 'complaint', 'shipping_inquiry', etc.

  -- Phase 6: AI分析
  sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
  urgency_level VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
  requires_human BOOLEAN DEFAULT false, -- 人間対応が必要
  ai_suggested_reply TEXT, -- AI提案返信文

  -- ステータス
  status VARCHAR(50) DEFAULT 'unread', -- unread, read, replied, archived
  is_replied BOOLEAN DEFAULT false,
  reply_deadline TIMESTAMPTZ,

  -- 関連注文
  order_id UUID REFERENCES orders_v2(id) ON DELETE SET NULL,
  order_number VARCHAR(100),

  -- メタデータ
  received_at TIMESTAMPTZ NOT NULL,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unified_messages_marketplace ON unified_messages(marketplace);
CREATE INDEX IF NOT EXISTS idx_unified_messages_status ON unified_messages(status);
CREATE INDEX IF NOT EXISTS idx_unified_messages_urgency ON unified_messages(urgency_level);
CREATE INDEX IF NOT EXISTS idx_unified_messages_received_at ON unified_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_messages_order_id ON unified_messages(order_id);

-- ============================================================================
-- Phase 7: SEO健全性スコア
-- ============================================================================

-- マーケットプレイスリスティングテーブル（SEO最適化）
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- リスティング基本情報
  marketplace VARCHAR(50) NOT NULL,
  listing_id VARCHAR(200) UNIQUE NOT NULL,
  sku VARCHAR(100),

  -- 商品情報
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'JPY',
  quantity INTEGER DEFAULT 0,

  -- 画像
  main_image_url TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,

  -- Phase 7: SEO健全性スコア
  health_score INTEGER DEFAULT 0, -- 0-100のスコア
  seo_issues JSONB DEFAULT '[]'::jsonb, -- SEO問題配列

  -- Phase 7: パフォーマンス指標
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  sales_count INTEGER DEFAULT 0,

  -- Phase 7: AI推奨改善
  suggested_title VARCHAR(500),
  suggested_improvements JSONB DEFAULT '[]'::jsonb,
  auto_terminate_recommended BOOLEAN DEFAULT false, -- 自動終了推奨

  -- ステータス
  status VARCHAR(50) DEFAULT 'active', -- active, ended, sold, suspended
  listing_type VARCHAR(50), -- auction, fixed_price, store_inventory

  -- 日時
  listed_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_optimized_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT marketplace_listings_health_score_check CHECK (health_score >= 0 AND health_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_marketplace ON marketplace_listings(marketplace);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_health_score ON marketplace_listings(health_score);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_sku ON marketplace_listings(sku);

-- ============================================================================
-- Phase 8: 多モール統合（アジア主要モール）
-- ============================================================================

-- アジアモール出品履歴テーブル
CREATE TABLE IF NOT EXISTS asia_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- マスターリスティング参照
  master_listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,

  -- アジアモール情報
  marketplace VARCHAR(50) NOT NULL, -- 'Qoo10', 'Shopee', 'Coupang', 'Amazon'
  marketplace_listing_id VARCHAR(200) UNIQUE NOT NULL,
  market_region VARCHAR(10), -- 'SG', 'PH', 'TW', 'KR', 'JP', etc.

  -- Phase 8: 価格情報
  base_price DECIMAL(10, 2) NOT NULL,
  local_price DECIMAL(10, 2) NOT NULL,
  local_currency VARCHAR(3) NOT NULL,
  ddp_price DECIMAL(10, 2), -- DDP価格（関税込み）

  -- Phase 8: T23 Qoo10プロモーション
  promotion_type VARCHAR(50), -- 'TIMESALE', 'GROUPBUY', 'NONE'
  promotion_active BOOLEAN DEFAULT false,
  sale_price DECIMAL(10, 2),
  promotion_start_date TIMESTAMPTZ,
  promotion_end_date TIMESTAMPTZ,

  -- Phase 8: T24 Coupang利益保証
  category_id VARCHAR(50),
  commission_rate DECIMAL(5, 4),
  profit_margin DECIMAL(5, 2), -- 利益率（%）
  price_adjusted BOOLEAN DEFAULT false, -- 価格自動調整フラグ

  -- Phase 8: T25/T26 Shopee最適化
  shipping_profile_id VARCHAR(100),
  preferred_image_ratio VARCHAR(10), -- '1:1', '3:4'
  optimized_images JSONB DEFAULT '[]'::jsonb,

  -- Phase 8: T27 Amazon DDP
  hs_code VARCHAR(20), -- HSコード
  origin_country VARCHAR(50),
  fulfillment_type VARCHAR(10), -- 'FBA', 'FBM'

  -- ステータス
  status VARCHAR(50) DEFAULT 'active',
  publish_status VARCHAR(50) DEFAULT 'pending', -- pending, published, failed

  -- メタデータ
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asia_listings_master_id ON asia_marketplace_listings(master_listing_id);
CREATE INDEX IF NOT EXISTS idx_asia_listings_marketplace ON asia_marketplace_listings(marketplace);
CREATE INDEX IF NOT EXISTS idx_asia_listings_market_region ON asia_marketplace_listings(market_region);
CREATE INDEX IF NOT EXISTS idx_asia_listings_status ON asia_marketplace_listings(status);

-- ============================================================================
-- 補助テーブル群
-- ============================================================================

-- 為替レートテーブル
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 通貨ペア
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,

  -- レート
  rate DECIMAL(12, 6) NOT NULL,

  -- 日時
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date DESC);

-- APIトークン管理テーブル
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- マーケットプレイス
  marketplace VARCHAR(50) NOT NULL UNIQUE,

  -- トークン情報
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,

  -- スコープ
  scopes TEXT[],

  -- ステータス
  is_active BOOLEAN DEFAULT true,
  last_refreshed_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS) ポリシー
-- ============================================================================

-- RLSを有効化
ALTER TABLE orders_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE asia_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 全ユーザーに読み取り権限を付与（必要に応じて調整）
CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON orders_v2
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON shipping_queue
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON cashflow_forecast
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON unified_messages
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON marketplace_listings
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON asia_marketplace_listings
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON exchange_rates
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON api_tokens
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS enable_read_for_all_users ON system_settings
  FOR SELECT USING (true);

-- 全ユーザーに書き込み権限を付与（必要に応じて調整）
CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON orders_v2
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON orders_v2
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON shipping_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON shipping_queue
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON cashflow_forecast
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON cashflow_forecast
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON unified_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON unified_messages
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON marketplace_listings
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON marketplace_listings
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON asia_marketplace_listings
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON asia_marketplace_listings
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON exchange_rates
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON api_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON api_tokens
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS enable_insert_for_all_users ON system_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS enable_update_for_all_users ON system_settings
  FOR UPDATE USING (true);

-- ============================================================================
-- トリガー関数: updated_at自動更新
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_orders_v2_updated_at
  BEFORE UPDATE ON orders_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_queue_updated_at
  BEFORE UPDATE ON shipping_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashflow_forecast_updated_at
  BEFORE UPDATE ON cashflow_forecast
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_messages_updated_at
  BEFORE UPDATE ON unified_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asia_marketplace_listings_updated_at
  BEFORE UPDATE ON asia_marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_tokens_updated_at
  BEFORE UPDATE ON api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 初期データ投入
-- ============================================================================

-- デフォルトのシステム設定
INSERT INTO system_settings (key, value, description) VALUES
  ('ai_auto_reply_enabled', 'true', 'AI自動返信機能の有効化'),
  ('seo_auto_optimization_enabled', 'true', 'SEO自動最適化の有効化'),
  ('risk_analysis_threshold', '70', 'リスクスコアの警告閾値'),
  ('cashflow_forecast_months', '6', 'キャッシュフロー予測期間（月）'),
  ('default_profit_margin_target', '20.0', '目標利益率（%）')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- マイグレーション完了
-- ============================================================================

-- マイグレーション実行ログ
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO migration_history (migration_name)
VALUES ('007_master_schema_integration')
ON CONFLICT (migration_name) DO NOTHING;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ マスタースキーマ統合マイグレーション完了';
  RAISE NOTICE '📊 作成されたテーブル:';
  RAISE NOTICE '  - orders_v2 (Phase 1: 受注管理)';
  RAISE NOTICE '  - shipping_queue (Phase 2: 出荷管理)';
  RAISE NOTICE '  - cashflow_forecast (Phase 4: 資金繰り予測)';
  RAISE NOTICE '  - unified_messages (Phase 6: 統合通信ハブ)';
  RAISE NOTICE '  - marketplace_listings (Phase 7: SEO健全性スコア)';
  RAISE NOTICE '  - asia_marketplace_listings (Phase 8: 多モール統合)';
  RAISE NOTICE '  - exchange_rates, api_tokens, system_settings (補助テーブル)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLSポリシー設定完了';
  RAISE NOTICE '⚡ トリガー関数設定完了';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ: I2 (AI連携の完全実装) へ進んでください';
END $$;
