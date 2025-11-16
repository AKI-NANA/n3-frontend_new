## 🔑 Supabase APIキーの取得方法

### 1. Supabaseプロジェクトにアクセス
https://app.supabase.com にログイン

### 2. プロジェクトを選択
**Project:** zdzfpucdyxdlavkgrvil

### 3. Settings → API に移動

### 4. 以下のキーをコピー

#### Project URL
```
https://zdzfpucdyxdlavkgrvil.supabase.co
```

#### anon public キー
```
Project API keys → anon → public
```

#### service_role キー (重要!)
```
Project API keys → service_role → 🔑 Reveal → コピー
```

### 5. .env.local を更新

コピーしたキーを以下に貼り付けてください:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ここにanon keyを貼り付け
SUPABASE_SERVICE_ROLE_KEY=ここにservice_role keyを貼り付け

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345

# Google Apps Script 翻訳API URL
GOOGLE_APPS_SCRIPT_TRANSLATE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# eBay API
EBAY_CLIENT_ID=your-ebay-client-id
EBAY_CLIENT_SECRET=your-ebay-client-secret
```

### 6. 開発サーバーを再起動

```bash
# Ctrl+C で停止
npm run dev
```

---

## ⚠️ 重要な注意

- **service_role キー**は非常に強力な権限を持っています
- .env.localはGitにコミットしないでください (.gitignoreに含まれています)
- 本番環境では必ずJWT_SECRETを変更してください

---

## 🧪 確認方法

ログイン時のログ:
```
✅ Supabase初期化: https://zdzfpucdyxdlavkgrvil.supabase.co
🔍 ログイン試行: { email: 'admin@test.com', passwordLength: 8 }
🔍 Supabaseクライアント作成完了
🔍 ユーザー検索結果: { found: true, ... }
✅ ユーザー見つかりました: { id: '...', email: 'admin@test.com', role: 'admin' }
```

エラーが出る場合:
```
❌ Invalid API key
```
→ APIキーが間違っているか、.env.localが読み込まれていません
