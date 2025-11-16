# Next.js MIMEタイプエラー修正ガイド

## 🔴 発生しているエラー

```
Refused to apply style from 'http://localhost:3000/_next/static/css/app/layout.css'
because its MIME type ('text/plain') is not a supported stylesheet MIME type
```

```
Failed to load resource: the server responded with a status of 404 (Not Found)
/_next/static/chunks/main-app.js
```

## 📊 原因分析

1. **Next.jsビルドキャッシュの破損**
   - `.next`ディレクトリ内のキャッシュが不整合
   - 静的ファイル（CSS/JS）が正しく生成されていない

2. **MIMEタイプの誤検出**
   - サーバーが`text/plain`として返している
   - 本来は`text/css`と`application/javascript`であるべき

3. **404エラー**
   - ビルド成果物が存在しない
   - パスが正しく解決されていない

## ✅ 修正手順

### 方法1: クリーンビルド（推奨）

```bash
cd ~/n3-frontend_new

# 1. Next.jsキャッシュをクリア
rm -rf .next

# 2. node_modulesもクリア（オプション、問題が解決しない場合）
rm -rf node_modules

# 3. 依存関係を再インストール
npm install

# 4. 開発サーバーを起動
npm run dev
```

### 方法2: 強制リビルド

```bash
cd ~/n3-frontend_new

# 全てをクリーンアップして再起動
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### 方法3: ポートを変更して起動

```bash
cd ~/n3-frontend_new

# ポート3001で起動（ポート競合の可能性）
PORT=3001 npm run dev
```

その後、ブラウザで`http://localhost:3001`にアクセス

## 🔧 トラブルシューティング

### ケース1: それでもエラーが出る

**原因**: 既存のNext.jsプロセスが残っている

**解決策**:
```bash
# Next.jsプロセスを全て停止
pkill -f "next dev"
lsof -ti:3000 | xargs kill -9

# 再起動
cd ~/n3-frontend_new
npm run dev
```

### ケース2: キャッシュクリア後もエラー

**原因**: ブラウザキャッシュの問題

**解決策**:
1. ブラウザでハードリロード: `Cmd + Shift + R` (Mac)
2. ブラウザの開発者ツール → Network → Disable cache
3. プライベートブラウジングモードで開く

### ケース3: 特定のページだけエラー

**原因**: ページコンポーネントの構文エラー

**解決策**:
```bash
# エラーログを確認
cd ~/n3-frontend_new
npm run dev 2>&1 | grep -i error

# 該当ページのコードを確認
# 例: app/tools/supabase-connection/page.tsx
```

## 📝 エラー予防策

### 1. 定期的なキャッシュクリア

```bash
# package.jsonにスクリプトを追加
{
  "scripts": {
    "clean": "rm -rf .next",
    "fresh": "rm -rf .next && npm run dev"
  }
}

# 使用方法
npm run fresh
```

### 2. .gitignoreの確認

`.gitignore`に以下が含まれていることを確認：
```
.next/
node_modules/
.env*.local
```

### 3. Next.jsバージョンの確認

```bash
# Next.jsバージョンを確認
npm list next

# 最新版にアップデート（必要に応じて）
npm install next@latest react@latest react-dom@latest
```

## 🎯 今回の具体的な修正手順

```bash
# ターミナルで実行
cd ~/n3-frontend_new

# 1. すべてクリーンアップ
rm -rf .next

# 2. Next.jsを起動
npm run dev

# 3. ブラウザでアクセス
# http://localhost:3000/tools/supabase-connection

# 4. ハードリロード
# ブラウザで Cmd + Shift + R
```

## ✅ 修正完了の確認

以下が正常に動作すればOK：

- [x] CSS が正しく読み込まれる（スタイルが適用される）
- [x] JavaScriptが実行される（ボタンクリックが動く）
- [x] コンソールエラーが消える
- [x] ページが正常に表示される

## 📊 エラーが再発する場合

### 根本原因の特定

```bash
# Next.jsの診断モードで起動
cd ~/n3-frontend_new
NODE_OPTIONS='--inspect' npm run dev

# または、詳細ログで起動
DEBUG=* npm run dev
```

### よくある原因

1. **ファイルパーミッション**
   ```bash
   # 権限を修正
   chmod -R 755 ~/n3-frontend_new
   ```

2. **ディスク容量不足**
   ```bash
   # ディスク容量を確認
   df -h
   ```

3. **Next.js設定の問題**
   ```bash
   # next.config.jsをチェック
   cat ~/n3-frontend_new/next.config.js
   ```

---

**作成日**: 2025-10-25
**対象バージョン**: Next.js 14+
**ステータス**: テスト済み
