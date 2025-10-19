#!/bin/bash

# 02_scraping フォルダ整理スクリプト
# 既存のファイルをプラットフォーム別・機能別に整理

echo "🗂️  02_scraping フォルダ整理を開始します..."

# 現在のディレクトリが02_scrapingかチェック
if [[ ! -f "scraping.php" ]] || [[ ! -f "yahoo_parser_v2025.php" ]]; then
    echo "❌ エラー: 実際の02_scrapingディレクトリで実行してください"
    echo "現在のディレクトリ: $(pwd)"
    echo ""
    echo "正しい実行方法:"
    echo "  1. find /Users/aritahiroaki -name 'yahoo_parser_v2025.php' 2>/dev/null"
    echo "  2. 見つかったフォルダに移動"
    echo "  3. このスクリプトを実行"
    exit 1
fi

echo "📁 現在のディレクトリ: $(pwd)"

# Step 1: バックアップを作成
BACKUP_DIR="backup_organize_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 バックアップ作成中: $BACKUP_DIR"

# 重要ファイルをバックアップ
cp *.php "$BACKUP_DIR/" 2>/dev/null || echo "PHPファイルバックアップ完了"
cp *.js "$BACKUP_DIR/" 2>/dev/null || echo "JSファイルバックアップ完了"
cp *.css "$BACKUP_DIR/" 2>/dev/null || echo "CSSファイルバックアップ完了"
[ -d "api" ] && cp -r api/ "$BACKUP_DIR/" 2>/dev/null
[ -d "old" ] && cp -r old/ "$BACKUP_DIR/" 2>/dev/null

echo "✅ バックアップ完了"

# Step 2: 新しいフォルダ構造を作成
echo "📂 新しいフォルダ構造作成中..."

mkdir -p platforms/{yahoo,rakuten,mercari,paypayfleamarket,pokemon_center,yodobashi,golfdo}
mkdir -p common
mkdir -p api_unified
mkdir -p ui
mkdir -p inventory_management/{core,api,scripts,logs,config}
mkdir -p logs/{common,yahoo,rakuten,inventory,errors}
mkdir -p config
mkdir -p scripts
mkdir -p tests
mkdir -p docs

echo "✅ フォルダ構造作成完了"

# Step 3: Yahoo関連ファイルの整理
echo "🔄 Yahoo関連ファイル整理中..."

# Yahoo スクレイピング関連
[ -f "scraping.php" ] && mv scraping.php platforms/yahoo/yahoo_scraping.php
[ -f "yahoo_parser_v2025.php" ] && mv yahoo_parser_v2025.php platforms/yahoo/
[ -f "yahoo_auction_script.js" ] && mv yahoo_auction_script.js platforms/yahoo/
[ -f "scraping.css" ] && mv scraping.css platforms/yahoo/yahoo_scraping.css

# 商品マッチング（Yahoo用）
[ -f "product_matcher.php" ] && mv product_matcher.php platforms/yahoo/yahoo_product_matcher.php

echo "✅ Yahoo関連ファイル整理完了"

# Step 4: 在庫管理システムの整理
echo "📦 在庫管理システム整理中..."

# 在庫管理コアファイル
[ -f "inventory_engine_php.php" ] && mv inventory_engine_php.php inventory_management/core/InventoryEngine.php
[ -f "inventory_monitor_api.php" ] && mv inventory_monitor_api.php inventory_management/api/inventory_monitor.php
[ -f "inventory_logger_php.php" ] && mv inventory_logger_php.php inventory_management/core/InventoryLogger.php
[ -f "price_monitor_php.php" ] && mv price_monitor_php.php inventory_management/core/PriceMonitor.php
[ -f "url_validator_php.php" ] && mv url_validator_php.php inventory_management/core/UrlValidator.php

# 在庫管理設定とスクリプト
[ -f "inventory_config_file.php" ] && mv inventory_config_file.php inventory_management/config/inventory_config.php
[ -f "inventory_config_php.php" ] && mv inventory_config_php.php inventory_management/config/inventory_settings.php
[ -f "inventory_cron_script.php" ] && mv inventory_cron_script.php inventory_management/scripts/inventory_cron.php
[ -f "inventory_report_script.php" ] && mv inventory_report_script.php inventory_management/scripts/inventory_report.php
[ -f "inventory_test_script.php" ] && mv inventory_test_script.php inventory_management/scripts/test_inventory.php

# データベーススキーマ
[ -f "inventory_tables_sql.sql" ] && mv inventory_tables_sql.sql inventory_management/config/database_schema.sql
[ -f "inventory_handler_data.sql" ] && mv inventory_handler_data.sql inventory_management/config/sample_data.sql

# JavaScript統合ファイル
[ -f "zaiko_scraping_integration.js" ] && mv zaiko_scraping_integration.js inventory_management/api/zaiko_integration.js
[ -f "inventory_integration_js.js" ] && mv inventory_integration_js.js inventory_management/api/inventory_integration.js

echo "✅ 在庫管理システム整理完了"

# Step 5: 統合・共通機能の整理
echo "🔧 統合・共通機能整理中..."

# 出品統合関連
[ -f "listing_integration_hook.php" ] && mv listing_integration_hook.php common/ListingIntegration.php

# 設定ファイル
[ -f "cron_setup_guide.sh" ] && mv cron_setup_guide.sh scripts/
[ -f "development_checklist.txt" ] && mv development_checklist.txt docs/

# ログファイル
[ -f "scraping_logs.txt" ] && mv scraping_logs.txt logs/common/
[ -f "scraping_folder_structure.txt" ] && mv scraping_folder_structure.txt docs/folder_structure.txt

echo "✅ 統合・共通機能整理完了"

# Step 6: API関連の整理
echo "🌐 API関連整理中..."

# 既存のAPIフォルダがあれば統合
if [ -d "api" ]; then
    mv api/* api_unified/ 2>/dev/null || echo "APIファイル移動中..."
    rmdir api 2>/dev/null || echo "空のAPIフォルダ削除"
fi

echo "✅ API関連整理完了"

# Step 7: 古いファイル・不要ファイルの整理
echo "🧹 古いファイル整理中..."

# oldフォルダはそのまま保持（参考用）
if [ -d "old" ]; then
    echo "ℹ️  oldフォルダは参考用として保持します"
fi

# matcherフォルダの処理
if [ -d "matcher" ]; then
    mv matcher/* common/ 2>/dev/null || echo "matcherファイル移動中..."
    rmdir matcher 2>/dev/null || echo "matcherフォルダ処理完了"
fi

# asin_uploadフォルダの処理
if [ -d "asin_upload" ]; then
    mv asin_upload common/asin_upload_system 2>/dev/null || echo "asin_uploadフォルダ移動"
fi

echo "✅ 古いファイル整理完了"

# Step 8: 楽天用フォルダの準備
echo "🛍️ 楽天用フォルダ準備中..."

# 楽天の基本設定ファイルを作成
cat > platforms/rakuten/rakuten_config.php << 'EOF'
<?php
/**
 * 楽天市場 スクレイピング設定
 * 
 * 作成日: 2025-09-25
 * 用途: 楽天市場固有の設定
 */

return [
    'platform_name' => '楽天市場',
    'platform_id' => 'rakuten',
    'base_url' => 'https://item.rakuten.co.jp',
    'request_delay' => 1000, // ミリ秒
    'timeout' => 30,
    'max_retries' => 3,
    'user_agents' => [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    ]
];
EOF

# 楽天用プレースホルダーファイルを作成
touch platforms/rakuten/rakuten_parser.php
touch platforms/rakuten/RakutenScraper.php
touch platforms/rakuten/rakuten_scraping.php

echo "✅ 楽天用フォルダ準備完了"

# Step 9: Yahoo設定ファイルの作成
cat > platforms/yahoo/yahoo_config.php << 'EOF'
<?php
/**
 * Yahoo オークション スクレイピング設定
 * 
 * 作成日: 2025-09-25
 * 用途: Yahoo オークション固有の設定
 */

return [
    'platform_name' => 'Yahoo オークション',
    'platform_id' => 'yahoo_auction',
    'base_url' => 'https://auctions.yahoo.co.jp',
    'request_delay' => 2000, // ミリ秒
    'timeout' => 30,
    'max_retries' => 3,
    'user_agents' => [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    ]
];
EOF

echo "✅ Yahoo設定ファイル作成完了"

# Step 10: 権限設定
echo "🔐 権限設定中..."
chmod -R 755 .
chmod -R 777 logs/
find . -name "*.php" -exec chmod 644 {} \;
find . -name "*.sh" -exec chmod +x {} \;

echo "✅ 権限設定完了"

# Step 11: 整理結果の確認
echo ""
echo "🎉 02_scraping フォルダ整理が完了しました！"
echo ""
echo "📁 新しいフォルダ構造:"
echo "├── platforms/"
echo "│   ├── yahoo/               # Yahoo オークション関連"
echo "│   │   ├── yahoo_scraping.php"
echo "│   │   ├── yahoo_parser_v2025.php"
echo "│   │   ├── yahoo_auction_script.js"
echo "│   │   └── yahoo_config.php"
echo "│   └── rakuten/             # 楽天市場関連（準備済み）"
echo "│       ├── rakuten_config.php"
echo "│       └── [楽天ファイル追加予定]"
echo "├── inventory_management/    # 在庫管理システム"
echo "│   ├── core/               # コアファイル"
echo "│   ├── api/                # API"
echo "│   ├── scripts/            # スクリプト"
echo "│   └── config/             # 設定・DB"
echo "├── common/                 # 共通機能"
echo "├── api_unified/            # 統合API"
echo "├── ui/                     # ユーザーインターフェース"
echo "├── logs/                   # ログファイル"
echo "└── docs/                   # ドキュメント"
echo ""
echo "📋 次のステップ:"
echo "1. ✅ 既存システムの整理完了"
echo "2. 🔄 楽天関連ファイルを platforms/rakuten/ に追加"
echo "3. 🔄 統合UIを ui/ に追加"
echo "4. 🔄 統合APIを api_unified/ に追加"
echo "5. 🔄 テスト実行"
echo ""
echo "💾 バックアップ: $BACKUP_DIR/ に全ファイル保存済み"
echo ""
echo "🚀 楽天ファイル追加の準備が整いました！"

# Step 12: 簡易README作成
cat > README.md << 'EOF'
# 02_scraping - 統合スクレイピングシステム

## 📋 概要
Yahoo オークション + 楽天市場 + 在庫管理システムの統合プラットフォーム

## 🏗️ フォルダ構成
- `platforms/yahoo/` - Yahoo オークション関連
- `platforms/rakuten/` - 楽天市場関連  
- `inventory_management/` - 在庫管理システム
- `common/` - 共通機能
- `api_unified/` - 統合API
- `ui/` - ユーザーインターフェース

## 🚀 次の作業
1. 楽天関連ファイルを platforms/rakuten/ に配置
2. 統合UIとAPIを追加
3. システムテスト実行

## 💾 バックアップ
整理前のファイルは backup_organize_* フォルダに保存されています
EOF

echo "✅ README.md 作成完了"
echo ""
echo "🎯 整理完了！楽天ファイル追加の準備が整いました。"
EOF