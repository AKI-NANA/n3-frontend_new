-- ファイル: /database/migrations/009_create_trade_email_log.sql

-- 貿易メールの自動処理履歴テーブル（バックオフィス自動化）
CREATE TABLE IF NOT EXISTS trade_email_log (
    id SERIAL PRIMARY KEY,
    sender_email TEXT NOT NULL,
    email_subject TEXT,
    email_body_original TEXT,         -- 受信した元のメール本文

    -- AI処理結果
    language TEXT,                    -- AIが判定した言語（'English', 'Chinese', 'Japanese'）
    classification TEXT NOT NULL,     -- AIによる分類（'Quotation_Request', 'Payment_Confirmation', 'Shipping_Update'など）
    extracted_data JSONB,             -- 見積もり金額、SKU、数量などの抽出データ

    -- 自動返信情報
    response_subject TEXT,
    response_body TEXT,               -- AIが生成した返信メール本文
    auto_send_status TEXT DEFAULT 'pending_review', -- 'pending_review', 'sent_auto', 'sent_manual', 'ignored'

    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);
