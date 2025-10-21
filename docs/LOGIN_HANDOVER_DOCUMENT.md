# ログイン機能追加 引き継ぎ書

**作成日**: 2025-10-21  
**状況**: ローカルでログイン機能を開発完了。VPSの既存ビルドに反映が必要。

---

## 📋 現在の状況

### ✅ 完了していること

1. **ローカル開発環境でログイン機能を実装**
   - JWT認証システム
   - ログイン画面（`app/login/page.tsx`）
   - 認証API（`app/api/auth/login`, `me`, `logout`, `register`）
   - AuthContext（`contexts/AuthContext.tsx`）
   - ヘッダーにユーザーメニュー追加
   - Rate Limiting（`middleware.ts`）
   - セキュリティヘッダー（`next.config.js`）

2. **GitHubにプッシュ済み**
   - リポジトリ: https://github.com/AKI-NANA/n3-frontend_new
   - 最新コミット: "feat: Add security middleware and headers for production deployment"

3. **データベース準備**
   - `database/create_users_table.sql` - usersテーブル作成SQL
   - `scripts/create-test-user.ts` - テストユーザー作成スクリプト

### ❌ 未完了・問題点

1. **VPS環境でビルドエラー**
   - 原因: VPSでの`npm run build`が失敗
   - 対策: **既存のビルド済みプロジェクトを使用**

2. **既存VPSアプリとの統合が必要**
   - VPS: `http://160.16.120.186:3000`
   - プロジェクトパス: `/home/ubuntu/n3-frontend_new`
   - PM2で管理: `n3-frontend`, `n3-api`

---

## 🎯 作業方針

### 戦略: 既存プロジェクトに最小限の変更でログイン機能を追加

1. **既存の`.next`ビルドを保持**
2. **認証機能に必要なファイルのみを手動で更新**
3. **段階的にテスト**

---

## 📝 実行手順

### Phase 1: 重要ファイルの手動更新（SSH経由）

VPSに接続してファイルを更新します。

#### Step 1: VPSに接続

```bash
# ローカルのMacから実行
ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186
```

#### Step 2: 必要なパッケージをインストール

```bash
cd ~/n3-frontend_new

# 認証に必要なパッケージをインストール
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

#### Step 3: 環境変数を設定

```bash
# .env.localを編集
nano .env.local
```

以下を追加：

```env
# JWT認証（本番環境では強力なランダム文字列に変更）
JWT_SECRET=nagano3-vps-production-secret-key-2025-change-this-immediately
```

保存: `Ctrl + O` → Enter → `Ctrl + X`

#### Step 4: JWT_SECRETを強力な値に変更

```bash
# ランダムな文字列を生成
openssl rand -base64 32
```

出力された値をコピーして、再度`.env.local`を編集：

```bash
nano .env.local
```

`JWT_SECRET=` の値を上記で生成した値に置き換える。

---

### Phase 2: Supabaseでデータベースセットアップ

#### Step 1: usersテーブル作成

1. ブラウザで https://supabase.com/dashboard にアクセス
2. プロジェクト選択
3. 左メニュー「**SQL Editor**」→「**New Query**」

以下のSQLを実行：

```sql
-- usersテーブル作成
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

-- RLS有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 開発環境用ポリシー
DROP POLICY IF EXISTS "Enable all access for development" ON public.users;
CREATE POLICY "Enable all access for development" 
  ON public.users 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- updated_at自動更新トリガー
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
```

#### Step 2: テストユーザー作成

ローカルのMacで実行：

```bash
cd /Users/aritahiroaki/n3-frontend_new
npx tsx scripts/create-test-user.ts
```

出力されたSQLをSupabase SQL Editorで実行：

```sql
INSERT INTO public.users (email, username, password_hash, role)
VALUES (
  'test@example.com',
  'Test User',
  '<生成されたハッシュ>',
  'admin'
);
```

---

### Phase 3: 重要ファイルのコピー（代替案）

ビルドが失敗する場合、認証APIファイルを手動でVPSにコピーします。

#### 方法A: scpでファイル転送（推奨）

ローカルのMacから実行：

```bash
# 認証APIをコピー
scp -i ~/.ssh/id_rsa \
  /Users/aritahiroaki/n3-frontend_new/app/api/auth/login/route.ts \
  aritahiroaki@160.16.120.186:~/n3-frontend_new/app/api/auth/login/

scp -i ~/.ssh/id_rsa \
  /Users/aritahiroaki/n3-frontend_new/app/api/auth/me/route.ts \
  aritahiroaki@160.16.120.186:~/n3-frontend_new/app/api/auth/me/

scp -i ~/.ssh/id_rsa \
  /Users/aritahiroaki/n3-frontend_new/app/api/auth/logout/route.ts \
  aritahiroaki@160.16.120.186:~/n3-frontend_new/app/api/auth/logout/

# middleware.tsをコピー
scp -i ~/.ssh/id_rsa \
  /Users/aritahiroaki/n3-frontend_new/middleware.ts \
  aritahiroaki@160.16.120.186:~/n3-frontend_new/

# next.config.jsをコピー
scp -i ~/.ssh/id_rsa \
  /Users/aritahiroaki/n3-frontend_new/next.config.js \
  aritahiroaki@160.16.120.186:~/n3-frontend_new/
```

#### 方法B: Gitから必要なファイルだけpull

VPSで実行：

```bash
cd ~/n3-frontend_new

# 特定のファイルだけをpull
git fetch origin main
git checkout origin/main -- app/api/auth/login/route.ts
git checkout origin/main -- app/api/auth/me/route.ts
git checkout origin/main -- app/api/auth/logout/route.ts
git checkout origin/main -- app/api/auth/register/route.ts
git checkout origin/main -- middleware.ts
git checkout origin/main -- next.config.js
git checkout origin/main -- lib/supabase/server.ts
```

---

### Phase 4: 再ビルド試行

VPSで実行：

```bash
cd ~/n3-frontend_new

# .nextを削除
rm -rf .next

# 再ビルド
npm run build
```

**ビルドが成功した場合**は次へ。  
**失敗した場合**はPhase 5へ。

---

### Phase 5: 開発モードで起動（ビルド失敗時の代替案）

本番環境での開発モード起動は推奨されませんが、テスト目的で一時的に使用できます。

```bash
cd ~/n3-frontend_new

# PM2で開発モードを起動
pm2 delete n3-frontend
pm2 start npm --name "n3-frontend-dev" -- run dev
pm2 save
```

---

### Phase 6: 動作確認

#### Step 1: アプリケーションの起動確認

VPSで実行：

```bash
pm2 status
pm2 logs n3-frontend --lines 50
```

#### Step 2: ブラウザでアクセス

```
http://160.16.120.186:3000/login
```

#### Step 3: ログインテスト

- メールアドレス: `test@example.com`
- パスワード: `test1234`

#### Step 4: 確認項目

- [ ] ログイン画面が表示される
- [ ] ログインできる
- [ ] ダッシュボードにリダイレクトされる
- [ ] ヘッダーにユーザー情報が表示される
- [ ] ログアウトできる

---

## 🔧 トラブルシューティング

### 問題1: ビルドエラーが解決しない

**原因**: 依存関係の競合、メモリ不足、TypeScriptエラー

**解決策**:
```bash
# node_modulesを完全に再インストール
rm -rf node_modules package-lock.json
npm install

# メモリを増やしてビルド
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 問題2: APIが404エラー

**原因**: `.next`ディレクトリが古い、APIルートがビルドされていない

**解決策**:
```bash
# .nextを削除して再ビルド
rm -rf .next
npm run build
pm2 restart n3-frontend
```

### 問題3: JWT_SECRETが読み込まれない

**原因**: 環境変数が設定されていない、PM2が環境変数を読み込んでいない

**解決策**:
```bash
# .env.localを確認
cat .env.local | grep JWT_SECRET

# PM2を--update-envで再起動
pm2 restart n3-frontend --update-env
```

### 問題4: Supabase接続エラー

**原因**: 環境変数の設定ミス

**解決策**:
```bash
# Supabase環境変数を確認
cat .env.local | grep SUPABASE

# ログでエラーを確認
pm2 logs n3-frontend | grep -i supabase
```

---

## 📚 重要ファイル一覧

### ローカルで作成・修正したファイル

#### 認証API
- `app/api/auth/login/route.ts` - ログインAPI
- `app/api/auth/me/route.ts` - ユーザー情報取得API
- `app/api/auth/logout/route.ts` - ログアウトAPI
- `app/api/auth/register/route.ts` - ユーザー登録API

#### フロントエンド
- `app/login/page.tsx` - ログイン画面
- `contexts/AuthContext.tsx` - 認証Context

#### コンポーネント
- `components/layout/Header.tsx` - ヘッダー（ユーザーメニュー追加）
- `components/layout/LayoutWrapper.tsx` - レイアウトラッパー
- `components/auth/ProtectedRoute.tsx` - 保護ルート

#### 設定・ミドルウェア
- `middleware.ts` - Rate Limiting
- `next.config.js` - セキュリティヘッダー
- `lib/supabase/server.ts` - Supabase server（async対応）

#### 環境変数
- `.env.local` - JWT_SECRET追加

#### データベース
- `database/create_users_table.sql` - usersテーブル作成SQL
- `scripts/create-test-user.ts` - テストユーザー作成スクリプト

---

## 🔐 セキュリティチェックリスト

### VPSデプロイ前
- [ ] JWT_SECRETを強力なランダム文字列に変更
- [ ] `.env.local`がGitにコミットされていないことを確認
- [ ] Supabase環境変数が正しく設定されている

### VPSデプロイ後
- [ ] HTTPSを設定（推奨）
- [ ] ファイアウォールを設定
- [ ] Rate Limitingが動作している
- [ ] ログイン試行回数制限が機能している

---

## 📞 次のステップ

### 完了後に実施すること

1. **ユーザー登録機能の追加**
   - 管理画面からユーザーを追加できるようにする

2. **HTTPS（SSL/TLS）の設定**
   - Let's Encryptで無料SSL証明書を取得
   - Nginxでリバースプロキシを設定

3. **ロールベースアクセス制御の実装**
   - 管理者と一般ユーザーで機能を制限

4. **ログ監視の設定**
   - ログイン履歴の記録
   - 不正アクセスの検知

---

## 📝 引き継ぎメモ

### 作業時の重要事項

1. **既存の`.next`ディレクトリを削除しない**
   - ビルドが失敗する場合の保険として保持

2. **PM2プロセスを確認**
   - `n3-frontend`と`n3-api`が動作中
   - 再起動時は両方を考慮

3. **VPSの既存データ**
   - 既にデータが入っている
   - 破壊的な変更は避ける

4. **SSH接続情報**
   - ユーザー: `aritahiroaki`
   - 鍵: `~/.ssh/id_rsa`
   - IP: `160.16.120.186`

---

## 🆘 緊急時の連絡先・参考資料

### ドキュメント
- `docs/VPS_CONNECTION_DEPLOYMENT_GUIDE.md` - VPS接続・デプロイ手順
- `docs/LOGIN_SETUP_GUIDE.md` - ログイン機能セットアップ
- `docs/VPS_SECURE_DEPLOYMENT_GUIDE.md` - セキュアデプロイ手順

### GitHubリポジトリ
- https://github.com/AKI-NANA/n3-frontend_new

### Supabase Dashboard
- https://supabase.com/dashboard

---

**この引き継ぎ書を使って、段階的に作業を進めてください。**  
**問題が発生した場合は、トラブルシューティングセクションを参照してください。**

---

**最終更新**: 2025-10-21  
**作成者**: Claude + Arita
