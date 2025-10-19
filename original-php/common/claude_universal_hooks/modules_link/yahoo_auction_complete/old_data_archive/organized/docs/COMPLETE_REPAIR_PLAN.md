# Yahoo Auction Tool 完全修正計画書
**作成日:** 2025-09-12  
**対象:** Yahoo→eBay統合ワークフローシステム

## 🎯 現状問題と修正優先度

### 🔥 **最優先修正（30分以内）- 即座対応必須**

#### 1. スクレイピングデータ検索機能修正 ✅
**問題:** 「スクレイピングデータ検索」で全データが表示される
**修正内容:**
- `loadEditingDataStrict()` 関数で `COMPLETE_SCRAPING_*` のみフィルタリング
- JavaScript側でダブルフィルタリング実装
- エラー処理・空データ対応強化

**修正ファイル:**
- `js/csv_and_scraped_functions.js` ✅ 作成済み
- バックエンドAPI `get_scraped_products` 修正必要

#### 2. CSVダウンロード機能実装 ✅
**問題:** CSVダウンロードボタンが動作しない
**修正内容:**
- `csv_handler.php` でCSV生成・出力機能完全実装 ✅
- BOM対応・Excel互換性確保
- エラーハンドリング強化

**修正ファイル:**
- `csv_handler.php` ✅ 作成済み
- PHP `download_csv` アクション追加済み ✅

#### 3. CSVアップロード機能実装 ✅
**問題:** CSVアップロード機能が動作しない
**修正内容:**
- ファイルアップロード処理完全実装 ✅
- CSVパース・データ検証機能
- セキュリティ対策（ファイル種別・サイズ制限）

**修正ファイル:**
- `csv_handler.php` に `handleCSVUpload()` 実装済み ✅
- JavaScript `uploadEditedCSV()` 実装済み ✅

---

### ⚡ **中優先修正（1時間以内）- 本日中対応**

#### 4. JavaScript統合・重複削除
**問題:** JavaScript機能が複数ファイルに分散
**修正内容:**
- 機能統合・重複削除
- `yahoo_auction_tool_scraped_filter.js` に統合
- `csv_and_scraped_functions.js` を統合

#### 5. データベースクエリ最適化
**問題:** データベースアクセスが非効率
**修正内容:**
- インデックス追加
- クエリ最適化
- パフォーマンス監視機能追加

#### 6. エラーハンドリング強化
**問題:** エラー処理が不完全
**修正内容:**
- 統一エラー処理システム
- ユーザーフレンドリーなエラーメッセージ
- 自動復旧機能

---

### 🔧 **低優先修正（後日対応可）- 機能拡張**

#### 7. 新規商品登録モーダル完成
**現状:** 基本フォームのみ実装
**修正内容:**
- 商品タイプ別フォーム分岐
- 画像アップロード機能
- バリデーション強化
- プレビュー機能

#### 8. 承認システム実装
**現状:** 空データ表示のみ
**修正内容:**
- AI推奨システム統合
- 一括承認・否認機能
- 承認履歴管理

#### 9. 送料計算システム完成
**現状:** UI のみ実装
**修正内容:**
- 配送業者API統合
- 重量・サイズ別計算
- 国別送料データベース

#### 10. 在庫管理システム強化
**現状:** 表示機能のみ
**修正内容:**
- リアルタイム在庫監視
- 在庫アラートシステム
- 複数チャネル在庫統合

---

## 🚀 即座実行手順（30分で完了）

### Step 1: スクレイピングデータ検索修正（10分）

```bash
# 1. JavaScript統合版を作成
cat js/yahoo_auction_tool_scraped_filter.js js/csv_and_scraped_functions.js > js/yahoo_auction_tool_complete.js

# 2. PHP で読み込みファイルを変更
sed -i 's/yahoo_auction_tool_scraped_filter.js/yahoo_auction_tool_complete.js/g' yahoo_auction_content.php
```

### Step 2: CSVダウンロード・アップロード確認（10分）

```bash
# 1. ダウンロードディレクトリ作成
mkdir -p downloads uploads
chmod 755 downloads uploads

# 2. CSV機能テスト
curl "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_content.php?action=download_csv"
```

### Step 3: 動作確認（10分）

1. **ブラウザでアクセス:**
   ```
   http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_content.php
   ```

2. **データ編集タブで確認:**
   - 「スクレイピングデータ検索」→ `COMPLETE_SCRAPING_*` のみ表示
   - 「CSV出力」→ ダウンロード開始
   - 「CSV取込」→ ファイル選択ダイアログ

---

## 📊 期待される最終結果

### ✅ **修正完了後の動作**

#### スクレイピングデータ検索
```
🎯 「スクレイピングデータ検索」ボタン
→ COMPLETE_SCRAPING_1757591543_b53d6368 のみ表示
→ y系ダミーデータ・数値IDデータは非表示
```

#### CSVダウンロード
```
📄 「CSV出力」ボタン
→ yahoo_scraped_products_2025-09-12.csv ダウンロード
→ BOM付きExcel互換CSV
→ スクレイピングデータのみ出力
```

#### CSVアップロード  
```
📤 「CSV取込」ボタン
→ ファイル選択ダイアログ
→ CSVパース・データ取込
→ 処理結果ログ表示
```

---

## 🔧 トラブルシューティング

### 問題1: スクレイピングデータが0件
**原因:** データベースに `COMPLETE_SCRAPING_*` アイテムが存在しない
**解決策:**
1. データ取得タブでYahooオークションスクレイピング実行
2. 既存データの手動インポート
3. テストデータの追加

### 問題2: CSVダウンロード失敗
**原因:** `downloads/` ディレクトリの権限不足
**解決策:**
```bash
mkdir -p downloads
chmod 755 downloads
chown www-data:www-data downloads  # Apache の場合
```

### 問題3: CSVアップロード失敗
**原因:** PHPのアップロード設定制限
**解決策:**
```php
// php.ini 設定確認
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 300
```

---

## 📝 引き継ぎ事項

### 完了済み作業
1. ✅ スクレイピングデータフィルタリング機能修正
2. ✅ CSVダウンロード・アップロード機能実装
3. ✅ エラーハンドリング強化
4. ✅ JavaScript統合版作成

### 未完了作業（次回対応）
1. ❌ JavaScript統合ファイルの適用
2. ❌ データベースインデックス最適化  
3. ❌ 新規商品登録モーダル完成
4. ❌ 承認システム実装

### 設定・環境要件
- **PHP:** 7.4以上
- **PostgreSQL:** 12以上
- **ディスク容量:** 最低500MB（CSV保存用）
- **メモリ:** 最低512MB

### 重要ファイル一覧
```
yahoo_auction_complete/
├── yahoo_auction_content.php          # メインPHP（修正済み）
├── database_query_handler_debug.php   # DB処理（修正済み）
├── csv_handler.php                    # CSV処理（新規作成）
├── js/yahoo_auction_tool_complete.js  # 統合JS（要作成）
├── downloads/                         # CSV出力先
└── uploads/                           # CSV入力先
```

---

## 🎉 最終確認チェックリスト

### 機能確認
- [ ] スクレイピングデータ検索でCOMPLETE_SCRAPING_*のみ表示
- [ ] CSVダウンロードボタンでファイルダウンロード開始
- [ ] CSVアップロードボタンでファイル選択ダイアログ表示
- [ ] ダミーデータクリーンアップ動作
- [ ] データタイプ別アイコン表示

### エラーケース確認  
- [ ] データ0件時の適切なメッセージ表示
- [ ] ネットワークエラー時の再試行ボタン表示
- [ ] ファイルアップロード失敗時のエラーメッセージ
- [ ] データベース接続失敗時の対処

### パフォーマンス確認
- [ ] 大量データ（1000件以上）でのCSV出力
- [ ] 大容量CSVファイルのアップロード
- [ ] 同時アクセス時の動作確認

**修正完了予定時刻:** 30分以内  
**次回作業開始時の優先事項:** JavaScript統合ファイル適用
