# 🔧 ポート3000で起動する方法

## 問題
Next.jsが3001ポートで起動しようとしている

## 原因
ポート3000が既に使用されている可能性

---

## ✅ 解決方法

### 方法1: スクリプトで自動修正 ⭐ 推奨

```bash
chmod +x fix-port-3000.sh
./fix-port-3000.sh
```

このスクリプトが自動で:
1. ポート3000を使用しているプロセスを停止
2. すべてのNext.jsプロセスを停止
3. .nextフォルダをクリア
4. 開発サーバーを起動

---

### 方法2: 手動で修正

#### ステップ1: ポート3000を使用しているプロセスを確認
```bash
lsof -i :3000
```

#### ステップ2: プロセスを停止
```bash
# PIDを確認後、以下を実行
kill -9 <PID>

# または一括停止
lsof -ti:3000 | xargs kill -9
```

#### ステップ3: Next.jsプロセスを停止
```bash
pkill -9 -f "next dev"
```

#### ステップ4: .nextフォルダをクリア
```bash
rm -rf .next node_modules/.cache
```

#### ステップ5: 開発サーバーを起動
```bash
npm run dev
```

---

### 方法3: 環境変数で指定

```bash
PORT=3000 npm run dev
```

---

## 📝 package.json の変更

**修正済み:**
```json
{
  "scripts": {
    "dev": "next dev -p 3000"  // ✅ ポート3000を明示的に指定
  }
}
```

これにより、`npm run dev` を実行すると自動的にポート3000で起動します。

---

## ✅ 確認方法

開発サーバーが起動したら、以下が表示されます:

```
✓ Ready in 3.5s
✓ Local:        http://localhost:3000  ← ポート3000
```

ブラウザで確認:
- http://localhost:3000
- http://localhost:3000/approval

---

## 🔍 よくある原因

### 1. 前回の開発サーバーが残っている
```bash
# 確認
ps aux | grep "next dev"

# 停止
pkill -9 -f "next dev"
```

### 2. 他のアプリがポート3000を使用
```bash
# 確認
lsof -i :3000

# 例: Reactの開発サーバー、別のNext.jsプロジェクト等
```

### 3. ビルドキャッシュの問題
```bash
# クリーンアップ
rm -rf .next node_modules/.cache
```

---

## 💡 予防策

### VSCodeのタスク設定 (.vscode/tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Dev Server (Port 3000)",
      "type": "shell",
      "command": "npm run dev",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Clean & Dev",
      "type": "shell",
      "command": "rm -rf .next node_modules/.cache && npm run dev",
      "problemMatcher": []
    }
  ]
}
```

### スクリプト追加

package.jsonに追加:
```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "dev:clean": "rm -rf .next node_modules/.cache && next dev -p 3000",
    "kill:port": "lsof -ti:3000 | xargs kill -9 || true"
  }
}
```

使用方法:
```bash
# クリーンビルドで起動
npm run dev:clean

# ポート3000を強制クリア
npm run kill:port
npm run dev
```

---

## 📊 ポート確認コマンド

```bash
# ポート3000のステータス
lsof -i :3000

# すべてのNext.jsプロセス
ps aux | grep next

# ネットワーク接続を確認
netstat -an | grep 3000

# ポート使用状況
ss -tulpn | grep 3000  # Linux
lsof -nP -iTCP -sTCP:LISTEN | grep 3000  # Mac
```

---

## 🆘 それでも解決しない場合

### デバッグモードで起動

```bash
NODE_OPTIONS='--inspect' PORT=3000 npm run dev
```

### ログファイルに出力

```bash
npm run dev 2>&1 | tee dev.log
```

### システム再起動

最終手段として:
1. 開発サーバーを停止
2. ターミナルを閉じる
3. Macを再起動
4. `npm run dev` を実行

---

**更新日:** 2025-01-15  
**package.json修正:** ✅ 完了 (`next dev -p 3000`)
