# Chrome起動エラーの修正方法

## 🔴 エラー内容

```
libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

**原因**: VPS上でChromeに必要なシステムライブラリが不足しています。

---

## ✅ 解決方法（VPS上で実行）

### ステップ1: VPSにSSH接続

```bash
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp
```

### ステップ2: リポジトリを更新

```bash
cd ~/n3-frontend_new
git pull origin main
```

### ステップ3: 以下のコマンドを実行（sudoパスワードが必要）

```bash
sudo apt-get update && sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

**このコマンドは以下をインストールします**:
- libatk-1.0-0（不足していたライブラリ）
- libgbm1
- libgtk-3-0
- libnss3
- その他Chrome/Chromiumに必要な30個以上のライブラリ

### ステップ4: アプリを再起動

```bash
pm2 restart n3-frontend
```

### ステップ5: 確認

```bash
curl https://n3.emverze.com/api/scraping/debug | jq '.checks.chromeLaunch'
```

**期待される結果**:
```json
{
  "success": true,
  "version": "HeadlessChrome/141.0.7390.78"
}
```

---

## 🧪 動作確認

### 1. デバッグエンドポイント

```bash
curl https://n3.emverze.com/api/scraping/debug
```

すべての`success: true`になるはず。

### 2. 実際のスクレイピングテスト

```bash
curl -X POST https://n3.emverze.com/api/scraping/execute \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://page.auctions.yahoo.co.jp/jp/auction/t1204568188"],
    "platforms": ["yahoo-auction"]
  }' | jq '.results[0]'
```

**期待される結果**:
```json
{
  "title": "【大量出品中 正規品】ポケモンカード...",
  "price": 3500,
  "status": "success",
  "condition": "目立った傷や汚れなし"
}
```

### 3. ブラウザで確認

https://n3.emverze.com/data-collection

Yahoo AuctionのURLを入力して、実際のデータが取得できることを確認。

---

## 🔍 トラブルシューティング

### Q: スクリプト実行後もエラーが出る

```bash
# ログ確認
pm2 logs n3-frontend --lines 50

# 再ビルド
cd ~/n3-frontend_new
npm run build
pm2 restart n3-frontend
```

### Q: 別のライブラリエラーが出る

エラーメッセージに表示されているライブラリ名をコピーして：

```bash
sudo apt-get install -y <ライブラリ名>
pm2 restart n3-frontend
```

例:
```bash
# libxxx.so.0 が見つからない場合
sudo apt-cache search libxxx
sudo apt-get install -y libxxx0
```

---

## 📝 Gitの使い方（重要）

### ローカルとGitHubの同期方法

#### 1. GitHubの最新をローカルに取得

```bash
cd ~/n3-frontend_new
git pull origin main
```

これで**GitHubで編集した内容がローカルに反映**されます。

#### 2. ローカルで編集

```bash
# ファイルを編集...
```

#### 3. ローカルからGitHubにプッシュ

```bash
git add .
git commit -m "修正内容"
git push origin main
```

**重要**: プッシュ前に必ず`git pull`すれば、GitHub側の変更が消えることはありません！

#### 4. コンフリクトが起きた場合

```bash
git pull origin main
# "CONFLICT"と表示された場合

# コンフリクトファイルを手動で編集
nano <ファイル名>

# 解決後
git add <ファイル名>
git commit -m "コンフリクト解決"
git push origin main
```

### Gitの安全性

✅ **Gitは賢い！**
- プッシュ前にリモートが変更されていたら警告してくれる
- 勝手にコードが消えることはない
- 間違えても`git reflog`で復元できる

---

**作成日**: 2025年10月23日
**問題**: libatk-1.0.so.0エラー
**解決**: システムライブラリインストール
