# 🔥 Yahoo + eBay 統合システム 使用方法（仮想環境版）

## 🚀 クイックスタート

### 1. 仮想環境アクティベート（必須）
```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool
./activate_venv.sh
```

### 2. スクレイピング実行
```bash
# 仮想環境内で実行
python unified_scraping_system.py "https://auctions.yahoo.co.jp/jp/auction/p1198293948"
```

### 3. システム状態確認
```bash
python unified_scraping_system.py status
```

### 4. 仮想環境終了
```bash
deactivate
```

## 📋 詳細コマンド一覧

### 🧪 スクレイピング実行

```bash
# 仮想環境アクティベート
./activate_venv.sh

# 単一URL スクレイピング
python unified_scraping_system.py "https://auctions.yahoo.co.jp/jp/auction/XXXXXXXXX"

# 複数URL 一括スクレイピング
python unified_scraping_system.py batch \
  "https://auctions.yahoo.co.jp/jp/auction/URL1" \
  "https://auctions.yahoo.co.jp/jp/auction/URL2" \
  "https://auctions.yahoo.co.jp/jp/auction/URL3"

# システム状態確認
python unified_scraping_system.py status
```

### 📊 データベース確認（仮想環境外でも実行可能）

```bash
# データ品質レポート表示
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM scraping_quality_report;"

# 統合状況確認
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM integration_status_summary;"

# 編集準備完了商品一覧
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM products_ready_for_editing LIMIT 10;"

# 最新スクレイピング結果
psql -d nagano3_db -U aritahiroaki -c "
SELECT product_id, title_jp, price_jpy, status, scrape_timestamp 
FROM unified_scraped_ebay_products 
ORDER BY scrape_timestamp DESC 
LIMIT 10;
"
```

### 🌐 API エンドポイント（仮想環境不要）

```bash
# 商品一覧取得
curl "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/products/scraped"

# システム状態取得
curl "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/system/status"
```

## 🎯 典型的な使用フロー

### 1. 仮想環境起動
```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool
./activate_venv.sh
```

### 2. スクレイピング実行
```bash
python unified_scraping_system.py batch \
  "https://auctions.yahoo.co.jp/jp/auction/p1198293948" \
  "https://auctions.yahoo.co.jp/jp/auction/o1198293949"
```

### 3. 結果確認
```bash
python unified_scraping_system.py status
```

### 4. 仮想環境終了
```bash
deactivate
```

### 5. 棚卸しシステムで確認
```
http://localhost:8080/modules/tanaoroshi_inline_complete/
```

## ⚠️ 重要な注意事項

### 🐍 Python仮想環境について
- **必須**: スクレイピング実行前に `./activate_venv.sh` で仮想環境をアクティベート
- **終了**: 作業完了後は `deactivate` で仮想環境を終了
- **確認**: `which python` で仮想環境のPythonが使用されていることを確認

### 📊 データベース操作
- PostgreSQLコマンドは仮想環境外でも実行可能
- APIアクセスは仮想環境不要

### 🔧 トラブルシューティング

#### 仮想環境エラー
```bash
# 仮想環境再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install playwright psycopg2-binary pandas requests
playwright install chromium
```

#### 依存関係エラー
```bash
# 仮想環境内で依存関係確認
source venv/bin/activate
pip list | grep -E "playwright|psycopg2|pandas|requests"
```

#### PostgreSQL接続エラー
```bash
# 仮想環境外で確認
psql -d nagano3_db -U aritahiroaki -c "SELECT current_database();"
```
