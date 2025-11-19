# 🚀 VPS完全デプロイ手順（不要ファイル削除込み）

## ⚠️ 重要：VPS上の不要ファイルについて

### 問題
- ローカルで `.gitignore` に追加しても、**VPS上の既存ファイルは削除されない**
- `git pull` しても、`.gitignore` されたファイルはそのまま残る
- TypeScriptコンパイラがVPS上の古いファイルをチェックしてエラーになる

### 解決策
**VPS上で不要ファイルを明示的に削除**する必要があります。

---

## 📋 デプロイ手順（3ステップ）

### Step 1: ローカルで最終確認 & Gitプッシュ

```bash
cd /Users/aritahiroaki/n3-frontend_new

# 最終ビルド確認
chmod +x final-build-check.sh
./final-build-check.sh

# ビルド成功を確認したら、Gitにプッシュ
git add .
git commit -m "fix: TypeScript型定義修正、デプロイ準備完了"
git push origin main
```

---

### Step 2: スクリプトをVPSにアップロード

VPSにSSH接続してスクリプトを作成します：

```bash
ssh ubuntu@n3.emverze.com

# プロジェクトディレクトリに移動
cd ~/n3-frontend_new

# デプロイスクリプトを作成
cat > vps-deploy-complete.sh << 'SCRIPT_EOF'
#!/bin/bash

echo "========================================="
echo "🚀 VPS完全デプロイスクリプト"
echo "========================================="
echo ""
echo "このスクリプトは以下を実行します："
echo "  1. バックアップ作成"
echo "  2. 不要ファイルのクリーンアップ"
echo "  3. 最新コードの取得"
echo "  4. 依存関係のインストール"
echo "  5. 本番ビルド"
echo "  6. PM2再起動"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

cd ~/n3-frontend_new

echo ""
echo "📦 Phase 1: バックアップ作成..."
BACKUP_DIR=~/n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)
cp -r ~/n3-frontend_new ${BACKUP_DIR}
echo "✅ バックアップ: ${BACKUP_DIR}"

echo ""
echo "🗑️  Phase 2: 不要ファイルの削除..."
find . -name "*.bak" -type f -delete
find . -name "*.original" -type f -delete
find . -name "*_old.tsx" -type f -delete
find . -name "*_old.ts" -type f -delete
find . -name "*_backup.*" -type f -delete
rm -rf _archive node_modules .next
echo "✅ クリーンアップ完了"

echo ""
echo "📥 Phase 3: 最新コードの取得..."
git stash 2>/dev/null
git pull origin main
echo "✅ 最新コード取得完了"

echo ""
echo "📦 Phase 4: 依存関係のインストール..."
npm install
echo "✅ インストール完了"

echo ""
echo "🔨 Phase 5: 本番ビルド..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ビルド失敗。ロールバック実行..."
    cd ~
    rm -rf n3-frontend_new
    mv ${BACKUP_DIR} n3-frontend_new
    cd n3-frontend_new
    pm2 restart n3-frontend
    exit 1
fi
echo "✅ ビルド完了"

echo ""
echo "🚀 Phase 6: PM2再起動..."
pm2 restart n3-frontend || pm2 start npm --name "n3-frontend" -- start
pm2 save
echo "✅ PM2再起動完了"

echo ""
echo "⏳ 起動待機（10秒）..."
sleep 10

echo ""
echo "✅ デプロイ完了！"
echo ""
pm2 list
echo ""
echo "🌐 ブラウザで確認: https://n3.emverze.com"
echo "📊 ログ確認: pm2 logs n3-frontend"
echo "💾 バックアップ: ${BACKUP_DIR}"
SCRIPT_EOF

# 実行権限を付与
chmod +x vps-deploy-complete.sh
```

---

### Step 3: デプロイスクリプトを実行

```bash
# VPS上で実行（既にSSH接続済み）
cd ~/n3-frontend_new
./vps-deploy-complete.sh
```

---

## 🎯 スクリプトが実行する内容

### Phase 1: バックアップ作成
- 現在の状態を `~/n3-frontend_new.backup.YYYYMMDD_HHMMSS` に保存
- 問題が起きてもロールバック可能

### Phase 2: 不要ファイルの削除 🗑️
以下のファイルを**完全削除**：
- `*.bak` - バックアップファイル
- `*.original` - オリジナルファイル
- `*_old.tsx`, `*_old.ts` - 旧ファイル
- `*_backup.*` - バックアップファイル
- `_archive/` - アーカイブディレクトリ
- `node_modules/`, `.next/` - 再生成用に削除

### Phase 3: 最新コードの取得
- `git stash` でローカル変更を退避
- `git pull origin main` で最新コードを取得

### Phase 4: 依存関係のインストール
- `npm install` で依存関係を再構築
- ネイティブモジュールも正しくインストール

### Phase 5: 本番ビルド
- `npm run build` で本番ビルド
- **失敗したら自動的にロールバック**

### Phase 6: PM2再起動
- `pm2 restart n3-frontend` でアプリを再起動
- プロセスが存在しない場合は自動作成

---

## 🔍 デプロイ後の確認

```bash
# PM2の状態を確認
pm2 list

# ログを確認
pm2 logs n3-frontend --lines 50

# ローカルアクセステスト
curl -I http://localhost:3000

# ブラウザで確認
# https://n3.emverze.com
```

---

## 🚑 トラブルシューティング

### ビルドが失敗した場合
スクリプトが自動的にロールバックしますが、手動でも可能：

```bash
cd ~
rm -rf n3-frontend_new
mv n3-frontend_new.backup.YYYYMMDD_HHMMSS n3-frontend_new
cd n3-frontend_new
pm2 restart n3-frontend
```

### 不要ファイルが残っている場合
手動で削除：

```bash
cd ~/n3-frontend_new

# 不要ファイルを確認
find . -name "*.bak" -o -name "*.original" -o -name "*_old.*"

# 削除
find . -name "*.bak" -type f -delete
find . -name "*.original" -type f -delete
find . -name "*_old.*" -type f -delete
rm -rf _archive
```

---

## ✅ デプロイ完了チェックリスト

- [ ] スクリプトがエラーなく完了
- [ ] `pm2 list` で `online` 状態を確認
- [ ] `pm2 logs` でエラーがないことを確認
- [ ] `curl http://localhost:3000` が200を返す
- [ ] https://n3.emverze.com がブラウザで表示される
- [ ] 主要機能が正常に動作する

---

## 💡 重要なポイント

1. **バックアップは自動作成される**ので安心
2. **不要ファイルは完全に削除される**のでエラーが再発しない
3. **ビルド失敗時は自動ロールバック**するので安全
4. **`.env.local` は手動確認が必要**（Gitで管理されない）

---

**作成日**: 2025-11-19  
**対象**: n3.emverze.com (VPS)
