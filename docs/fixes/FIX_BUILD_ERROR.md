# 🔧 Next.js ビルドエラー修正手順

## ❌ エラー内容
```
ENOENT: no such file or directory, open '/Users/aritahiroaki/n3-frontend_new/.next/server/vendor-chunks/@supabase.js'
```

## 🎯 原因
- `.next` ビルドキャッシュが破損している
- Supabaseモジュールの読み込みに失敗

## ✅ 解決方法 (3つの方法)

---

### 方法1: 手動でクリーンビルド ⭐️ 推奨

ターミナルで以下を実行:

```bash
# 1. 開発サーバーを停止 (Ctrl+C)

# 2. .nextフォルダを削除
rm -rf .next

# 3. node_modules/.cacheを削除
rm -rf node_modules/.cache

# 4. 開発サーバーを再起動
npm run dev
```

**所要時間:** 約30秒

---

### 方法2: スクリプトで自動修正

```bash
# スクリプトに実行権限を付与
chmod +x fix-build-error.sh

# スクリプトを実行
./fix-build-error.sh
```

スクリプトが自動で以下を実行:
1. Next.jsプロセスを停止
2. `.next`フォルダを削除
3. `node_modules/.cache`を削除
4. 開発サーバーを起動

**所要時間:** 約1分

---

### 方法3: 完全クリーンインストール (最終手段)

依存関係の問題が疑われる場合:

```bash
# 1. 開発サーバーを停止 (Ctrl+C)

# 2. すべてのビルド成果物を削除
rm -rf .next node_modules/.cache

# 3. node_modulesを再インストール
rm -rf node_modules
npm install

# 4. 開発サーバーを再起動
npm run dev
```

**所要時間:** 約5分 (node_modulesの再インストール含む)

---

## 🔍 エラーが解決しない場合

### チェックリスト

1. **プロセスが完全に停止しているか確認**
   ```bash
   # Next.jsプロセスを検索
   ps aux | grep "next dev"
   
   # プロセスがあれば強制終了
   pkill -9 -f "next dev"
   ```

2. **ポート3000が使用されているか確認**
   ```bash
   # ポート3000を使用しているプロセスを確認
   lsof -i :3000
   
   # プロセスを強制終了
   kill -9 <PID>
   ```

3. **ディスク容量を確認**
   ```bash
   df -h
   ```

4. **権限の問題を確認**
   ```bash
   # プロジェクトディレクトリの権限を確認
   ls -la /Users/aritahiroaki/n3-frontend_new
   ```

---

## 💡 予防策

### 今後同じエラーを防ぐために:

1. **定期的にクリーンビルド**
   ```bash
   # 週に1回程度
   rm -rf .next node_modules/.cache
   npm run dev
   ```

2. **package.jsonにスクリプトを追加**
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "clean": "rm -rf .next node_modules/.cache",
       "dev:clean": "npm run clean && npm run dev"
     }
   }
   ```
   
   使用方法:
   ```bash
   npm run dev:clean
   ```

3. **VSCodeの設定**
   - `.next`フォルダを監視対象から除外
   - ファイル: `.vscode/settings.json`
   ```json
   {
     "files.watcherExclude": {
       "**/.next/**": true
     }
   }
   ```

---

## 📊 エラーの詳細情報

### なぜこのエラーが発生するのか？

1. **ビルドキャッシュの不整合**
   - コードの変更後、`.next`フォルダが正しく更新されない
   - モジュールパスが変更されたが、キャッシュが古いまま

2. **Supabaseモジュールの問題**
   - `@supabase/supabase-js`のバージョン変更
   - 依存関係の解決に失敗

3. **ファイルシステムの問題**
   - ディスク容量不足
   - 権限エラー
   - ファイルロック

### 正常な状態
```
.next/
├── server/
│   ├── app/
│   ├── pages/
│   └── vendor-chunks/
│       └── @supabase.js  ← このファイルが存在する
```

### エラー状態
```
.next/
├── server/
│   ├── app/
│   ├── pages/
│   └── vendor-chunks/
│       └── @supabase.js  ← このファイルが存在しない or 破損
```

---

## ✅ 確認方法

修正後、以下を確認:

1. **開発サーバーが起動すること**
   ```
   ✓ Ready in 3.5s
   ✓ Local:        http://localhost:3000
   ✓ Network:      http://192.168.x.x:3000
   ```

2. **エラーログが出ないこと**
   ```
   # このエラーが出ないこと
   ❌ ENOENT: no such file or directory
   ```

3. **ページが正常に表示されること**
   - http://localhost:3000
   - http://localhost:3000/approval

---

## 🆘 それでも解決しない場合

以下の情報を共有してください:

1. **エラーログ全体**
   ```bash
   npm run dev 2>&1 | tee error.log
   ```

2. **Node.jsバージョン**
   ```bash
   node -v
   npm -v
   ```

3. **package.jsonの内容**
   ```bash
   cat package.json
   ```

4. **ディレクトリ構造**
   ```bash
   ls -la .next/server/vendor-chunks/ 2>/dev/null || echo ".next not found"
   ```

---

**更新日:** 2025-01-15  
**作成者:** Claude  
