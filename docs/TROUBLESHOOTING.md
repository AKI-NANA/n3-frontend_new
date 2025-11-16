# ============================================
# トラブルシューティングガイド
# ============================================

## エラー1: "Cannot coerce the result to a single JSON object"

**原因:** テンプレートが見つからない
**解決策:**
1. http://localhost:3000/api/debug/html-templates にアクセス
2. `defaultTemplate.exists` が `false` の場合:
   - http://localhost:3000/tools/html-editor を開く
   - 新しいテンプレートを作成
   - 「モーダルのデフォルト表示に設定」にチェック
   - 保存ボタンをクリック

## エラー2: "商品が見つかりませんでした"

**原因:** products_master にデータがない
**解決策:**
1. データベーストリガーを確認
   ```sql
   SELECT * FROM products_master LIMIT 10;
   ```
2. トリガーが動作しているか確認
   ```sql
   SELECT * FROM yahoo_scraped_products LIMIT 1;
   -- この後、products_masterに同期されているか確認
   ```

## エラー3: "Type mismatch: UUID vs INTEGER"

**原因:** IDの型が異なる
**解決策:**
1. SKUベースの検索に変更（既に修正済み）
2. それでもエラーが出る場合:
   - `/tmp/fix_uuid_integer_mismatch.sql` を実行

## エラー4: ボタンを押しても反応しない

**原因:** JavaScriptエラー or API接続エラー
**解決策:**
1. ブラウザのコンソールを確認（F12）
2. Network タブでAPI呼び出しを確認
3. エラーログを確認

## 確認用コマンド

```bash
# デバッグAPIでデータ確認
curl http://localhost:3000/api/debug/html-templates | jq .

# products_masterのデータ確認
psql $DATABASE_URL -c "SELECT COUNT(*) FROM products_master;"

# テンプレート確認
psql $DATABASE_URL -c "SELECT id, name, is_default_preview FROM html_templates LIMIT 5;"
```

## バックアップからの復元

もし問題が発生した場合、各ファイルの `.backup_*` ファイルから復元できます：

```bash
# 例: category-analyzeの復元
cd /Users/aritahiroaki/n3-frontend_new/app/api/tools/category-analyze
cp route.ts.backup_YYYYMMDD_HHMMSS route.ts
```

## サポート情報

- 修正日時: 2025-11-01
- 修正内容: products → products_master 一括変更
- 影響範囲: 全ツールAPI (5件)
