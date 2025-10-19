# 🚨 Yahoo→eBay統合ワークフロー 禁止ワード機能 セットアップガイド

## 📋 概要

このガイドでは、Yahoo→eBay統合ワークフローツールに**禁止ワード管理・チェック機能**を追加する手順を説明します。

### 🎯 追加される機能

1. **📤 CSVアップロード**: 禁止キーワードをCSV形式で一括登録
2. **🛡️ タイトル事前チェック**: 商品タイトルに禁止ワードが含まれているかリアルタイムチェック
3. **📊 統計・履歴管理**: 禁止ワード統計とチェック履歴の表示
4. **🔧 フィルター機能**: カテゴリ・重要度別での禁止ワード管理
5. **⚡ eBay配送ポリシー自動作成**: 商品情報から最適な配送ポリシーを自動生成

---

## 🚀 セットアップ手順

### Step 1: 実行権限の付与

```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete
chmod +x setup_prohibited_keywords.sh
```

### Step 2: セットアップスクリプトの実行

```bash
./setup_prohibited_keywords.sh
```

### Step 3: 動作確認

1. ブラウザで以下のURLにアクセス:
   ```
   http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php
   ```

2. 「**フィルター**」タブをクリック

3. 「**データ更新**」ボタンで初期データが表示されることを確認

---

## 📂 ファイル構成

### 新規作成ファイル

| ファイル名 | 用途 |
|-----------|------|
| `prohibited_keywords_setup.sql` | データベーススキーマ定義 |
| `prohibited_keywords_manager.js` | フロントエンド JavaScript |
| `prohibited_keywords_sample.csv` | サンプル禁止ワードCSV |
| `ebay_policy_generator.html` | eBay配送ポリシー生成UI |
| `setup_prohibited_keywords.sh` | 自動セットアップスクリプト |

### 修正ファイル

| ファイル名 | 修正内容 |
|-----------|----------|
| `shipping_management_api.php` | 禁止ワード管理API追加 |
| `yahoo_auction_tool_content.php` | UI改善（要手動追加） |

---

## 🌐 API エンドポイント

### ベースURL
```
http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php
```

### 主要エンドポイント

| アクション | メソッド | パラメータ | 説明 |
|-----------|---------|-----------|------|
| `get_prohibited_keywords` | GET | `category`, `severity` | 禁止ワード一覧取得 |
| `check_prohibited` | GET | `title` | タイトル内禁止ワードチェック |
| `upload_prohibited_keywords` | POST | `csv_file` | CSVアップロード |
| `get_prohibited_stats` | GET | なし | 統計情報取得 |
| `get_keyword_history` | GET | `limit` | チェック履歴取得 |
| `create_ebay_policy` | GET | `weight`, `country`, `category` | eBayポリシー生成 |

### 使用例

```bash
# 禁止ワードチェック
curl "http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php?action=check_prohibited&title=Nintendo%20Switch"

# 統計情報取得
curl "http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php?action=get_prohibited_stats"

# eBayポリシー生成
curl "http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php?action=create_ebay_policy&weight=1.5&country=US&category=electronics"
```

---

## 📋 CSVファイル形式

### 必須カラム

| カラム名 | 説明 | 例 |
|---------|------|-----|
| `keyword` | 禁止キーワード | Nintendo |
| `category` | カテゴリ | copyright |
| `severity` | 重要度 | critical |
| `reason` | 理由 | 著作権侵害リスク |

### 重要度レベル

| レベル | 説明 | 動作 |
|--------|------|------|
| `critical` | 致命的 | 即座に出品禁止 |
| `high` | 高 | 即座に出品禁止 |
| `medium` | 中 | 警告表示 |
| `low` | 低 | 情報表示のみ |

### カテゴリ例

- `copyright`: 著作権関連
- `prohibited`: 禁止品
- `restricted`: 制限品
- `dangerous`: 危険物
- `adult`: アダルト関連
- `general`: 一般

---

## 🔧 UIの使用方法

### 1. 禁止ワード管理

1. **フィルター**タブを開く
2. **CSVアップロードエリア**にファイルをドラッグ&ドロップ
3. アップロード完了後、**データ更新**で一覧を確認

### 2. タイトル事前チェック

1. **商品タイトル事前チェック**セクションで商品名を入力
2. **チェック実行**ボタンをクリック
3. 結果が即座に表示される

### 3. eBay配送ポリシー自動作成

1. **送料計算**タブを開く
2. **eBay配送ポリシー自動作成**セクションで商品情報を入力
3. **ポリシー生成**ボタンでeBay用の配送ポリシーを自動生成
4. JSON形式または読みやすい形式でコピー可能

---

## 🛠️ トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQLの状態確認
pg_ctl status

# PostgreSQL起動
brew services start postgresql
# または
pg_ctl start
```

### APIアクセスエラー

```bash
# Webサーバーの状態確認
sudo lsof -i :8080

# PHPサーバー再起動
php -S localhost:8080 -t /Users/aritahiroaki/NAGANO-3/N3-Development
```

### ファイルパーミッションエラー

```bash
# ファイル権限確認
ls -la *.php *.js

# 権限修正
chmod 644 *.php *.js
chmod +x *.sh
```

---

## 📊 データベーススキーマ

### 主要テーブル

1. **prohibited_keywords**: 禁止キーワードマスター
2. **keyword_check_history**: チェック履歴
3. **keyword_upload_history**: アップロード履歴

### 主要関数

- `check_title_for_prohibited_words(TEXT)`: タイトルチェック関数

---

## 🎯 今後の拡張予定

- [ ] 正規表現対応
- [ ] 多言語対応（英語・中国語）
- [ ] ホワイトリスト機能
- [ ] 自動学習機能
- [ ] Slack通知連携

---

## ⚡ パフォーマンス最適化

- インデックス自動作成
- 大文字・小文字を区別しない高速検索
- PostgreSQL関数による高速チェック
- キャッシュ機能（今後実装予定）

---

## 📞 サポート

問題が発生した場合は、以下の情報を含めて報告してください：

1. エラーメッセージ
2. ブラウザのコンソールログ
3. PHPエラーログ
4. データベースの状態

---

**🎊 これで禁止ワード管理機能の導入が完了です！**

安全で効率的な出品管理をお楽しみください。
