# 🚀 VPS 簡単デプロイガイド

## 📋 前提条件

- VPSのIPアドレス
- SSH接続可能
- Node.js 18以上がインストール済み
- Supabaseプロジェクトの認証情報

---

## ⚡ クイックスタート

### 1️⃣ ローカルマシンから実行

```bash
# プロジェクトディレクトリに移動
cd /path/to/n3-frontend_new

# VPSに転送（rsync）
# ※ user@your-vps-ip を実際の値に置き換え
rsync -avz --exclude node_modules --exclude .git --exclude .next \
  ./ user@your-vps-ip:/var/www/n3-frontend
```

**または Git経由（推奨）:**

```bash
# VPSにSSH接続
ssh user@your-vps-ip

# プロジェクトをクローン
cd /var/www
git clone https://github.com/AKI-NANA/n3-frontend_new.git
cd n3-frontend_new
git checkout claude/research-analysis-dashboard-01Uv1pv2Mp8vg43dEpYv62D5
```

---

### 2️⃣ VPS上で実行

```bash
# プロジェクトディレクトリに移動
cd /var/www/n3-frontend_new

# 環境変数ファイルを作成
nano .env.local
```

`.env.local` に以下を記入：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

EBAY_APP_ID=your_app_id
EBAY_CLIENT_ID_MJT=your_client_id
EBAY_CLIENT_SECRET_MJT=your_client_secret
EBAY_REFRESH_TOKEN_MJT=your_refresh_token

NODE_ENV=production
```

保存して閉じる（Ctrl+X → Y → Enter）

```bash
# 依存関係をインストール
npm install

# ビルド
npm run build

# PM2で起動
npm install -g pm2
pm2 start npm --name "n3-frontend" -- start
pm2 startup
pm2 save

# 状態確認
pm2 status
pm2 logs n3-frontend
```

---

### 3️⃣ Supabaseマイグレーション実行

1. https://app.supabase.com にアクセス
2. プロジェクトを選択
3. 左メニュー「SQL Editor」→「New query」
4. 以下のファイル内容を貼り付け：
   `supabase/migrations/20250117_research_analytics_rpc.sql`
5. 「Run」をクリック

---

### 4️⃣ アクセス確認

```bash
# ブラウザで開く
http://your-vps-ip:3000/research-analysis
```

---

## 🔧 Nginx設定（オプション・推奨）

ポート80でアクセスできるようにする：

```bash
# Nginx設定ファイルを作成
sudo nano /etc/nginx/sites-available/n3-frontend
```

以下を貼り付け：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

有効化：

```bash
sudo ln -s /etc/nginx/sites-available/n3-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

これで `http://your-vps-ip/research-analysis` でアクセス可能！

---

## 📝 PM2コマンド一覧

```bash
# 状態確認
pm2 status

# ログ表示
pm2 logs n3-frontend

# 再起動
pm2 restart n3-frontend

# 停止
pm2 stop n3-frontend

# 削除
pm2 delete n3-frontend

# すべてのアプリを表示
pm2 list
```

---

## 🐛 トラブルシューティング

### エラー: "Missing script: build"

**原因:** プロジェクトディレクトリにいない

**解決策:**
```bash
cd /var/www/n3-frontend_new
pwd  # 現在地を確認
npm run build
```

### エラー: "Cannot find module..."

**原因:** node_modules がない

**解決策:**
```bash
npm install
npm run build
```

### エラー: "Port 3000 already in use"

**原因:** ポートが使用中

**解決策:**
```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを停止
pm2 stop all
# または
kill -9 <PID>
```

### ページが表示されない

**確認項目:**
```bash
# アプリが起動しているか
pm2 status

# ログを確認
pm2 logs n3-frontend

# ファイアウォール確認
sudo ufw status
sudo ufw allow 3000

# Nginx確認（設定している場合）
sudo nginx -t
sudo systemctl status nginx
```

---

## 🎉 完了！

アプリケーションが起動しました！

アクセスURL:
- **直接アクセス:** `http://your-vps-ip:3000/research-analysis`
- **Nginx経由:** `http://your-vps-ip/research-analysis`

確認事項:
- ✅ KPIカードに統計情報が表示される
- ✅ グラフが正しく描画される
- ✅ フィルタリングが動作する
- ✅ データテーブルが表示される
