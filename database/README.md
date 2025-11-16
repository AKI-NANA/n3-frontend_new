# データベース管理

## 📂 ディレクトリ

### `/migrations/`
スキーマ変更・データ移行
- `score_system_migration.sql` - スコアシステム追加

### `/diagnostics/`
診断・チェック用SQL
- テーブル構造確認
- データ整合性チェック

### `/fixes/`
データ修正SQL
- カラム追加/修正
- データ型変更

### `/setup/`
初期セットアップSQL
- `01_create_products_master.sql` - マスターテーブル作成
