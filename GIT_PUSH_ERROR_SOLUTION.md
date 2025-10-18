# Git Push エラー解決方法

GitHubのSecret Scanningでpushがブロックされています。以下の3つの解決方法があります。

## 方法1: GitHubのWeb UIで一時的に許可する（最も簡単）⭐️

GitHubのエラーメッセージに表示されたURLをクリックして、一時的に許可することができます：

```
https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLMlG2rnKkWz9oBYn91lHyfR
https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLR2dEVXRV93IVw7kvAIU74W
```

**手順:**
1. 上記のURLをブラウザで開く
2. 「Allow secret」ボタンをクリック
3. 再度 `git push origin main` を実行

**注意:** この方法は一時的な回避策です。機密情報は公開リポジトリに残ります。

---

## 方法2: BFG Repo-Cleanerを使用（推奨）⭐️⭐️⭐️

最も安全で高速な方法です。

### インストール
```bash
brew install bfg
```

### 実行
```bash
# 自動スクリプトを実行
chmod +x cleanup-with-bfg.sh
./cleanup-with-bfg.sh

# または手動で実行
bfg --replace-text secrets.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin main --force
```

---

## 方法3: Git Filter-Branchを使用

伝統的な方法です。

```bash
chmod +x cleanup-git-history.sh
./cleanup-git-history.sh
git push origin main --force
```

---

## 方法4: 新しいリポジトリとして再作成（最終手段）

すべてがうまくいかない場合：

```bash
# 1. 現在のGit履歴を削除
rm -rf .git

# 2. 新しいリポジトリを初期化
git init
git add .
git commit -m "Initial commit with clean history"

# 3. GitHubリポジトリを再作成するか、強制push
git remote add origin https://github.com/AKI-NANA/n3-frontend_new.git
git push origin main --force
```

---

## 推奨される対応順序

1. **まず方法1を試す**（最も簡単、5秒で完了）
2. うまくいかない場合は**方法2のBFG**を使用
3. それでもダメなら**方法4で新規作成**

---

## 今後の予防策

以下のファイルは既に `.gitignore` に追加されています：

```
.env*
scripts/
**/client_secret*.json
```

次回からは機密情報が自動的に除外されます。

---

## 環境変数の設定

本番環境では以下を設定してください：

```bash
# Vercel/Netlify等のダッシュボードで設定
EBAY_CLIENT_ID_GREEN=***
EBAY_CLIENT_SECRET_GREEN=***
EBAY_REFRESH_TOKEN_GREEN=***
```

ローカル開発では `.env.local` ファイルを使用してください（Gitには含まれません）。
