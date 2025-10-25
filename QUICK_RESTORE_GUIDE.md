# 🚀 クイック復元ガイド

## 📋 この方法で復元できること
- ローカル環境がおかしくなった時
- CSSが効かない、エラーが出る時
- 確実に最新のVPS状態にしたい時

---

## ⚡ 最速復元方法（3ステップ）

### ステップ1: バックアップ & クローン
```bash
cd ~
mv n3-frontend_new n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)
git clone https://github.com/AKI-NANA/n3-frontend_new.git
cd n3-frontend_new
```

### ステップ2: ブランチ切り替え & インストール
```bash
git checkout claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG
npm install
```

### ステップ3: 環境変数 & 起動
```bash
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDYxNjUsImV4cCI6MjA3NDYyMjE2NX0.iQbmWDhF4ba0HF3mCv74Kza5aOMScJCVEQpmWzbMAYU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0NjE2NSwiZXhwIjoyMDc0NjIyMTY1fQ.U91DMzI4MchkC1qPKA3nzrgn-rZtt1lYqvKQ3xeGu7Q
ENVEOF

npm run dev
```

**完了！** http://localhost:3000 にアクセス

---

## 🎯 さらに簡単な方法（GUI）

### git-deployページから実行
1. ブラウザで `http://localhost:3000/tools/git-deploy` を開く
2. **🔄 Mac完全同期（クリーンインストール）** カードを探す
3. 「完全同期コマンドをコピー」ボタンをクリック
4. ターミナルで `Cmd+V` → `Enter`
5. 完了したら `npm run dev`

---

## 📦 重要なファイル・情報

### GitHubリポジトリ
```
https://github.com/AKI-NANA/n3-frontend_new.git
```

### 開発ブランチ
```
claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG
```

### VPS接続情報
```bash
ホスト: 160.16.120.186
ユーザー: ubuntu
SSH設定名: emverze-vps
パス: /home/ubuntu/n3-frontend_new
```

### VPSから直接ファイルを取得する方法
```bash
# 特定のファイルを取得
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/app/xxx/page.tsx ./

# ディレクトリごと取得
scp -r ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/app ./

# 設定ファイルを取得
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/tailwind.config.ts ./
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/postcss.config.js ./
```

---

## 🔧 トラブルシューティング

### CSSが効かない
```bash
# 設定ファイルを確認
ls -la tailwind.config.* postcss.config.*

# なければVPSから取得
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/tailwind.config.ts ./
scp ubuntu@160.16.120.186:/home/ubuntu/n3-frontend_new/postcss.config.js ./

# 再ビルド
rm -rf .next
npm run dev
```

### ポートが使用中
```bash
# 使用中のプロセスを停止
kill $(lsof -ti:3000)

# 再起動
npm run dev
```

### node_modulesがおかしい
```bash
rm -rf node_modules .next
npm install
npm run dev
```

---

## 💡 Claudeへの指示

次回復元が必要な時は、Claudeに以下のように依頼してください：
```
「QUICK_RESTORE_GUIDE.mdの手順で復元してください」
```

Claudeはこのファイルを読んで、正確な手順を実行します。

---

## 📝 このファイルの保存場所

- **Git**: `/n3-frontend_new/QUICK_RESTORE_GUIDE.md`
- **ローカル**: `~/n3-frontend_new/QUICK_RESTORE_GUIDE.md`
- **VPS**: `/home/ubuntu/n3-frontend_new/QUICK_RESTORE_GUIDE.md`

このファイル自体もGitで管理されているので、安全です。

---

**作成日**: 2025年10月25日  
**最終更新**: 2025年10月25日
