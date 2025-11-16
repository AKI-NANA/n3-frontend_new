# Mac環境セットアップガイド

## 🎯 目的

VPS（https://n3.emverze.com）で開発したコードをMacのローカル環境に同期して開発する。

---

## 📋 前提条件

- Mac に Git がインストールされている
- Mac に Node.js がインストールされている（推奨: v20以上）
- GitリポジトリのURLが分かっている

---

## 🚀 初回セットアップ

### ステップ1: GitリポジトリのURLを確認

VPSにSSH接続して確認：

```bash
ssh ubuntu@n3.emverze.com
cd /home/ubuntu/n3-frontend_new
git remote -v
```

出力例：
```
origin  https://github.com/AKI-NANA/n3-frontend_new.git (fetch)
origin  https://github.com/AKI-NANA/n3-frontend_new.git (push)
```

このURLをメモしてください。

### ステップ2: Macにクローン

```bash
# ホームディレクトリに移動（または好きな場所）
cd ~

# Gitからクローン（URLを実際のものに変更）
git clone https://github.com/AKI-NANA/n3-frontend_new.git n3-frontend

# ディレクトリに移動
cd n3-frontend
```

### ステップ3: 依存関係をインストール

```bash
npm install
```

### ステップ4: 環境変数をセットアップ

VPSから環境変数をコピー：

```bash
# VPSで実行
cat /home/ubuntu/n3-frontend_new/.env.local
```

内容をコピーして、Macで作成：

```bash
# Macで実行
nano .env.local
# コピーした内容を貼り付け
# Ctrl+O → Enter → Ctrl+X で保存
```

### ステップ5: ローカルで起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

---

## 🔄 日常的な同期作業

### 方法1: Git同期スクリプトを使う（推奨）

```bash
cd ~/n3-frontend
./sync-mac.sh
```

このスクリプトは：
1. ローカル変更を自動コミット
2. Gitにプッシュ
3. Gitから最新を取得

### 方法2: 手動でGitコマンドを実行

```bash
cd ~/n3-frontend

# 変更をコミット
git add .
git commit -m "作業内容の説明"

# Gitにプッシュ
git push origin main  # または現在のブランチ

# Gitから最新を取得
git pull origin main
```

---

## 📊 ワークフロー

```
┌─────────────────────────────┐
│ Mac（ローカル開発）         │
│ ~/n3-frontend               │
│                             │
│ 1. コード編集               │
│ 2. ./sync-mac.sh 実行       │
│    → Gitに自動プッシュ      │
└─────────────────────────────┘
         ↕ Git同期
┌─────────────────────────────┐
│ Git（リポジトリ）           │
│ GitHub/GitLab               │
└─────────────────────────────┘
         ↕ Git同期
┌─────────────────────────────┐
│ VPS（本番環境）             │
│ /home/ubuntu/n3-frontend_new│
│                             │
│ Webで「Git完全同期」実行   │
│ https://n3.emverze.com/     │
│ tools/git-deploy            │
└─────────────────────────────┘
```

---

## 🔧 トラブルシューティング

### 問題1: Gitリポジトリが見つからない

```bash
# リモートURLを確認
git remote -v

# URLを変更（実際のURLに置き換え）
git remote set-url origin https://github.com/AKI-NANA/n3-frontend_new.git
```

### 問題2: コンフリクトが発生

```bash
# 現在の変更を一時保存
git stash

# 最新を取得
git pull

# 変更を復元
git stash pop

# コンフリクトを手動で解決してから
git add .
git commit -m "コンフリクト解決"
git push
```

### 問題3: npm installでエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install

# Puppeteerスキップが必要な場合
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

### 問題4: ポート3000が使用中

```bash
# ポート3000を使っているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートで起動
PORT=3003 npm run dev
```

---

## 📚 重要なファイル

| ファイル | 説明 | Git管理 |
|---------|------|---------|
| `.env.local` | 環境変数（機密情報） | ❌ 管理しない |
| `.env` | 環境変数（サンプル） | ✅ 管理する |
| `sync-mac.sh` | Mac用同期スクリプト | ✅ 管理する |
| `node_modules/` | 依存関係 | ❌ 管理しない |
| `.next/` | ビルド成果物 | ❌ 管理しない |

---

## ✅ チェックリスト

初回セットアップ:
- [ ] GitリポジトリURLを確認
- [ ] Macにクローン
- [ ] npm install 実行
- [ ] .env.local 作成
- [ ] npm run dev で起動確認

日常作業:
- [ ] コード編集
- [ ] ./sync-mac.sh 実行
- [ ] VPSで「Git完全同期」実行
- [ ] 本番環境で確認

---

## 🆘 サポート

問題が発生した場合：

1. エラーメッセージをコピー
2. 以下のコマンドの結果を確認：
   ```bash
   git status
   git remote -v
   git log --oneline -5
   ```
3. サポートに問い合わせ
