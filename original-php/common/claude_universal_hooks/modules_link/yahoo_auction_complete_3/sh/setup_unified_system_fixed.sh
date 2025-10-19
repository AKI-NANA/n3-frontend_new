#!/bin/bash

# 🔥 Yahoo + eBay 統合システム セットアップ（修正版）
# Python環境問題対応・PostgreSQL統合データベース構築

set -e  # エラー時に停止

echo "🔥 ==========================================="
echo "🎯 Yahoo + eBay 統合システム セットアップ（修正版）"
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
    exit 1
fi
print_success "PostgreSQL接続成功"

# 修正版データベーススキーマ適用
print_info "修正版統合データベーススキーマ適用中..."
FIXED_SCHEMA_FILE="$YAHOO_MODULE_DIR/unified_scraped_ebay_database_schema_fixed.sql"

if [ ! -f "$FIXED_SCHEMA_FILE" ]; then
    print_error "修正版スキーマファイルが見つかりません: $FIXED_SCHEMA_FILE"
    exit 1
fi

if psql -d $DB_NAME -U $DB_USER -f "$FIXED_SCHEMA_FILE"; then
    print_success "修正版統合データベーススキーマ適用完了"
else
    print_error "スキーマ適用失敗"
    exit 1
fi

# Python仮想環境作成・セットアップ
print_info "Python仮想環境セットアップ中..."
cd "$YAHOO_MODULE_DIR"

# 仮想環境作成（存在しない場合）
if [ ! -d "venv" ]; then
    print_info "Python仮想環境作成中..."
    python3 -m venv venv
    print_success "Python仮想環境作成完了"
else
    print_info "既存のPython仮想環境を使用"
fi

# 仮想環境アクティベート
print_info "仮想環境アクティベート中..."
source venv/bin/activate

# Python依存関係インストール（仮想環境内）
print_info "Python依存関係インストール中（仮想環境内）..."
PYTHON_DEPS=(
    "playwright"
    "psycopg2-binary" 
    "pandas"
    "requests"
)

for dep in "${PYTHON_DEPS[@]}"; do
    print_info "インストール中: $dep"
    if pip install "$dep"; then
        print_success "$dep インストール完了"
    else
        print_error "$dep インストール失敗"
        exit 1
    fi
done

# Playwright ブラウザインストール
print_info "Playwright ブラウザインストール中..."
if playwright install chromium; then
    print_success "Playwright ブラウザインストール完了"
else
    print_warning "Playwright ブラウザインストール失敗（手動で実行可能）"
fi

# 実行権限設定
print_info "実行権限設定中..."
chmod +x "$YAHOO_MODULE_DIR/unified_scraping_system.py"
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
        print_warning "ビュー未作成: $view（次回起動時に自動作成）"
    fi
done

# システム動作テスト（仮想環境内）
print_info "システム動作テスト中..."

# Python スクリプト実行テスト
if python unified_scraping_system.py status > /dev/null 2>&1; then
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

# 仮想環境スタートアップスクリプト作成
print_info "仮想環境スタートアップスクリプト作成中..."
cat > "$YAHOO_MODULE_DIR/activate_venv.sh" << 'EOF'
#!/bin/bash
# Yahoo + eBay 統合システム 仮想環境アクティベート

cd "$(dirname "$0")"
source venv/bin/activate

echo "✅ Python仮想環境アクティベート完了"
echo "📋 利用可能コマンド:"
echo "  python unified_scraping_system.py status"
echo "  python unified_scraping_system.py \"<Yahoo URL>\""
echo "  python unified_scraping_system.py batch \"<URL1>\" \"<URL2>\""
echo ""
echo "🚀 終了時は 'deactivate' コマンドで仮想環境を終了してください"

# シェルを仮想環境付きで起動
exec "$SHELL"
EOF

chmod +x "$YAHOO_MODULE_DIR/activate_venv.sh"
print_success "仮想環境スタートアップスクリプト作成完了"

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
    },
    "python": {
        "virtual_environment": true,
        "venv_path": "./venv"
    }
}
EOF
print_success "設定ファイル生成完了"

# 使用方法ガイド更新（仮想環境対応）
print_info "使用方法ガイド生成中..."
cat > "$YAHOO_MODULE_DIR/USAGE_GUIDE_VENV.md" << 'EOF'
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
EOF
print_success "仮想環境対応使用方法ガイド生成完了"

# テストデータ投入（オプション）
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

# 最終確認（仮想環境内）
print_info "最終動作確認中..."
TOTAL_PRODUCTS=$(psql -d $DB_NAME -U $DB_USER -t -c "SELECT COUNT(*) FROM unified_scraped_ebay_products;")
TOTAL_COLUMNS=$(psql -d $DB_NAME -U $DB_USER -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'unified_scraped_ebay_products';")

print_success "データベース統計:"
print_success "  📊 商品データ数: $(echo $TOTAL_PRODUCTS | xargs) 件"
print_success "  📋 メインテーブル項目数: $(echo $TOTAL_COLUMNS | xargs) 項目"

# 仮想環境デアクティベート
deactivate

echo ""
echo "🔥 ==========================================="
echo "✅ Yahoo + eBay 統合システム セットアップ完了！"
echo "🔥 ==========================================="
echo ""
print_success "🚀 次のステップ:"
print_info "  1. 仮想環境起動: ./activate_venv.sh"
print_info "  2. テスト実行: python unified_scraping_system.py status"
print_info "  3. 使用方法: cat USAGE_GUIDE_VENV.md"
print_info "  4. 棚卸しシステム: http://localhost:8080/modules/tanaoroshi_inline_complete/"
echo ""
print_warning "⚠️  重要: Python実行時は必ず ./activate_venv.sh で仮想環境をアクティベートしてください"
echo ""
print_success "🎉 セットアップ完了！Yahoo + eBay 統合システムが使用可能です。"
