# Git Push エラー解決方法（ローカルファイル保持版）

GitHubのSecret Scanningでpushがブロックされています。

## ✅ 推奨される解決方法（最も簡単）

### 方法1: GitHubのWeb UIで一時的に許可する ⭐️⭐️⭐️

**この方法の利点:**
- ✅ ローカルファイルに影響なし
- ✅ Git履歴の書き換え不要
- ✅ 30秒で完了
- ✅ リスクなし

**手順:**

1. ブラウザで以下の2つのURLを開く:

```
https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLMlG2rnKkWz9oBYn91lHyfR

https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLR2dEVXRV93IVw7kvAIU74W
```

2. 各ページで「**Allow secret**」ボタンをクリック

3. ターミナルで実行:
```bash
git push origin main
```

**完了！** 🎉

---

## 方法2: Gitトラッキングから削除（ローカルは保持）

ローカルファイルは残したまま、Gitの追跡だけを解除します。

```bash
# 自動スクリプトを実行
chmod +x fix-git-push-safe.sh
./fix-git-push-safe.sh
# → 「2」を選択

# または手動で実行
git rm -r --cached scripts/
git rm --cached .env*
git add .gitignore
git commit -m "chore: Remove sensitive files from Git tracking"
git push origin main
```

**結果:**
- 📁 ローカルの `scripts/` ディレクトリは**そのまま残る**
- 🚫 今後、`scripts/` の変更はGitに含まれない
- ✅ `.gitignore` で自動的に除外される

---

## 今後の運用方法

### scriptsディレクトリの扱い

**ローカル開発:**
- `scripts/` ディレクトリは普通に使用できます
- 変更しても Git には含まれません

**チーム開発の場合:**
- `scripts/` のテンプレートを別途共有
- 各開発者が自分の環境変数を設定

**例: scriptsテンプレートの作成**
```bash
# テンプレートディレクトリを作成（Gitに含める）
mkdir -p scripts-template/
cp scripts/*.example scripts-template/

# 実際のスクリプトはローカルにのみ存在
# .gitignore で scripts/ は除外
```

---

## 環境変数の管理

### ローカル開発
`.env.local` ファイルを使用（既に `.gitignore` に含まれています）

```bash
# .env.local
EBAY_CLIENT_ID_GREEN=your-client-id
EBAY_CLIENT_SECRET_GREEN=your-secret
```

### 本番環境
Vercel/Netlifyなどのダッシュボードで環境変数を設定

---

## FAQ

**Q: scriptsディレクトリが消えてしまいますか？**  
A: いいえ、**ローカルには残ります**。Gitの追跡から外れるだけです。

**Q: 他の開発者はscriptsをどう取得しますか？**  
A: 別の安全な方法（Slack、暗号化zip等）で共有するか、テンプレートを用意します。

**Q: 方法1と方法2、どちらがおすすめ？**  
A: **方法1（GitHubで許可）が最も簡単で安全**です。履歴の書き換えが不要です。

**Q: プライベートリポジトリなら安全？**  
A: はい、プライベートなら比較的安全ですが、セキュリティのベストプラクティスとして環境変数を使うことを推奨します。

---

## 迅速解決チャート

```
┌─────────────────────────┐
│ 今すぐpushしたい？      │
└────────┬────────────────┘
         │
    ┌────▼─────┐
    │   YES    │
    └────┬─────┘
         │
    ┌────▼──────────────────────────────┐
    │ 方法1: GitHubでAllow secretをクリック │
    │ （30秒で完了）                      │
    └───────────────────────────────────┘

    ┌────▼─────┐
    │   NO     │
    └────┬─────┘
         │
    ┌────▼──────────────────────────────┐
    │ 方法2: Gitトラッキングから削除      │
    │ （ローカルファイルは保持）          │
    └───────────────────────────────────┘
```

---

## 実行方法

```bash
# メニュー形式で実行
chmod +x fix-git-push-safe.sh
./fix-git-push-safe.sh
```
