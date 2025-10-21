# 🚀 N3プロジェクト デプロイメントガイド

## 📊 プロジェクト概要

- **本番URL**: https://n3.emverze.com
- **VPSサーバー**: tk2-236-27682.vs.sakura.ne.jp (160.16.120.186)
- **フロントエンド**: Next.js 15.5.4 (ポート3000)
- **バックエンド**: PHP/Laravel (ポート8080)
- **Webサーバー**: Nginx (リバースプロキシ)
- **SSL証明書**: Let's Encrypt (自動更新)
- **DNS管理**: Cloudflare
- **ドメイン取得**: エックスサーバー

---

## 🔧 環境構成

### サーバー情報
```
OS: Ubuntu 24.04.3 LTS
Node.js: 18.x (→ 20.x へのアップグレード推奨)
PM2: プロセスマネージャー
Nginx: リバースプロキシ & SSL終端
```

### ポート構成
```
80   → Nginx (HTTP → HTTPS リダイレクト)
443  → Nginx (HTTPS)
3000 → Next.js (内部のみ)
8080 → PHP API (内部のみ)
```

---

## 📝 標準デプロイ手順

### 1. ローカルでの開発・修正

```bash
cd ~/n3-frontend_new

# コードを修正

# 動作確認
npm run dev
```

### 2. Gitへコミット & プッシュ

```bash
# 変更をステージング
git add .

# コミット
git commit -m "機能追加: XXXの実装"

# GitHub へプッシュ
git push origin main
```

### 3. VPSへのデプロイ

#### 3-1. VPSに接続
```bash
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp
```

#### 3-2. プロジェクトディレクトリに移動
```bash
cd ~/n3-frontend_new
```

#### 3-3. 最新コードを取得
```bash
git pull origin main
```

#### 3-4. 依存関係のインストール（package.json が変更された場合のみ）
```bash
npm install
```

#### 3-5. ビルド
```bash
npm run build
```

#### 3-6. アプリケーション再起動
```bash
pm2 restart n3-frontend
```

#### 3-7. ログ確認
```bash
pm2 logs n3-frontend --lines 20
```

---

## ⚡ クイックデプロイコマンド（一括実行）

VPS上で以下のコマンドを実行するだけでデプロイ完了：

```bash
cd ~/n3-frontend_new && \
git pull origin main && \
npm install && \
npm run build && \
pm2 restart n3-frontend && \
pm2 logs n3-frontend --lines 20
```

---

## 🔒 HTTPS設定（完了済み）

### DNS設定（Cloudflare）
```
Type: A
Name: n3
IPv4 address: 160.16.120.186
Proxy status: DNS only（グレーの雲）
TTL: Auto
```

### SSL証明書
```
発行元: Let's Encrypt
有効期限: 90日（自動更新）
証明書パス: /etc/letsencrypt/live/n3.emverze.com/
```

### 証明書の更新確認
```bash
sudo certbot renew --dry-run
```

---

## 🛠️ トラブルシューティング

### 問題1: サイトにアクセスできない

```bash
# Nginxの状態確認
sudo systemctl status nginx

# Nginxを再起動
sudo systemctl restart nginx

# アプリケーションの状態確認
pm2 status
```

### 問題2: ビルドエラー

```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 問題3: Git pull でコンフリクト

```bash
# ローカルの変更を退避
git stash

# 最新を取得
git pull origin main

# 退避した変更を戻す
git stash pop
```

### 問題4: PM2でアプリが起動しない

```bash
# プロセスを完全に削除して再起動
pm2 delete n3-frontend
pm2 start npm --name "n3-frontend" -- start
pm2 save
```

---

## 📂 重要なファイル

### 環境変数
```
ファイル: ~/n3-frontend_new/.env.local
※ Gitには含まれない（.gitignoreで除外）
※ 変更後は必ずビルド & 再起動が必要
```

### Nginx設定
```
ファイル: /etc/nginx/sites-available/n3.emverze.com
シンボリックリンク: /etc/nginx/sites-enabled/n3.emverze.com
```

### PM2設定
```
起動スクリプト: npm start
作業ディレクトリ: ~/n3-frontend_new
ログ: ~/.pm2/logs/n3-frontend-*.log
```

---

## ⚠️ 注意事項

### .env.local の管理
- **絶対にGitにコミットしない**（機密情報が含まれる）
- VPS上で直接編集する
- 変更後は必ず `npm run build` と `pm2 restart` を実行

### SSL証明書
- 90日ごとに自動更新（Certbot の systemd timer）
- 更新失敗時はメール通知が届く

### ファイアウォール
- SSH (22), HTTP (80), HTTPS (443) のみ許可
- 3000, 8080 は内部通信のみ（外部から直接アクセス不可）

---

## 🚀 今後の改善項目

### 優先度：高
- [ ] ログイン/ログアウト機能の完全実装
- [ ] 認証ガード（未ログイン時のアクセス制限）
- [ ] Node.js 20へのアップグレード

### 優先度：中
- [ ] モニタリング設定（Slack通知等）
- [ ] 自動バックアップ設定
- [ ] CI/CDパイプライン構築

### 優先度：低
- [ ] ログローテーション設定
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化

---

## 📞 緊急時の対応

### サイトが完全にダウンした場合

```bash
# 1. VPSに接続
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp

# 2. すべてのサービスを再起動
sudo systemctl restart nginx
pm2 restart all

# 3. ログを確認
sudo tail -f /var/log/nginx/error.log
pm2 logs --lines 50
```

### SSL証明書エラー

```bash
# 証明書を再取得
sudo certbot --nginx -d n3.emverze.com --force-renewal
sudo systemctl restart nginx
```

---

## 📋 デプロイ完了チェックリスト

### 開発環境
- [ ] ローカルで動作確認
- [ ] コードレビュー
- [ ] Gitコミット & プッシュ

### VPS環境
- [ ] `git pull` で最新コード取得
- [ ] `npm install` で依存関係更新
- [ ] `npm run build` でビルド成功
- [ ] `pm2 restart` で再起動
- [ ] ログにエラーがないか確認

### 本番確認
- [ ] https://n3.emverze.com にアクセス可能
- [ ] 鍵マーク（SSL）が表示される
- [ ] 主要機能が動作する
- [ ] レスポンス速度が正常

---

## 🔗 関連リンク

- **GitHub リポジトリ**: https://github.com/AKI-NANA/n3-frontend_new
- **Cloudflare ダッシュボード**: https://dash.cloudflare.com/
- **さくらVPS コントロールパネル**: https://secure.sakura.ad.jp/vps/

---

最終更新日: 2025年10月21日
