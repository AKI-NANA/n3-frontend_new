# 🔥 Next.js 完全リセット - クイックガイド

## ❌ エラー内容
```
ENOENT: no such file or directory, open '.next/server/pages/_document.js'
```

## 原因
- `.next`フォルダが中途半端に削除された
- ビルドプロセスが中断された
- ファイルシステムの不整合

---

## ⚡ 最速の解決方法 (1分)

### コピペで実行 ⭐ 推奨

```bash
pkill -9 -f "next" 2>/dev/null; pkill -9 -f "node" 2>/dev/null; lsof -ti:3000 | xargs kill -9 2>/dev/null; rm -rf .next node_modules/.cache; npm run dev
```

---

## 📋 ステップバイステップ

### ステップ1: すべてのプロセスを停止
```bash
# Next.jsプロセスを停止
pkill -9 -f "next"

# Nodeプロセスを停止
pkill -9 -f "node"

# 2秒待機
sleep 2
```

### ステップ2: ポート3000をクリア
```bash
# ポート3000を使用中のプロセスを停止
lsof -ti:3000 | xargs kill -9
```

### ステップ3: ビルド成果物を完全削除
```bash
# .nextフォルダを削除
rm -rf .next

# キャッシュを削除
rm -rf node_modules/.cache

# 確認
ls -la | grep .next  # 何も表示されなければOK
```

### ステップ4: 開発サーバーを起動
```bash
npm run dev
```

**初回ビルドは30秒〜1分かかります。以下が表示されるまで待ちます:**
```
✓ Ready in 3.5s
✓ Local:        http://localhost:3000
```

---

## 🔧 スクリプトで自動実行

```bash
# 実行権限を付与
chmod +x clean-build.sh

# 実行
./clean-build.sh
```

---

## 🔍 詳細な診断

### 現在の状態を確認

```bash
# .nextフォルダの存在確認
ls -la .next 2>/dev/null || echo ".next が存在しません"

# Next.jsプロセスの確認
ps aux | grep next

# ポート3000の使用状況
lsof -i :3000

# ディスク容量
df -h
```

---

## 💡 エラーが再発する場合

### 原因1: node_modules の破損

```bash
# node_modulesを完全再インストール
rm -rf node_modules
npm install
npm run dev
```

### 原因2: package-lock.json の問題

```bash
# ロックファイルを削除して再生成
rm package-lock.json
npm install
npm run dev
```

### 原因3: ディスク容量不足

```bash
# ディスク容量を確認
df -h

# 不要なファイルを削除
rm -rf .next node_modules/.cache
```

### 原因4: 権限の問題

```bash
# プロジェクトディレクトリの権限を確認
ls -la /Users/aritahiroaki/n3-frontend_new

# 権限を修正（必要な場合）
sudo chown -R $(whoami) /Users/aritahiroaki/n3-frontend_new
```

---

## 🚨 緊急時の完全リセット

**警告: node_modulesも削除されるため時間がかかります（5分程度）**

```bash
# すべてクリア
pkill -9 -f "next"
pkill -9 -f "node"
rm -rf .next node_modules node_modules/.cache package-lock.json

# 再インストール
npm install

# 起動
npm run dev
```

---

## ✅ 正常に起動したか確認

### チェック1: コンソール出力
```bash
✓ Ready in 3.5s
✓ Local:        http://localhost:3000
✓ Network:      http://192.168.x.x:3000
```

### チェック2: .nextフォルダの構造
```bash
ls -R .next/server/ | head -20
```

**期待される構造:**
```
.next/server/
├── app/
├── pages/
│   └── _document.js  ← このファイルが存在する
├── vendor-chunks/
└── ...
```

### チェック3: ブラウザでアクセス
- http://localhost:3000 → トップページが表示される
- http://localhost:3000/approval → 承認ページが表示される

---

## 📊 ビルド時間の目安

| 状況 | 時間 |
|------|------|
| 通常の起動 | 3-5秒 |
| 初回ビルド | 30秒-1分 |
| node_modules再インストール | 3-5分 |

---

## 🛠️ 予防策

### 1. .gitignoreに追加
```
.next/
node_modules/.cache/
```

### 2. package.jsonにスクリプト追加
```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "clean": "rm -rf .next node_modules/.cache",
    "dev:clean": "npm run clean && npm run dev",
    "reset": "pkill -9 -f next; rm -rf .next node_modules/.cache"
  }
}
```

使用方法:
```bash
npm run dev:clean  # クリーンビルドで起動
npm run reset      # プロセス停止 + クリーン
```

### 3. VSCodeの設定
`.vscode/settings.json`:
```json
{
  "files.watcherExclude": {
    "**/.next/**": true,
    "**/node_modules/.cache/**": true
  }
}
```

---

## 🆘 それでも解決しない場合

### 情報収集

```bash
# エラーログを保存
npm run dev 2>&1 | tee error.log

# システム情報
node -v
npm -v
pwd
ls -la
```

### 以下の情報を共有

1. **エラーログ全体** (`error.log`)
2. **実行したコマンド**
3. **Node.jsバージョン**
4. **ディスク容量** (`df -h`)
5. **.nextフォルダの有無** (`ls -la .next`)

---

## 📞 よくある質問

**Q: なぜこのエラーが発生するのか?**  
A: Next.jsのビルドプロセスが中断されたり、`.next`フォルダが不完全な状態になると発生します。

**Q: 何度も同じエラーが出る**  
A: node_modulesの再インストールが必要です。上記の「緊急時の完全リセット」を実行してください。

**Q: ビルドに時間がかかりすぎる**  
A: 初回ビルドは通常より時間がかかります。1分以上待っても変わらない場合は、プロセスを停止して再試行してください。

---

**更新日:** 2025-01-15  
**対応エラー:** `ENOENT: no such file or directory, open '.next/server/pages/_document.js'`
