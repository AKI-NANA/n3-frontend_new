# 🚀 VPSデプロイ完全ガイド

## ✅ デプロイ前の確認事項

- [x] ローカルビルド成功 (`npm run build`)
- [x] TypeScript型エラーを最小化
- [x] APIルートの非同期処理を確認
- [x] Gitに変更をコミット & プッシュ

---

## 📋 VPSデプロイ手順（完全版）

### Phase 1: ローカルでの最終確認

```bash
cd /Users/aritahiroaki/n3-frontend_new

# 最終ビルド確認
chmod +x final-build-check.sh
./final-build-check.sh
```

**ビルドが成功したら**、次のPhaseに進みます。

---

### Phase 2: Gitに変更をプッシュ

```bash
# 変更をステージング
git add .

# コミット
git commit -m "fix: TypeScript型定義を修正し、デプロイ準備完了"

# GitHubにプッシュ
git push origin main
```

**プッシュが成功したか確認**:
```bash
git status
# "Your branch is up to date with 'origin/main'" が表示されればOK
```

---

### Phase 3: VPSにSSH接続

```bash
ssh ubuntu@n3.emverze.com
```

**接続できない場合**:
- VPNに接続しているか確認
- SSHキーが正しく設定されているか確認
- サーバーのIPアドレスが正しいか確認

---

### Phase 4: VPSで最新コードを取得

```bash
# プロジェクトディレクトリに移動
cd ~/n3-frontend_new

# 現在のブランチを確認
git branch

# 最新コードを取得（バックアップを作成）
echo "バックアップを作成中..."
cp -r ~/n3-frontend_new ~/n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)

# Gitから最新を取得
git pull origin main
```

**エラーが発生した場合**:
```bash
# ローカル変更がある場合はスタッシュ
git stash

# 再度プル
git pull origin main

# 必要に応じてスタッシュを適用
git stash pop
```

---

### Phase 5: 依存関係のインストール

```bash
# node_modulesを一度削除（推奨）
rm -rf node_modules .next

# 依存関係をインストール
npm install
```

**注意**: 
- `lightningcss-linux-x64-gnu` などのネイティブモジュールが自動的にインストールされます
- エラーが出た場合は、Node.jsのバージョンを確認してください

---

### Phase 6: 本番ビルド

```bash
# 本番ビルドを実行
npm run build
```

**期待される結果**:
```
✓ Compiled successfully in 15-20s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (354/354)
```

**ビルドが失敗した場合**:
1. エラーメッセージを確認
2. メモリ不足の場合: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`
3. それでも失敗する場合: バックアップから復元して再試行

---

### Phase 7: PM2でアプリを再起動

```bash
# PM2のプロセス一覧を確認
pm2 list

# n3-frontendを再起動
pm2 restart n3-frontend

# ログを確認（Ctrl+Cで終了）
pm2 logs n3-frontend --lines 50
```

**PM2プロセスが存在しない場合**:
```bash
# 新規に起動
pm2 start npm --name "n3-frontend" -- start

# PM2を自動起動に設定
pm2 startup
pm2 save
```

---

### Phase 8: デプロイ確認

```bash
# アプリケーションの状態を確認
pm2 status n3-frontend

# プロセスが正常に動作しているか確認
curl http://localhost:3000

# ログにエラーがないか確認
pm2 logs n3-frontend --lines 100 | grep -i error
```

---

### Phase 9: ブラウザで動作確認

1. **本番URL**: https://n3.emverze.com にアクセス
2. **主要機能の確認**:
   - [ ] トップページが表示される
   - [ ] 商品リストが表示される
   - [ ] eBayリサーチツールが動作する
   - [ ] データベース接続が正常
   - [ ] 画像が正しく表示される

---

## 🔍 トラブルシューティング

### ケース A: ビルドが失敗する

```bash
# キャッシュをクリア
rm -rf .next node_modules
npm install
npm run build
```

### ケース B: PM2が起動しない

```bash
# PM2を再インストール
npm install -g pm2

# プロセスを停止
pm2 stop all
pm2 delete all

# 再起動
pm2 start npm --name "n3-frontend" -- start
```

### ケース C: 502 Bad Gateway エラー

```bash
# PM2ログを確認
pm2 logs n3-frontend --lines 100

# ポート3000が使用されているか確認
lsof -i :3000

# 必要に応じてプロセスをkill
kill -9 <PID>
pm2 restart n3-frontend
```

### ケース D: データベース接続エラー

```bash
# 環境変数を確認
cat .env.local

# Supabase接続をテスト
curl -X GET https://zdzfpucdyxdlavkgrvil.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

---

## 📊 デプロイ後のモニタリング

### リアルタイムログ監視

```bash
# ログを監視（Ctrl+Cで終了）
pm2 logs n3-frontend

# エラーのみを監視
pm2 logs n3-frontend --err
```

### メトリクス確認

```bash
# CPU/メモリ使用状況
pm2 monit

# 詳細な統計情報
pm2 show n3-frontend
```

---

## 🎯 デプロイ完了チェックリスト

- [ ] VPSでビルドが成功
- [ ] PM2が正常に動作
- [ ] https://n3.emverze.com でアクセス可能
- [ ] 主要機能が正常に動作
- [ ] エラーログに問題がない
- [ ] データベース接続が正常

---

## 📞 緊急時のロールバック手順

```bash
# 1. PM2を停止
pm2 stop n3-frontend

# 2. バックアップから復元
cd ~
rm -rf n3-frontend_new
mv n3-frontend_new.backup.YYYYMMDD_HHMMSS n3-frontend_new

# 3. プロジェクトディレクトリに移動
cd n3-frontend_new

# 4. PM2を再起動
pm2 restart n3-frontend
```

---

## 💡 ベストプラクティス

1. **デプロイ前に必ずバックアップを作成**
2. **本番環境でのビルドは時間がかかる場合がある**（15-30分）
3. **PM2ログを定期的に確認**
4. **環境変数（.env.local）は手動でコピーが必要**
5. **メモリ不足の場合はスワップを設定**

---

**作成日**: 2025-11-19  
**対象サーバー**: n3.emverze.com  
**プロジェクト**: n3-frontend_new
