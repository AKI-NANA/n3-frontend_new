-- Migration: Add Phase 1.5 Automatic Purchase Tables
-- Purpose: 自動購入機能のための追加テーブル
-- Created: 2025-11-21

-- ============================================================
-- amazon_accounts テーブル（Amazonアカウント管理）
-- ============================================================

CREATE TABLE IF NOT EXISTS amazon_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL, -- 暗号化推奨
  marketplace VARCHAR(10) NOT NULL,
  proxy_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,

  -- リスク管理
  risk_score INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  total_purchases INTEGER DEFAULT 0,
  daily_purchases INTEGER DEFAULT 0,
  weekly_purchases INTEGER DEFAULT 0,

  -- クールダウン管理
  cooldown_until TIMESTAMPTZ,

  -- 無効化情報
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_amazon_accounts_marketplace ON amazon_accounts(marketplace);
CREATE INDEX idx_amazon_accounts_is_active ON amazon_accounts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_amazon_accounts_risk_score ON amazon_accounts(risk_score);
CREATE INDEX idx_amazon_accounts_cooldown ON amazon_accounts(cooldown_until);

-- コメント
COMMENT ON TABLE amazon_accounts IS 'Amazonアカウント管理テーブル';
COMMENT ON COLUMN amazon_accounts.risk_score IS 'リスクスコア (0-100): 高いほど停止リスク高';
COMMENT ON COLUMN amazon_accounts.cooldown_until IS 'クールダウン終了日時';

-- ============================================================
-- payment_methods テーブル（決済方法管理）
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,

  -- カード情報
  card_type VARCHAR(20) NOT NULL, -- visa, mastercard, amex, discover
  card_last4 VARCHAR(4) NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  card_encrypted_data TEXT, -- 暗号化されたカード情報

  -- 請求先住所
  billing_address JSONB NOT NULL,

  -- 状態管理
  is_active BOOLEAN DEFAULT TRUE,

  -- 限度額管理
  daily_limit NUMERIC(10,2) DEFAULT 1000.00,
  monthly_limit NUMERIC(10,2) DEFAULT 10000.00,
  daily_used NUMERIC(10,2) DEFAULT 0.00,
  monthly_used NUMERIC(10,2) DEFAULT 0.00,

  -- メタデータ
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_payment_methods_account_id ON payment_methods(account_id);
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active) WHERE is_active = TRUE;

-- コメント
COMMENT ON TABLE payment_methods IS '決済方法管理テーブル';
COMMENT ON COLUMN payment_methods.card_encrypted_data IS '暗号化されたカード詳細情報';

-- ============================================================
-- proxy_pool テーブル（プロキシプール管理）
-- ============================================================

CREATE TABLE IF NOT EXISTS proxy_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(255) NOT NULL UNIQUE,
  proxy_type VARCHAR(20) NOT NULL, -- residential, datacenter, mobile
  location VARCHAR(100), -- 地域（US, JP, etc.）

  -- 状態管理
  is_active BOOLEAN DEFAULT TRUE,

  -- パフォーマンス
  avg_response_time_ms INTEGER,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  total_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  -- メタデータ
  last_used_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_proxy_pool_is_active ON proxy_pool(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_proxy_pool_location ON proxy_pool(location);
CREATE INDEX idx_proxy_pool_last_used ON proxy_pool(last_used_at);

-- コメント
COMMENT ON TABLE proxy_pool IS 'プロキシプール管理テーブル';
COMMENT ON COLUMN proxy_pool.success_rate IS '成功率（%）';

-- ============================================================
-- amazon_account_usage_log テーブル（アカウント使用履歴）
-- ============================================================

CREATE TABLE IF NOT EXISTS amazon_account_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,

  -- 使用情報
  purchase_success BOOLEAN NOT NULL,
  purchase_amount NUMERIC(10,2),

  -- リスク情報
  risk_score_before INTEGER,
  risk_score_after INTEGER,
  cooldown_hours INTEGER,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_account_usage_log_account_id ON amazon_account_usage_log(account_id);
CREATE INDEX idx_account_usage_log_created_at ON amazon_account_usage_log(created_at DESC);

-- コメント
COMMENT ON TABLE amazon_account_usage_log IS 'Amazonアカウント使用履歴';

-- ============================================================
-- payment_transactions テーブル（決済トランザクション）
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,

  -- トランザクション情報
  transaction_id VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,

  -- ステータス
  status VARCHAR(20) NOT NULL, -- completed, failed, pending
  error_message TEXT,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_payment_transactions_payment_method_id ON payment_transactions(payment_method_id);
CREATE INDEX idx_payment_transactions_account_id ON payment_transactions(account_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- コメント
COMMENT ON TABLE payment_transactions IS '決済トランザクション履歴';

-- ============================================================
-- order_emails テーブル（注文メール情報）
-- ============================================================

CREATE TABLE IF NOT EXISTS order_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 注文情報
  order_id VARCHAR(100) NOT NULL,
  order_date VARCHAR(100),
  order_total NUMERIC(10,2),
  items JSONB,
  shipping_address JSONB,

  -- 発送情報
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),
  estimated_delivery VARCHAR(100),

  -- メール情報
  email_subject TEXT,
  email_date TIMESTAMPTZ,
  raw_email_body TEXT,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_order_emails_order_id ON order_emails(order_id);
CREATE INDEX idx_order_emails_tracking_number ON order_emails(tracking_number);
CREATE INDEX idx_order_emails_created_at ON order_emails(created_at DESC);

-- コメント
COMMENT ON TABLE order_emails IS '注文メール情報（解析結果）';

-- ============================================================
-- arbitrage_purchases テーブルにカラム追加
-- ============================================================

ALTER TABLE arbitrage_purchases ADD COLUMN IF NOT EXISTS purchase_confirmation VARCHAR(255);
ALTER TABLE arbitrage_purchases ADD COLUMN IF NOT EXISTS screenshot TEXT; -- Base64スクリーンショット（デバッグ用）

COMMENT ON COLUMN arbitrage_purchases.purchase_confirmation IS '購入確認番号';
COMMENT ON COLUMN arbitrage_purchases.screenshot IS 'デバッグ用スクリーンショット（Base64）';

-- ============================================================
-- 完了
-- ============================================================

-- 初期データ挿入（サンプル）
-- 注意：本番環境では実際の認証情報を使用

-- サンプルAmazonアカウント（開発用）
INSERT INTO amazon_accounts (email, password, marketplace, is_active, risk_score)
VALUES ('test@example.com', 'encrypted_password_here', 'US', FALSE, 0)
ON CONFLICT (email) DO NOTHING;

-- サンプルプロキシ（開発用）
INSERT INTO proxy_pool (url, proxy_type, location, is_active)
VALUES ('http://proxy.example.com:8080', 'residential', 'US', FALSE)
ON CONFLICT (url) DO NOTHING;
