# VPSセキュアデプロイ手順書

**対象**: NAGANO-3 統合eコマース管理システム  
**作成日**: 2025-10-21

---

## 前提条件

- VPS: Ubuntu 22.04 LTS
- Node.js 18以上
- ドメイン設定済み
- Supabaseアカウント

---

## Phase 1: VPS初期設定（30分）

### 1. SSHでVPSに接続

```bash
ssh root@your-vps-ip
```

### 2. システム更新

```bash
apt update && apt upgrade -y
```

### 3. 一般ユーザー作成

```bash
adduser nagano3
usermod -aG sudo nagano3
```

### 4. SSH鍵認証設定

ローカルマシンで：
```bash
ssh-keygen -t ed25519 -C "nagano3@your-domain.com"
ssh-copy-id nagano3@your-vps-ip
```

### 5. ファイアウォール設定

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

---

## Phase 2: 必要なソフトウェアのインストール（20分）

### 1. Node.js インストール

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v18以上であることを確認
```

### 2. PM2 インストール

```bash
sudo npm install -g pm2
```

### 3. Nginx インストール

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Git インストール

```bash
sudo apt install git -y
```

---

## Phase 3: アプリケーションデプロイ（30分）

### 1. プロジェクトをクローン

```bash
cd /home/nagano3
git clone <repository-url> n3-frontend_new
cd n3-frontend_new
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. 環境変数設定

```bash
nano .env.local
```

以下を入力：
```env
# JWT認証（必ず強力なランダム文字列に変更）
JWT_SECRET=<openssl rand -base64 32 で生成>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**JWT_SECRET生成**:
```bash
openssl rand -base64 32
```

### 4. ビルド

```bash
npm run build
```

### 5. PM2で起動

```bash
pm2 start npm --name "nagano3" -- start
pm2 save
pm2 startup
```

---

## Phase 4: Nginx設定（20分）

### 1. Nginx設定ファイル作成

```bash
sudo nano /etc/nginx/sites-available/nagano3
```

以下を入力：
```nginx
# Rate Limiting設定
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

server {
    listen 80;
    server_name your-domain.com;

    # Rate Limiting（ログインAPI）
    location /api/auth/login {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # その他のリクエスト
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. シンボリックリンク作成

```bash
sudo ln -s /etc/nginx/sites-available/nagano3 /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # デフォルト設定を削除
```

### 3. Nginx設定テスト

```bash
sudo nginx -t
```

### 4. Nginx再起動

```bash
sudo systemctl restart nginx
```

---

## Phase 5: SSL/TLS設定（15分）

### 1. Certbotインストール

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. SSL証明書取得

```bash
sudo certbot --nginx -d your-domain.com
```

プロンプトに従って入力：
- メールアドレス
- 利用規約に同意
- HTTPSへの自動リダイレクト: Yes

### 3. 自動更新設定

```bash
sudo certbot renew --dry-run
```

---

## Phase 6: データベースセットアップ（10分）

### 1. Supabase SQL Editorで実行

```sql
-- usersテーブル作成（既に実行済みの場合はスキップ）
-- database/create_users_table.sql の内容を実行
```

### 2. 本番環境用ユーザー作成

```bash
# ローカルで実行
npx tsx scripts/create-test-user.ts
```

出力されたSQLをSupabaseで実行（テスト用）

---

## Phase 7: 動作確認（10分）

### 1. アプリケーション起動確認

```bash
pm2 status
pm2 logs nagano3
```

### 2. ブラウザでアクセス

https://your-domain.com/login

### 3. ログインテスト

- メール: test@example.com
- パスワード: test1234

### 4. セキュリティヘッダー確認

```bash
curl -I https://your-domain.com
```

以下のヘッダーが含まれていることを確認：
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`

---

## Phase 8: 監視・ログ設定（15分）

### 1. PM2監視設定

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Nginxログローテーション

```bash
sudo nano /etc/logrotate.d/nginx
```

以下を確認：
```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
}
```

### 3. システム監視（オプション）

```bash
# htopインストール
sudo apt install htop -y

# ディスク使用量確認
df -h

# メモリ使用量確認
free -h
```

---

## トラブルシューティング

### アプリケーションが起動しない

```bash
# ログ確認
pm2 logs nagano3

# プロセス再起動
pm2 restart nagano3

# 完全再起動
pm2 delete nagano3
pm2 start npm --name "nagano3" -- start
pm2 save
```

### Nginxエラー

```bash
# エラーログ確認
sudo tail -f /var/log/nginx/error.log

# 設定テスト
sudo nginx -t

# 再起動
sudo systemctl restart nginx
```

### SSL証明書エラー

```bash
# 証明書確認
sudo certbot certificates

# 手動更新
sudo certbot renew

# 強制更新
sudo certbot renew --force-renewal
```

---

## 定期メンテナンス

### 毎日
- [ ] アプリケーションログ確認: `pm2 logs`
- [ ] ディスク使用量確認: `df -h`

### 毎週
- [ ] システム更新: `sudo apt update && sudo apt upgrade -y`
- [ ] PM2プロセス確認: `pm2 status`

### 毎月
- [ ] SSL証明書確認: `sudo certbot certificates`
- [ ] バックアップ確認

---

## セキュリティチェックリスト

### デプロイ前
- [ ] JWT_SECRETを強力な値に変更
- [ ] 環境変数を適切に設定
- [ ] .env.localをGitにコミットしていないことを確認

### デプロイ後
- [ ] HTTPS（SSL/TLS）が有効
- [ ] ファイアウォールが有効
- [ ] Rate Limitingが動作
- [ ] セキュリティヘッダーが設定されている
- [ ] ログイン機能が動作
- [ ] 未認証ユーザーがアクセスできないことを確認

---

## 緊急時の対応

### アプリケーション停止

```bash
pm2 stop nagano3
```

### ロールバック

```bash
cd /home/nagano3/n3-frontend_new
git pull origin main
npm install
npm run build
pm2 restart nagano3
```

### データベースバックアップ

Supabase Dashboardから手動バックアップ：
1. Dashboard → Database → Backups
2. 「Create Backup」をクリック

---

**これでセキュアなVPSデプロイが完了です！**

何か問題があれば、このドキュメントのトラブルシューティングセクションを参照してください。
