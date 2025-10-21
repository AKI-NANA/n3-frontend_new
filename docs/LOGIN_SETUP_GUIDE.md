# ログイン機能セットアップガイド

## 🚀 セットアップ手順（5-10分で完了）

このガイドに従って、ログイン機能を有効化してください。

---

## Step 1: 依存パッケージのインストール（2分）

ターミナルで以下を実行：

```bash
cd /Users/aritahiroaki/n3-frontend_new
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

**確認:**
```bash
npm list bcryptjs jsonwebtoken
```

---

## Step 2: Supabase でデータベーステーブル作成（3分）

### 2-1. Supabase Dashboard にログイン

1. ブラウザで https://supabase.com/dashboard を開く
2. プロジェクト `zdzfpucdyxdlavkgrvil` を選択
3. 左メニュー「**SQL Editor**」をクリック

### 2-2. SQL を実行

1. 「**New Query**」ボタンをクリック
2. 以下のファイルの内容を**全てコピー**:
   ```
   database/create_users_table.sql
   ```
3. SQL Editor に**ペースト**
4. 右下の「**RUN**」ボタンをクリック
5. 「**Success**」と表示されればOK！

### 2-3. テーブル確認

左メニュー → **Table Editor** → `users` テーブルが表示されていることを確認

**カラム構成:**
- `id` (UUID)
- `email` (VARCHAR)
- `username` (VARCHAR)
- `password_hash` (VARCHAR)
- `role` (VARCHAR)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `last_login_at` (TIMESTAMPTZ)
- `login_count` (INTEGER)

---

## Step 3: テストユーザー作成（2分）

### 3-1. パスワードハッシュを生成

ターミナルで以下を実行：

```bash
npx tsx scripts/create-test-user.ts
```

**出力例:**
```
==============================================
テストユーザー作成用SQL
==============================================

INSERT INTO public.users (email, username, password_hash, role)
VALUES (
  'test@example.com',
  'Test User',
  '$2a$10$XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
  'admin'
);

==============================================
ログイン情報
==============================================
メールアドレス: test@example.com
パスワード: test1234
==============================================
```

### 3-2. テストユーザーをDBに登録

1. 上記のSQLをコピー
2. Supabase SQL Editor にペースト
3. 「**RUN**」をクリック

---

## Step 4: 開発サーバー起動（1分）

```bash
npm run dev
```

ブラウザで http://localhost:3000/login にアクセス

---

## Step 5: ログインテスト（1分）

### 5-1. ログイン

1. メールアドレス: `test@example.com`
2. パスワード: `test1234`
3. 「ログイン」ボタンをクリック

**成功時:** ダッシュボード（`/`）にリダイレクトされる

### 5-2. セッション維持確認

1. ログイン後、ページをリロード（F5）
2. ログイン状態が維持されていることを確認

### 5-3. ログアウト確認

1. ヘッダーのユーザーアイコンをクリック
2. 「ログアウト」をクリック
3. ログイン画面にリダイレクトされることを確認

---

## ✅ セットアップ完了チェックリスト

- [ ] `bcryptjs` と `jsonwebtoken` がインストールされた
- [ ] Supabase に `users` テーブルが作成された
- [ ] テストユーザーが作成された
- [ ] ログインできた
- [ ] ページリロード後もログイン状態が維持された
- [ ] ログアウトできた

**全てチェックできたら、セットアップ完了です！🎉**

---

## 🔧 トラブルシューティング

### エラー: "Module not found: bcryptjs"

**原因:** パッケージがインストールされていない

**解決策:**
```bash
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

---

### エラー: "relation 'users' does not exist"

**原因:** `users` テーブルが作成されていない

**解決策:**
1. Supabase SQL Editor を開く
2. `database/create_users_table.sql` の内容を実行

---

### エラー: "メールアドレスまたはパスワードが正しくありません"

**原因:** テストユーザーが作成されていない、またはパスワードが間違っている

**解決策:**
1. `npx tsx scripts/create-test-user.ts` を実行
2. 出力されたSQLをSupabaseで実行
3. 正しいログイン情報を使用:
   - メール: `test@example.com`
   - パスワード: `test1234`

---

### エラー: "JWT_SECRET が設定されていません"

**原因:** 環境変数が設定されていない

**解決策:**
`.env.local` ファイルは既に設定済みです。開発サーバーを再起動してください：
```bash
# 一度停止（Ctrl+C）
npm run dev
```

---

### ログイン後、リダイレクトされない

**原因:** AuthProvider が設置されていない可能性

**解決策:**
`app/layout.tsx` を確認:
```typescript
<AuthProvider>
  {children}
</AuthProvider>
```

既に設置されているはずです。ブラウザのコンソールでエラーを確認してください。

---

## 📚 次のステップ

### 追加ユーザーの作成

管理画面からユーザーを追加する機能は未実装です。現在は以下の方法で追加：

1. パスワードハッシュを生成:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password', 10, (err, hash) => console.log(hash))"
   ```

2. Supabase SQL Editor で実行:
   ```sql
   INSERT INTO public.users (email, username, password_hash, role)
   VALUES (
     'newuser@example.com',
     'New User',
     '<生成したハッシュ>',
     'user'
   );
   ```

### ユーザー登録画面の実装（将来）

`app/register/page.tsx` を作成予定

---

## 🔐 セキュリティに関する注意事項

### 本番環境での設定

**必須対応:**
1. `.env.local` の `JWT_SECRET` を変更
   - 32文字以上のランダム文字列
   - 例: `openssl rand -base64 32`

2. HTTPS を必ず使用

3. Cookie の `secure` フラグを有効化（本番環境では自動）

### パスワードポリシー

現在のテストユーザーのパスワードは `test1234` ですが、本番環境では以下を推奨:
- 最低8文字以上
- 大文字・小文字・数字・記号を含む
- 一般的な単語を避ける

---

## 📊 実装済み機能

✅ メール・パスワードログイン  
✅ JWT認証（7日間有効）  
✅ HTTPOnly Cookie でトークン保存  
✅ セッション維持（ページリロード対応）  
✅ ログアウト  
✅ ユーザー情報取得API  
✅ 認証状態管理（React Context）  

---

## 🚧 未実装機能

⬜ ユーザー登録画面  
⬜ パスワードリセット  
⬜ メール認証  
⬜ 2段階認証  
⬜ ログイン履歴表示  
⬜ セッションタイムアウト  
⬜ CSRF対策  
⬜ Rate Limiting  

---

**作成日:** 2025-10-21  
**最終更新:** 2025-10-21
