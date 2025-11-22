-- ================================================================
-- NAGANO-3 多販路EC統合管理システム - マスタースキーマ統合
-- Phase 1-8 全テーブル定義統合版
-- Migration Version: 007
-- Created: 2025-11-22
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- SECTION 1: 商品マスターデータ
-- ================================================================

-- 商品マスターテーブル
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE NOT NULL,
  title_jp TEXT NOT NULL,
  title_en TEXT,
  description_jp TEXT,
  description_en TEXT,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  weight_g INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  category_ebay VARCHAR(255),
  hs_code VARCHAR(20),
  origin_country VARCHAR(2) DEFAULT 'JP',
  brand VARCHAR(255),
  condition VARCHAR(50) DEFAULT 'new',
  images JSONB DEFAULT '[]',
  dimensions JSONB,
  last_price_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON products(current_stock);

-- ================================================================
-- SECTION 2: マーケットプレイス設定
-- ================================================================

-- モール別手数料・設定テーブル
CREATE TABLE IF NOT EXISTS marketplace_settings (
  marketplace_id VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  sales_fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  fixed_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cross_border_fee_rate DECIMAL(5, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payout_currency VARCHAR(3) NOT NULL DEFAULT 'JPY',
  target_profit_rate DECIMAL(5, 2) DEFAULT 25.0,
  api_rate_limit_per_hour INTEGER DEFAULT 5000,
  oauth_config JSONB,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デフォルトデータ挿入
INSERT INTO marketplace_settings (marketplace_id, display_name, sales_fee_rate, default_currency) VALUES
  ('EBAY_US', 'eBay US', 13.25, 'USD'),
  ('AMAZON_JP', 'Amazon Japan', 15.0, 'JPY'),
  ('SHOPEE_SG', 'Shopee Singapore', 5.0, 'SGD'),
  ('ETSY', 'Etsy', 6.5, 'USD'),
  ('BONANZA', 'Bonanza', 3.5, 'USD'),
  ('CATAWIKI', 'Catawiki', 9.0, 'EUR'),
  ('FACEBOOK_MARKETPLACE', 'Facebook Marketplace', 5.0, 'USD'),
  ('COUPANG', 'Coupang', 10.0, 'KRW'),
  ('QOO10_JP', 'Qoo10 Japan', 6.0, 'JPY'),
  ('BUYMA', 'BUYMA', 7.56, 'JPY')
ON CONFLICT (marketplace_id) DO NOTHING;

-- ================================================================
-- SECTION 3: マーケットプレイス別出品データ
-- ================================================================

-- モール別出品テーブル（在庫・価格連動の核）
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace_id VARCHAR(50) NOT NULL REFERENCES marketplace_settings(marketplace_id),
  listing_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255),
  title TEXT NOT NULL,
  listing_price DECIMAL(10, 2) NOT NULL,
  listing_stock INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  is_auto_reprice BOOLEAN DEFAULT false,
  is_auto_sync_stock BOOLEAN DEFAULT true,
  mall_specific_data JSONB DEFAULT '{}',
  seo_health_score DECIMAL(5, 2),
  views_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(marketplace_id, listing_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_product_id ON marketplace_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_marketplace_id ON marketplace_listings(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_sku ON marketplace_listings(sku);

-- ================================================================
-- SECTION 4: 送料ルール
-- ================================================================

-- 送料計算ルールテーブル
CREATE TABLE IF NOT EXISTS shipping_rules (
  id BIGSERIAL PRIMARY KEY,
  marketplace_id VARCHAR(50) NOT NULL REFERENCES marketplace_settings(marketplace_id),
  shipping_method VARCHAR(100) NOT NULL,
  is_fba_like BOOLEAN DEFAULT false,
  rule_json JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shipping_rules_marketplace_id ON shipping_rules(marketplace_id);

-- ================================================================
-- SECTION 5: 注文管理（Phase 2-3）
-- ================================================================

-- 注文テーブル v2
CREATE TABLE IF NOT EXISTS orders_v2 (
  id BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  marketplace_id VARCHAR(50) NOT NULL REFERENCES marketplace_settings(marketplace_id),
  listing_id BIGINT REFERENCES marketplace_listings(id),
  product_id BIGINT REFERENCES products(id),
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  shipping_status VARCHAR(50) NOT NULL DEFAULT 'not_shipped',
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  fees DECIMAL(10, 2) DEFAULT 0,
  net_profit DECIMAL(10, 2),
  shipping_address JSONB,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_orders_v2_order_id ON orders_v2(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_v2_marketplace_id ON orders_v2(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_orders_v2_user_id ON orders_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_v2_order_date ON orders_v2(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_v2_order_status ON orders_v2(order_status);

-- ================================================================
-- SECTION 6: 配送キュー（Phase 3）
-- ================================================================

-- 配送キューテーブル
CREATE TABLE IF NOT EXISTS shipping_queue (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders_v2(id) ON DELETE CASCADE,
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),
  shipping_method VARCHAR(100),
  shipping_label_url TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  queue_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shipping_queue_order_id ON shipping_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_queue_status ON shipping_queue(queue_status);
CREATE INDEX IF NOT EXISTS idx_shipping_queue_user_id ON shipping_queue(user_id);

-- ================================================================
-- SECTION 7: 資金繰り予測（Phase 4）
-- ================================================================

-- 資金繰り予測テーブル
CREATE TABLE IF NOT EXISTS cashflow_forecast (
  id BIGSERIAL PRIMARY KEY,
  forecast_date DATE NOT NULL,
  forecast_month VARCHAR(7) NOT NULL,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  total_costs DECIMAL(12, 2) DEFAULT 0,
  total_fees DECIMAL(12, 2) DEFAULT 0,
  net_cashflow DECIMAL(12, 2) DEFAULT 0,
  cumulative_cashflow DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'JPY',
  breakdown JSONB DEFAULT '{}',
  confidence_level VARCHAR(20) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, forecast_date)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cashflow_forecast_date ON cashflow_forecast(forecast_date);
CREATE INDEX IF NOT EXISTS idx_cashflow_forecast_user_id ON cashflow_forecast(user_id);

-- ================================================================
-- SECTION 8: 統合メッセージ（Phase 6）
-- ================================================================

-- 統合メッセージテーブル
CREATE TABLE IF NOT EXISTS unified_messages (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  marketplace_id VARCHAR(50) NOT NULL REFERENCES marketplace_settings(marketplace_id),
  order_id BIGINT REFERENCES orders_v2(id),
  sender_name VARCHAR(255),
  sender_id VARCHAR(255),
  subject TEXT,
  body TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'inquiry',
  urgency_level VARCHAR(20) DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  replied_at TIMESTAMP WITH TIME ZONE,
  ai_suggested_reply TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_unified_messages_marketplace_id ON unified_messages(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_order_id ON unified_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_user_id ON unified_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_is_read ON unified_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_unified_messages_urgency ON unified_messages(urgency_level);

-- ================================================================
-- SECTION 9: 刈り取りアラート（Phase 5）
-- ================================================================

-- 刈り取りアラートテーブル
CREATE TABLE IF NOT EXISTS karitori_alerts (
  id BIGSERIAL PRIMARY KEY,
  source_marketplace VARCHAR(50) NOT NULL,
  target_marketplace VARCHAR(50) NOT NULL REFERENCES marketplace_settings(marketplace_id),
  asin VARCHAR(20),
  jan_code VARCHAR(20),
  product_name TEXT NOT NULL,
  source_price DECIMAL(10, 2) NOT NULL,
  target_price DECIMAL(10, 2) NOT NULL,
  estimated_profit DECIMAL(10, 2) NOT NULL,
  profit_margin DECIMAL(5, 2) NOT NULL,
  source_url TEXT,
  target_url TEXT,
  alert_status VARCHAR(50) DEFAULT 'active',
  priority_score INTEGER DEFAULT 0,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_karitori_alerts_status ON karitori_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_karitori_alerts_user_id ON karitori_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_karitori_alerts_profit ON karitori_alerts(estimated_profit DESC);

-- ================================================================
-- SECTION 10: 楽天裁定ログ（Phase 5）
-- ================================================================

-- 楽天裁定ログテーブル
CREATE TABLE IF NOT EXISTS rakuten_arbitrage_logs (
  id BIGSERIAL PRIMARY KEY,
  jan_code VARCHAR(20) NOT NULL,
  product_name TEXT NOT NULL,
  rakuten_price DECIMAL(10, 2) NOT NULL,
  amazon_price DECIMAL(10, 2) NOT NULL,
  price_difference DECIMAL(10, 2) NOT NULL,
  profit_margin DECIMAL(5, 2) NOT NULL,
  rakuten_url TEXT,
  amazon_url TEXT,
  bsr_rank INTEGER,
  log_status VARCHAR(50) DEFAULT 'detected',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_rakuten_arbitrage_jan ON rakuten_arbitrage_logs(jan_code);
CREATE INDEX IF NOT EXISTS idx_rakuten_arbitrage_user_id ON rakuten_arbitrage_logs(user_id);

-- ================================================================
-- SECTION 11: SEO健全性スコア（Phase 7）
-- ================================================================

-- SEO健全性スコアテーブル
CREATE TABLE IF NOT EXISTS seo_health_scores (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  health_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  title_score DECIMAL(5, 2) DEFAULT 0,
  description_score DECIMAL(5, 2) DEFAULT 0,
  image_score DECIMAL(5, 2) DEFAULT 0,
  price_competitiveness DECIMAL(5, 2) DEFAULT 0,
  conversion_score DECIMAL(5, 2) DEFAULT 0,
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  ai_suggestions TEXT,
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_seo_health_scores_listing_id ON seo_health_scores(listing_id);
CREATE INDEX IF NOT EXISTS idx_seo_health_scores_health_score ON seo_health_scores(health_score);

-- ================================================================
-- SECTION 12: eBayカテゴリ手数料
-- ================================================================

-- eBayカテゴリ手数料テーブル
CREATE TABLE IF NOT EXISTS ebay_category_fees (
  id BIGSERIAL PRIMARY KEY,
  category_id VARCHAR(20) NOT NULL UNIQUE,
  category_name VARCHAR(255) NOT NULL,
  base_fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 13.25,
  max_fee DECIMAL(10, 2),
  min_fee DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SECTION 13: 送料ポリシー
-- ================================================================

-- 送料ポリシーテーブル
CREATE TABLE IF NOT EXISTS shipping_policies (
  id BIGSERIAL PRIMARY KEY,
  marketplace_id VARCHAR(50) NOT NULL REFERENCES marketplace_settings(marketplace_id),
  policy_name VARCHAR(255) NOT NULL,
  policy_id_external VARCHAR(255),
  domestic_service JSONB,
  international_service JSONB,
  handling_time_days INTEGER DEFAULT 3,
  free_shipping_threshold DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shipping_policies_marketplace_id ON shipping_policies(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_shipping_policies_user_id ON shipping_policies(user_id);

-- ================================================================
-- SECTION 14: 送料ゾーン
-- ================================================================

-- 送料ゾーンテーブル
CREATE TABLE IF NOT EXISTS shipping_zones (
  id BIGSERIAL PRIMARY KEY,
  zone_name VARCHAR(100) NOT NULL,
  countries JSONB NOT NULL DEFAULT '[]',
  base_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  per_kg_rate DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SECTION 15: Row Level Security (RLS) ポリシー
-- ================================================================

-- RLS有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE karitori_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rakuten_arbitrage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_policies ENABLE ROW LEVEL SECURITY;

-- productsのRLSポリシー
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- marketplace_listingsのRLSポリシー
CREATE POLICY "Users can view their own listings" ON marketplace_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listings" ON marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" ON marketplace_listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" ON marketplace_listings
  FOR DELETE USING (auth.uid() = user_id);

-- orders_v2のRLSポリシー
CREATE POLICY "Users can view their own orders" ON orders_v2
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON orders_v2
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders_v2
  FOR UPDATE USING (auth.uid() = user_id);

-- shipping_queueのRLSポリシー
CREATE POLICY "Users can view their own shipping queue" ON shipping_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipping queue" ON shipping_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shipping queue" ON shipping_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- cashflow_forecastのRLSポリシー
CREATE POLICY "Users can view their own cashflow forecast" ON cashflow_forecast
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cashflow forecast" ON cashflow_forecast
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cashflow forecast" ON cashflow_forecast
  FOR UPDATE USING (auth.uid() = user_id);

-- unified_messagesのRLSポリシー
CREATE POLICY "Users can view their own messages" ON unified_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON unified_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" ON unified_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- karitori_alertsのRLSポリシー
CREATE POLICY "Users can view their own alerts" ON karitori_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts" ON karitori_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON karitori_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- rakuten_arbitrage_logsのRLSポリシー
CREATE POLICY "Users can view their own arbitrage logs" ON rakuten_arbitrage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own arbitrage logs" ON rakuten_arbitrage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- shipping_policiesのRLSポリシー
CREATE POLICY "Users can view their own shipping policies" ON shipping_policies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipping policies" ON shipping_policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shipping policies" ON shipping_policies
  FOR UPDATE USING (auth.uid() = user_id);

-- ================================================================
-- SECTION 16: トリガー関数（自動updated_at更新）
-- ================================================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_settings_updated_at BEFORE UPDATE ON marketplace_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_rules_updated_at BEFORE UPDATE ON shipping_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_v2_updated_at BEFORE UPDATE ON orders_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_queue_updated_at BEFORE UPDATE ON shipping_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashflow_forecast_updated_at BEFORE UPDATE ON cashflow_forecast
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_messages_updated_at BEFORE UPDATE ON unified_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_health_scores_updated_at BEFORE UPDATE ON seo_health_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebay_category_fees_updated_at BEFORE UPDATE ON ebay_category_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_policies_updated_at BEFORE UPDATE ON shipping_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON shipping_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- マイグレーション完了
-- ================================================================

COMMENT ON TABLE products IS 'Phase 1: 商品マスターデータ';
COMMENT ON TABLE marketplace_settings IS 'Phase 1: マーケットプレイス別設定';
COMMENT ON TABLE marketplace_listings IS 'Phase 1: マーケットプレイス別出品データ（在庫・価格連動の核）';
COMMENT ON TABLE shipping_rules IS 'Phase 1: 送料計算ルール';
COMMENT ON TABLE orders_v2 IS 'Phase 2-3: 注文管理';
COMMENT ON TABLE shipping_queue IS 'Phase 3: 配送キュー';
COMMENT ON TABLE cashflow_forecast IS 'Phase 4: 資金繰り予測';
COMMENT ON TABLE unified_messages IS 'Phase 6: 統合メッセージ管理';
COMMENT ON TABLE karitori_alerts IS 'Phase 5: 刈り取りアラート';
COMMENT ON TABLE rakuten_arbitrage_logs IS 'Phase 5: 楽天裁定ログ';
COMMENT ON TABLE seo_health_scores IS 'Phase 7: SEO健全性スコア';
COMMENT ON TABLE ebay_category_fees IS 'eBayカテゴリ手数料マスター';
COMMENT ON TABLE shipping_policies IS '送料ポリシー管理';
COMMENT ON TABLE shipping_zones IS '送料ゾーン定義';
