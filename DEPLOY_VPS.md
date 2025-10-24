# VPS初回デプロイ手順

新しい自動デプロイシステムを有効にするため、一度だけ手動でデプロイが必要です。

## 手順

### 1. ターミナルを開く（SSH鍵がある環境で）

### 2. 以下のコマンドを実行

```bash
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp "cd ~/n3-frontend_new && git fetch origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz && git checkout claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz && git pull origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz && npm install && npm run build && pm2 restart n3-frontend"
```

### 3. デプロイ完了確認

コマンドが成功したら、以下が完了しています：
- ✅ 最新コードがVPSに反映
- ✅ 価格・カテゴリ表示の修正
- ✅ 画像フィルタリングの改善
- ✅ インポート後の表示改善
- ✅ 自動デプロイシステムの有効化

### 4. 次回以降

https://n3.emverze.com/tools/git-deploy のボタン一つで自動デプロイできます。

## トラブルシューティング

### SSH鍵が見つからない場合

VPSにログインできる環境（SSH鍵ファイルがある場所）で実行してください。

### Permission deniedエラーが出る場合

SSH鍵のパスを明示的に指定：
```bash
ssh -i ~/.ssh/YOUR_KEY_NAME ubuntu@tk2-236-27682.vs.sakura.ne.jp "cd ~/n3-frontend_new && ..."
```

### 別の方法：VPSに直接ログインして実行

```bash
# 1. VPSにログイン
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp

# 2. VPS上で以下を実行
cd ~/n3-frontend_new
git fetch origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz
git checkout claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz
git pull origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz
npm install
npm run build
pm2 restart n3-frontend

# 3. 確認
pm2 logs n3-frontend --lines 20
```

## 完了後のテスト

1. https://n3.emverze.com/tools/editing にアクセス
2. スクレイピング → インポートを実行
3. 価格が正しく表示されるか確認（6000円など）
4. カテゴリが表示されるか確認
5. 画像が商品のもののみか確認
