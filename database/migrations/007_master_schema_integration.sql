-- ============================================
-- 多販路EC統合管理システム マスタースキーマ統合
-- Migration: 007_master_schema_integration.sql
-- 作成日: 2025-11-22
-- ============================================
--
-- 目的: 全フェーズ (Phase 1-7) のテーブル定義を統合し、
--      一度の実行で全データベース基盤を構築可能にする
--
-- 統合フェーズ:
--   - Phase 1: 受注管理システム V2.0
--   - Phase 2: 出荷管理システム V1.0
--   - Phase 3: 総合ダッシュボード V1.0
--   - Phase 4: 資金繰り予測ツール V1.0
--   - Phase 5: 一括承認UI & SPOE
--   - Phase 6: セキュリティ・信頼性 V1.0
--   - Phase 7: SEO/健全性マネージャー V1.0
--   - 追加: 刈り取り・せどり収益ツール
-- ============================================

-- ============================================
-- Phase 1: 受注管理システム V2.0
-- ============================================

-- 受注テーブル（V2.0: 確定利益・赤字リスク対応）
CREATE TABLE IF NOT EXISTS orders_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本注文情報
  order_id TEXT UNIQUE NOT NULL,
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marketplace TEXT NOT NULL, -- 'eBay', 'Amazon', 'Shopee', 'Coupang', etc.

  -- 商品情報
  product_id UUID REFERENCES product_master(id),
  sku TEXT NOT NULL,
  product_title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- 価格情報（Phase 1の重要拡張）
  total_amount_usd DECIMAL(10,2) NOT NULL,
  cost_price_jpy DECIMAL(10,2), -- 仕入れ価格（円）
  expected_profit_usd DECIMAL(10,2), -- 予想利益（USD）
  profit_rate DECIMAL(5,2), -- 利益率（%）
  is_loss_risk BOOLEAN DEFAULT FALSE, -- 赤字リスクフラグ

  -- 顧客情報
  customer_name TEXT,
  customer_email TEXT,
  shipping_country TEXT NOT NULL,
  shipping_address JSONB, -- 配送先詳細

  -- ステータス管理
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  shipping_status TEXT DEFAULT 'new', -- 'new', 'pending', 'processing', 'shipped', 'delivered', 'canceled'

  -- AI分析スコア
  ai_risk_score INTEGER DEFAULT 50, -- 0-100（Phase 1のAI統合）
  ai_analysis_notes TEXT,

  -- メタデータ
  shipping_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_v2_marketplace ON orders_v2(marketplace);
CREATE INDEX idx_orders_v2_status ON orders_v2(shipping_status);
CREATE INDEX idx_orders_v2_date ON orders_v2(order_date DESC);
CREATE INDEX idx_orders_v2_loss_risk ON orders_v2(is_loss_risk) WHERE is_loss_risk = TRUE;

-- ============================================
-- Phase 2: 出荷管理システム V1.0
-- ============================================

-- 出荷キュー（D&Dワークフロー対応）
CREATE TABLE IF NOT EXISTS shipping_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders_v2(id) ON DELETE CASCADE,

  -- 出荷優先度管理
  queue_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'packed', 'shipped', 'failed'
  priority_score INTEGER DEFAULT 0, -- 優先度スコア（高いほど緊急）
  is_delayed_risk BOOLEAN DEFAULT FALSE, -- 出荷遅延リスクフラグ

  -- 配送情報
  carrier TEXT, -- 'USPS', 'FedEx', 'UPS', 'DHL', etc.
  tracking_number TEXT,
  label_printed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,

  -- リスク予測（Phase 2のコア機能）
  predicted_ship_date TIMESTAMPTZ,
  weekend_risk BOOLEAN DEFAULT FALSE, -- 週末リスク
  holiday_risk BOOLEAN DEFAULT FALSE, -- 祝日リスク

  -- RPA連携
  rpa_execution_log JSONB, -- RPA実行ログ

  -- メタデータ
  assigned_to TEXT, -- 担当者
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shipping_queue_status ON shipping_queue(queue_status);
CREATE INDEX idx_shipping_queue_priority ON shipping_queue(priority_score DESC);
CREATE INDEX idx_shipping_queue_delayed_risk ON shipping_queue(is_delayed_risk) WHERE is_delayed_risk = TRUE;

-- ============================================
-- Phase 4: 資金繰り予測ツール V1.0
-- ============================================

-- 資金繰り予測テーブル
CREATE TABLE IF NOT EXISTS cashflow_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 予測期間
  forecast_date DATE NOT NULL,
  forecast_type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'

  -- キャッシュフロー予測
  beginning_balance_jpy DECIMAL(12,2) NOT NULL, -- 期初残高

  -- 収入予測
  expected_revenue_jpy DECIMAL(12,2) DEFAULT 0, -- 予想売上

  -- 支出予測（クレカサイクル連動）
  expected_sourcing_cost_jpy DECIMAL(12,2) DEFAULT 0, -- 仕入れ支払い予測
  credit_card_payment_jpy DECIMAL(12,2) DEFAULT 0, -- クレカ引き落とし
  other_expenses_jpy DECIMAL(12,2) DEFAULT 0, -- その他経費

  -- 予測結果
  net_cashflow_jpy DECIMAL(12,2), -- 純キャッシュフロー
  ending_balance_jpy DECIMAL(12,2), -- 期末残高

  -- リスク判定（Phase 4の最重要機能）
  is_payment_risk BOOLEAN DEFAULT FALSE, -- 支払不能リスク
  safety_buffer_jpy DECIMAL(12,2), -- 安全バッファ
  alert_level TEXT DEFAULT 'safe', -- 'safe', 'warning', 'critical'

  -- 信用カード情報
  credit_card_utilization JSONB, -- カード別利用状況

  -- メタデータ
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_cashflow_forecast_date ON cashflow_forecast(forecast_date DESC);
CREATE INDEX idx_cashflow_forecast_risk ON cashflow_forecast(is_payment_risk) WHERE is_payment_risk = TRUE;

-- ============================================
-- Phase 7: SEO/健全性マネージャー V1.0
-- ============================================

-- オークションアンカー管理
CREATE TABLE IF NOT EXISTS auction_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES product_master(id),

  -- カテゴリー管理
  category TEXT NOT NULL,

  -- 価格設定（機能7-1）
  min_start_price_usd DECIMAL(10,2) NOT NULL, -- 最低開始価格
  current_start_price_usd DECIMAL(10,2) NOT NULL, -- 現在の開始価格
  auto_relist BOOLEAN DEFAULT TRUE, -- 自動再出品

  -- オークション状態（機能7-2）
  auction_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'ended_no_bids', 'ended_with_bids', 'converted_to_fixed'
  ebay_auction_id TEXT,
  current_bid_count INTEGER DEFAULT 0,
  current_highest_bid_usd DECIMAL(10,2),

  -- 自動切り替え設定
  auto_convert_to_fixed BOOLEAN DEFAULT TRUE,
  fixed_price_usd DECIMAL(10,2),
  converted_at TIMESTAMPTZ,

  -- 在庫監視（機能7-3）
  inventory_check_enabled BOOLEAN DEFAULT TRUE,
  inventory_lost_at TIMESTAMPTZ,
  auto_ended_for_inventory BOOLEAN DEFAULT FALSE,

  -- スケジュール
  next_auction_scheduled_at TIMESTAMPTZ,
  last_auction_ended_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auction_anchors_status ON auction_anchors(auction_status);
CREATE INDEX idx_auction_anchors_category ON auction_anchors(category);

-- リスティング健全性スコア（機能7-4）
CREATE TABLE IF NOT EXISTS listing_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES product_master(id),
  ebay_listing_id TEXT,

  -- 健全性スコア（0-100）
  health_score INTEGER NOT NULL DEFAULT 50,
  score_calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 評価指標（過去90日間）
  days_since_last_sale INTEGER DEFAULT 0,
  total_views_90d INTEGER DEFAULT 0,
  total_sales_90d INTEGER DEFAULT 0,
  conversion_rate_90d DECIMAL(5,2) DEFAULT 0,
  avg_daily_views DECIMAL(8,2) DEFAULT 0,

  -- eBay SEO指標
  search_appearance_rate DECIMAL(5,2) DEFAULT 0,
  click_through_rate DECIMAL(5,2) DEFAULT 0,
  watch_count INTEGER DEFAULT 0,

  -- 死に筋判定
  is_dead_listing BOOLEAN DEFAULT FALSE,
  dead_listing_reason TEXT,
  recommended_action TEXT DEFAULT 'keep', -- 'keep', 'revise', 'end'

  -- 自動終了設定
  auto_end_enabled BOOLEAN DEFAULT FALSE,
  auto_ended_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listing_health_scores_score ON listing_health_scores(health_score);
CREATE INDEX idx_listing_health_scores_dead ON listing_health_scores(is_dead_listing) WHERE is_dead_listing = TRUE;

-- SEOアラート
CREATE TABLE IF NOT EXISTS seo_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'auction_no_bids', 'inventory_lost', 'low_health_score', 'zero_dollar_ending'
  severity TEXT DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
  message TEXT NOT NULL,

  -- 関連商品
  product_id UUID REFERENCES product_master(id),
  product_title TEXT,
  ebay_listing_id TEXT,

  -- 関連データ
  auction_anchor_id UUID REFERENCES auction_anchors(id),
  health_score_id UUID REFERENCES listing_health_scores(id),

  -- アクション
  action_taken TEXT DEFAULT 'pending', -- 'pending', 'auto_converted', 'auto_ended', 'manual_review', 'ignored'
  action_taken_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_seo_health_alerts_severity ON seo_health_alerts(severity);
CREATE INDEX idx_seo_health_alerts_pending ON seo_health_alerts(action_taken) WHERE action_taken = 'pending';

-- ============================================
-- Phase 6: セキュリティ・信頼性（通信ハブ）
-- ============================================

-- 統合メッセージングテーブル
CREATE TABLE IF NOT EXISTS unified_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- メッセージ基本情報
  message_id TEXT UNIQUE NOT NULL, -- 各モールのメッセージID
  marketplace TEXT NOT NULL, -- 'eBay', 'Amazon', 'Shopee', etc.

  -- 送受信情報
  direction TEXT NOT NULL, -- 'incoming', 'outgoing'
  sender_name TEXT,
  sender_email TEXT,
  recipient_name TEXT,
  recipient_email TEXT,

  -- メッセージ内容
  subject TEXT,
  body TEXT NOT NULL,

  -- 関連注文
  order_id UUID REFERENCES orders_v2(id),
  product_id UUID REFERENCES product_master(id),

  -- AI分析（Phase 6の重要拡張）
  ai_urgency TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  ai_category TEXT, -- 'refund_request', 'shipping_inquiry', 'product_question', etc.
  ai_suggested_response TEXT, -- AI生成の推奨返信

  -- ステータス管理
  reply_status TEXT DEFAULT 'pending', -- 'pending', 'draft', 'sent', 'archived'
  is_read BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,

  -- 返信管理
  parent_message_id UUID REFERENCES unified_messages(id),
  replied_at TIMESTAMPTZ,
  replied_by TEXT,

  -- メタデータ
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unified_messages_marketplace ON unified_messages(marketplace);
CREATE INDEX idx_unified_messages_status ON unified_messages(reply_status);
CREATE INDEX idx_unified_messages_urgency ON unified_messages(ai_urgency);
CREATE INDEX idx_unified_messages_unread ON unified_messages(is_read) WHERE is_read = FALSE;

-- ============================================
-- 刈り取り・せどり収益ツール
-- ============================================

-- 刈り取りアラート（Amazon/楽天価格変動監視）
CREATE TABLE IF NOT EXISTS karitori_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 商品情報
  asin TEXT NOT NULL,
  product_title TEXT NOT NULL,
  category TEXT,

  -- 価格情報
  current_price_jpy DECIMAL(10,2) NOT NULL,
  historical_avg_price_jpy DECIMAL(10,2),
  lowest_price_90d_jpy DECIMAL(10,2),
  price_drop_percentage DECIMAL(5,2), -- 下落率（%）

  -- 収益性分析
  estimated_profit_jpy DECIMAL(10,2),
  profit_margin_percentage DECIMAL(5,2),
  roi_percentage DECIMAL(5,2), -- ROI

  -- ランキング情報
  bsr_rank INTEGER, -- ベストセラーランク
  bsr_category TEXT,
  sales_velocity TEXT, -- 'high', 'medium', 'low'

  -- アラート情報
  alert_type TEXT DEFAULT 'price_drop', -- 'price_drop', 'stock_alert', 'bsr_improvement'
  alert_priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'

  -- アクション
  action_status TEXT DEFAULT 'pending', -- 'pending', 'purchased', 'ignored', 'expired'
  action_taken_at TIMESTAMPTZ,

  -- メタデータ
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- アラート有効期限
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_karitori_alerts_priority ON karitori_alerts(alert_priority, detected_at DESC);
CREATE INDEX idx_karitori_alerts_pending ON karitori_alerts(action_status) WHERE action_status = 'pending';

-- 楽天アービトラージログ
CREATE TABLE IF NOT EXISTS rakuten_arbitrage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 商品情報
  rakuten_item_code TEXT NOT NULL,
  product_title TEXT NOT NULL,
  shop_name TEXT,

  -- 価格情報（SPU考慮）
  base_price_jpy DECIMAL(10,2) NOT NULL,
  spu_multiplier DECIMAL(3,2) DEFAULT 1.0, -- SPU倍率
  effective_price_jpy DECIMAL(10,2) NOT NULL, -- 実質価格
  point_return_jpy DECIMAL(10,2), -- ポイント還元額

  -- アービトラージ分析
  target_marketplace TEXT NOT NULL, -- 'eBay', 'Amazon', etc.
  target_sell_price_usd DECIMAL(10,2),
  estimated_profit_jpy DECIMAL(10,2),
  profit_margin_percentage DECIMAL(5,2),

  -- 在庫情報
  stock_available INTEGER,
  is_limited_stock BOOLEAN DEFAULT FALSE,

  -- 実行ステータス
  execution_status TEXT DEFAULT 'candidate', -- 'candidate', 'approved', 'purchased', 'listed', 'sold', 'failed'
  purchased_at TIMESTAMPTZ,
  listed_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,

  -- メタデータ
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rakuten_arbitrage_logs_status ON rakuten_arbitrage_logs(execution_status);
CREATE INDEX idx_rakuten_arbitrage_logs_profit ON rakuten_arbitrage_logs(profit_margin_percentage DESC);

-- ============================================
-- Phase 3: 総合ダッシュボード（KPI集約用ビュー）
-- ============================================

-- 日次KPIビュー
CREATE OR REPLACE VIEW daily_kpi_summary AS
SELECT
  CURRENT_DATE as report_date,

  -- 売上・利益
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount_usd) as total_revenue_usd,
  SUM(o.expected_profit_usd) as total_profit_usd,
  AVG(o.profit_rate) as avg_profit_margin,

  -- リスク
  COUNT(DISTINCT CASE WHEN o.is_loss_risk THEN o.id END) as loss_risk_count,
  COUNT(DISTINCT CASE WHEN s.is_delayed_risk THEN s.id END) as delayed_risk_count,
  COUNT(DISTINCT CASE WHEN c.is_payment_risk THEN c.id END) as payment_risk_count,

  -- SEO/健全性
  AVG(l.health_score) as avg_health_score,
  COUNT(DISTINCT CASE WHEN l.is_dead_listing THEN l.id END) as dead_listing_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.auction_status = 'active') as active_auctions

FROM orders_v2 o
LEFT JOIN shipping_queue s ON o.id = s.order_id
LEFT JOIN cashflow_forecast c ON c.forecast_date = CURRENT_DATE
LEFT JOIN listing_health_scores l ON o.product_id = l.product_id
LEFT JOIN auction_anchors a ON o.product_id = a.product_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 day';

-- ============================================
-- トリガー: 更新日時の自動更新
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_v2_updated_at BEFORE UPDATE ON orders_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipping_queue_updated_at BEFORE UPDATE ON shipping_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auction_anchors_updated_at BEFORE UPDATE ON auction_anchors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_health_scores_updated_at BEFORE UPDATE ON listing_health_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unified_messages_updated_at BEFORE UPDATE ON unified_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rakuten_arbitrage_logs_updated_at BEFORE UPDATE ON rakuten_arbitrage_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ マスタースキーマ統合が完了しました';
  RAISE NOTICE '📊 作成されたテーブル: orders_v2, shipping_queue, cashflow_forecast, auction_anchors, listing_health_scores, seo_health_alerts, unified_messages, karitori_alerts, rakuten_arbitrage_logs';
  RAISE NOTICE '🎯 次のステップ: AI連携とAPI統合の実装';
END $$;
