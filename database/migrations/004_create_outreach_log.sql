-- ファイル: /database/migrations/004_create_outreach_log.sql

-- 問屋・メーカーへの営業メール履歴管理テーブル
CREATE TABLE IF NOT EXISTS outreach_log_master (
    id SERIAL PRIMARY KEY,
    target_company TEXT NOT NULL,
    target_email TEXT,  -- 連絡先メールアドレス
    target_url TEXT,
    product_id INTEGER REFERENCES products_master(id), -- 関連商品ID (N3のデータ)
    persona_id INTEGER REFERENCES persona_master(id),
    email_subject TEXT,
    email_body TEXT,
    status TEXT DEFAULT 'sent', -- 'sent', 'replied', 'ignored', 'failed'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
