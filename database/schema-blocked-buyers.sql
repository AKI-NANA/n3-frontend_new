-- eBay ブロックバイヤーリスト自動登録ツール - データベーススキーマ

-- 1. eBayユーザートークンテーブル
-- 各参加者のeBay認証トークンを安全に保存
CREATE TABLE IF NOT EXISTS ebay_user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebay_user_id TEXT NOT NULL, -- eBayユーザーID
  access_token TEXT NOT NULL, -- アクセストークン（暗号化推奨）
  refresh_token TEXT NOT NULL, -- リフレッシュトークン（暗号化推奨）
  token_expires_at TIMESTAMPTZ NOT NULL, -- トークンの有効期限
  scope TEXT, -- トークンのスコープ
  is_active BOOLEAN DEFAULT true, -- アクティブ状態
  last_sync_at TIMESTAMPTZ, -- 最後の同期日時
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ebay_user_id)
);

-- 2. 共有ブロックバイヤーリストテーブル
-- N3参加者間で共有される問題のあるバイヤーのリスト
CREATE TABLE IF NOT EXISTS ebay_blocked_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_username TEXT NOT NULL UNIQUE, -- eBayバイヤーのユーザー名
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reason TEXT, -- ブロック理由
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  reported_by UUID REFERENCES auth.users(id), -- 報告者
  approved_by UUID REFERENCES auth.users(id), -- 承認者
  approved_at TIMESTAMPTZ, -- 承認日時
  is_active BOOLEAN DEFAULT true, -- アクティブ状態
  notes TEXT, -- 備考
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. バイヤー報告履歴テーブル
-- 参加者からのバイヤー報告を記録
CREATE TABLE IF NOT EXISTS blocked_buyer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_username TEXT NOT NULL, -- 報告されたバイヤーのユーザー名
  reported_by UUID NOT NULL REFERENCES auth.users(id), -- 報告者
  reason TEXT NOT NULL, -- 報告理由
  severity TEXT DEFAULT 'medium', -- 深刻度
  evidence TEXT, -- 証拠（URLやテキスト）
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES auth.users(id), -- レビュー者
  reviewed_at TIMESTAMPTZ, -- レビュー日時
  review_notes TEXT, -- レビューメモ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ブロックリスト同期履歴テーブル
-- 各ユーザーのブロックリスト同期履歴を記録
CREATE TABLE IF NOT EXISTS ebay_blocklist_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ebay_user_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- manual, automatic, scheduled
  buyers_added INTEGER DEFAULT 0, -- 追加されたバイヤー数
  buyers_removed INTEGER DEFAULT 0, -- 削除されたバイヤー数
  total_buyers INTEGER DEFAULT 0, -- 同期後の総バイヤー数
  status TEXT DEFAULT 'success', -- success, failed, partial
  error_message TEXT, -- エラーメッセージ
  sync_duration_ms INTEGER, -- 同期にかかった時間（ミリ秒）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. システム設定テーブル
-- ブロックリストツールの設定
CREATE TABLE IF NOT EXISTS ebay_blocklist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- NULL の場合はグローバル設定
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_ebay_user_tokens_user_id ON ebay_user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_ebay_user_tokens_is_active ON ebay_user_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_ebay_blocked_buyers_status ON ebay_blocked_buyers(status);
CREATE INDEX IF NOT EXISTS idx_ebay_blocked_buyers_buyer_username ON ebay_blocked_buyers(buyer_username);
CREATE INDEX IF NOT EXISTS idx_blocked_buyer_reports_status ON blocked_buyer_reports(status);
CREATE INDEX IF NOT EXISTS idx_blocked_buyer_reports_reported_by ON blocked_buyer_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_ebay_blocklist_sync_history_user_id ON ebay_blocklist_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ebay_blocklist_sync_history_created_at ON ebay_blocklist_sync_history(created_at);

-- Row Level Security (RLS) の有効化
ALTER TABLE ebay_user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_blocked_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_buyer_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_blocklist_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_blocklist_settings ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ebay_user_tokens
-- ユーザーは自分のトークンのみ閲覧・編集可能
CREATE POLICY "Users can view own tokens" ON ebay_user_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON ebay_user_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON ebay_user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON ebay_user_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: ebay_blocked_buyers
-- 全ユーザーが承認済みリストを閲覧可能
CREATE POLICY "All users can view approved blocked buyers" ON ebay_blocked_buyers
  FOR SELECT USING (status = 'approved' OR auth.uid() = reported_by);

-- 認証済みユーザーは新しいバイヤーを追加可能
CREATE POLICY "Authenticated users can insert blocked buyers" ON ebay_blocked_buyers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 報告者または管理者のみ更新可能
CREATE POLICY "Reporters and admins can update blocked buyers" ON ebay_blocked_buyers
  FOR UPDATE USING (
    auth.uid() = reported_by OR
    auth.uid() = approved_by OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- RLSポリシー: blocked_buyer_reports
-- ユーザーは自分の報告と承認済み報告を閲覧可能
CREATE POLICY "Users can view own and approved reports" ON blocked_buyer_reports
  FOR SELECT USING (
    auth.uid() = reported_by OR
    status = 'approved' OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY "Authenticated users can insert reports" ON blocked_buyer_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can update reports" ON blocked_buyer_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- RLSポリシー: ebay_blocklist_sync_history
-- ユーザーは自分の同期履歴のみ閲覧可能
CREATE POLICY "Users can view own sync history" ON ebay_blocklist_sync_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync history" ON ebay_blocklist_sync_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLSポリシー: ebay_blocklist_settings
-- ユーザーは自分の設定とグローバル設定を閲覧可能
CREATE POLICY "Users can view own and global settings" ON ebay_blocklist_settings
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON ebay_blocklist_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON ebay_blocklist_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- 関数: updated_at の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー: updated_at の自動更新
CREATE TRIGGER update_ebay_user_tokens_updated_at BEFORE UPDATE ON ebay_user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebay_blocked_buyers_updated_at BEFORE UPDATE ON ebay_blocked_buyers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocked_buyer_reports_updated_at BEFORE UPDATE ON blocked_buyer_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebay_blocklist_settings_updated_at BEFORE UPDATE ON ebay_blocklist_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータの挿入（開発環境用）
-- INSERT INTO ebay_blocklist_settings (setting_key, setting_value) VALUES
-- ('max_blocklist_size', '{"value": 5000, "description": "Maximum number of buyers in blocklist"}'::jsonb),
-- ('auto_sync_enabled', '{"value": true, "description": "Enable automatic blocklist sync"}'::jsonb),
-- ('sync_schedule', '{"value": "0 2 * * *", "description": "Cron schedule for auto sync (daily at 2am)"}'::jsonb);
