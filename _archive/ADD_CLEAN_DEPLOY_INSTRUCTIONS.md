# 🚀 完全クリーンデプロイボタンの追加手順

## 現状
✅ CleanupTab.tsx - 「VPS完全クリーンアップ」ボタン追加完了
✅ page.tsx - 状態と関数の追加完了
❌ page.tsx - JSXカードがまだ未追加

## 追加手順

### ステップ1: VS Codeでファイルを開く

```bash
code ~/n3-frontend_new/app/tools/git-deploy/page.tsx
```

### ステップ2: 検索で該当箇所を探す

**Cmd+F (Mac) または Ctrl+F (Windows) で以下を検索:**

```
データ保護の仕組み
```

この文字列は「ワンクリック完全同期」カードの最後の方にあります。

### ステップ3: 挿入場所を特定

以下のような箇所が見つかります：

```tsx
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <strong>📚 データ保護の仕組み:</strong><br/>
                  ・ すべての変更はGitのコミット履歴に永久保存<br/>
                  ・ VPSバックアップを有効にすると、旧バージョンも保存<br/>
                  ・ 問題があれば <code className="bg-slate-100 px-1 rounded">git reset</code> で復元可能<br/>
                  ・ 競合検出時は自動で停止、手動解決を促す
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* ← ここに完全クリーンデプロイカードを追加 */}

          {/* 以下は既存の機能 */}
          {/* Git状態表示 */}
          <Card>
```

### ステップ4: コードを挿入

`</Card>` の**直後**（上記の `{/* ← ここに */}` の位置）に、
`CLEAN_DEPLOY_CARD_INSERT.txt` の内容全体をコピー&ペーストします。

### ステップ5: 保存して確認

1. ファイルを保存 (Cmd+S / Ctrl+S)
2. ブラウザでリロード
3. 「デプロイ」タブに「🧹 完全クリーンデプロイ（大規模変更後）」カードが表示される

---

## 📝 別の方法：行番号で探す

VS Codeの左側に行番号が表示されています。
以下のコマンドで「ワンクリック完全同期」カード付近に移動できます：

**Cmd+G (Mac) または Ctrl+G (Windows) を押して、行番号入力**

おそらく700行目〜1000行目の間にあります。

---

## ✅ 確認方法

ブラウザで http://localhost:3000/tools/git-deploy を開いて、
「デプロイ」タブをスクロールすると：

1. 🚀 ワンクリック完全同期（青紫のカード）
2. 🧹 完全クリーンデプロイ（オレンジのカード）← これが追加される
3. Git状態表示

の順番で表示されるはずです。

---

## 💡 トラブルシューティング

### エラーが出る場合
- インポート文は既に追加済みなので、エラーが出たら保存して開発サーバーを再起動
  ```bash
  npm run dev
  ```

### 見つからない場合
- 「Mac → GitHub → VPS を一括で同期」というテキストを検索
- または「ワンクリック完全同期」を検索

---

## 📄 挿入するコードファイル

`CLEAN_DEPLOY_CARD_INSERT.txt` を開いて、全内容をコピーしてください。
