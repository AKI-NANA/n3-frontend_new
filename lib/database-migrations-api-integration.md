# 多販路API連携システム - データベースマイグレーション

Phase 3 Stage 2 用のテーブル定義

## 実行方法

以下のSQLをSupabase SQL Editorで順次実行してください。

---

## 1. PlatformCredentials テーブル

プラットフォーム認証情報の一元管理

```sql
CREATE TABLE IF NOT EXISTS platform_credentials (
  credential_id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  account_id INTEGER NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  auth_type VARCHAR(50) NOT NULL, -- 'auth_n_auth', 'oauth2', 'private_token', 'api_key'

  -- 認証情報（暗号化推奨）
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- API Keys
  api_key TEXT,
  api_secret TEXT,
  app_id TEXT,

  -- eBay専用
  ebay_auth_token TEXT,
  ebay_token_expires_at TIMESTAMPTZ,

  -- 環境設定
  is_sandbox BOOLEAN DEFAULT FALSE,
  api_base_url TEXT,

  -- ステータス
  is_active BOOLEAN DEFAULT TRUE,
  last_token_refresh TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform, account_id)
);

-- インデックス
CREATE INDEX idx_platform_credentials_platform ON platform_credentials(platform);
CREATE INDEX idx_platform_credentials_active ON platform_credentials(is_active);

-- コメント
COMMENT ON TABLE platform_credentials IS 'プラットフォーム認証情報管理テーブル';
COMMENT ON COLUMN platform_credentials.auth_type IS 'auth_n_auth=eBay長期トークン, oauth2=OAuth2.0, private_token=Shopify等';
```

---

## 2. ListingResultLogs テーブル

出品API呼び出し結果とエラーログ

```sql
CREATE TABLE IF NOT EXISTS listing_result_logs (
  log_id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  account_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- '出品処理中', '出品中', '出品停止', 'APIリトライ待ち', '出品失敗（要確認）'

  -- 出品結果
  listing_id VARCHAR(255), -- モール側のID (eBay Item ID, Amazon ASINなど)
  success BOOLEAN NOT NULL,

  -- エラー情報
  error_code VARCHAR(100),
  error_message TEXT,
  error_details JSONB,

  -- リトライ情報
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_listing_logs_sku ON listing_result_logs(sku);
CREATE INDEX idx_listing_logs_status ON listing_result_logs(status);
CREATE INDEX idx_listing_logs_platform ON listing_result_logs(platform);
CREATE INDEX idx_listing_logs_created ON listing_result_logs(created_at DESC);

-- コメント
COMMENT ON TABLE listing_result_logs IS 'API出品結果ログテーブル';
COMMENT ON COLUMN listing_result_logs.error_code IS 'eBay: 93200=VERO違反, Amazon: MISSING_ASIN等';
```

---

## 3. ExclusiveLocks テーブル

排他的ロック管理（同一SKU重複出品防止）

```sql
CREATE TABLE IF NOT EXISTS exclusive_locks (
  lock_id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  locked_platform VARCHAR(50) NOT NULL,
  locked_account_id INTEGER NOT NULL,

  -- ロック理由
  reason VARCHAR(50) DEFAULT 'listing_active', -- 'listing_active', 'duplicate_prevention'

  -- ロック管理
  is_active BOOLEAN DEFAULT TRUE,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_exclusive_locks_sku ON exclusive_locks(sku);
CREATE INDEX idx_exclusive_locks_active ON exclusive_locks(is_active);
CREATE UNIQUE INDEX idx_exclusive_locks_unique ON exclusive_locks(sku) WHERE is_active = TRUE;

-- コメント
COMMENT ON TABLE exclusive_locks IS '排他的ロック管理テーブル（重複出品防止）';
COMMENT ON COLUMN exclusive_locks.is_active IS 'TRUE: ロック中, FALSE: ロック解除済み';
```

---

## 4. ListingData テーブル（既存の場合は拡張）

実際の出品情報

```sql
CREATE TABLE IF NOT EXISTS listing_data (
  listing_data_id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  account_id INTEGER NOT NULL,
  listing_id VARCHAR(255) NOT NULL, -- モール側のID

  -- 出品状態
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'ended'

  -- 出品情報
  title TEXT,
  price DECIMAL(12, 2),
  quantity INTEGER,
  listed_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform, listing_id)
);

-- インデックス
CREATE INDEX idx_listing_data_sku ON listing_data(sku);
CREATE INDEX idx_listing_data_platform ON listing_data(platform);
CREATE INDEX idx_listing_data_status ON listing_data(status);

-- コメント
COMMENT ON TABLE listing_data IS 'プラットフォーム別出品データテーブル';
```

---

## 5. Products Master 拡張（既存テーブルに列追加）

既に戦略エンジン用のフィールドが追加済みの場合はスキップ

```sql
-- 既存のproducts_masterテーブルに、出品ステータスを保存する列を追加
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT '取得完了';

-- コメント
COMMENT ON COLUMN products_master.status IS '取得完了 → 優先度決定済 → AI処理中 → 外注処理完了 → 戦略決定済 → 出品中';
```

---

## 6. サンプルデータ挿入

テスト用の認証情報サンプル（実際の値に置き換えてください）

```sql
-- eBay認証情報サンプル（Sandbox）
INSERT INTO platform_credentials (
  platform,
  account_id,
  account_name,
  auth_type,
  ebay_auth_token,
  ebay_token_expires_at,
  is_sandbox,
  is_active
) VALUES (
  'ebay',
  1,
  'eBay Account #1',
  'auth_n_auth',
  'YOUR_EBAY_AUTH_TOKEN_HERE',
  NOW() + INTERVAL '18 months',
  TRUE,
  TRUE
);

-- Amazon認証情報サンプル（Sandbox）
INSERT INTO platform_credentials (
  platform,
  account_id,
  account_name,
  auth_type,
  refresh_token,
  api_key,
  api_secret,
  is_sandbox,
  is_active
) VALUES (
  'amazon',
  1,
  'Amazon SP-API Account #1',
  'oauth2',
  'YOUR_REFRESH_TOKEN_HERE',
  'YOUR_LWA_CLIENT_ID_HERE',
  'YOUR_LWA_CLIENT_SECRET_HERE',
  TRUE,
  TRUE
);
```

---

## 7. RPC関数（リトライカウント増加）

```sql
CREATE OR REPLACE FUNCTION increment_retry_count(log_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT retry_count INTO current_count
  FROM listing_result_logs
  WHERE listing_result_logs.log_id = increment_retry_count.log_id;

  RETURN current_count + 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_retry_count IS 'リトライカウントを1増やして返す';
```

---

## マイグレーション完了

上記のSQLを順次実行してください。エラーが発生した場合は、既存のテーブル定義と競合している可能性があります。

### 確認方法

```sql
-- テーブル一覧を確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('platform_credentials', 'listing_result_logs', 'exclusive_locks', 'listing_data');

-- 各テーブルの列を確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'platform_credentials';
```
