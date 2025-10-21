-- ============================================
-- NAGANO-3 ユーザー認証テーブル
-- 作成日: 2025-10-21
-- ============================================

-- users テーブル作成
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'outsourcer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- RLS (Row Level Security) 有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 開発環境用ポリシー: 全アクセス許可
DROP POLICY IF EXISTS "Enable all access for development" ON public.users;
CREATE POLICY "Enable all access for development" 
  ON public.users 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE 'users テーブルの作成が完了しました';
END $$;
