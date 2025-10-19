#!/bin/bash

# Yahoo Auction Complete データ移動スクリプト
# 古いディレクトリから新しいディレクトリに不足ファイルを移動

echo "🔄 Yahoo Auction Complete - 不足ファイル移動開始"

# 基本ディレクトリ設定
OLD_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete＿古い"
NEW_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"

# 移動前のバックアップ作成
echo "📋 移動前バックアップ作成中..."
cp -r "$NEW_DIR" "${NEW_DIR}_backup_$(date +%Y%m%d_%H%M%S)"

# 1. 重要なJavaScriptファイル移動
echo "📁 JavaScriptファイル移動中..."
if [ -f "$OLD_DIR/database_integration.js" ]; then
    cp "$OLD_DIR/database_integration.js" "$NEW_DIR/js/"
    echo "✅ database_integration.js 移動完了"
fi

if [ -f "$OLD_DIR/yahoo_auction_tool.js" ]; then
    cp "$OLD_DIR/yahoo_auction_tool.js" "$NEW_DIR/js/"
    echo "✅ yahoo_auction_tool.js 移動完了"
fi

if [ -f "$OLD_DIR/approval_system.js" ]; then
    cp "$OLD_DIR/approval_system.js" "$NEW_DIR/js/"
    echo "✅ approval_system.js 移動完了"
fi

# 2. PHPファイル移動
echo "📁 PHPファイル移動中..."
if [ -f "$OLD_DIR/database_query_handler.php" ]; then
    cp "$OLD_DIR/database_query_handler.php" "$NEW_DIR/"
    echo "✅ database_query_handler.php 移動完了"
fi

if [ -f "$OLD_DIR/ajax_handler.php" ]; then
    cp "$OLD_DIR/ajax_handler.php" "$NEW_DIR/"
    echo "✅ ajax_handler.php 移動完了"
fi

if [ -f "$OLD_DIR/api_endpoints.php" ]; then
    cp "$OLD_DIR/api_endpoints.php" "$NEW_DIR/"
    echo "✅ api_endpoints.php 移動完了"
fi

if [ -f "$OLD_DIR/approval_api.php" ]; then
    cp "$OLD_DIR/approval_api.php" "$NEW_DIR/"
    echo "✅ approval_api.php 移動完了"
fi

if [ -f "$OLD_DIR/config.php" ]; then
    cp "$OLD_DIR/config.php" "$NEW_DIR/"
    echo "✅ config.php 移動完了"
fi

# 3. 設定ファイル・データベースファイル移動
echo "📁 設定・データベースファイル移動中..."
if [ -f "$OLD_DIR/config.json" ]; then
    cp "$OLD_DIR/config.json" "$NEW_DIR/"
    echo "✅ config.json 移動完了"
fi

if [ -f "$OLD_DIR/requirements.txt" ]; then
    cp "$OLD_DIR/requirements.txt" "$NEW_DIR/"
    echo "✅ requirements.txt 移動完了"
fi

# 4. データベース関連ファイル移動
echo "📁 データベースファイル移動中..."
if [ -d "$OLD_DIR/database" ]; then
    cp -r "$OLD_DIR/database" "$NEW_DIR/"
    echo "✅ database ディレクトリ移動完了"
fi

# 5. スクレイピング関連ファイル移動
echo "📁 スクレイピングファイル移動中..."
if [ -d "$OLD_DIR/scrapers" ]; then
    cp -r "$OLD_DIR/scrapers" "$NEW_DIR/"
    echo "✅ scrapers ディレクトリ移動完了"
fi

# 6. API関連ファイル移動
echo "📁 APIファイル移動中..."
if [ -d "$OLD_DIR/api_servers" ]; then
    cp -r "$OLD_DIR/api_servers" "$NEW_DIR/"
    echo "✅ api_servers ディレクトリ移動完了"
fi

# 7. CSVエクスポート関連移動
echo "📁 CSVエクスポートファイル移動中..."
if [ -d "$OLD_DIR/csv_exports" ]; then
    cp -r "$OLD_DIR/csv_exports" "$NEW_DIR/"
    echo "✅ csv_exports ディレクトリ移動完了"
fi

# 8. 配送計算関連移動
echo "📁 配送計算ファイル移動中..."
if [ -d "$OLD_DIR/shipping_calculation" ]; then
    cp -r "$OLD_DIR/shipping_calculation" "$NEW_DIR/"
    echo "✅ shipping_calculation ディレクトリ移動完了"
fi

# 9. eBay関連ファイル移動
echo "📁 eBayファイル移動中..."
if [ -d "$OLD_DIR/ebay_listing_specs" ]; then
    cp -r "$OLD_DIR/ebay_listing_specs" "$NEW_DIR/"
    echo "✅ ebay_listing_specs ディレクトリ移動完了"
fi

# 10. ユーティリティファイル移動
echo "📁 ユーティリティファイル移動中..."
if [ -d "$OLD_DIR/utilities" ]; then
    cp -r "$OLD_DIR/utilities" "$NEW_DIR/"
    echo "✅ utilities ディレクトリ移動完了"
fi

# 11. アップロードディレクトリ移動
echo "📁 アップロードディレクトリ移動中..."
if [ -d "$OLD_DIR/uploads" ]; then
    cp -r "$OLD_DIR/uploads" "$NEW_DIR/"
    echo "✅ uploads ディレクトリ移動完了"
fi

# 12. UI関連ファイル移動
echo "📁 UIファイル移動中..."
if [ -d "$OLD_DIR/ui_interfaces" ]; then
    cp -r "$OLD_DIR/ui_interfaces" "$NEW_DIR/"
    echo "✅ ui_interfaces ディレクトリ移動完了"
fi

# 13. 重要なHTMLファイル移動
echo "📁 HTMLファイル移動中..."
important_html_files=(
    "filter_management.html"
    "inventory_management.html" 
    "product_registration.html"
    "shipping_calculator.html"
    "workflow_dashboard.html"
    "system_dashboard.html"
)

for file in "${important_html_files[@]}"; do
    if [ -f "$OLD_DIR/$file" ]; then
        cp "$OLD_DIR/$file" "$NEW_DIR/"
        echo "✅ $file 移動完了"
    fi
done

# 14. 重要なCSVファイル移動
echo "📁 CSVファイル移動中..."
if [ -f "$OLD_DIR/prohibited_keywords_sample.csv" ]; then
    cp "$OLD_DIR/prohibited_keywords_sample.csv" "$NEW_DIR/"
    echo "✅ prohibited_keywords_sample.csv 移動完了"
fi

if [ -f "$OLD_DIR/eloji_fedex_rates.csv" ]; then
    cp "$OLD_DIR/eloji_fedex_rates.csv" "$NEW_DIR/"
    echo "✅ eloji_fedex_rates.csv 移動完了"
fi

# 15. venv設定ファイル移動
echo "📁 Python venv設定移動中..."
if [ -f "$OLD_DIR/pyvenv.cfg" ] && [ ! -f "$NEW_DIR/pyvenv.cfg" ]; then
    cp "$OLD_DIR/pyvenv.cfg" "$NEW_DIR/"
    echo "✅ pyvenv.cfg 移動完了"
fi

# 16. ログディレクトリ移動
echo "📁 ログディレクトリ移動中..."
if [ -d "$OLD_DIR/logs" ]; then
    cp -r "$OLD_DIR/logs" "$NEW_DIR/"
    echo "✅ logs ディレクトリ移動完了"
fi

# 17. Core Systemsディレクトリ移動
echo "📁 Core Systemsディレクトリ移動中..."
if [ -d "$OLD_DIR/core_systems" ]; then
    cp -r "$OLD_DIR/core_systems" "$NEW_DIR/"
    echo "✅ core_systems ディレクトリ移動完了"
fi

# 18. Database Systemsディレクトリ移動
echo "📁 Database Systemsディレクトリ移動中..."
if [ -d "$OLD_DIR/database_systems" ]; then
    cp -r "$OLD_DIR/database_systems" "$NEW_DIR/"
    echo "✅ database_systems ディレクトリ移動完了"
fi

# 19. Complete Systemディレクトリ移動
echo "📁 Complete Systemディレクトリ移動中..."
if [ -d "$OLD_DIR/complete_system" ]; then
    cp -r "$OLD_DIR/complete_system" "$NEW_DIR/"
    echo "✅ complete_system ディレクトリ移動完了"
fi

# 20. 実行権限設定
echo "🔧 実行権限設定中..."
find "$NEW_DIR/sh" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null
find "$NEW_DIR" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null

# 21. 移動完了レポート作成
echo "📊 移動完了レポート作成中..."
cat > "$NEW_DIR/migration_report_$(date +%Y%m%d_%H%M%S).txt" << EOF
Yahoo Auction Complete データ移動完了レポート
移動日時: $(date)
移動元: $OLD_DIR
移動先: $NEW_DIR

移動されたファイル・ディレクトリ:
- JavaScriptファイル (database_integration.js, approval_system.js等)
- PHPファイル (database_query_handler.php, ajax_handler.php等)
- 設定ファイル (config.php, config.json, requirements.txt)
- データベース関連ディレクトリ
- スクレイピング関連ディレクトリ  
- API関連ディレクトリ
- CSV関連ディレクトリ
- 配送計算関連ディレクトリ
- eBay関連ディレクトリ
- ユーティリティディレクトリ
- UI関連ディレクトリ
- HTMLファイル各種
- ログディレクトリ
- Core Systems・Database Systems・Complete System

移動完了。システムの動作確認を実行してください。
EOF

echo "✅ 全ての移動作業が完了しました！"
echo "📋 移動レポートが作成されました: $NEW_DIR/migration_report_*.txt"
echo "🔍 次に実行すべき確認作業:"
echo "   1. http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php にアクセス"
echo "   2. 各タブの動作確認"
echo "   3. データベース接続確認"
echo "   4. API動作確認"
