# Git & デプロイ 完全マニュアル

## 📝 コミットメッセージ規約

### 基本フォーマット
```
<type>: <subject>

例: feat: eBayリサーチツール完全版実装 - 全5タブ対応
```

### タイプ一覧

| タイプ | 意味 | 使用例 |
|--------|------|--------|
| **feat** | 新機能追加 | `feat: eBayリサーチツール追加` |
| **fix** | バグ修正 | `fix: ログインエラーを修正` |
| **docs** | ドキュメント変更 | `docs: READMEを更新` |
| **style** | コードスタイル変更（機能に影響なし） | `style: インデントを修正` |
| **refactor** | リファクタリング | `refactor: 関数を整理` |
| **test** | テスト追加・修正 | `test: ユニットテスト追加` |
| **chore** | ビルド・設定変更 | `chore: package.jsonを更新` |

### ✅ 良い例
```
feat: eBayリサーチツール完全版実装 - 全5タブ対応
fix: サイドバーリンク修正
docs: Git & デプロイガイド更新
style: コンポーネントのCSSを調整
refactor: API呼び出しロジックを整理
test: eBay APIテストを追加
chore: 依存関係を更新
```

### ❌ 悪い例
```
修正
update
あああ
WIP
test
```

---

## 🔄 デプロイ手順（完全版）

### ステップ1: コード修正
- ローカルまたはClaude Codeでコード修正
- VSCodeやエディタで編集

### ステップ2: 動作確認
```bash
npm run dev
```
- ブラウザで http://localhost:3000 を開いて確認

### ステップ3: Git状態を確認
- 「デプロイ」タブで変更ファイル一覧を確認
- 何が変わったか把握する

### ステップ4: 🔍 差分確認（推奨）
- **「差分確認」ボタンをクリック**
- GitHubとローカルの差分をチェック
- ⚠️ GitHubに未取得の変更があれば警告が表示される

### ステップ5: Git Pull（必要に応じて）
- 差分があれば**「Git Pull」ボタンをクリック**
- GitHubの変更をローカルに取り込む
- これでコンフリクトを防ぐ

### ステップ6: コミットメッセージ入力
- 上記の規約に従って入力
- 例: `feat: eBayリサーチツール完全版実装 - 全5タブ対応`

### ステップ7: Git Push実行
- **「Git Push 実行」ボタンをクリック**
- 自動的に以下が実行される：
  1. `git pull origin main` （最新を取得）
  2. `git add .` （全変更をステージング）
  3. `git commit -m "メッセージ"` （コミット）
  4. `git push origin main` （プッシュ）

### ステップ8: コンフリクト確認
- もしコンフリクトがあれば、エラーメッセージが表示される
- エラーメッセージに従って手動で解決

### ステップ9: VPSデプロイ
- **「VPSデプロイ実行」ボタンをクリック**
- VPSで以下が自動実行される：
  1. `git pull origin main`
  2. `npm install`
  3. `npm run build`
  4. `pm2 restart n3-frontend`

### ステップ10: 本番確認
- https://n3.emverze.com を開いて動作確認
- 変更が反映されているか確認

---

## ⚠️ コンフリクト発生時の対処法

### コンフリクトとは？
- GitHubとローカルで**同じファイルの同じ箇所**を編集した時に発生
- 自動マージできない状態

### コンフリクト表示例
```
❌ Git pullに失敗しました

CONFLICT (content): Merge conflict in app/research/ebay-research/page.tsx
Automatic merge failed; fix conflicts and then commit the result.
```

### 解決方法1: 手動で解決（推奨）

1. **コンフリクトファイルを開く**
```typescript
<<<<<<< HEAD (ローカルの変更)
export default function EbayResearchComplete() {
=======
export default function EbayResearchPage() {
>>>>>>> origin/main (GitHubの変更)
```

2. **マーカーを削除して、どちらを残すか決める**
```typescript
// 例: ローカルの変更を残す場合
export default function EbayResearchComplete() {
```

3. **ターミナルで以下を実行**
```bash
git add app/research/ebay-research/page.tsx
git commit -m "fix: コンフリクト解決 - eBayリサーチツール"
git push origin main
```

### 解決方法2: 一方を優先（簡易）

**ローカルの変更を優先:**
```bash
git checkout --ours app/research/ebay-research/page.tsx
git add .
git commit -m "fix: ローカル変更を優先"
git push origin main
```

**GitHubの変更を優先:**
```bash
git checkout --theirs app/research/ebay-research/page.tsx
git add .
git commit -m "fix: GitHub変更を優先"
git push origin main
```

---

## 🚨 トラブルシューティング

### Q1: 「Git Push 実行」ボタンが押せない
**原因:**
- 変更されたファイルがない
- コミットメッセージが空

**解決策:**
- ファイルを修正する
- コミットメッセージを入力する

### Q2: 差分確認で黄色の警告が出る
**原因:**
- GitHubに未取得の変更がある

**解決策:**
1. 「Git Pull」ボタンをクリック
2. GitHubの変更を取り込む
3. もう一度「差分確認」で確認

### Q3: VPSデプロイが失敗する
**原因:**
- GitHubにプッシュされていない
- ビルドエラー

**解決策:**
1. 先に「Git Push 実行」を完了させる
2. ローカルで `npm run build` を実行してエラーがないか確認

### Q4: デプロイしたのに変更が反映されない
**原因:**
- VPSが間違ったブランチ（feature branch）にいる
- mainブランチではなく、古いfeature branchからデプロイされている

**症状:**
- GitHub Actions は成功している
- ビルドも成功している
- でも本番サイトに変更が見られない

**確認方法:**
```bash
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp
cd ~/n3-frontend_new
git branch              # 現在のブランチを確認
git log --oneline -3    # 現在のコミットを確認
```

**解決策:**
```bash
# mainブランチに切り替え
git checkout main

# 最新を取得
git pull origin main

# クリーンビルド
rm -rf .next
npm run build

# 再起動
pm2 restart n3-frontend
```

**予防策:**
- VPSで作業する際は必ず `git checkout main` を確認
- デプロイ後は `git branch` で main にいることを確認
- VPSは常に main ブランチを追跡すべき

---

## 📚 参考情報

### 環境情報
- **本番URL:** https://n3.emverze.com
- **VPSサーバー:** tk2-236-27682.vs.sakura.ne.jp
- **GitHubリポジトリ:** https://github.com/AKI-NANA/n3-frontend_new
- **デプロイ方式:** GitHub Actions + PM2

### よく使うコマンド（ターミナル）
```bash
# ローカル開発
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # リント実行

# Git操作
git status           # 変更状況確認
git add .            # 全ファイルをステージング
git commit -m "..." # コミット
git pull origin main # 最新を取得
git push origin main # GitHubへプッシュ

# VPS操作（SSH接続後）
cd ~/n3-frontend_new
git pull origin main
npm install
npm run build
pm2 restart n3-frontend
pm2 logs n3-frontend --lines 50
```

---

## 💡 ベストプラクティス

### ✅ Do（やるべきこと）
1. **必ず差分確認してからプッシュ**
2. **コミットメッセージは規約に従う**
3. **動作確認してからプッシュ**
4. **小さな単位でコミット**
5. **Claude Codeと並行作業する時は差分確認を頻繁に**

### ❌ Don't（やってはいけないこと）
1. **動作確認せずにプッシュ**
2. **コミットメッセージを適当に書く**
3. **差分確認せずにプッシュ**
4. **VPSで直接ファイルを編集**
5. **大量の変更を一度にコミット**

---

作成日: 2025年10月21日
最終更新: 2025年10月21日
