# Shopee 7カ国対応 出品管理ツール

## 概要

本システムは、Shopeeの7つの主要市場（シンガポール、マレーシア、タイ、フィリピン、インドネシア、ベトナム、台湾）向けの商品を一括管理するためのバックエンドシステムです。

## 主要機能

- **API連携**: Shopee API を通じた商品の一括登録・更新
- **CSV管理**: CSVファイルを通じた商品データの一括更新
- **7カ国対応**: 各国の通貨・言語に対応
- **トークン管理**: 自動的なアクセストークンの更新
- **レート制限対応**: API制限に準拠した安全な処理
- **エラーハンドリング**: 堅牢なエラー処理とログ管理

## 必要要件

### システム要件
- Python 3.8+
- PostgreSQL 12+
- Redis 6+

### Pythonパッケージ
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary redis celery pandas click httpx
```

## セットアップ手順

### 1. データベース設定

```sql
-- PostgreSQLでデータベースを作成
CREATE DATABASE shopee_manager;
CREATE USER shopee_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE shopee_manager TO shopee_user;
```

### 2. 設定ファイル（config.py）

```python
import os
from typing import Dict

# データベース設定
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://shopee_user:your_password@localhost:5432/shopee_manager"
)

# Redis設定
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Shopee API設定
SHOPEE_API_CONFIGS = {
    'SG': {
        'currency': 'SGD',
        'host': 'https://partner.shopeemobile.com',
        'timezone': 'Asia/Singapore'
    },
    'MY': {
        'currency': 'MYR', 
        'host': 'https://partner.shopeemobile.com',
        'timezone': 'Asia/Kuala_Lumpur'
    },
    'TH': {
        'currency': 'THB',
        'host': 'https://partner.shopeemobile.com', 
        'timezone': 'Asia/Bangkok'
    },
    'PH': {
        'currency': 'PHP',
        'host': 'https://partner.shopeemobile.com',
        'timezone': 'Asia/Manila'
    },
    'ID': {
        'currency': 'IDR',
        'host': 'https://partner.shopeemobile.com',
        'timezone': 'Asia/Jakarta'
    },
    'VN': {
        'currency': 'VND',
        'host': 'https://partner.shopeemobile.com',
        'timezone': 'Asia/Ho_Chi_Minh'
    },
    'TW': {
        'currency': 'TWD',
        'host': 'https://partner.shopeemobile.com',
        'timezone': 'Asia/Taipei'
    }
}

# ログ設定
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "shopee_manager.log")

# API制限設定
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 1  # 秒

# Celery設定
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
```

### 3. 環境変数設定（.env）

```bash
# データベース
DATABASE_URL=postgresql://shopee_user:your_password@localhost:5432/shopee_manager

# Redis
REDIS_URL=redis://localhost:6379/0

# ログレベル
LOG_LEVEL=INFO

# セキュリティ
SECRET_KEY=your-secret-key-here
```

### 4. システム初期化

```bash
# データベース初期化
python main.py init-db

# サンプルCSV生成（テスト用）
python main.py generate-sample
```

## 認証設定

各国ごとにShopee開発者アカウントから取得した認証情報を設定します：

```bash
# シンガポールの認証情報を設定
python main.py setup-auth \
  --country SG \
  --partner-id "your_partner_id" \
  --partner-key "your_partner_key" \
  --shop-id "your_shop_id" \
  --access-token "your_access_token" \
  --refresh-token "your_refresh_token" \
  --expires-in 3600

# 設定済み認証情報の確認
python main.py list-auth

# トークン状態の確認
python main.py check-tokens
```

## 実行方法

### APIサーバーの起動

```bash
# 開発環境
python main.py run-server --host 127.0.0.1 --port 8000 --reload

# 本番環境
python main.py run-server --host 0.0.0.0 --port 8000
```

### Celeryワーカーの起動

```bash
python main.py run-worker
```

### CSVファイルの処理

```bash
# ドライラン（テスト実行）
python main.py process-csv sample_products.csv --dry-run

# 実際の処理
python main.py process-csv sample_products.csv
```

## APIエンドポイント

### 商品管理

- `POST /api/products/upload-csv` - CSVファイルのアップロード
- `POST /api/products/add` - 単一商品の追加
- `PUT /api/products/{product_id}` - 商品の更新
- `GET /api/products` - 商品一覧の取得

### ログ・監視

- `GET /api/logs` - APIログの取得
- `GET /health` - ヘルスチェック

### API使用例

#### 単一商品の追加

```bash
curl -X POST "http://localhost:8000/api/products/add" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PRODUCT001",
    "country": "SG",
    "product_name_ja": "テスト商品",
    "product_name_en": "Test Product",
    "price": 29.99,
    "stock": 100,
    "category_id": 100001,
    "image_urls": ["https://example.com/image1.jpg"]
  }'
```

#### CSVファイルのアップロード

```bash
curl -X POST "http://localhost:8000/api/products/upload-csv" \
  -F "file=@sample_products.csv" \
  -F "auto_process=true"
```

## CSVファイル形式

CSVファイルは以下のカラムを含む必要があります：

| カラム名 | 必須 | 説明 |
|----------|------|------|
| sku | ✓ | 商品管理番号（一意） |
| country | ✓ | 国コード（SG, MY, TH, PH, ID, VN, TW） |
| product_name_ja | ✓ | 商品名（日本語） |
| product_name_en | ✓ | 商品名（英語） |
| price | ✓ | 価格 |
| stock | ✓ | 在庫数 |
| category_id | ✓ | ShopeeカテゴリID |
| image_url1 | | 画像URL 1 |
| image_url2 | | 画像URL 2 |
| ... | | 最大9枚まで対応 |

### CSVサンプル

```csv
sku,country,product_name_ja,product_name_en,price,stock,category_id,image_url1,image_url2
PROD001,SG,テスト商品1,Test Product 1,29.99,100,100001,https://example.com/img1.jpg,https://example.com/img2.jpg
PROD002,MY,テスト商品2,Test Product 2,19.99,50,100002,https://example.com/img3.jpg,
```

## 監視・運用

### システム状態の確認

```bash
python main.py status
```

### ログの確認

```bash
# アプリケーションログ
tail -f shopee_manager.log

# APIアクセスログ
curl "http://localhost:8000/api/logs?country=SG&limit=10"
```

### トークンの更新

システムは自動的にアクセストークンを更新しますが、手動での確認も可能です：

```bash
python main.py check-tokens
```

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - PostgreSQLサービスが起動しているか確認
   - 認証情報が正しいか確認

2. **Redis接続エラー**
   - Redisサービスが起動しているか確認
   - ポート6379が利用可能か確認

3. **Shopee API エラー**
   - 認証情報が正しく設定されているか確認
   - トークンの有効期限を確認
   - レート制限に達していないか確認

4. **CSV処理エラー**
   - ファイルエンコーディングがUTF-8またはUTF-8 with BOMか確認
   - 必須カラムが全て含まれているか確認
   - 数値フィールドに不正な値がないか確認

### ログの詳細度を上げる

```python
# config.py で設定
LOG_LEVEL = "DEBUG"
```

## セキュリティ考慮事項

- 認証情報は環境変数またはセキュアな設定ファイルで管理
- データベースアクセスは専用ユーザーで制限
- API エンドポイントには適切な認証を実装（本番環境）
- ログに機密情報が含まれないよう注意

## パフォーマンス最適化

- データベースインデックスの設定
- Redis キャッシュの活用
- Celery ワーカー数の調整
- API レート制限の適切な設定

## 将来の拡張

- 商品画像の自動処理
- 在庫同期の自動化
- 売上データの取得・分析
- 多言語対応の強化
- ダッシュボード機能の追加

## サポート

技術的な問題やバグレポートについては、開発チームまでお問い合わせください。