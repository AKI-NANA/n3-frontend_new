#!/bin/bash

# 🔥 Yahoo スクレイピング + eBay API統合システム セットアップ
# PostgreSQL統合データベース構築・権限設定・初期データ投入

set -e  # エラー時に停止

echo "🔥 ==========================================="
echo "🎯 Yahoo + eBay 統合システム セットアップ開始"
echo "🔥 ==========================================="

# 色付きメッセージ関数
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }

# 設定変数
DB_NAME="nagano3_db"
DB_USER="aritahiroaki"
PROJECT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development"
YAHOO_MODULE_DIR="$PROJECT_DIR/modules/yahoo_auction_tool"

# PostgreSQL接続確認
print_info "PostgreSQL接続確認中..."
if ! psql -d $DB_NAME -U $DB_USER -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "PostgreSQL接続失敗。データベース設定を確認してください。"
    print_info "以下のコマンドで確認："
    print_info "  psql -l  # データベース一覧確認"
    print_info "  psql -d $DB_NAME -U $DB_USER -c 'SELECT current_database();'"
    exit 1
fi
print_success "PostgreSQL接続成功"

# 統合データベーススキーマ適用
print_info "統合データベーススキーマ適用中..."
SCHEMA_FILE="$YAHOO_MODULE_DIR/unified_scraped_ebay_database_schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    print_error "スキーマファイルが見つかりません: $SCHEMA_FILE"
    exit 1
fi

if psql -d $DB_NAME -U $DB_USER -f "$SCHEMA_FILE"; then
    print_success "統合データベーススキーマ適用完了"
else
    print_error "スキーマ適用失敗"
    exit 1
fi

# Python依存関係確認・インストール
print_info "Python依存関係確認中..."
PYTHON_DEPS=(
    "playwright"
    "psycopg2-binary" 
    "pandas"
    "requests"
)

for dep in "${PYTHON_DEPS[@]}"; do
    if python3 -c "import ${dep//-/_}" 2>/dev/null; then
        print_success "$dep インストール済み"
    else
        print_warning "$dep が見つかりません。インストール中..."
        pip3 install "$dep" || {
            print_error "$dep インストール失敗"
            exit 1
        }
        print_success "$dep インストール完了"
    fi
done

# Playwright ブラウザインストール確認
print_info "Playwright ブラウザ確認中..."
if playwright install chromium 2>/dev/null; then
    print_success "Playwright ブラウザ準備完了"
else
    print_warning "Playwright ブラウザインストール失敗（手動実行が必要な場合があります）"
fi

# 実行権限設定
print_info "実行権限設定中..."
chmod +x "$YAHOO_MODULE_DIR/unified_scraping_system.py"
chmod +x "$0"  # このスクリプト自体
print_success "実行権限設定完了"

# データディレクトリ作成
print_info "データディレクトリ作成中..."
mkdir -p "$YAHOO_MODULE_DIR/yahoo_ebay_data"
mkdir -p "$YAHOO_MODULE_DIR/logs"
print_success "データディレクトリ作成完了"

# データベーステーブル存在確認
print_info "データベーステーブル確認中..."
EXPECTED_TABLES=(
    "unified_scraped_ebay_products"
    "scraping_session_logs" 
    "product_editing_history"
)

for table in "${EXPECTED_TABLES[@]}"; do
    if psql -d $DB_NAME -U $DB_USER -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q "t"; then
        print_success "テーブル確認: $table"
    else
        print_error "テーブル未作成: $table"
        exit 1
    fi
done

# ビュー存在確認
print_info "データベースビュー確認中..."
EXPECTED_VIEWS=(
    "scraping_quality_report"
    "integration_status_summary"
    "products_ready_for_editing"
    "products_ready_for_ebay"
)

for view in "${EXPECTED_VIEWS[@]}"; do
    if psql -d $DB_NAME -U $DB_USER -c "SELECT EXISTS (SELECT FROM information_schema.views WHERE table_name = '$view');" | grep -q "t"; then
        print_success "ビュー確認: $view"
    else
        print_warning "ビュー未作成: $view（オプション）"
    fi
done

# システム動作テスト
print_info "システム動作テスト中..."

# Python スクリプト実行テスト
cd "$YAHOO_MODULE_DIR"
if python3 unified_scraping_system.py status > /dev/null 2>&1; then
    print_success "Python スクレイピングシステム動作確認"
else
    print_warning "Python システム動作テスト失敗（設定を確認してください）"
fi

# PHP API テスト
if php -l unified_product_api.php > /dev/null 2>&1; then
    print_success "PHP API構文チェック完了"
else
    print_error "PHP API構文エラー"
    exit 1
fi

# 設定ファイル生成
print_info "設定ファイル生成中..."
cat > "$YAHOO_MODULE_DIR/config.json" << EOF
{
    "database": {
        "host": "localhost",
        "port": 5432,
        "database": "$DB_NAME",
        "user": "$DB_USER",
        "password": ""
    },
    "scraping": {
        "max_concurrent_requests": 3,
        "request_delay_seconds": 2,
        "timeout_seconds": 30,
        "retry_attempts": 3
    },
    "integration": {
        "enable_duplicate_detection": true,
        "auto_update_active_data": true,
        "sync_to_tanaoroshi": true,
        "sync_to_ebay_system": false
    },
    "api": {
        "base_url": "http://localhost:8080/modules/yahoo_auction_tool",
        "enable_cors": true,
        "max_results_per_page": 50
    }
}
EOF
print_success "設定ファイル生成完了: config.json"

# 使用方法ガイド生成
print_info "使用方法ガイド生成中..."
cat > "$YAHOO_MODULE_DIR/USAGE_GUIDE.md" << 'EOF'
# 🔥 Yahoo + eBay 統合システム 使用方法

## 📋 ターミナルコマンド一覧

### 🧪 スクレイピング実行

```bash
# 単一URL スクレイピング
python3 unified_scraping_system.py "https://auctions.yahoo.co.jp/jp/auction/XXXXXXXXX"

# 複数URL 一括スクレイピング
python3 unified_scraping_system.py batch \
  "https://auctions.yahoo.co.jp/jp/auction/URL1" \
  "https://auctions.yahoo.co.jp/jp/auction/URL2" \
  "https://auctions.yahoo.co.jp/jp/auction/URL3"

# システム状態確認
python3 unified_scraping_system.py status
```

### 📊 データベース確認

```bash
# データ品質レポート表示
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM scraping_quality_report;"

# 統合状況確認
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM integration_status_summary;"

# 編集準備完了商品一覧
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM products_ready_for_editing LIMIT 10;"

# eBay出品準備完了商品一覧  
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM products_ready_for_ebay LIMIT 10;"

# 最新スクレイピング結果
psql -d nagano3_db -U aritahiroaki -c "
SELECT product_id, title_jp, price_jpy, status, scrape_timestamp 
FROM unified_scraped_ebay_products 
ORDER BY scrape_timestamp DESC 
LIMIT 10;
"
```

### 🌐 API エンドポイント

```bash
# 商品一覧取得（棚卸しシステム用）
curl "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/products/scraped"

# システム状態取得
curl "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/system/status"

# 編集準備完了商品取得
curl "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/products/ready-for-editing"

# 商品情報更新
curl -X POST "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/products/update" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "XXXXXXXXXXXX",
    "title_en": "English Title",
    "description_en": "English Description", 
    "ebay_price_usd": 29.99,
    "ebay_category_id": "12345"
  }'
```

## 🎯 典型的な使用フロー

### 1. スクレイピング実行
```bash
python3 unified_scraping_system.py batch \
  "https://auctions.yahoo.co.jp/jp/auction/p1198293948" \
  "https://auctions.yahoo.co.jp/jp/auction/o1198293949"
```

### 2. 結果確認
```bash
python3 unified_scraping_system.py status
```

### 3. 棚卸しシステムで確認
```
http://localhost:8080/modules/tanaoroshi_inline_complete/
```

### 4. 商品編集（API経由）
```bash
curl -X POST "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/products/update-for-ebay" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "取得したproduct_id",
    "title_en": "Premium Japanese Item",
    "description_en": "High quality item from Japan...",
    "ebay_price_usd": 45.99,
    "ebay_category_id": "12345",
    "shipping_cost_usd": 15.00
  }'
```

### 5. eBay出品準備確認
```bash
curl "http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/products/ready-for-ebay"
```

## ⚠️ 注意事項

- スクレイピング時は適切な間隔（2秒以上）で実行
- 大量スクレイピング前にテスト実行を推奨
- データベース変更前には必ずバックアップを取得
- エラーログは `yahoo_ebay_data/` フォルダに保存されます

## 🔧 トラブルシューティング

### PostgreSQL接続エラー
```bash
# データベース接続確認
psql -d nagano3_db -U aritahiroaki -c "SELECT current_database();"

# 権限確認
psql -d nagano3_db -U aritahiroaki -c "SELECT * FROM information_schema.table_privileges WHERE grantee = 'aritahiroaki';"
```

### Python依存関係エラー
```bash
# 依存関係再インストール
pip3 install playwright psycopg2-binary pandas requests

# Playwrightブラウザインストール
playwright install chromium
```

### PHP APIエラー
```bash
# PHP構文チェック
php -l unified_product_api.php

# PHPエラーログ確認
tail -f /usr/local/var/log/php_errors.log
```
EOF
print_success "使用方法ガイド生成完了: USAGE_GUIDE.md"

# 簡易テストデータ投入（オプション）
print_info "テストデータ投入確認..."
read -p "テストデータを投入しますか？ (y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    print_info "テストデータ投入中..."
    
    # テスト用サンプルデータ
    psql -d $DB_NAME -U $DB_USER << 'SQL'
INSERT INTO unified_scraped_ebay_products (
    product_id, title_jp, description_jp, price_jpy, 
    category_jp, scraped_image_urls, yahoo_url,
    status, stock_quantity, scrape_success,
    data_source_priority, integration_status,
    has_scraped_data, sync_to_tanaoroshi
) VALUES 
(
    'TEST001SAMPLE',
    'テスト商品：ヴィンテージ腕時計',
    'テスト用のサンプル商品です。実際の商品ではありません。',
    15000,
    '腕時計 > メンズ > アンティーク',
    'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test1.jpg|https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test2.jpg',
    'https://auctions.yahoo.co.jp/jp/auction/test001',
    'scraped',
    1,
    true,
    'scraped',
    'scraped', 
    true,
    true
),
(
    'TEST002SAMPLE',
    'テスト商品：電子機器セット',
    'テスト用のサンプル商品です。複数アイテムセット。',
    8500,
    'コンピューター > PC周辺機器',
    'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test3.jpg',
    'https://auctions.yahoo.co.jp/jp/auction/test002',
    'scraped',
    3,
    true,
    'scraped',
    'scraped',
    true,
    true
) ON CONFLICT (product_id) DO NOTHING;
SQL

    if [ $? -eq 0 ]; then
        print_success "テストデータ投入完了"
    else
        print_warning "テストデータ投入失敗（既に存在する可能性）"
    fi
else
    print_info "テストデータ投入をスキップしました"
fi

# 最終確認
print_info "最終動作確認中..."
TOTAL_PRODUCTS=$(psql -d $DB_NAME -U $DB_USER -t -c "SELECT COUNT(*) FROM unified_scraped_ebay_products;")
TOTAL_TABLES=$(psql -d $DB_NAME -U $DB_USER -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'unified_%' OR table_name LIKE '%scraping%' OR table_name LIKE '%editing%';")
TOTAL_VIEWS=$(psql -d $DB_NAME -U $DB_USER -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name LIKE '%report' OR table_name LIKE '%summary' OR table_name LIKE '%ready%';")

print_success "データベース統計:"
print_success "  📊 商品データ数: $(echo $TOTAL_PRODUCTS | xargs) 件"
print_success "  📋 統合テーブル数: $(echo $TOTAL_TABLES | xargs) 個"
print_success "  👁️  分析ビュー数: $(echo $TOTAL_VIEWS | xargs) 個"

echo ""
echo "🔥 ==========================================="
echo "✅ Yahoo + eBay 統合システム セットアップ完了！"
echo "🔥 ==========================================="
echo ""
print_success "🚀 次のステップ:"
print_info "  1. 使用方法: cat $YAHOO_MODULE_DIR/USAGE_GUIDE.md"
print_info "  2. テスト実行: python3 $YAHOO_MODULE_DIR/unified_scraping_system.py status"
print_info "  3. 棚卸しシステム: http://localhost:8080/modules/tanaoroshi_inline_complete/"
print_info "  4. API確認: curl http://localhost:8080/modules/yahoo_auction_tool/unified_product_api.php/system/status"
echo ""
print_warning "⚠️  重要な注意事項:"
print_warning "  - スクレイピング実行前に USAGE_GUIDE.md を必ず確認"
print_warning "  - 大量データ処理前にはバックアップを取得"
print_warning "  - 商用利用時は適切なアクセス間隔を維持"
echo ""

# システム情報表示
print_info "📋 システム情報:"
print_info "  Project Dir: $PROJECT_DIR"
print_info "  Yahoo Module: $YAHOO_MODULE_DIR"
print_info "  Database: $DB_NAME"
print_info "  Python: $(python3 --version)"
print_info "  PostgreSQL: $(psql --version | head -n 1)"
print_info "  PHP: $(php --version | head -n 1)"

echo ""
print_success "🎉 セットアップ完了！Yahoo + eBay 統合システムが使用可能です。"
