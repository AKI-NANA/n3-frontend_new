# Wisdom Core - 開発ナレッジ事典

## 概要
AI協調型コードベース理解システム。プロジェクト内の全ファイルを自動分析し、「何のツールか」「どんな機能か」を理解しやすく整理します。

## 主な機能

### 1. 自動ファイルスキャン
- `/Users/aritahiroaki/n3-frontend_new/` 配下を再帰的にスキャン
- PHP, JS, CSS, SQL, MDファイルを自動検出
- ファイル内容を分析して自動分類

### 2. AI風の自動分類
各ファイルを以下の情報で分類：
- **ツール種別**: ダッシュボード、データ編集ツール、APIエンドポイントなど
- **カテゴリ**: dashboard, scraping, editing, api, class, shared など
- **技術スタック**: PHP, JavaScript, CSS, SQL など
- **主要機能**: 関数名を自動抽出
- **依存関係**: require/include文から自動抽出

### 3. 視覚的なコードマップ
- **リスト表示**: カード形式でファイル一覧
- **ツリー表示**: フォルダ構造をツリービューで表示
- **検索機能**: ファイル名・パス・内容から全文検索
- **カテゴリフィルター**: カテゴリ別に絞り込み

### 4. Gemini連携コピー機能
ファイル詳細画面で「Gemini用コピー」ボタンをクリックすると、以下の形式でクリップボードにコピー：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 ファイル: /07_editing/editor.php
🏷️ 種類: データ編集ツール
💡 機能: Yahoo Auctionからスクレイピングした商品データを編集・削除・CSV出力するツール

【カテゴリ】
editing

【技術スタック】
PHP

【主要機能】
- getProducts
- updateProduct
- deleteProduct

【コード全文】
```php
<?php
// ... ファイル内容
?>
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. JSON形式エクスポート
`code_map.json` 形式でエクスポート可能。LLMへの説明更新プロンプトに使用できます：

```json
[
  {
    "path": "/07_editing/editor.php",
    "title": "データ編集ツール",
    "description_level_h": "Yahoo Auctionからスクレイピングした商品データを編集・削除・CSV出力するツール",
    "last_updated": "2025-11-08"
  }
]
```

## セットアップ

### 1. Supabaseテーブル作成
```bash
# Supabase SQL Editorで実行
cat database/create_tables.sql
```

以下のテーブルが作成されます：
- `code_map`: コードマップメインテーブル
- `code_map_history`: 説明更新履歴

### 2. config.php確認
スキャン対象ディレクトリが正しいか確認：
```php
'base_path' => '/Users/aritahiroaki/n3-frontend_new',
```

### 3. アクセス
```
http://localhost/08_wisdom_core/wisdom.php
```

## 使い方

### 初回スキャン
1. ブラウザで `wisdom.php` を開く
2. 「プロジェクトスキャン」ボタンをクリック
3. スキャン進行状況が表示される
4. 完了後、ファイル一覧が表示される

### ファイル詳細表示
1. ファイルカードをクリック
2. 詳細情報が表示される
3. 「Gemini用コピー」でクリップボードにコピー
4. Geminiに貼り付けて開発を依頼

### 差分検出
スキャンを再実行すると：
- 新規ファイル → 新規登録
- 更新されたファイル → 再分析して更新
- 変更なし → スキップ

## ファイル構造

```
08_wisdom_core/
├── wisdom.php              # メインUI
├── config.php             # モジュール設定
├── api/
│   ├── scan.php           # スキャンAPI
│   ├── data.php           # データ取得API
│   └── export.php         # JSONエクスポート
├── assets/
│   ├── wisdom.css         # スタイル
│   └── wisdom.js          # JavaScript
├── includes/
│   └── WisdomCore.php     # コア機能クラス
├── database/
│   └── create_tables.sql  # テーブル作成SQL
└── README.md              # このファイル
```

## データベーススキーマ

### code_map テーブル
| カラム | 型 | 説明 |
|--------|-----|------|
| id | BIGSERIAL | 主キー |
| project_name | TEXT | プロジェクト名 |
| path | TEXT | ファイルパス（ユニーク） |
| file_name | TEXT | ファイル名 |
| tool_type | TEXT | ツール種別 |
| category | TEXT | カテゴリ |
| description_simple | TEXT | 簡潔な説明 |
| description_detailed | TEXT | 詳細説明 |
| main_features | JSONB | 主要機能配列 |
| tech_stack | TEXT | 技術スタック |
| ui_location | TEXT | UI上の場所 |
| dependencies | JSONB | 依存関係配列 |
| content | TEXT | ファイル内容 |
| file_size | INTEGER | ファイルサイズ |
| last_modified | TIMESTAMP | 最終更新日時 |
| last_analyzed | TIMESTAMP | 最終分析日時 |

## API仕様

### スキャンAPI
```
POST api/scan.php
→ プロジェクト全体をスキャン

Response:
{
  "success": true,
  "data": {
    "scanned": 150,
    "new": 20,
    "updated": 10,
    "skipped": 120,
    "errors": 0
  }
}
```

### データ取得API
```
GET api/data.php?action=list&page=1&limit=50&category=editing&keyword=editor
→ ファイル一覧取得

GET api/data.php?action=detail&id=123
→ ファイル詳細取得

GET api/data.php?action=tree
→ ツリー構造取得

GET api/data.php?action=stats
→ 統計情報取得
```

### エクスポートAPI
```
GET api/export.php
→ code_map.json をダウンロード
```

## カスタマイズ

### 対象拡張子の追加
`config.php` を編集：
```php
'target_extensions' => ['.php', '.js', '.jsx', '.css', '.md', '.sql', '.json', '.tsx'],
```

### 除外ディレクトリの追加
```php
'exclude_dirs' => ['node_modules', '.next', '.git', 'vendor', 'dist', 'build', 'tmp'],
```

### カテゴリの追加
```php
'categories' => [
    'custom' => 'カスタムカテゴリ',
    // ...
],
```

## トラブルシューティング

### スキャンが遅い
- `max_file_size` を小さくする（デフォルト1MB）
- `exclude_dirs` に不要なディレクトリを追加

### ファイルが検出されない
- `target_extensions` に拡張子が含まれているか確認
- `base_path` が正しいか確認

### データベースエラー
- Supabaseテーブルが作成されているか確認
- RLSポリシーが有効か確認

## 今後の拡張予定

- [ ] LLMによる説明文の自動生成
- [ ] ファイル間の依存関係グラフ表示
- [ ] コード変更履歴の追跡
- [ ] カスタム分類ルールの追加
- [ ] 複数プロジェクト対応

## ライセンス
MIT License

## 作成者
アリタヒロアキ

## バージョン
1.0.0 - 2025-11-08
