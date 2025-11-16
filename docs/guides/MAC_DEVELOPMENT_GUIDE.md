# 🍎 Mac開発環境セットアップガイド

## 📋 目次
1. [初回セットアップ](#初回セットアップ)
2. [日常的な開発フロー](#日常的な開発フロー)
3. [トラブルシューティング](#トラブルシューティング)

---

## 🚀 初回セットアップ

### 方法1: 完全クリーンインストール（推奨）
```bash
# 1. 既存のディレクトリをバックアップ
cd ~
mv n3-frontend_new n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)

# 2. GitHubから最新をクローン
git clone https://github.com/AKI-NANA/n3-frontend_new.git
cd n3-frontend_new
git checkout claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG

# 3. 依存関係をインストール
npm install

# 4. 環境変数を設定
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDYxNjUsImV4cCI6MjA3NDYyMjE2NX0.iQbmWDhF4ba0HF3mCv74Kza5aOMScJCVEQpmWzbMAYU
ENVEOF

# 5. 開発サーバー起動
npm run dev
```

起動後: http://localhost:3000

---

## 🔄 日常的な開発フロー

### パターンA: Macで変更 → Git → VPS
```bash
# Macで開発
cd ~/n3-frontend_new
# ... コード編集 ...

# Git同期（自動コミット＆プッシュ）
./sync-mac.sh

# VPSで反映（git-deployページで実行）
# https://n3.emverze.com/tools/git-deploy
```

### パターンB: VPSで変更 → Git → Mac
```bash
# Macで最新を取得
cd ~/n3-frontend_new
git pull origin claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG
npm install  # 依存関係が変わった場合
```

---

## 🔧 トラブルシューティング

### 問題1: CSSが効かない

**原因:** Tailwind設定ファイルの不足
```bash
cd ~/n3-frontend_new

# 設定ファイルを確認
ls -la tailwind.config.* postcss.config.*

# なければVPSから取得
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/tailwind.config.ts ./
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/postcss.config.js ./

# 再ビルド
rm -rf .next
npm run dev
```

### 問題2: 古いファイルが残っている

**解決策:** 完全クリーンインストール（上記の初回セットアップ参照）

### 問題3: ポートが使用中
```bash
# 使用中のプロセスを確認
lsof -ti:3000

# 停止
kill $(lsof -ti:3000)

# 再起動
npm run dev
```

### 問題4: データベース接続エラー

`.env.local`を確認：
```bash
cat .env.local
```

Supabase接続情報が正しいか確認

---

## 📌 重要なファイル

### Gitに含まれる
- ソースコード（`app/`, `components/`等）
- 設定ファイル（`tailwind.config.ts`, `postcss.config.js`）
- `package.json`, `tsconfig.json`

### Gitに含まれない（ローカルのみ）
- `.env.local` - 環境変数
- `node_modules/` - 依存関係
- `.next/` - ビルドファイル

---

## 🎯 ベストプラクティス

1. **毎回の開発開始時**: `git pull` で最新を取得
2. **開発終了時**: `./sync-mac.sh` で変更を保存
3. **月1回**: 完全クリーンインストールで環境リフレッシュ
4. **トラブル時**: このガイドのトラブルシューティング参照

---

## 📞 サポート

問題が解決しない場合:
1. git-deployページの「環境診断」ボタンを実行
2. エラーメッセージをコピー
3. 開発チームに連絡

