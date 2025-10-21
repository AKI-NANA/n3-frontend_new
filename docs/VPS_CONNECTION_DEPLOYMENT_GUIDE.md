# NAGANO-3 VPS接続・デプロイ完全ガイド

**作成日**: 2025-10-21  
**対象環境**: さくらVPS (Ubuntu 24.04 LTS)  
**VPS IP**: 160.16.120.186

---

## 📋 目次

1. [SSH接続方法](#ssh接続方法)
2. [Gitへのコード反映](#gitへのコード反映)
3. [VPSへのデプロイ](#vpsへのデプロイ)
4. [トラブルシューティング](#トラブルシューティング)

---

## 🔐 SSH接続方法

### 接続情報

```
ホスト: 160.16.120.186
ユーザー: aritahiroaki
認証方式: SSH公開鍵認証
鍵ファイル: ~/.ssh/id_rsa
```

### 接続コマンド

```bash
ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186
```

### SSH設定ファイルに登録（推奨）

`~/.ssh/config` に以下を追加すると、簡単に接続できます：

```bash
# SSH設定ファイルを編集
nano ~/.ssh/config
```

以下を追加：

```
Host nagano3-vps
    HostName 160.16.120.186
    User aritahiroaki
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

保存後、以下のコマンドで接続可能：

```bash
ssh nagano3-vps
```

### 接続確認

```bash
# システム情報確認
uname -a

# ディスク使用量確認
df -h

# メモリ使用量確認
free -h
```

---

## 📤 Gitへのコード反映

### ローカル開発からGitHubへのプッシュ手順

#### 1. 変更内容の確認

```bash
# 変更されたファイルを確認
git status

# 変更内容の詳細を確認
git diff
```

#### 2. 変更をステージング

```bash
# すべての変更をステージング
git add .

# または特定のファイルのみ
git add app/api/auth/login/route.ts
git add middleware.ts
```

#### 3. コミット

```bash
# コミット（意味のあるメッセージを記述）
git commit -m "feat: Add authentication system with JWT"
```

**コミットメッセージの規約**:
- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント更新
- `refactor:` リファクタリング
- `chore:` その他の変更

#### 4. リモートリポジトリにプッシュ

```bash
# mainブランチにプッシュ
git push origin main
```

#### 5. GitHubで確認

ブラウザで以下にアクセスして、コードが反映されているか確認：
```
https://github.com/AKI-NANA/n3-frontend_new
```

---

## 🚀 VPSへのデプロイ

### 初回セットアップ（既に完了している場合はスキップ）

#### 1. VPSに接続

```bash
ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186
```

#### 2. プロジェクトディレクトリの確認

```bash
# ホームディレクトリに移動
cd ~

# プロジェクトディレクトリを探す
ls -la

# Next.jsプロジェクトを探す
find ~ -name "package.json" -type f 2>/dev/null | grep -v node_modules
```

#### 3. Gitリポジトリの設定確認

```bash
# プロジェクトディレクトリに移動（パスは環境によって異なる）
cd ~/n3-frontend_new

# Gitリモートの確認
git remote -v
```

出力例：
```
origin  https://github.com/AKI-NANA/n3-frontend_new.git (fetch)
origin  https://github.com/AKI-NANA/n3-frontend_new.git (push)
```

---

### 通常のデプロイ手順（毎回実行）

#### Step 1: VPSに接続

```bash
ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186
```

#### Step 2: プロジェクトディレクトリに移動

```bash
cd ~/n3-frontend_new
```

#### Step 3: 現在の状態を確認

```bash
# 現在のブランチとコミットを確認
git status
git log --oneline -1

# 実行中のプロセスを確認
ps aux | grep node
```

#### Step 4: アプリケーションを停止

```bash
# PM2を使用している場合
pm2 stop nagano3

# または直接nodeプロセスを停止
pkill -f "node.*next"
```

#### Step 5: 最新のコードを取得

```bash
# リモートの最新情報を取得
git fetch origin

# mainブランチを最新に更新
git pull origin main
```

#### Step 6: 依存関係を更新（package.jsonが変更された場合のみ）

```bash
# 新しいパッケージがインストールされた場合
npm install
```

#### Step 7: 環境変数の確認・更新

```bash
# .env.localが存在するか確認
ls -la .env.local

# 必要に応じて編集
nano .env.local
```

**重要な環境変数**:
```env
# JWT認証（本番環境では必ず変更）
JWT_SECRET=<強力なランダム文字列>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://160.16.120.186:3000
```

#### Step 8: ビルド

```bash
# 本番用ビルド
npm run build
```

**ビルドが成功したことを確認**してから次に進む。

#### Step 9: アプリケーションを起動

```bash
# PM2を使用している場合
pm2 start npm --name "nagano3" -- start
pm2 save

# または直接起動
npm start &
```

#### Step 10: 動作確認

```bash
# プロセスが起動しているか確認
ps aux | grep node

# PM2の場合
pm2 status

# ログを確認
pm2 logs nagano3 --lines 50
```

#### Step 11: ブラウザで確認

ブラウザで以下にアクセス：
```
http://160.16.120.186:3000
```

---

## 🔥 クイックデプロイ（ワンライナー）

全手順を一度に実行する場合：

```bash
ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186 << 'ENDSSH'
cd ~/n3-frontend_new
pm2 stop nagano3
git pull origin main
npm install
npm run build
pm2 start nagano3
pm2 logs nagano3 --lines 20
ENDSSH
```

---

## 🛠️ トラブルシューティング

### SSH接続できない

#### 問題1: Permission denied (publickey)

```bash
# 正しい鍵とユーザー名を使用
ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186

# 鍵のパーミッションを確認
chmod 600 ~/.ssh/id_rsa
```

#### 問題2: Connection refused

```bash
# VPSが起動しているか確認
ping 160.16.120.186

# SSHサービスが起動しているか（VPSで実行）
sudo systemctl status ssh
```

---

### Gitプッシュできない

#### 問題1: Changes not staged for commit

```bash
# 変更をステージング
git add .
git commit -m "Update code"
git push origin main
```

#### 問題2: Your branch is behind

```bash
# リモートの変更を先に取得
git pull origin main --rebase
git push origin main
```

#### 問題3: Merge conflicts

```bash
# コンフリクトを確認
git status

# コンフリクトを解決後
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

---

### Gitプルできない（VPS側）

#### 問題1: Please commit your changes

```bash
# 変更を一時退避
git stash

# プル
git pull origin main

# 退避した変更を復元（必要な場合）
git stash pop
```

#### 問題2: Authentication failed

```bash
# HTTPS認証の場合、トークンを使用
git config --global credential.helper store
git pull origin main
```

---

### ビルドエラー

#### 問題1: Module not found

```bash
# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 問題2: Out of memory

```bash
# Node.jsのメモリ制限を増やす
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

---

### アプリケーションが起動しない

#### ログの確認

```bash
# PM2のログを確認
pm2 logs nagano3

# または直接ログファイルを確認
tail -f ~/.pm2/logs/nagano3-error.log
tail -f ~/.pm2/logs/nagano3-out.log
```

#### ポート確認

```bash
# ポート3000が使用中か確認
sudo lsof -i :3000

# プロセスを強制終了
sudo kill -9 <PID>
```

#### 完全再起動

```bash
pm2 delete nagano3
pm2 start npm --name "nagano3" -- start
pm2 save
```

---

## 📝 チェックリスト

### ローカル開発完了時

- [ ] `git status` で変更を確認
- [ ] `npm run build` でビルドエラーがないか確認
- [ ] `git add .` で変更をステージング
- [ ] `git commit -m "適切なメッセージ"` でコミット
- [ ] `git push origin main` でプッシュ
- [ ] GitHubで反映を確認

### VPSデプロイ時

- [ ] VPSに接続
- [ ] プロジェクトディレクトリに移動
- [ ] アプリケーションを停止
- [ ] `git pull origin main` で最新コードを取得
- [ ] 必要に応じて `npm install`
- [ ] `npm run build` でビルド
- [ ] アプリケーションを起動
- [ ] ブラウザで動作確認

---

## 🔒 セキュリティベストプラクティス

### 1. SSH鍵の管理

```bash
# 鍵のパーミッション設定
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# 鍵のバックアップ（安全な場所に保存）
cp ~/.ssh/id_rsa ~/Backup/ssh_keys/
```

### 2. 環境変数の管理

- `.env.local` は絶対にGitにコミットしない
- 本番環境のJWT_SECRETは強力なランダム文字列を使用
- APIキーは定期的にローテーション

### 3. 定期的なアップデート

```bash
# VPSで実行（月1回推奨）
sudo apt update && sudo apt upgrade -y

# Node.jsパッケージの更新
npm outdated
npm update
```

---

## 📞 よくある質問（FAQ）

### Q1: デプロイはどのくらいの頻度で行うべきですか？

**A**: 開発の進捗に応じて、以下を推奨：
- 小さな変更: 1日1回
- 大きな機能追加: テスト後すぐ
- 緊急バグ修正: 即座に

### Q2: ローカルとVPSで環境変数が異なる場合は？

**A**: それぞれで異なる `.env.local` を管理します。
- ローカル: 開発用の値
- VPS: 本番用の値（セキュアな値）

### Q3: ビルドに時間がかかりすぎる

**A**: VPSのメモリが不足している可能性があります。
```bash
# スワップメモリを増やす（VPSで実行）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 🎯 まとめ

### 基本ワークフロー

```
ローカル開発
  ↓
git add/commit/push
  ↓
GitHub
  ↓
VPS接続
  ↓
git pull
  ↓
npm install (必要時)
  ↓
npm run build
  ↓
アプリ再起動
  ↓
動作確認
```

### 重要コマンド早見表

| 操作 | コマンド |
|------|---------|
| VPS接続 | `ssh -i ~/.ssh/id_rsa aritahiroaki@160.16.120.186` |
| コードプッシュ | `git add . && git commit -m "message" && git push origin main` |
| コードプル | `git pull origin main` |
| ビルド | `npm run build` |
| アプリ起動 | `pm2 start nagano3` または `npm start` |
| ログ確認 | `pm2 logs nagano3` |

---

**このガイドは常に最新の状態に保ってください。**

最終更新: 2025-10-21
