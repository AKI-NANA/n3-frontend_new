# VPSデプロイ手順

## 🚀 簡単デプロイ（推奨）

VPSにSSH接続して以下のコマンドを実行してください：

```bash
ssh ubuntu@n3.emverze.com
cd /home/ubuntu/n3-frontend_new
git fetch origin
git checkout claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG
git pull origin claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh
```

## 📋 手動デプロイ

スクリプトを使わない場合は、以下を順番に実行：

```bash
ssh ubuntu@n3.emverze.com

# プロジェクトディレクトリに移動
cd /home/ubuntu/n3-frontend_new

# 最新データを取得
git fetch origin
git checkout claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG
git pull origin claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG

# 依存関係インストール
PUPPETEER_SKIP_DOWNLOAD=true npm install

# ビルド
npm run build

# 再起動
pm2 restart n3-frontend

# ログ確認
pm2 logs n3-frontend --lines 50
```

## ✅ デプロイ確認

https://n3.emverze.com/tools/git-deploy にアクセスして、新しい「Git完全同期」カードが表示されることを確認してください。

## 🔧 トラブルシューティング

### ビルドエラーが出る場合
```bash
# node_modules を削除して再インストール
rm -rf node_modules
PUPPETEER_SKIP_DOWNLOAD=true npm install
npm run build
```

### PM2が見つからない場合
```bash
npm install -g pm2
pm2 start npm --name "n3-frontend" -- start
```

### ポートが使われている場合
```bash
# 既存のプロセスを確認
pm2 list

# 既存のプロセスを削除
pm2 delete n3-frontend

# 再度起動
pm2 start npm --name "n3-frontend" -- start
pm2 save
```

## 📊 デプロイ後の確認

```bash
# アプリのステータス確認
pm2 status

# ログをリアルタイム監視
pm2 logs n3-frontend

# メモリ・CPU使用率確認
pm2 monit
```
