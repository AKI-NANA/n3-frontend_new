-- ========================================
-- eBay APIトークン管理テーブル
-- ========================================

CREATE TABLE IF NOT EXISTS ebay_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account TEXT NOT NULL UNIQUE,           -- 'mjt', 'green'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ebay_tokens_account ON ebay_tokens (account);
CREATE INDEX IF NOT EXISTS idx_ebay_tokens_active ON ebay_tokens (is_active);

COMMENT ON TABLE ebay_tokens IS 'eBay APIアクセストークン管理';
COMMENT ON COLUMN ebay_tokens.account IS 'アカウント識別子 (mjt, green)';
COMMENT ON COLUMN ebay_tokens.expires_at IS 'トークン有効期限';

-- サンプルトークン（開発用・無効なトークン）
INSERT INTO ebay_tokens (account, access_token, refresh_token, expires_at)
VALUES 
    ('mjt', 'v^1.1#i^1#f^0#r^1#p^3#I^3#t^Ul4xMF8', 'v^1.1#i^1#f^0#r^1#p^3#I^3#t^Ul4xMF8', NOW() + INTERVAL '7200 seconds'),
    ('green', 'v^1.1#i^1#f^0#r^1#p^3#I^3#t^Ul4xMF8', 'v^1.1#i^1#f^0#r^1#p^3#I^3#t^Ul4xMF8', NOW() + INTERVAL '7200 seconds')
ON CONFLICT (account) DO NOTHING;
